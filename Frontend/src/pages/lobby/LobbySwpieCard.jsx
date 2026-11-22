import React from "react";

export default function LobbySwipeDeck({ lobbies, interests, preferences, setPreferences, choices, setChoices }) {
  const selected = new Set(preferences);
  const activityNames = new Map(interests.map(({ id, interest }) => [id, interest]));
  const history = lobbies.filter(({ id }) => Object.hasOwn(choices, id));
  const now = Date.now();
  const lobby = lobbies
    .filter((item) => Date.parse(item.starts_at) > now && !Object.hasOwn(choices, item.id))
    .sort((a, b) => Number(selected.has(b.interest_id)) - Number(selected.has(a.interest_id))
      || Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];

  function toggleInterest(id) {
    setPreferences((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  }

  function choose(liked) {
    setChoices((current) => ({ ...current, [lobby.id]: liked }));
  }

  return (
    <section aria-label="Discover lobbies">
      <fieldset className="ap-dashboard__interests">
        <legend>Which activities interest you?</legend>
        {interests.map(({ id, interest }) => (
          <label key={id}>
            <input type="checkbox" checked={selected.has(id)} onChange={() => toggleInterest(id)} />
            {interest}
          </label>
        ))}
        {!interests.length && <p>No activity categories are available.</p>}
      </fieldset>
      <h2>{lobby && selected.has(lobby.interest_id) ? "Top recommendations" : "Upcoming lobbies"}</h2>
      {lobby ? (
        <>
          <article className="ap-dashboard__card">
            {activityNames.has(lobby.interest_id) && <p>{activityNames.get(lobby.interest_id)}</p>}
            <h3>{lobby.title}</h3>
            <p>{lobby.location || "Location TBD"} · {new Date(lobby.starts_at).toLocaleString()}</p>
          </article>
          <div className="ap-dashboard__actions ap-dashboard__recommendation-actions">
            <button type="button" onClick={() => choose(false)}>Not interested</button>
            <button type="button" onClick={() => choose(true)}>Interested</button>
          </div>
        </>
      ) : <p role="status">No more upcoming lobbies to review.</p>}
      <section aria-labelledby="lobby-choice-history">
        <h2 id="lobby-choice-history">Your lobby choices</h2>
        {[
          { liked: true, label: "Interested" },
          { liked: false, label: "Not interested" },
        ].map(({ liked, label }) => {
          const entries = history.filter(({ id }) => choices[id] === liked);
          return (
            <div key={label}>
              <h3>{label}</h3>
              {entries.length ? (
                <ul>
                  {entries.map(({ id, title, starts_at }) => (
                    <li key={id}>{title} · {new Date(starts_at).toLocaleString()}</li>
                  ))}
                </ul>
              ) : <p>No lobbies marked {label.toLowerCase()} yet.</p>}
            </div>
          );
        })}
      </section>
    </section>
  );
}