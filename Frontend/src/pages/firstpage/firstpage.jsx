import React, { useState } from "react";

export default function LandingPage({ onShowLogin, onShowSignup, onShowCalendar, onShowLanding, onShowLobby }) {
  return (
    <main className="landing">
      <header className="landing-nav">
        <strong>Apricus</strong>

        <nav aria-label="Account">
          <button type="button" onClick={onShowLogin}>
            Log in
          </button>
          <button type="button" onClick={onShowSignup}>
            Create an account
          </button>
          <button type="button" onClick={onShowCalendar}>
            Calendar
          </button>
          <button type="button" onClick={onShowLanding}>
            Home
          </button> 
          <button type="button" onClick={onShowLobby}>
            Lobby
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div>
          <h1>Find people to study with.</h1>
          <p>Meet other McGill students and find a study group.</p>
          <button type="button" onClick={onShowSignup}>
            Get started
          </button>
        </div>

        <div className="landing-preview">
          <article>
            <h2>Engineering study group</h2>
            <p>Review practice problems together at the library.</p>
          </article>
        </div>
      </section>
    </main>
  );
}