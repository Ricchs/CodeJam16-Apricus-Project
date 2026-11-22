import React, { useEffect, useState } from "react";
import { CalendarDays, Compass, Settings, Users } from "lucide-react";
import CalendarPage from "../calendar/Calendar.jsx";
import LobbyPage from "../lobby/lobby.jsx";
import LobbySwipeDeck from "../lobby/LobbySwpieCard.jsx";
import { getInterests, getLobbies, getLobbyDeck, getSwipes, saveSwipe } from "../lobby/lobbyApi.js";
import SettingsPage from "../settings/usr_settings.jsx";
import "./dashboard.css";

const tabs = [
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "lobbies", label: "Lobbies", Icon: Users },
  { id: "discover", label: "Discover", Icon: Compass },
  { id: "settings", label: "Account settings", Icon: Settings },
];

function Discover({ onShowLobbies, choices, onChoose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([getLobbyDeck(signal), getLobbies(signal), getInterests(signal)])
      .then(([deck, lobbies, interests]) => {
        if (!signal.aborted) setData({ deck, lobbies, interests });
      })
      .catch((error) => {
        if (!signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, []);

  async function chooseAndRefresh(lobby, liked) {
    await onChoose(lobby, liked);
    setError("");
    try {
      const deck = await getLobbyDeck();
      setData((current) => ({ ...current, deck }));
    } catch (error) {
      setError(`Choice saved. Could not refresh recommendations. ${error.message}`);
    }
  }

  return (
    <section className="ap-dashboard__discover">
      <h1>Discover</h1>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading activities…</p>}
      {data && <LobbySwipeDeck {...data}
        choices={choices} onChoose={chooseAndRefresh} />}
      <div className="ap-dashboard__actions">
        <button type="button" onClick={onShowLobbies}>Browse lobbies</button>
      </div>
    </section>
  );
}

export default function Dashboard({ onLogin, onSignedOut }) {
  const [tab, setTab] = useState("calendar");
  const [choices, setChoices] = useState({});
  const [interestedLobbies, setInterestedLobbies] = useState([]);
  const [loadingChoices, setLoadingChoices] = useState(true);
  const [choiceError, setChoiceError] = useState("");
  const [choiceAttempt, setChoiceAttempt] = useState(0);
  const latestInterest = interestedLobbies.at(-1);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadChoices() {
      try {
        const swipes = await getSwipes(signal);
        if (signal.aborted) return;
        const liked = swipes.filter((swipe) => swipe.liked);
        const lobbies = liked.length ? await getLobbies(signal) : [];
        if (signal.aborted) return;

        const byId = new Map(lobbies.map((lobby) => [lobby.id, lobby]));
        setChoices(Object.fromEntries(swipes.map((swipe) => [swipe.lobby_id, swipe.liked])));
        setInterestedLobbies(liked.map((swipe) => byId.get(swipe.lobby_id)).filter(Boolean));
      } catch (error) {
        if (!signal.aborted) setChoiceError(error.message);
      } finally {
        if (!signal.aborted) setLoadingChoices(false);
      }
    }

    loadChoices();
    return () => controller.abort();
  }, [choiceAttempt]);

  async function onChoose(lobby, liked) {
    await saveSwipe(lobby.id, liked);
    setChoices((current) => ({ ...current, [lobby.id]: liked }));
    setInterestedLobbies((current) => {
      const remaining = current.filter(({ id }) => id !== lobby.id);
      return liked ? [...remaining, lobby] : remaining;
    });
  }

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
        {(tab === "calendar" || tab === "discover") && loadingChoices
          && <p role="status">Loading saved lobby choices…</p>}
        {(tab === "calendar" || tab === "discover") && choiceError && (
          <div>
            <p role="alert">Could not load saved lobby choices. {choiceError}</p>
            <button type="button" onClick={() => {
              setChoiceError("");
              setLoadingChoices(true);
              setChoiceAttempt((current) => current + 1);
            }}>Retry</button>
          </div>
        )}
        {tab === "calendar" && !loadingChoices
          && <CalendarPage interestedLobbies={interestedLobbies} initialDate={latestInterest?.starts_at} />}
        {tab === "lobbies" && <LobbyPage />}
        {tab === "discover" && !loadingChoices && !choiceError
          && <Discover onShowLobbies={() => setTab("lobbies")}
            choices={choices} onChoose={onChoose} />}
        {tab === "settings" && (
          <SettingsPage onBack={showCalendar} onLogin={onLogin} onSignedOut={onSignedOut} />
        )}
      </div>
    </div>
  );
}
