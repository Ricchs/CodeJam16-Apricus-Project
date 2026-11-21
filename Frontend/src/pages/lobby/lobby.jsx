import React, { useState } from "react";
import "./lobby.css";

const categories = ["Study", "Gym", "Sports", "Food", "Seminars", "Hobbies"];
const key = "apricus-lobbies-v1";

function demoLobbies() {
  const startsAt = Date.now() + 24 * 60 * 60 * 1000;
  return [{
    id: "demo-study", title: "Library study group (demo)",
    location: "McLennan Library", category: "Study", startsAt,
    endsAt: startsAt + 60 * 60 * 1000, capacity: 6,
    joined: false, host: false,
  }];
}

function loadLobbies() {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved) ? saved : demoLobbies();
  } catch {
    return demoLobbies();
  }
}

export default function LobbyPage() {
  const [lobbies, setLobbies] = useState(loadLobbies);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  function save(next) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setLobbies(next);
      setMessage("");
      return true;
    } catch {
      setMessage("The browser could not save your changes.");
      return false;
    }
  }

  function createLobby(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = data.get("title").trim();
    const location = data.get("location").trim();
    const startsAt = new Date(data.get("startsAt")).getTime();
    const endsAt = new Date(data.get("endsAt")).getTime();
    const capacity = Number(data.get("capacity"));
    if (!title || !location || !categories.includes(data.get("category")) ||
        !Number.isInteger(capacity) || capacity < 2 || capacity > 100) {
      setMessage("Enter a title, a location, a category and a capacity from 2 to 100.");
      return;
    }
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) ||
        startsAt <= Date.now() || endsAt <= startsAt) {
      setMessage("Choose a future start time and an end time after it.");
      return;
    }
    const lobby = {
      id: crypto.randomUUID(), title, location, category: data.get("category"),
      startsAt, endsAt, capacity, joined: true, host: true,
    };
    if (save([...lobbies, lobby])) {
      form.reset();
      setCategory("");
      setSearch("");
    }
  }

  function toggleMembership(lobby) {
    if (lobby.host || (!lobby.joined && lobby.startsAt <= Date.now())) {
      setMessage("You can only join an upcoming lobby. Hosts can cancel their own lobby.");
      return;
    }
    save(lobbies.map((item) =>
      item.id === lobby.id ? { ...item, joined: !item.joined } : item
    ));
  }

  const query = search.trim().toLowerCase();
  const visible = lobbies.filter((lobby) =>
    (!category || lobby.category === category) &&
    [lobby.title, lobby.location, lobby.category].some((value) =>
      value.toLowerCase().includes(query)
    )
  ).sort((a, b) => a.startsAt - b.startsAt);

  return (
    <main className="ap-lobby">
      <h1>Lobbies</h1>
      <p>This demo saves lobbies in this browser.</p>
      <section aria-labelledby="create-lobby">
        <h2 id="create-lobby">Create a lobby</h2>
        <form onSubmit={createLobby}>
          <label>Title <input name="title" required maxLength={80} /></label>
          <label>Location <input name="location" required maxLength={120} /></label>
          <label>Category <select name="category">
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select></label>
          <label>Starts <input name="startsAt" type="datetime-local" required /></label>
          <label>Ends <input name="endsAt" type="datetime-local" required /></label>
          <label>Capacity <input name="capacity" type="number" min={2} max={100} defaultValue={6} required /></label>
          <button type="submit">Create lobby</button>
        </form>
        <p role="status">{message}</p>
      </section>
      <section aria-labelledby="browse-lobbies">
        <h2 id="browse-lobbies">Browse lobbies</h2>
        <label>Search <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label>Category <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select></label>
        {visible.length === 0 && <p>No lobbies found.</p>}
        {visible.map((lobby) => (
          <article key={lobby.id}>
            <h3>{lobby.title}</h3>
            <p>{lobby.category} · {lobby.location} · Capacity {lobby.capacity}</p>
            <p>{new Date(lobby.startsAt).toLocaleString()} to {new Date(lobby.endsAt).toLocaleString()}</p>
            {lobby.host ? (
              <button type="button" onClick={() => {
                if (window.confirm("Cancel this lobby?")) {
                  save(lobbies.filter((item) => item.id !== lobby.id));
                }
              }}>Cancel lobby</button>
            ) : (
              <button type="button" disabled={!lobby.joined && lobby.startsAt <= Date.now()} onClick={() => toggleMembership(lobby)}>
                {lobby.joined ? "Leave lobby" : "Join lobby"}
              </button>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
