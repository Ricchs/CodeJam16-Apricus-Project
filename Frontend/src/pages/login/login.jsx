import React, { useState } from "react";
import { supabase } from "../../../supabase.js";
export default function LoginPage({ onShowSignup, onShowLanding, onLogin }) {
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
        <h1>Log in to Apricus</h1>

        <form onSubmit={handleLogin}>
          <label>
            McGill email
            <input name="email" type="email" autoComplete="username" required />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="primary" type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p role="status">{message}</p>

        <button className="outline" type="button" onClick={onShowSignup}>
          Create an account
        </button>
        <button className="outline" type="button" onClick={onShowLanding}>
          Back to home
        </button>
      </section>
    </main>
  );
}