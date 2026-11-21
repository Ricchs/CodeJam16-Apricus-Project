import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import LoginPage from "./pages/login/login.jsx";
import SignupPage from "./pages/signup/signup.jsx";
import "./style.css";
import LandingPage from "./pages/firstpage/firstpage.jsx";
import CalendarPage from "./pages/calendar/calendar.jsx";
import LobbyPage from "./pages/lobby/lobby.jsx";

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
    return <SignupPage onShowLogin={() => setPage("login")}
    onShowLanding={() => setPage("home")}
    />;
  }

  if (page === "calendar") {
    return <CalendarPage />;
  }
  if (page === "lobby") {
    return <LobbyPage />;
  }

  return <LoginPage onShowSignup={() => setPage("signup")} 
  onShowLanding={() => setPage("home")}/>;
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);