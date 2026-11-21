import React, { useState } from "react";

export default function SignupPage({ onShowLogin }) {
  const [message, setMessage] = useState("");

  function handleSignup(event) {
    event.preventDefault();
    setMessage("Signup form submitted. Supabase is not connected yet.");
  }

  return (
    <main className="auth-page auth-page--signup">
      <section className="login-panel">
        <h1>Create an Apricus account</h1>

        <form onSubmit={handleSignup}>
          <label>
            First name
            <input name="first_name" autoComplete="given-name" required />
          </label>

          <label>
            Last name
            <input name="last_name" autoComplete="family-name" required />
          </label>

          <label>
            McGill student ID
            <input name="mcgill_id" type="text" inputMode="numeric" required />
          </label>

          <label>
            Faculty
            <input name="faculty" placeholder="Engineering" required />
          </label>

          <label>
            Major
            <input name="major" placeholder="Computer Engineering" required />
          </label>

          <label>
            Year of study
            <input name="year" type="number" min="1" step="1" required />
          </label>

          <label>
            Role
            <input name="role" value="Student" readOnly />
          </label>

          <label>
            McGill email
            <input name="email" type="email" autoComplete="username" required />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </label>

          <button className="primary" type="submit">Create account</button>
        </form>

        <p role="status">{message}</p>

        <button className="outline" type="button" onClick={onShowLogin}>
          Back to log in
        </button>
      </section>
    </main>
  );
}