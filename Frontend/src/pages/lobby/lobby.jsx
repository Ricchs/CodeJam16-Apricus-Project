import React, { useEffect, useState } from "react";
import { createLobby, getInterests, getJoinedLobbies, getLobbies, joinLobby } from "./lobbyApi.js";
import "./lobby.css";

export default function LobbyPage() {
  const [lobbies, setLobbies] = useState([]);
  const [interests, setInterests] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [feedback, setFeedback] = useState("");
  const [listError, setListError] = useState("");
  const [interestError, setInterestError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [joinedIds, setJoinedIds] = useState([]);
  const [joiningId, setJoiningId] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [joinNotice, setJoinNotice] = useState(null);
  const [membershipError, setMembershipError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setListError("");
    setInterestError("");
    getLobbies(signal).then((rows) => {
      if (!signal.aborted) setLobbies(rows);
    }).catch((error) => {
      if (!signal.aborted) setListError(error.message);
    }).finally(() => {
      if (!signal.aborted) setLoading(false);
    });
    getInterests(signal).then((rows) => {
      if (!signal.aborted) setInterests(rows);
    }).catch((error) => {
      if (!signal.aborted) setInterestError(error.message);
    });
    setMembershipError("");
    getJoinedLobbies(signal).then((ids) => {
      if (!signal.aborted) setJoinedIds((current) => [...new Set([...current, ...ids])]);
    }).catch((error) => {
      if (!signal.aborted) setMembershipError(error.message);
    });
    return () => controller.abort();
  }, [refresh]);

  async function submit(event) {
    event.preventDefault();
    if (saving || loading) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const title = fields.get("title").trim();
    const location = fields.get("location").trim();
    const start = new Date(fields.get("starts_at"));
    const end = new Date(fields.get("ends_at"));
    const interestId = Number(fields.get("interest_id"));
    const capacity = Number(fields.get("capacity"));

    if (!title || !location || !interests.some(({ id }) => id === interestId) ||
        !Number.isInteger(capacity) || capacity < 2 || capacity > 100) {
      setFeedback("Enter a title, location, interest and capacity from 2 to 100.");
      return;
    }
    if (!(start.getTime() > Date.now() && end > start)) {
      setFeedback("Choose a future start time and an end time after it.");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const saved = await createLobby({
        title, location, capacity, interest_id: interestId,
        starts_at: start.toISOString(), ends_at: end.toISOString(),
      });
      if (saved?.id) setLobbies((rows) => [...rows.filter(({ id }) => id !== saved.id), saved]);
      form.reset();
      setSearch("");
      setFilter("");
      setFeedback("Lobby created.");
      setRefresh((value) => value + 1);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleJoin(id) {
    if (joiningId !== null) return;
    setJoiningId(id);
    setJoinError(null);
    try {
      await joinLobby(id);
      setJoinedIds((current) => [...new Set([...current, id])]);
      setJoinNotice({ id, message: "Added to your calendar." });
    } catch (error) {
      setJoinError({ id, message: error.message });
    } finally {
      setJoiningId(null);
    }
  }

  const names = new Map(interests.map(({ id, interest: name }) => [id, name]));
  const query = search.trim().toLowerCase();
  const visible = lobbies.filter((row) =>
    (!filter || String(row.interest_id) === filter) &&
    [row.title, row.location, names.get(row.interest_id)].some((value) =>
      String(value ?? "").toLowerCase().includes(query)
    )
  ).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));

  return (
    <main className="ap-lobby">
      <h1>Lobbies</h1>
      <section aria-labelledby="create-lobby">
        <h2 id="create-lobby">Create a lobby</h2>
        <form onSubmit={submit}>
          <label>Title <input name="title" required maxLength={80} /></label>
          <label>Location <input name="location" required maxLength={120} /></label>
          <label>Interest <select name="interest_id" defaultValue="" required>
            <option value="" disabled>Select an interest</option>
            {interests.map(({ id, interest: name }) => <option value={id} key={id}>{name}</option>)}
          </select></label>
          <label>Starts <input name="starts_at" type="datetime-local" required /></label>
          <label>Ends <input name="ends_at" type="datetime-local" required /></label>
          <label>Capacity <input name="capacity" type="number" min={2} max={100} defaultValue={6} required /></label>
          <button type="submit" disabled={loading || saving || !interests.length || !!interestError}>
            {saving ? "Creating…" : "Create lobby"}
          </button>
        </form>
        <p role="status">{feedback || interestError || (!loading && !interests.length ? "No interests are available." : "")}</p>
      </section>
      <section aria-labelledby="browse-lobbies">
        <h2 id="browse-lobbies">Browse lobbies</h2>
        <label>Search <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label>Interest <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">All interests</option>
          {interests.map(({ id, interest: name }) => <option value={id} key={id}>{name}</option>)}
        </select></label>
        <button type="button" disabled={loading || saving} onClick={() => setRefresh((value) => value + 1)}>Refresh lobbies</button>
        {loading && <p role="status">Loading lobbies…</p>}
        {membershipError && <p role="alert">Could not load your memberships. {membershipError}</p>}
        {listError && <p role="alert">{listError}</p>}
        {!loading && !listError && !visible.length && <p>No lobbies found.</p>}
        {visible.map((row) => (
          <article key={row.id}>
            <h3>{row.title}</h3>
            <p>{names.get(row.interest_id) ?? "Interest"} · {row.location || "Location TBD"} · Capacity {row.capacity}</p>
            <p>{new Date(row.starts_at).toLocaleString()} to {new Date(row.ends_at).toLocaleString()}</p>
            <button
              type="button"
              disabled={joiningId !== null || joinedIds.includes(row.id) || Date.parse(row.starts_at) <= Date.now()}
              onClick={() => handleJoin(row.id)}
            >
              {joinedIds.includes(row.id) ? "Joined" :
                joiningId === row.id ? "Joining…" :
                Date.parse(row.starts_at) <= Date.now() ? "Lobby started" : "Join lobby"}
            </button>
            {joinNotice?.id === row.id && <p role="status">{joinNotice.message}</p>}
            {joinError?.id === row.id && <p role="alert">{joinError.message}</p>}
          </article>
        ))}
      </section>
    </main>
  );
}
