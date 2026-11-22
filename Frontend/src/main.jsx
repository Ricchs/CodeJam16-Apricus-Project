import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import LoginPage from "./pages/login/login.jsx";
import SignupPage from "./pages/signup/signup.jsx";
import LandingPage from "./pages/firstpage/firstpage.jsx";
import CalendarPage from "./pages/calendar/Calendar.jsx";
import LobbyPage from "./pages/lobby/lobby.jsx";
import SettingsPage from "./pages/settings/usr_settings.jsx";
import Dashboard from "./pages/dashboard/dashboard.jsx";
import "./style.css";

function App() {
  const [page, setPage] = useState("home");

  const showHome = () => setPage("home");
  const showLogin = () => setPage("login");
  const showSignup = () => setPage("signup");

  if (page === "home") {
    return (
      <LandingPage
        onShowLogin={showLogin}
        onShowSignup={showSignup}
        onShowCalendar={() => setPage("calendar")}
        onShowLanding={showHome}
        onShowLobby={() => setPage("lobby")}
      />
    );
  }

  if (page === "signup") {
    return (
      <SignupPage onShowLogin={showLogin} onShowLanding={showHome} />
    );
  }

  if (page === "dashboard") {
    return <Dashboard onLogin={showLogin} onSignedOut={showHome} />;
  }

  if (page === "calendar") {
    return <CalendarPage />;
  }

  if (page === "settings") {
    return (
      <SettingsPage
        onBack={() => setPage("lobby")}
        onLogin={showLogin}
        onSignedOut={showHome}
      />
    );
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
      onShowSignup={showSignup}
      onShowLanding={showHome}
      onLogin={() => setPage("dashboard")}
    />
  );
}

createRoot(document.getElementById("root")).render(<App />);