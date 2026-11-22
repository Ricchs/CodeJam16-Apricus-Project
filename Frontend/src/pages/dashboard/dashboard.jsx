import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, Compass, Settings, Users } from "lucide-react";
import CalendarPage from "../calendar/Calendar.jsx";
import LobbyPage from "../lobby/lobby.jsx";
import { getLobbies } from "../lobby/lobbyApi.js";
import SettingsPage from "../settings/usr_settings.jsx";
import "./dashboard.css";

const tabs = [
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "lobbies", label: "Lobbies", Icon: Users },
  { id: "discover", label: "Discover", Icon: Compass },
  { id: "settings", label: "Account settings", Icon: Settings },
];

function Discover({ onShowLobbies }) {
  const [lobbies, setLobbies] = useState([]);
  const [status, setStatus] = useState("Loading lobbies…");

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    getLobbies(signal).then((rows) => {
      if (signal.aborted) return;
      setLobbies(rows.filter((row) => Date.parse(row.starts_at) > Date.now())
        .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)));
      setStatus("");
    }).catch((error) => {
      if (!signal.aborted) setStatus(error.message);
    });
    return () => controller.abort();
  }, []);
  const [index, setIndex] = useState(0);
  const startX = useRef(null);
  const lobby = lobbies[index];

  function next() {
    setIndex((current) => Math.min(current + 1, lobbies.length));
  }

  return (
    <section className="ap-dashboard__discover">
      <h1>Discover</h1>
      {lobby ? (
        <article
          className="ap-dashboard__card"
          key={lobby.id}
          onPointerDown={(event) => { startX.current = event.clientX; }}
          onPointerCancel={() => { startX.current = null; }}
          onPointerUp={(event) => {
            if (startX.current === null) return;
            const distance = event.clientX - startX.current;
            startX.current = null;
            if (distance < -60) next();
            if (distance > 60) onShowLobbies();
          }}
        >
          <h2>{lobby.title}</h2>
          <p>{lobby.location} · {new Date(lobby.starts_at).toLocaleString()}</p>
          <div className="ap-dashboard__actions">
            <button type="button" onClick={next}>Skip</button>
            <button type="button" onClick={onShowLobbies}>Browse lobbies</button>
          </div>
        </article>
      ) : (
        <div className="ap-dashboard__card">
          <p>{status || (lobbies.length ? "You’ve reached the end of the list." : "No upcoming lobbies.")}</p>
          <div className="ap-dashboard__actions">
            {lobbies.length > 0 && <button type="button" onClick={() => setIndex(0)}>Start over</button>}
            <button type="button" onClick={onShowLobbies}>Browse lobbies</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Dashboard({ onLogin, onSignedOut }) {
  const [tab, setTab] = useState("calendar");
  const showCalendar = () => setTab("calendar");

  return (
    <div className="ap-dashboard">
      <aside className="ap-dashboard__sidebar">
        <button className="ap-dashboard__brand" type="button" onClick={showCalendar}>Apricus</button>
        <nav aria-label="Dashboard">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} type="button" aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}>
              <Icon size={18} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="ap-dashboard__content">
        {tab === "calendar" && <CalendarPage />}
        {tab === "lobbies" && <LobbyPage />}
        {tab === "discover" && <Discover onShowLobbies={() => setTab("lobbies")} />}
        {tab === "settings" && (
          <SettingsPage onBack={showCalendar} onLogin={onLogin} onSignedOut={onSignedOut} />
        )}
      </div>
    </div>
  );
}
