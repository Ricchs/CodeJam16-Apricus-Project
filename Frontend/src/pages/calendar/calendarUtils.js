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

function parseIcsDate(line) {
  if (!line) return null;
  const [property, raw] = line.split(":", 2);
  if (!raw) return null;
  if (/VALUE=DATE/.test(property)) {
    return new Date(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8))).toISOString();
  }
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) return null;
  const [, y, m, d, h, min, sec = "00", utc] = match;
  const date = utc
    ? new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +sec))
    : new Date(+y, +m - 1, +d, +h, +min, +sec);
  return date.toISOString();
}

export function importIcs(text) {
  const lines = unfoldIcs(text);
  const imported = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT" && current) {
      const start = parseIcsDate(current.DTSTART);
      const end = parseIcsDate(current.DTEND) || (start ? new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString() : null);
      if (start && end && current.SUMMARY) {
        const category = unescapeIcs(current.CATEGORIES || "personal").toLowerCase();
        imported.push({
          id: createEventId(),
          title: unescapeIcs(current.SUMMARY),
          start,
          end,
          category: CALENDAR_CATEGORIES.some((item) => item.id === category) ? category : "personal",
          location: unescapeIcs(current.LOCATION || ""),
          notes: unescapeIcs(current.DESCRIPTION || ""),
        });
      }
      current = null;
    } else if (current) {
      const separator = line.indexOf(":");
      if (separator < 0) continue;
      const key = line.slice(0, separator).split(";")[0].toUpperCase();
      if (["SUMMARY", "DTSTART", "DTEND", "CATEGORIES", "LOCATION", "DESCRIPTION"].includes(key)) {
        current[key] = line.slice(separator + 1);
      }
    }
  }
  return imported;
}
