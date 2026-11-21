import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import LoginPage from "./pages/login/login.jsx";
import SignupPage from "./pages/signup/signup.jsx";
import "./style.css";


function App() {
  const [page, setPage] = useState("login");

  if (page === "signup") {
    return <SignupPage onShowLogin={() => setPage("login")} />;
  }

  return <LoginPage onShowSignup={() => setPage("signup")} />;
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);