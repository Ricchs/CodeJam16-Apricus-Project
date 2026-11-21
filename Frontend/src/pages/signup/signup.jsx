import React, { useState } from "react";

export default function SignupPage({ onShowLogin }) {
  const [message, setMessage] = useState("");

  function handleSignup(event) {
    event.preventDefault();
    setMessage("Signup form submitted. Supabase is not connected yet.");
  }

  return (
    <main className="auth-page auth-page--signup login_screen">
      <section className="login-panel">
        <h1>Create an Apricus account</h1>

        <form onSubmit={handleSignup}>
          <label>
            First name
            <input name="first_name" autoComplete="given-name" placeholder="e.g. Richard" required />
          </label>

          <label>
            Last name
            <input name="last_name" autoComplete="family-name" placeholder="e.g. Cao" required />
          </label>

          <label>
            McGill student ID
            <input name="mcgill_id" type="text" inputMode="numeric" placeholder="e.g. 260123456" required />
          </label>

          <label>
            Faculty
            <input name="faculty" placeholder="e.g. Engineering" required />
          </label>

          <label>
            Major
            <input name="major" placeholder="e.g. Computer Engineering" required />
          </label>

          <label>
            Year of study
            <select name="year of study" defaultValue="" required>
              <option value="" disabled hidden>Select year of study</option>
              <option value="U0">U0</option>
              <option value="U1">U1</option>
              <option value="U2">U2</option>
              <option value="U3">U3</option>
              <option value="U4">U4</option>
              <option value="U5+">U5+</option>

            </select>
          </label>

          <label>
            Role
            <select name="role" defaultValue="" required>
              <option value="Student">Student</option>
              <option value="Faculty">Clubs</option>
            </select>
          </label>

          <label>
            McGill email
            <input name="email" type="email" autoComplete="username" placeholder="e.g. rcao@mcgill.ca" required />
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