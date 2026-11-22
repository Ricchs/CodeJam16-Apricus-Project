import React, { useEffect, useState } from "react";
import { CalendarDays, Compass, Settings, Users } from "lucide-react";
import CalendarPage from "../calendar/Calendar.jsx";
import LobbyPage from "../lobby/lobby.jsx";
import LobbySwipeDeck from "../lobby/LobbySwpieCard.jsx";
import { getInterests, getLobbies } from "../lobby/lobbyApi.js";
import SettingsPage from "../settings/usr_settings.jsx";
import "./dashboard.css";

const tabs = [
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "lobbies", label: "Lobbies", Icon: Users },
  { id: "discover", label: "Discover", Icon: Compass },
  { id: "settings", label: "Account settings", Icon: Settings },
];

function Discover({ onShowLobbies, preferences, setPreferences, choices, setChoices }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([getLobbies(signal), getInterests(signal)])
      .then(([lobbies, interests]) => {
        if (!signal.aborted) setData({ lobbies, interests });
      })
      .catch((error) => {
        if (!signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="ap-dashboard__discover">
      <h1>Discover</h1>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading activities…</p>}
      {data && <LobbySwipeDeck {...data} preferences={preferences} setPreferences={setPreferences}
        choices={choices} setChoices={setChoices} />}
    </section>
  );
}

export default function Dashboard({ onLogin, onSignedOut }) {
  const [tab, setTab] = useState("calendar");
  const [preferences, setPreferences] = useState([]);
  const [choices, setChoices] = useState({});
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
        {tab === "calendar" && <CalendarPage lobbyChoices={choices} />}
        {tab === "lobbies" && <LobbyPage />}
        {tab === "discover" && <Discover onShowLobbies={() => setTab("lobbies")} preferences={preferences}
          setPreferences={setPreferences} choices={choices} setChoices={setChoices} />}
        {tab === "settings" && (
          <SettingsPage onBack={showCalendar} onLogin={onLogin} onSignedOut={onSignedOut} />
        )}
      </div>
    </div>
  );
}
