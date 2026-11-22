import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import LoginPage from "./pages/login/login.jsx";
import SignupPage from "./pages/signup/signup.jsx";
import LandingPage from "./pages/firstpage/firstpage.jsx";
import CalendarPage from "./pages/calendar/Calendar.jsx";
import LobbyPage from "./pages/lobby/lobby.jsx";
import SettingsPage from "./pages/settings/usr_settings.jsx";
import Dashboard from "./pages/dashboard/dashboard.jsx";
import { supabase } from "../supabase.js";
import "./style.css";

function App() {
  const [page, setPage] = useState(supabase ? null : "home");
  const [userId, setUserId] = useState(null);
  const [signupType, setSignupType] = useState(null);

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user.id ?? null);
      if (event === "INITIAL_SESSION") {
        setPage(session ? "dashboard" : "home");
      } else if (event === "SIGNED_OUT") {
        setPage("home");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (page === null) {
    return <p role="status">Checking your session…</p>;
  }

  const showHome = () => setPage("home");
  const showLogin = () => setPage("login");
  const showSignup = (type = null) => {
    setSignupType(type);
    setPage("signup");
  };

  if (page === "home") {
    return (
      <LandingPage
        onShowLogin={showLogin}
        onShowSignup={() => showSignup()}
        onShowCalendar={() => setPage("calendar")}
        onShowLanding={showHome}
        onShowLobby={() => setPage("lobby")}
      />
    );
  }

  if (page === "signup") {
    return (
      <SignupPage initialAccountType={signupType} onShowLogin={showLogin} onShowLanding={showHome} />
    );
  }

  if (page === "dashboard") {
    return <Dashboard userId={userId} onLogin={showLogin} onSignedOut={showHome} />;
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
      onLogin={(session) => {
        setUserId(session?.user.id ?? null);
        setPage("dashboard");
      }}
    />
  );
}

createRoot(document.getElementById("root")).render(<App />);
