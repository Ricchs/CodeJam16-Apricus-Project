import React, { useState } from "react";

export default function LobbySwipeDeck({ deck, lobbies, interests, choices, onChoose, refreshing, deckError, onRetry, preferredActivity, myLobbies, userId }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [removeAllResult, setRemoveAllResult] = useState(null);
  const [reviewDismissedActivity, setReviewDismissedActivity] = useState(false);
  const [reviewedThisVisit, setReviewedThisVisit] = useState(() => new Set());
  const [showOtherActivities, setShowOtherActivities] = useState(false);
  const activityNames = new Map(interests.map(({ id, interest }) => [id, interest]));
  const joinedLobbies = userId ? myLobbies.filter(({ host_id }) => host_id !== userId) : [];
  const now = Date.now();
  const dismissedLobbies = lobbies.filter((item) =>
    choices[item.id] === false && !reviewedThisVisit.has(item.id) && Date.parse(item.starts_at) > now
  );
  const available = deck.filter(({ id, starts_at }) =>
    Date.parse(starts_at) > now && !Object.hasOwn(choices, id)
  );
  const preferredName = preferredActivity?.toLowerCase();
  const matchesActivity = ({ interest_id }) =>
    Boolean(preferredName) && activityNames.get(interest_id)?.trim().toLowerCase() === preferredName;
  const preferredLobby = available.find(matchesActivity);
  const holdOtherActivities = Boolean(preferredName) && !showOtherActivities;
  const dismissedInActivity = dismissedLobbies.filter(matchesActivity);
  const lobby = preferredLobby ?? (holdOtherActivities
    ? (reviewDismissedActivity ? dismissedInActivity[0] : undefined)
    : available[0] ?? dismissedInActivity[0] ?? dismissedLobbies[0]);
  const canShowOtherActivities = holdOtherActivities
    && (available.length > 0 || dismissedLobbies.some((item) => !matchesActivity(item)));

  async function choose(lobbyToUpdate, liked) {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    setSaveNotice("");
    try {
      const saved = await onChoose(lobbyToUpdate, liked);
      if (saved.liked && !saved.joined) setSaveNotice("Interest saved. This lobby could not be joined.");
      if (lobbyToUpdate.id === preferredLobby?.id) setShowOtherActivities(true);
      if (lobbyToUpdate.id === lobby?.id) {
        setReviewedThisVisit((current) => new Set(current).add(lobbyToUpdate.id));
      }
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeAll() {
    if (saving || refreshing || !joinedLobbies.length) return;
    setSaving(true);
    setSaveError("");
    setSaveNotice("");
    setRemoveAllResult(null);
    try {
      const results = await Promise.allSettled(joinedLobbies.map((entry) => onChoose(entry, false)));
      const removed = results.flatMap((result, index) =>
        result.status === "fulfilled" && !result.value.joined ? [joinedLobbies[index].id] : []
      );
      setReviewedThisVisit((current) => new Set([...current, ...removed]));
      setRemoveAllResult({ removed: removed.length, failed: joinedLobbies.length - removed.length });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ap-dashboard__discover-layout" aria-label="Discover lobbies">
      <div className="ap-dashboard__deck">
        <article className="ap-dashboard__card ap-dashboard__deck-card" aria-labelledby="current-lobby">
          {refreshing ? (
            <h2 id="current-lobby" role="status">Updating recommendations…</h2>
          ) : deckError ? (
            <div>
              <h2 id="current-lobby">Could not refresh recommendations</h2>
              <p role="alert">{deckError}</p>
              <div className="ap-dashboard__actions">
                <button type="button" onClick={onRetry}>Retry</button>
              </div>
            </div>
          ) : lobby ? (
            <>
              <div>
                {activityNames.has(lobby.interest_id) && (
                  <p className="ap-dashboard__deck-category">{activityNames.get(lobby.interest_id)}</p>
                )}
                <h2 id="current-lobby">{lobby.title}</h2>
                {choices[lobby.id] === false && <p>Previously dismissed</p>}
                <p>{lobby.location || "Location TBD"}</p>
                <time dateTime={lobby.starts_at}>{new Date(lobby.starts_at).toLocaleString()}</time>
              </div>
              <div className="ap-dashboard__actions ap-dashboard__deck-actions">
                <button type="button" disabled={saving} onClick={() => choose(lobby, true)}>Interested</button>
                <button type="button" disabled={saving} onClick={() => choose(lobby, false)}>Not interested</button>
              </div>
            </>
          ) : (
            <div>
              <h2 id="current-lobby">No new recommendations</h2>
              <p role="status">{holdOtherActivities
                ? `No upcoming, unrated ${preferredActivity} lobbies are available in your deck.`
                : "No more eligible lobbies in your deck."}</p>
              {holdOtherActivities && (dismissedInActivity.length > 0 || canShowOtherActivities) && (
                <div className="ap-dashboard__actions">
                  {dismissedInActivity.length > 0 && (
                    <button type="button" disabled={saving} onClick={() => {
                      setSaveError("");
                      setReviewDismissedActivity(true);
                    }}>
                      Review dismissed {preferredActivity} lobbies
                    </button>
                  )}
                  {canShowOtherActivities && (
                    <button type="button" onClick={() => setShowOtherActivities(true)}>
                      Show other activities
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </article>
        {saveError && <p role="alert">{saveError}</p>}
        {saveNotice && <p role="status">{saveNotice}</p>}
      </div>
      <aside className="ap-dashboard__card ap-dashboard__my-lobbies" aria-labelledby="my-discover-lobbies">
        <div className="ap-dashboard__my-lobbies-header">
          <h2 id="my-discover-lobbies">My Lobbies</h2>
          {joinedLobbies.length > 0 && (
            <button className="ap-dashboard__choice-remove" type="button" disabled={saving || refreshing}
              aria-label="Remove all joined lobbies" onClick={removeAll}>
              Remove all
            </button>
          )}
        </div>
        {removeAllResult && (
          <p role={removeAllResult.failed ? "alert" : "status"}>
            {removeAllResult.removed > 0 && `Removed ${removeAllResult.removed} joined ${removeAllResult.removed === 1 ? "lobby" : "lobbies"}.`}
            {removeAllResult.failed > 0 && ` Could not remove ${removeAllResult.failed}. You can try again.`}
          </p>
        )}
        {myLobbies.length ? (
          <ul className="ap-dashboard__choice-list">
            {myLobbies.map((entry) => (
              <li key={entry.id}>
                <div className="ap-dashboard__choice-details">
                  <strong>{entry.title}</strong>
                  <time dateTime={entry.starts_at}>{new Date(entry.starts_at).toLocaleString()}</time>
                </div>
                {entry.host_id === userId ? <span>Hosted</span> : (
                  <button className="ap-dashboard__choice-remove" type="button" disabled={saving || refreshing || !userId}
                    aria-label={`Leave ${entry.title}`}
                    onClick={() => choose(entry, false)}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : <p>Lobbies you join or host appear here.</p>}
      </aside>
    </section>
  );
}
