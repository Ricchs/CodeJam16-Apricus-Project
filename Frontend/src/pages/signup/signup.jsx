import React, { useState } from "react";
import AccountTypePicker from "../AccountTypePicker.jsx";
import { ensureUserProfile } from "../../userProfile.js";
import { supabase } from "../../../supabase.js";

export default function SignupPage({ initialAccountType = null, onShowLogin, onShowLanding }) {
  const [accountType, setAccountType] = useState(initialAccountType);
  const isClub = accountType === "Clubs";
  const [message, setMessage] = useState("");

  const [pending, setPending] = useState(false);

  async function handleSignup(event) {
    event.preventDefault();
    if (pending || !accountType) return;
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    const form = event.currentTarget;
    const fields = new FormData(form);
    const detailFields = isClub
      ? ["club_name", "instagram"]
      : ["first_name", "last_name", "mcgill_id", "faculty", "major", "year_of_study"];
    const details = Object.fromEntries(
      detailFields.map((name) => [name, String(fields.get(name) ?? "").trim()])
    );
    if (Object.values(details).some((value) => !value)) {
      setMessage("Complete all profile fields.");
      return;
    }

    setPending(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: String(fields.get("email")).trim(),
        password: String(fields.get("password")),
        options: { data: { ...details, requested_role: accountType } },
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      if (data.session) {
        try {
          await ensureUserProfile(data.session);
        } catch (profileError) {
          setMessage(`Your account was created. ${profileError.message} Log in to retry profile setup.`);
          return;
        }
      }
      form.reset();
      setMessage(data.session
        ? "Account ready. Select Back to log in to continue."
        : "If confirmation is required, check your email for a link before logging in.");
    } catch {
      setMessage("Could not connect to Supabase. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page auth-page--signup login_screen">
      <section className="login-panel">
        <h1>{accountType ? (isClub ? "Register your club" : "Create a student account") : "Create an Apricus account"}</h1>
        {!accountType ? (
          <>
            <p>Are you a student or a club?</p>
            <AccountTypePicker onChoose={setAccountType} />
          </>
        ) : (
          <form onSubmit={handleSignup}>
            {isClub ? (
              <>
                <label>
                  Club name
                  <input name="club_name" autoComplete="organization" required />
                </label>
                <label>
                  Instagram
                  <input name="instagram" placeholder="@yourclub" required />
                </label>
              </>
            ) : (
              <>
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
                  <select name="faculty" defaultValue="" required>
                    <option value="" disabled hidden>Choose a faculty</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Science">Science</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Business">Business</option>
                    <option value="Law">Law</option>
                    <option value="Arts">Arts</option>
                  </select>
                </label>

                <label>
                  Major
                  <input name="major" placeholder="e.g. Computer Engineering" required />
                </label>

                <label>
                  Year of study
                  <select name="year_of_study" defaultValue="" required>
                    <option value="" disabled hidden>Select year of study</option>
                    <option value="U0">U0</option>
                    <option value="U1">U1</option>
                    <option value="U2">U2</option>
                    <option value="U3">U3</option>
                    <option value="U4">U4</option>
                    <option value="U5+">U5+</option>
                  </select>
                </label>
              </>
            )}
            <label>
              {isClub ? "Club email" : "McGill email"}
              <input name="email" type="email" autoComplete="username" placeholder={isClub ? "club@example.com" : "e.g. rcao@mcgill.ca"} required />
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

            <button className="primary" type="submit" disabled={pending}>
              {pending ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}

        {accountType && (
          <button className="outline" type="button" disabled={pending} onClick={() => {
            setAccountType(null);
            setMessage("");
          }}>
            Change account type
          </button>
        )}

        <p role="status">{message}</p>

        <button className="outline" type="button" onClick={onShowLogin}>
          Back to log in
        </button>
        <button className="outline" type="button" onClick={onShowLanding}>
          Back to home
        </button>
      </section>
    </main>
  );
}
