import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase.js";

export default function SettingsPage({ onBack, onLogin, onSignedOut }) {
  const [account, setAccount] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !data.user) {
        setMessage("Sign in to manage your account.");
        return;
      }
      const user = data.user;
      const result = await supabase.from("apricus_profiles")
        .select("display_name, visibility").eq("id", user.id).maybeSingle();
      if (!active) return;
      if (result.error) setMessage(result.error.message);
      setAccount({ user, profile: result.data, profileAvailable: !result.error });
    }
    if (supabase) {
      load().catch(() => {
        if (active) setMessage("Unable to load account settings.");
      });
    } else {
      setMessage("Supabase is not configured.");
    }
    return () => { active = false; };
  }, []);

  async function run(action, success) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await action();
      setMessage(error ? error.message : success);
      return !error;
    } catch {
      setMessage("Could not save your changes. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function saveProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get("display_name").trim();
    if (!name) {
      setMessage("Enter a display name.");
      return;
    }
    void run(() => supabase.from("apricus_profiles").upsert({
      id: account.user.id,
      display_name: name,
      visibility: form.get("visibility"),
    }), "Profile settings saved.");
  }

  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = fields.get("new_password");
    if (password !== fields.get("confirm_password")) {
      setMessage("The new passwords do not match.");
      return;
    }
    const saved = await run(async () => {
      const current = await supabase.auth.signInWithPassword({
        email: account.user.email,
        password: fields.get("current_password"),
      });
      if (current.error) return current;
      return supabase.auth.updateUser({ password });
    }, "Password changed.");
    if (saved) form.reset();
  }

  function changeEmail(event) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email").trim();
    void run(() => supabase.auth.updateUser({ email }),
      "Email change requested. Check your inboxes for confirmation links.");
  }

  async function signOut() {
    if (await run(() => supabase.auth.signOut({ scope: "local" }), "Signed out.")) {
      onSignedOut();
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <h1>Account settings</h1>
        <p role="status">{message}</p>
        {account ? (
          <>
            {account.profileAvailable && (
              <form onSubmit={saveProfile}>
                <h2>Profile</h2>
                <label>Display name
                  <input name="display_name" maxLength={80} required
                    defaultValue={account.profile?.display_name ?? [account.user.user_metadata?.first_name, account.user.user_metadata?.last_name].filter(Boolean).join(" ")} />
                </label>
                <label>Profile visibility
                  <select name="visibility" defaultValue={account.profile?.visibility ?? "private"}>
                    <option value="private">Private</option>
                    <option value="public">Public to signed-in Apricus users</option>
                  </select>
                </label>
                <button className="primary" disabled={busy}>Save profile</button>
              </form>
            )}
            <form onSubmit={changeEmail}>
              <h2>Email</h2>
              <p>Current email: {account.user.email}</p>
              <label>New email <input type="email" name="email" autoComplete="email" required /></label>
              <button className="primary" disabled={busy}>Request email change</button>
            </form>
            <form onSubmit={changePassword}>
              <h2>Password</h2>
              <label>Current password <input type="password" name="current_password" autoComplete="current-password" required /></label>
              <label>New password <input type="password" name="new_password" autoComplete="new-password" minLength={8} required /></label>
              <label>Confirm new password <input type="password" name="confirm_password" autoComplete="new-password" minLength={8} required /></label>
              <button className="primary" disabled={busy}>Change password</button>
            </form>
            <button className="outline" type="button" disabled={busy} onClick={signOut}>Sign out</button>
          </>
        ) : message && <button className="primary" type="button" onClick={onLogin}>Log in</button>}
        <button className="outline" type="button" disabled={busy} onClick={onBack}>Back</button>
      </section>
    </main>
  );
}
