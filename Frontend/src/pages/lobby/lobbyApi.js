import { supabase } from "../../../supabase.js";

async function request(path, { body, signal, authenticated = false, allowSignedOut = false } = {}) {
  const base = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new Error("Set VITE_API_URL to the Apricus backend URL.");
  const url = new URL((base.endsWith("/api") ? base : base + "/api") + path);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("The backend URL must use HTTPS outside localhost.");
  }
  const headers = { Accept: "application/json" };
  if (authenticated) {
    if (!supabase && allowSignedOut) return [];
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session && allowSignedOut) return [];
    if (!data.session) throw new Error("Log in to join a lobby.");
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  if (body) headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers,
    signal,
    redirect: "error",
  });
  if (!response.ok) {
    const { detail } = await response.json().catch(() => ({}));
    const message = Array.isArray(detail)
      ? detail.map(({ loc, msg }) => `${loc?.at(-1) ?? "Field"}: ${msg}`).join(" · ")
      : detail;
    throw new Error(typeof message === "string" ? message : `Lobby request failed (HTTP ${response.status}).`);
  }
  return response.json();
}

export const getLobbies = (signal) => request("/lobbies", { signal });
export const getInterests = (signal) => request("/interests/", { signal });
export const createLobby = (body) => request("/lobbies", { body, authenticated: true });

export const getJoinedLobbies = (signal) =>
  request("/lobbies/joined", { signal, authenticated: true, allowSignedOut: true });

export const joinLobby = (id) =>
  request(`/lobbies/${encodeURIComponent(id)}/join`, { body: {}, authenticated: true });
