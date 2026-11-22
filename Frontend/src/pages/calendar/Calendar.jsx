import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Calendar.css";
import { scheduleRequest } from "./calendarApi.js";
import { getJoinedLobbies, getLobbies } from "../lobby/lobbyApi.js";
import {
  addDays,
  CALENDAR_CATEGORIES,
  createEventId,
  dateKey,
  exportIcs,
  formatDateRange,
  formatTime,
  importIcs,
  parseLocalDateTime,
  sortEvents,
  startOfWeek,
} from "./calendarUtils";

const STORAGE_KEY = "apricus-calendar-events-v1";
const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

function readSavedEvents(storageKey, initialEvents) {
  if (typeof window === "undefined") return initialEvents;
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : initialEvents;
  } catch {
    return initialEvents;
  }
}

function dateInputValue(date) {
  return dateKey(date);
}

function timeInputValue(value) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function draftFromEvent(event) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return {
    id: event.id,
    title: event.title,
    date: dateInputValue(start),
    startTime: timeInputValue(event.start),
    endTime: timeInputValue(event.end),
    endDate: dateKey(end),
    category: event.category || "personal",
    location: event.location || "",
    notes: event.notes || "",
  };
}

function EventForm({ draft, onChange, onClose, onSave, onDelete, busy, error }) {
  const update = (field) => (event) => onChange({ ...draft, [field]: event.target.value });
  const submit = (event) => {
    event.preventDefault();
    const start = parseLocalDateTime(draft.date, draft.startTime);
    const end = parseLocalDateTime(draft.endDate || draft.date, draft.endTime);
    if (end <= start) {
      window.alert("The end time must be after the start time.");
      return;
    }
    onSave({
      id: draft.id || createEventId(),
      title: draft.title.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      category: draft.category,
      location: draft.location.trim(),
      notes: draft.notes.trim(),
    });
  };

  return (
    <div className="ap-calendar__backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="ap-calendar__dialog" role="dialog" aria-modal="true" aria-labelledby="ap-calendar-form-title">
        <div className="ap-calendar__dialog-head">
          <div>
            <p className="ap-calendar__eyebrow">YOUR SCHEDULE</p>
            <h2 id="ap-calendar-form-title">{draft.id ? "Edit event" : "Add an event"}</h2>
          </div>
          <button className="ap-calendar__icon-button" type="button" onClick={onClose} aria-label="Close event form">×</button>
        </div>
        <form onSubmit={submit} className="ap-calendar__form">
          {error && <p className="ap-calendar__field--wide" role="alert">{error}</p>}
          <label className="ap-calendar__field ap-calendar__field--wide">
            <span>Event name</span>
            <input autoFocus required maxLength={100} value={draft.title} onChange={update("title")} placeholder="e.g. ECON 250 lecture" />
          </label>
          <label className="ap-calendar__field">
            <span>Date</span>
            <input required type="date" value={draft.date} onChange={(event) => {
              const date = event.target.value;
              onChange({ ...draft, date, endDate: draft.endDate === draft.date ? date : draft.endDate });
            }} />
          </label>
          <label className="ap-calendar__field">
            <span>Type</span>
            <select value={draft.category} onChange={update("category")}>
              {CALENDAR_CATEGORIES.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}
            </select>
          </label>
          <label className="ap-calendar__field">
            <span>Starts</span>
            <input required type="time" value={draft.startTime} onChange={update("startTime")} />
          </label>
          <label className="ap-calendar__field">
            <span>End date</span>
            <input required type="date" min={draft.date} value={draft.endDate} onChange={update("endDate")} />
          </label>
          <label className="ap-calendar__field">
            <span>Ends</span>
            <input required type="time" value={draft.endTime} onChange={update("endTime")} />
          </label>
          <label className="ap-calendar__field ap-calendar__field--wide">
            <span>Location <small>Optional</small></span>
            <input maxLength={120} value={draft.location} onChange={update("location")} placeholder="Building, room, or link" />
          </label>
          <label className="ap-calendar__field ap-calendar__field--wide">
            <span>Notes <small>Optional</small></span>
            <textarea rows="3" maxLength={500} value={draft.notes} onChange={update("notes")} placeholder="Add a reminder or details" />
          </label>
          <div className="ap-calendar__form-actions ap-calendar__field--wide">
            {draft.id && <button className="ap-calendar__button ap-calendar__button--danger" type="button" disabled={busy} onClick={onDelete}>Delete</button>}
            <span />
            <button className="ap-calendar__button ap-calendar__button--quiet" type="button" onClick={onClose}>Cancel</button>
            <button className="ap-calendar__button ap-calendar__button--primary" type="submit" disabled={busy}>Save event</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function EventChip({ event, onClick, compact = false }) {
  const category = CALENDAR_CATEGORIES.find((item) => item.id === event.category) || CALENDAR_CATEGORIES.at(-1);
  return (
    <button
      type="button"
      className={`ap-calendar__event${compact ? " ap-calendar__event--compact" : ""}`}
      style={{ "--event-color": category.color }}
      onClick={(click) => { click.stopPropagation(); onClick(event); }}
      title={`${event.title}, ${formatTime(event.start)}${event.location ? ` · ${event.location}` : ""}`}
    >
      <span className="ap-calendar__event-time">{formatTime(event.start)}</span>
      <span className="ap-calendar__event-title">{event.title}</span>
    </button>
  );
}

function MonthGrid({ activeDate, eventsByDay, onDayClick, onEventClick }) {
  const monthStart = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const todayKey = dateKey(new Date());
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  return (
    <div className="ap-calendar__month" role="grid" aria-label={monthFormatter.format(activeDate)}>
      <div className="ap-calendar__month-weekdays" role="row">
        {weekdayNames.map((day) => <div role="columnheader" key={day}>{day}</div>)}
      </div>
      <div className="ap-calendar__month-cells">
        {cells.map((date) => {
          const key = dateKey(date);
          const dayEvents = eventsByDay.get(key) || [];
          const outside = date.getMonth() !== activeDate.getMonth();
          return (
            <div
              role="gridcell"
              className={`ap-calendar__month-cell${outside ? " is-outside" : ""}${key === todayKey ? " is-today" : ""}`}
              key={key}
              onClick={() => onDayClick(date)}
              onKeyDown={(event) => event.key === "Enter" && onDayClick(date)}
              tabIndex={0}
              aria-label={`${fullDateFormatter.format(date)}, ${dayEvents.length} events`}
            >
              <span className="ap-calendar__month-date">{date.getDate()}</span>
              <div className="ap-calendar__month-events">
                {dayEvents.slice(0, 3).map((event) => <EventChip key={event.id} event={event} compact onClick={onEventClick} />)}
                {dayEvents.length > 3 && <span className="ap-calendar__more-events">+{dayEvents.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ activeDate, eventsByDay, onDayClick, onEventClick }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(activeDate), index));
  const todayKey = dateKey(new Date());
  return (
    <div className="ap-calendar__week">
      {days.map((date, index) => {
        const key = dateKey(date);
        const dayEvents = eventsByDay.get(key) || [];
        return (
          <section className={`ap-calendar__day${key === todayKey ? " is-today" : ""}`} key={key} aria-label={fullDateFormatter.format(date)}>
            <button className="ap-calendar__day-head" type="button" onClick={() => onDayClick(date)}>
              <span>{weekdayNames[index]}</span>
              <strong>{date.getDate()}</strong>
            </button>
            <div className="ap-calendar__day-events">
              {dayEvents.length ? dayEvents.map((event) => (
                <EventChip key={event.id} event={event} onClick={onEventClick} />
              )) : <button className="ap-calendar__empty-day" type="button" onClick={() => onDayClick(date)}>＋ Add</button>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function Calendar({ initialEvents = [], storageKey = STORAGE_KEY, className = "", onEventsChange }) {
  const [events, setEvents] = useState([]);
  const [legacyEvents, setLegacyEvents] = useState(() => readSavedEvents(storageKey, initialEvents));
  const [ready, setReady] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [blocks, setBlocks] = useState(null);
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [blockError, setBlockError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [activeDate, setActiveDate] = useState(() => new Date());
  const [view, setView] = useState("week");
  const [enabledCategories, setEnabledCategories] = useState(() => new Set(CALENDAR_CATEGORIES.map((category) => category.id)));
  const [draft, setDraft] = useState(null);
  const [lobbyEvents, setLobbyEvents] = useState([]);
  const [lobbyError, setLobbyError] = useState("");
  const [selectedLobby, setSelectedLobby] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    scheduleRequest("/events", { signal }).then((rows) => {
      if (signal.aborted) return;
      setEvents(rows ?? []);
      setReady(rows !== null);
    }).catch((requestError) => {
      if (!signal.aborted) setError(requestError.message);
    });
    scheduleRequest("/me", { signal }).then((rows) => {
      if (!signal.aborted) setBlocks(rows);
    }).catch((requestError) => {
      if (!signal.aborted) setScheduleError(requestError.message);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (ready) onEventsChange?.(events);
  }, [events, ready, onEventsChange]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadLobbyEvents() {
      try {
        const ids = new Set(await getJoinedLobbies(signal));
        if (!ids.size || signal.aborted) return;
        const lobbies = await getLobbies(signal);
        if (signal.aborted) return;
        setLobbyEvents(lobbies.filter(({ id }) => ids.has(id)).map((lobby) => ({
          id: `lobby-${lobby.id}`,
          title: lobby.title,
          start: lobby.starts_at,
          end: lobby.ends_at,
          category: "social",
          location: lobby.location || "",
          source: "lobby",
        })));
      } catch {
        if (!signal.aborted) setLobbyError("Could not load joined lobbies.");
      }
    }

    loadLobbyEvents();
    return () => controller.abort();
  }, []);

  const weeklyEvents = useMemo(() => {
    const firstDay = view === "week" ? startOfWeek(activeDate)
      : startOfWeek(new Date(activeDate.getFullYear(), activeDate.getMonth(), 1));
    return Array.from({ length: view === "week" ? 7 : 42 }, (_, offset) => {
      const day = addDays(firstDay, offset);
      const date = dateKey(day);
      return (blocks ?? []).filter((block) => block.day_of_week === (day.getDay() + 6) % 7).map((block) => ({
        id: `weekly-${block.id}-${date}`, title: block.label || "Schedule block",
        start: `${date}T${block.start_time.slice(0, 8)}`,
        end: `${date}T${block.end_time.slice(0, 8)}`, category: "class", source: "weekly", block,
      }));
    }).flat();
  }, [activeDate, blocks, view]);
  const calendarEvents = useMemo(
    () => [...events, ...lobbyEvents, ...weeklyEvents], [events, lobbyEvents, weeklyEvents],
  );
  const filteredEvents = useMemo(
    () => sortEvents(calendarEvents.filter((event) => enabledCategories.has(event.category))),
    [calendarEvents, enabledCategories],
  );
  const eventsByDay = useMemo(() => {
    const grouped = new Map();
    const first = view === "week" ? startOfWeek(activeDate)
      : startOfWeek(new Date(activeDate.getFullYear(), activeDate.getMonth(), 1));
    for (let offset = 0; offset < (view === "week" ? 7 : 42); offset++) {
      const day = addDays(first, offset);
      grouped.set(dateKey(day), filteredEvents.filter((event) =>
        new Date(event.start) < addDays(day, 1) && new Date(event.end) > day
      ));
    }
    return grouped;
  }, [filteredEvents, activeDate, view]);

  const label = view === "month"
    ? monthFormatter.format(activeDate)
    : formatDateRange(startOfWeek(activeDate), addDays(startOfWeek(activeDate), 6));

  const movePeriod = (direction) => {
    setActiveDate((current) => view === "month"
      ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
      : addDays(current, direction * 7));
  };
  const openNewEvent = (date = activeDate, blockTime = false) => {
    if (!blocks || busy) return;
    setActiveDate(date);
    setEditingBlock(null);
    setAllowBusyLabel(blockTime);
    setBlockError("");
    setBlockFormOpen(true);
  };
  function openEvent(event) {
    if (event.source === "weekly") {
      if (busy) return;
      setActiveDate(new Date(event.start));
      setEditingBlock(event.block);
      setAllowBusyLabel(event.block.label === "Busy");
      setBlockError("");
      setBlockFormOpen(true);
    } else if (event.source) {
      setSelectedLobby(event);
    } else {
      if (!ready || busy) return;
      setError("");
      setSelectedLobby(null);
      setDraft(draftFromEvent(event));
    }
  }
  async function runCalendarAction(action) {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveTimeBlock(event) {
    event.preventDefault();
    if (busy || !blocks) return;
    const fields = new FormData(event.currentTarget);
    const dayOfWeek = Number(fields.get("weekday"));
    const start = fields.get("start");
    const end = fields.get("end");
    if (end <= start) {
      setBlockError("Choose an end time after the start time.");
      return;
    }

    setBusy(true);
    setBlockError("");
    setNotice("");
    try {
      const block = await scheduleRequest("/", {
        method: "POST",
        body: {
          day_of_week: dayOfWeek,
          start_time: start,
          end_time: end,
          label: fields.get("label").trim() || "Busy",
        },
      });
      setBlocks((current) => [...current.filter(({ id }) => id !== block.id), block]);
      setActiveDate(addDays(startOfWeek(activeDate), dayOfWeek));
      setEnabledCategories((current) => new Set([...current, "class"]));
      setBlockFormOpen(false);
      setNotice("Weekly time block saved.");
    } catch (requestError) {
      setBlockError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function saveEvent(event) {
    return runCalendarAction(async () => {
      if (draft.id) {
        const saved = await scheduleRequest(`/events/${encodeURIComponent(event.id)}`, { method: "PUT", body: event });
        setEvents((current) => current.map((item) => item.id === saved.id ? saved : item));
      } else {
        setEvents(await scheduleRequest("/events", { method: "POST", body: [event] }));
      }
      setActiveDate(new Date(event.start));
      setDraft(null);
    });
  }

  function deleteEvent() {
    return runCalendarAction(async () => {
      const { id } = draft;
      await scheduleRequest(`/events/${encodeURIComponent(id)}`, { method: "DELETE" });
      setEvents((current) => current.filter((event) => event.id !== id));
      setDraft(null);
    });
  }

  async function uploadEvents(added) {
    if (!added.length) throw new Error("No calendar events were found.");
    if (added.length > 1000) throw new Error("Import a file with 1,000 events or fewer.");
    setEvents(await scheduleRequest("/events", { method: "POST", body: added }));
    const focus = added.find((event) => new Date(event.end) > new Date()) || added[0];
    setActiveDate(new Date(focus.start));
    setEnabledCategories(new Set(CALENDAR_CATEGORIES.map(({ id }) => id)));
  }

  const toggleCategory = (id) => {
    setEnabledCategories((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadCalendar = () => {
    const blob = new Blob([exportIcs(calendarEvents)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "apricus-calendar.ics";
    link.click();
    URL.revokeObjectURL(url);
  };

  function importCalendar(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    return runCalendarAction(async () => {
      await uploadEvents(importIcs(await file.text()));
      setNotice("Calendar file imported.");
    });
  }

  function copyBrowserEvents() {
    return runCalendarAction(async () => {
      await uploadEvents(legacyEvents);
      setLegacyEvents([]);
      setNotice("Browser events copied to your account.");
    });
  }

  return (
    <div className={`ap-calendar ${className}`.trim()}>
      <header className="ap-calendar__topbar">
        <div className="ap-calendar__heading">
          <p className="ap-calendar__eyebrow">APRICUS · CAMPUS LIFE</p>
          <h1>Calendar</h1>
          <p className="ap-calendar__subtitle">Keep classes, club events, work, and your free time in one place.</p>
        </div>
        <div className="ap-calendar__top-actions">
          <input ref={fileInput} className="ap-calendar__file-input" type="file" accept=".ics,text/calendar" onChange={importCalendar} aria-label="Import calendar file" />
          <button className="ap-calendar__button ap-calendar__button--quiet" type="button" disabled={!ready || busy} onClick={() => fileInput.current?.click()}>Import .ics</button>
          <button className="ap-calendar__button ap-calendar__button--quiet" type="button" onClick={downloadCalendar}>Export .ics</button>
          <button className="ap-calendar__button ap-calendar__button--primary" type="button" disabled={!blocks || busy} onClick={() => openNewEvent()}>＋ Add event</button>
        </div>
      </header>

      {ready === null && !error && <p role="status">Loading calendar…</p>}
      {!draft && error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {scheduleError && <p role="alert">Weekly schedule could not load. {scheduleError}</p>}
      {ready && legacyEvents.length > 0 && (
        <button className="ap-calendar__button" type="button" disabled={busy} onClick={copyBrowserEvents}>
          Copy saved browser events to this account
        </button>
      )}
      <div className="ap-calendar__layout">
        <aside className="ap-calendar__sidebar" aria-label="Calendar filters">
          <button className="ap-calendar__button ap-calendar__button--primary ap-calendar__sidebar-add" type="button" disabled={!ready || busy} onClick={() => openNewEvent()}>＋ New event</button>
          <button className="ap-calendar__button ap-calendar__sidebar-add" type="button"
            disabled={!blocks || busy} onClick={() => {
              setBlockError("");
              setBlockFormOpen(true);
            }}>
            Block time
          </button>
          <section className="ap-calendar__filters">
            <div className="ap-calendar__section-heading">
              <h2>My calendars</h2>
              <button className="ap-calendar__text-button" type="button" onClick={() => setEnabledCategories(new Set(CALENDAR_CATEGORIES.map((category) => category.id)))}>Show all</button>
            </div>
            {CALENDAR_CATEGORIES.map((category) => (
              <label className="ap-calendar__filter" key={category.id}>
                <input type="checkbox" checked={enabledCategories.has(category.id)} onChange={() => toggleCategory(category.id)} />
                <span className="ap-calendar__filter-dot" style={{ "--event-color": category.color }} />
                <span>{category.label}</span>
                <span className="ap-calendar__filter-count">{calendarEvents.filter((event) => event.category === category.id).length}</span>
              </label>
            ))}
          </section>
          <section className="ap-calendar__import-note">
            <span className="ap-calendar__note-icon" aria-hidden="true">↔</span>
            <div>
              <strong>Connect a calendar</strong>
              <p>Import or export an .ics file from Google Calendar, Outlook, or Apple Calendar.</p>
            </div>
          </section>
        </aside>

        <section className="ap-calendar__content" aria-label="Calendar events">
          <div className="ap-calendar__toolbar">
            <div className="ap-calendar__navigation">
              <button className="ap-calendar__icon-button" type="button" aria-label="Previous period" onClick={() => movePeriod(-1)}>‹</button>
              <button className="ap-calendar__icon-button" type="button" aria-label="Next period" onClick={() => movePeriod(1)}>›</button>
              <button className="ap-calendar__button ap-calendar__button--quiet ap-calendar__today" type="button" onClick={() => setActiveDate(new Date())}>Today</button>
              <h2 aria-live="polite">{label}</h2>
            </div>
            <div className="ap-calendar__view-switch" role="group" aria-label="Calendar view">
              <button type="button" className={view === "week" ? "is-active" : ""} aria-pressed={view === "week"} onClick={() => setView("week")}>Week</button>
              <button type="button" className={view === "month" ? "is-active" : ""} aria-pressed={view === "month"} onClick={() => setView("month")}>Month</button>
            </div>
          </div>

          {view === "week"
            ? <WeekGrid activeDate={activeDate} eventsByDay={eventsByDay} onDayClick={openNewEvent} onEventClick={openEvent} />
            : <MonthGrid activeDate={activeDate} eventsByDay={eventsByDay} onDayClick={openNewEvent} onEventClick={openEvent} />}
          {lobbyError && <p role="alert">{lobbyError}</p>}
          {selectedLobby && (
            <section aria-label="Event details">
              <h3>{selectedLobby.title}</h3>
              <p>{fullDateFormatter.format(new Date(selectedLobby.start))} · {formatTime(selectedLobby.start)} to {formatTime(selectedLobby.end)}</p>
              {selectedLobby.location && <p>{selectedLobby.location}</p>}
              <button className="ap-calendar__button" type="button" onClick={() => setSelectedLobby(null)}>Close details</button>
            </section>
          )}
          <p className="ap-calendar__privacy">Calendar events and joined lobbies sync from your account.</p>
        </section>
      </div>

      {blockFormOpen && (
        <div className="ap-calendar__backdrop">
          <section className="ap-calendar__dialog" role="dialog" aria-modal="true" aria-labelledby="ap-calendar-block-title">
            <div className="ap-calendar__dialog-head">
              <div>
                <h2 id="ap-calendar-block-title">Block time</h2>
                <p>Repeats every week on the selected day.</p>
              </div>
              <button className="ap-calendar__icon-button" type="button" disabled={busy}
                aria-label="Close time block form" onClick={() => setBlockFormOpen(false)}>×</button>
            </div>
            <form className="ap-calendar__form" onSubmit={saveTimeBlock}>
              <label className="ap-calendar__field ap-calendar__field--wide">
                <span>Day of the week</span>
                <select name="weekday" defaultValue={(activeDate.getDay() + 6) % 7} autoFocus>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
              </label>
              <label className="ap-calendar__field">
                <span>Starts</span>
                <input name="start" type="time" defaultValue="09:00" required />
              </label>
              <label className="ap-calendar__field">
                <span>Ends</span>
                <input name="end" type="time" defaultValue="10:00" required />
              </label>
              <label className="ap-calendar__field ap-calendar__field--wide">
                <span>Label <small>Optional</small></span>
                <input name="label" placeholder="Busy" maxLength={100} />
              </label>
              {blockError && <p className="ap-calendar__field--wide" role="alert">{blockError}</p>}
              <div className="ap-calendar__form-actions ap-calendar__field--wide">
                <span />
                <button className="ap-calendar__button ap-calendar__button--quiet" type="button"
                  disabled={busy} onClick={() => setBlockFormOpen(false)}>Cancel</button>
                <button className="ap-calendar__button ap-calendar__button--primary" type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save time block"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {draft && <EventForm busy={busy} error={error} draft={draft} onChange={setDraft} onClose={() => { if (!busy) { setDraft(null); setError(""); } }} onSave={saveEvent} onDelete={deleteEvent} />}
    </div>
  );
}
