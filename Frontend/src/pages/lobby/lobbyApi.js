import { supabase } from "../../../supabase.js";

async function request(path, { body, signal, authenticated = false, allowSignedOut = false, cache } = {}) {
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
    if (!data.session) throw new Error("Log in to continue.");
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  if (body) headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers,
    signal,
    cache,
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

export const getLobbies = (signal) => request("/lobbies", { signal, authenticated: true });
export const getLobbyDeck = (signal, interestIds = [], { includeOtherActivities = false } = {}) => {
  const params = new URLSearchParams();
  for (const id of interestIds) params.append("interest_ids", id);
  if (includeOtherActivities) params.set("include_other_activities", "true");
  const query = params.size ? `?${params}` : "";
  return request(`/lobbies/deck${query}`, { signal, authenticated: true, cache: "no-store" });
};
export const getMyLobbies = (signal, { allowSignedOut = false } = {}) =>
  request("/lobbies/mine", { signal, authenticated: true, allowSignedOut, cache: "no-store" });

export const getInterests = (signal) => request("/interests/", { signal });
export const createLobby = (body) => request("/lobbies", { body, authenticated: true });

export const getJoinedLobbies = (signal) =>
  request("/lobbies/joined", { signal, authenticated: true, allowSignedOut: true });

export const joinLobby = (id) =>
  request(`/lobbies/${encodeURIComponent(id)}/join`, { body: {}, authenticated: true });

export const getSwipes = (signal) => request("/swipes", { signal, authenticated: true });

export const saveSwipe = (lobbyId, liked) =>
  request("/swipes", { body: { lobby_id: lobbyId, liked }, authenticated: true });
