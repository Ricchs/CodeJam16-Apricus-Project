import React, { useState } from "react";

export default function LobbySwipeDeck({ deck, lobbies, interests, choices, onChoose, refreshing, deckError, onRetry, selectedInterestId }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [reviewQueue, setReviewQueue] = useState([]);
  const activityNames = new Map(interests.map(({ id, interest }) => [id, interest]));
  const selectedActivityName = activityNames.get(selectedInterestId);
  const myLobbies = lobbies.filter(({ id }) => choices[id] === true);
  const now = Date.now();
  const matchesActivity = ({ interest_id }) => selectedInterestId == null || interest_id === selectedInterestId;
  const dismissedLobbies = lobbies.filter((item) =>
    matchesActivity(item) && choices[item.id] === false && Date.parse(item.starts_at) > now
  );
  const recommendation = deck.find((item) =>
    matchesActivity(item) && Date.parse(item.starts_at) > now && !Object.hasOwn(choices, item.id)
  );
  const reviewLobby = reviewQueue.length > 0
    ? dismissedLobbies.find(({ id }) => reviewQueue.includes(id))
    : undefined;
  const lobby = recommendation ?? reviewLobby;

  async function choose(lobbyToUpdate, liked) {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await onChoose(lobbyToUpdate, liked);
      setReviewQueue((current) => current.filter((id) => id !== lobbyToUpdate.id));
    } catch (error) {
      setSaveError(error.message);
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
              <p role="status">{selectedActivityName
                ? `No more eligible ${selectedActivityName} lobbies.`
                : "No more eligible lobbies in your deck."}</p>
              {dismissedLobbies.length > 0 && (
                <div className="ap-dashboard__actions">
                  <button type="button" disabled={saving} onClick={() => {
                    setSaveError("");
                    setReviewQueue(dismissedLobbies.map(({ id }) => id));
                  }}>
                    Review dismissed lobbies ({dismissedLobbies.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </article>
        {saveError && <p role="alert">{saveError}</p>}
      </div>
      <aside className="ap-dashboard__card ap-dashboard__my-lobbies" aria-labelledby="my-discover-lobbies">
        <h2 id="my-discover-lobbies">My Lobbies</h2>
        {myLobbies.length ? (
          <ul className="ap-dashboard__choice-list">
            {myLobbies.map((entry) => (
              <li key={entry.id}>
                <div className="ap-dashboard__choice-details">
                  <strong>{entry.title}</strong>
                  <time dateTime={entry.starts_at}>{new Date(entry.starts_at).toLocaleString()}</time>
                </div>
                <button className="ap-dashboard__choice-remove" type="button" disabled={saving || refreshing}
                  aria-label={`Remove ${entry.title} from My Lobbies`}
                  onClick={() => choose(entry, false)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : <p>Lobbies you mark Interested appear here.</p>}
      </aside>
    </section>
  );
}
