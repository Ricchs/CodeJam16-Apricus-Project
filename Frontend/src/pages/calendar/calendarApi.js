import { supabase } from "../../../supabase.js";

export async function scheduleRequest(path, { method = "GET", body, signal } = {}) {
  const base = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new Error("Set VITE_API_URL to the Apricus backend URL.");
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("Log in to use your calendar.");

  const url = new URL(`${base}${base.endsWith("/api") ? "" : "/api"}/schedule${path}`);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("The backend URL must use HTTPS outside localhost.");
  }
  const headers = { Authorization: `Bearer ${data.session.access_token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(url, { method, headers, signal, redirect: "error", body: JSON.stringify(body) });
  if ((response.status === 404 || response.status === 405) && path === "/events" && method === "GET") {
    throw new Error("Dated events are unavailable. The backend needs the calendar API update.");
  }
  if (!response.ok) {
    const { detail } = await response.json().catch(() => ({}));
    throw new Error(typeof detail === "string" ? detail : `Calendar request failed (HTTP ${response.status}).`);
  }
  if (response.status !== 204) return response.json();
}
