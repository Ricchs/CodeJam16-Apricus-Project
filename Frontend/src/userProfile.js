export async function ensureUserProfile(session) {
  const metadata = session.user.user_metadata ?? {};
  const year = /^U([0-5])\+?$/.exec(metadata.year_of_study ?? "");
  const base = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new Error("Set VITE_API_URL to the Apricus backend URL.");

  const url = new URL(base.endsWith("/api") ? base + "/users/" : base + "/api/users/");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("The Apricus backend must use HTTPS outside localhost.");
  }

  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      first_name: metadata.first_name ?? null,
      last_name: metadata.last_name ?? null,
      club_name: metadata.club_name ?? null,
      major: metadata.major ?? null,
      faculty: metadata.faculty ?? null,
      year: year ? Number(year[1]) : null,
    }),
  });

  if (response.ok || response.status === 409) return;
  throw new Error(`Apricus could not create your profile (HTTP ${response.status}).`);
}
