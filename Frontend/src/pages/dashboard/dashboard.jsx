import React, { useEffect, useState } from "react";
import { CalendarDays, Compass, Settings, Users } from "lucide-react";
import CalendarPage from "../calendar/Calendar.jsx";
import LobbyPage from "../lobby/lobby.jsx";
import LobbySwipeDeck from "../lobby/LobbySwpieCard.jsx";
import { getInterests, getLobbies, getLobbyDeck, getMyLobbies, getSwipes, saveSwipe } from "../lobby/lobbyApi.js";
import SettingsPage from "../settings/usr_settings.jsx";
import "./dashboard.css";

const tabs = [
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "lobbies", label: "Lobbies", Icon: Users },
  { id: "discover", label: "Discover", Icon: Compass },
  { id: "settings", label: "Account settings", Icon: Settings },
];

function Discover({ onShowLobbies, choices, onChoose, myLobbies, userId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedInterestId, setSelectedInterestId] = useState(undefined);
  const [deckResult, setDeckResult] = useState(null);
  const [deckAttempt, setDeckAttempt] = useState(0);

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

  useEffect(() => {
    if (selectedInterestId === undefined || !data) return;
    const controller = new AbortController();
    const { signal } = controller;
    const request = { interestId: selectedInterestId, choices, attempt: deckAttempt };
    const selectedInterest = data.interests.find(({ id }) => id === selectedInterestId);
    const interestIds = selectedInterest ? data.interests
      .filter(({ interest }) => interest.trim().toLowerCase() === selectedInterest.interest.trim().toLowerCase())
      .map(({ id }) => id) : [];
    getLobbyDeck(signal, interestIds, { includeOtherActivities: true })
      .then((deck) => {
        if (!signal.aborted) setDeckResult({ ...request, deck });
      })
      .catch((error) => {
        if (!signal.aborted) setDeckResult({ ...request, error: error.message });
      });
    return () => controller.abort();
  }, [selectedInterestId, choices, data, deckAttempt]);

  const activeDeck = deckResult && deckResult.interestId === selectedInterestId
    && deckResult.choices === choices && deckResult.attempt === deckAttempt
    ? deckResult
    : null;
  const activitiesById = new Map(data?.interests.map(({ id, interest }) => [
    id, interest.trim().toLowerCase(),
  ]));
  const activities = new Map();
  for (const [id, name] of activitiesById) {
    if (name && !activities.has(name)) {
      activities.set(name, { id, label: name.charAt(0).toUpperCase() + name.slice(1) });
    }
  }
  const selectedActivity = activities.get(activitiesById.get(selectedInterestId));
  const activityOptions = [...activities.values()];

  return (
    <section className="ap-dashboard__discover">
      <h1>Discover</h1>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading activities…</p>}
      {data && selectedInterestId === undefined && (
        <section className="ap-dashboard__card" aria-labelledby="discover-activity">
          <h2 id="discover-activity">What are you interested in?</h2>
          <div className="ap-dashboard__actions ap-dashboard__activity-picker">
            {[{ id: null, label: "All activities" }, ...activityOptions].map(({ id, label }) => (
              <button key={id ?? "all"} type="button" onClick={() => {
                setDeckResult(null);
                setSelectedInterestId(id);
              }}>{label}</button>
            ))}
          </div>
        </section>
      )}
      {data && selectedInterestId !== undefined && (
        <>
          <div className="ap-dashboard__actions ap-dashboard__activity-selection">
            <span><strong>{selectedActivity ? selectedActivity.label : "All activities"}</strong></span>
            <button type="button" onClick={() => setSelectedInterestId(undefined)}>Change activity</button>
          </div>
          <LobbySwipeDeck {...data} deck={activeDeck?.deck ?? []} choices={choices} onChoose={onChoose}
            preferredActivity={selectedActivity?.label} myLobbies={myLobbies} userId={userId}
            refreshing={!activeDeck} deckError={activeDeck?.error}
            onRetry={() => setDeckAttempt((attempt) => attempt + 1)} />
        </>
      )}
      <div className="ap-dashboard__actions ap-dashboard__browse">
        <button type="button" onClick={onShowLobbies}>Browse lobbies</button>
      </div>
    </section>
  );
}

export default function Dashboard({ onLogin, onSignedOut, userId }) {
  const [tab, setTab] = useState("calendar");
  const [choices, setChoices] = useState({});
  const [myLobbies, setMyLobbies] = useState([]);
  const [loadingChoices, setLoadingChoices] = useState(true);
  const [choiceError, setChoiceError] = useState("");
  const [choiceAttempt, setChoiceAttempt] = useState(0);
  const joinedById = new Map(myLobbies.map((lobby) => [lobby.id, lobby]));
  const latestInterest = Object.keys(choices).reverse()
    .map((id) => choices[id] === true ? joinedById.get(id) : undefined)
    .find(Boolean);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadChoices() {
      try {
        const [swipes, lobbies] = await Promise.all([getSwipes(signal), getMyLobbies(signal)]);
        if (signal.aborted) return;
        setChoices(Object.fromEntries(swipes.map((swipe) => [swipe.lobby_id, swipe.liked])));
        setMyLobbies(lobbies);
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
    const saved = await saveSwipe(lobby.id, liked);
    setChoices((current) => {
      const next = { ...current };
      delete next[saved.lobby_id];
      next[saved.lobby_id] = saved.liked;
      return next;
    });
    if (lobby.host_id !== userId) {
      setMyLobbies((current) => {
        const remaining = current.filter(({ id }) => id !== saved.lobby_id);
        return saved.joined ? [...remaining, lobby] : remaining;
      });
    }
    return saved;
  }

  function onLobbyAdded(lobby) {
    setMyLobbies((current) => [...current.filter(({ id }) => id !== lobby.id), lobby]);
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
          && <CalendarPage interestedLobbies={myLobbies} initialDate={latestInterest?.starts_at} />}
        {tab === "lobbies" && <LobbyPage onLobbyAdded={onLobbyAdded} />}
        {tab === "discover" && !loadingChoices && !choiceError
          && <Discover onShowLobbies={() => setTab("lobbies")}
            choices={choices} onChoose={onChoose} myLobbies={myLobbies} userId={userId} />}
        {tab === "settings" && (
          <SettingsPage onBack={showCalendar} onLogin={onLogin} onSignedOut={onSignedOut} />
        )}
      </div>
    </div>
  );
}
