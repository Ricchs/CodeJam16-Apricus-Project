import React, { useState } from "react";
import "./auth.css";


export default function LoginPage({ onShowSignup }) {
  const [message, setMessage] = useState("");

  function handleLogin(event) {
    event.preventDefault();
    setMessage("Login form submitted. Supabase is not connected yet.");
  }

  return (
    <main className="auth-page">
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

          <button className="primary" type="submit">Log in</button>
        </form>

        <p role="status">{message}</p>

        <button className="outline" type="button" onClick={onShowSignup}>
          Create an account
        </button>
      </section>
    </main>
  );
}