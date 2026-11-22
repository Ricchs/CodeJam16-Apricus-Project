import React, { useState } from "react";
import AccountTypePicker from "../AccountTypePicker.jsx";
import { ensureUserProfile } from "../../userProfile.js";
import { supabase } from "../../../supabase.js";
export default function LoginPage({ onShowSignup, onShowLanding, onLogin }) {
  const [accountType, setAccountType] = useState(null);
  const isClub = accountType === "Clubs";
  const [message, setMessage] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();

    if (isLoggingIn) return;

    if (!supabase) {
      setMessage("Supabase is missing its project URL or publishable key.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = form.get("email").trim();
    const password = form.get("password");

    setMessage("");
    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.session) {
        setMessage("No login session was created.");
        return;
      }

      try {
        await ensureUserProfile(data.session);
      } catch (profileError) {
        setMessage(profileError.message);
        return;
      }
      setMessage("Logged in successfully.");
      onLogin?.(data.session);
    } catch {
      setMessage("Unable to log in. Check your connection and try again.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <h1>{accountType ? (isClub ? "Club login" : "Student login") : "Log in to Apricus"}</h1>
        {accountType ? (
          <>
            <form onSubmit={handleLogin}>
              <label>
                {isClub ? "Club email" : "McGill email"}
                <input name="email" type="email" autoComplete="username" required />
              </label>
              <label>
                Password
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              <button className="primary" type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? "Logging in…" : "Log in"}
              </button>
            </form>
            <p role="status">{message}</p>
            <button className="outline" type="button" disabled={isLoggingIn}
              onClick={() => onShowSignup(accountType)}>
              {isClub ? "Register a club" : "Create a student account"}
            </button>
            <button className="outline" type="button" disabled={isLoggingIn} onClick={() => {
              setAccountType(null);
              setMessage("");
            }}>
              Change account type
            </button>
          </>
        ) : (
          <>
            <p>Are you a student or a club?</p>
            <AccountTypePicker onChoose={setAccountType} />
          </>
        )}

        <button className="outline" type="button" onClick={onShowLanding}>
          Back to home
        </button>
      </section>
    </main>
  );
}
