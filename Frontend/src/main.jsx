import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import LoginPage from "./pages/login/login.jsx";
import SignupPage from "./pages/signup/signup.jsx";
import LandingPage from "./pages/firstpage/firstpage.jsx";
import CalendarPage from "./pages/calendar/Calendar.jsx";
import LobbyPage from "./pages/lobby/lobby.jsx";
import SettingsPage from "./pages/settings/usr_settings.jsx";
import "./style.css";

function App() {
  const [page, setPage] = useState("home");

  if (page === "home") {
    return (
      <LandingPage
        onShowLogin={() => setPage("login")}
        onShowSignup={() => setPage("signup")}
        onShowCalendar={() => setPage("calendar")}
        onShowLanding={() => setPage("home")}
        onShowLobby={() => setPage("lobby")}
      />
    );
  }

  if (page === "signup") {
    return (
      <SignupPage
        onShowLogin={() => setPage("login")}
        onShowLanding={() => setPage("home")}
      />
    );
  }

  if (page === "calendar") {
    return <CalendarPage />;
  }

  if (page === "settings") {
    return <SettingsPage
      onBack={() => setPage("lobby")}
      onLogin={() => setPage("login")}
      onSignedOut={() => setPage("home")}
    />;
  }

  if (page === "lobby") {
    return (
      <>
        <button type="button" onClick={() => setPage("settings")}>
          Account settings
        </button>
        <LobbyPage />
      </>
    );
  }

  return (
    <LoginPage
      onShowSignup={() => setPage("signup")}
      onShowLanding={() => setPage("home")}
      onLogin={() => setPage("lobby")}
    />
  );
}

createRoot(document.getElementById("root")).render(<App />);