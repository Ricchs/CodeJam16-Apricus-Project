export const CALENDAR_CATEGORIES = [
  { id: "class", label: "Classes", color: "#6574cd" },
  { id: "club", label: "Clubs", color: "#b866c2" },
  { id: "work", label: "Work", color: "#df9447" },
  { id: "gym", label: "Gym & sports", color: "#45a98e" },
  { id: "social", label: "Social", color: "#e06c75" },
  { id: "personal", label: "Personal", color: "#788493" },
];

const pad = (value) => String(value).padStart(2, "0");

export function createEventId() {
  return globalThis.crypto?.randomUUID?.() || `event-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDateTime(date, time = "09:00") {
  const [year, month, day] = date.split("-").map(Number);
  const [hour = 9, minute = 0] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

export function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function formatDateRange(start, end) {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startText = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(start);
  const endText = new Intl.DateTimeFormat(undefined, {
    month: sameYear ? undefined : "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  }).format(end);
  return `${startText} – ${endText}${sameYear ? `, ${end.getFullYear()}` : ""}`;
}

export function sortEvents(events) {
  return [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
}

function icsEscape(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsDate(value) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

export function exportIcs(events) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Apricus//Student Calendar//EN", "CALSCALE:GREGORIAN"];
  for (const event of sortEvents(events)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsEscape(event.id)}@apricus.local`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(event.start)}`,
      `DTEND:${toIcsDate(event.end)}`,
      `SUMMARY:${icsEscape(event.title)}`,
      `CATEGORIES:${icsEscape(event.category || "personal")}`,
    );
    if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`);
    if (event.notes) lines.push(`DESCRIPTION:${icsEscape(event.notes)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR", "");
  return lines.join("\r\n");
}

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
}

function unescapeIcs(value = "") {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseIcsDate({ value, params }) {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value);
  if (!match) throw new Error("The file contains an invalid event date.");
  const [, year, month, day, hour = "00", minute = "00", second = "00", utc] = match;
  const parts = [+year, +month - 1, +day, +hour, +minute, +second];
  const wallTime = Date.UTC(...parts);
  const zone = /(?:^|;)TZID=(?:"([^"]+)"|([^;]+))/i.exec(params);
  if (utc) return new Date(wallTime);
  if (!zone) return new Date(...parts);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone[1] || zone[2], year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23",
  });
  let candidate = wallTime;
  for (let attempt = 0; attempt < 3; attempt++) {
    const fields = Object.fromEntries(formatter.formatToParts(candidate).map(({ type, value }) => [type, Number(value)]));
    const displayed = Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute, fields.second);
    if (displayed === wallTime) return new Date(candidate);
    candidate += wallTime - displayed;
  }
  throw new Error("An event time falls inside a daylight-saving clock change.");
}

function durationMilliseconds(value) {
  const match = /^P(?:(\d+)W|(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?)$/i.exec(value);
  if (!match) throw new Error("The file contains an invalid event duration.");
  const [, weeks = 0, days = 0, hours = 0, minutes = 0, seconds = 0] = match.map((part) => part === undefined ? undefined : Number(part));
  return (((weeks * 7 + days) * 24 + hours) * 3600 + minutes * 60 + seconds) * 1000;
}

export function importIcs(text) {
  const imported = [];
  let current = null;
  let insideAlarm = false;
  for (const rawLine of unfoldIcs(text.replace(/^\uFEFF/, ""))) {
    const line = rawLine.trimEnd();
    const boundary = line.toUpperCase();
    if (boundary === "BEGIN:VEVENT") {
      current = {};
      insideAlarm = false;
    } else if (boundary === "END:VEVENT" && current) {
      if (current.RRULE || current.RDATE || current["RECURRENCE-ID"]) {
        throw new Error("Recurring ICS events need to be exported as individual occurrences.");
      }
      if (current.DTSTART && current.STATUS?.value.toUpperCase() !== "CANCELLED") {
        const start = parseIcsDate(current.DTSTART);
        const end = current.DTEND ? parseIcsDate(current.DTEND)
          : current.DURATION ? new Date(+start + durationMilliseconds(current.DURATION.value))
          : /^\d{8}$/.test(current.DTSTART.value) ? addDays(start, 1)
          : new Date(+start + 3600000);
        if (end <= start) throw new Error("An event ends before or at its start time.");
        const category = unescapeIcs(current.CATEGORIES?.value || "").toLowerCase();
        const title = unescapeIcs(current.SUMMARY?.value || "").trim() || "Untitled event";
        const location = unescapeIcs(current.LOCATION?.value || "");
        const key = current.UID?.value || JSON.stringify([title, start, end, location]);
        // Encode UTF-8 bytes in fixed-width hex for stable, URL-safe IDs.
        const id = `ics-${Array.from(new TextEncoder().encode(key), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
        imported.push({
          id, title, start: start.toISOString(), end: end.toISOString(),
          category: CALENDAR_CATEGORIES.some((item) => item.id === category) ? category : "personal",
          location, notes: unescapeIcs(current.DESCRIPTION?.value || ""),
        });
      }
      current = null;
    } else if (current && boundary === "BEGIN:VALARM") {
      insideAlarm = true;
    } else if (current && boundary === "END:VALARM") {
      insideAlarm = false;
    } else if (current && !insideAlarm) {
      const header = /^(?:[^":]|"[^"]*")*:/.exec(line);
      const colon = header ? header[0].length - 1 : -1;
      if (colon < 0) continue;
      const [key, ...params] = line.slice(0, colon).split(";");
      current[key.toUpperCase()] = { value: line.slice(colon + 1), params: params.join(";") };
    }
  }
  return sortEvents(imported);
}
