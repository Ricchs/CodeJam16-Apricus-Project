import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Calendar.css";
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

function emptyDraft(date = new Date()) {
  const day = dateInputValue(date);
  return {
    id: "",
    title: "",
    date: day,
    startTime: "09:00",
    endTime: "10:00",
    category: "class",
    location: "",
    notes: "",
  };
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
    category: event.category || "personal",
    location: event.location || "",
    notes: event.notes || "",
  };
}

function EventForm({ draft, onChange, onClose, onSave, onDelete }) {
  const update = (field) => (event) => onChange({ ...draft, [field]: event.target.value });
  const submit = (event) => {
    event.preventDefault();
    const start = parseLocalDateTime(draft.date, draft.startTime);
    const end = parseLocalDateTime(draft.date, draft.endTime);
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
          <label className="ap-calendar__field ap-calendar__field--wide">
            <span>Event name</span>
            <input autoFocus required maxLength={100} value={draft.title} onChange={update("title")} placeholder="e.g. ECON 250 lecture" />
          </label>
          <label className="ap-calendar__field">
            <span>Date</span>
            <input required type="date" value={draft.date} onChange={update("date")} />
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
            {draft.id && <button className="ap-calendar__button ap-calendar__button--danger" type="button" onClick={onDelete}>Delete</button>}
            <span />
            <button className="ap-calendar__button ap-calendar__button--quiet" type="button" onClick={onClose}>Cancel</button>
            <button className="ap-calendar__button ap-calendar__button--primary" type="submit">Save event</button>
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
  const [events, setEvents] = useState(() => readSavedEvents(storageKey, initialEvents));
  const [activeDate, setActiveDate] = useState(() => new Date());
  const [view, setView] = useState("week");
  const [enabledCategories, setEnabledCategories] = useState(() => new Set(CALENDAR_CATEGORIES.map((category) => category.id)));
  const [draft, setDraft] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(events)); } catch { /* Storage can be disabled or full. */ }
    onEventsChange?.(events);
  }, [events, storageKey, onEventsChange]);

  const filteredEvents = useMemo(
    () => sortEvents(events.filter((event) => enabledCategories.has(event.category))),
    [events, enabledCategories],
  );
  const eventsByDay = useMemo(() => {
    const grouped = new Map();
    for (const event of filteredEvents) {
      const key = dateKey(new Date(event.start));
      grouped.set(key, [...(grouped.get(key) || []), event]);
    }
    return grouped;
  }, [filteredEvents]);

  const label = view === "month"
    ? monthFormatter.format(activeDate)
    : formatDateRange(startOfWeek(activeDate), addDays(startOfWeek(activeDate), 6));

  const movePeriod = (direction) => {
    setActiveDate((current) => view === "month"
      ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
      : addDays(current, direction * 7));
  };
  const openNewEvent = (date = activeDate) => {
    setActiveDate(date);
    setDraft(emptyDraft(date));
  };
  const openEditEvent = (event) => setDraft(draftFromEvent(event));
  const saveEvent = (event) => {
    setEvents((current) => sortEvents(event.id && current.some((item) => item.id === event.id)
      ? current.map((item) => item.id === event.id ? event : item)
      : [...current, event]));
    setDraft(null);
  };
  const deleteEvent = () => {
    if (!draft?.id) return;
    setEvents((current) => current.filter((event) => event.id !== draft.id));
    setDraft(null);
  };
  const toggleCategory = (id) => {
    setEnabledCategories((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadCalendar = () => {
    const blob = new Blob([exportIcs(events)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "apricus-calendar.ics";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCalendar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const added = importIcs(await file.text());
      if (added.length) setEvents((current) => sortEvents([...current, ...added]));
      else window.alert("No calendar events were found in this file.");
    } catch {
      window.alert("This calendar file could not be read.");
    } finally {
      event.target.value = "";
    }
  };

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
          <button className="ap-calendar__button ap-calendar__button--quiet" type="button" onClick={() => fileInput.current?.click()}>Import .ics</button>
          <button className="ap-calendar__button ap-calendar__button--quiet" type="button" onClick={downloadCalendar}>Export .ics</button>
          <button className="ap-calendar__button ap-calendar__button--primary" type="button" onClick={() => openNewEvent()}>＋ Add event</button>
        </div>
      </header>

      <div className="ap-calendar__layout">
        <aside className="ap-calendar__sidebar" aria-label="Calendar filters">
          <button className="ap-calendar__button ap-calendar__button--primary ap-calendar__sidebar-add" type="button" onClick={() => openNewEvent()}>＋ New event</button>
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
                <span className="ap-calendar__filter-count">{events.filter((event) => event.category === category.id).length}</span>
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
            ? <WeekGrid activeDate={activeDate} eventsByDay={eventsByDay} onDayClick={openNewEvent} onEventClick={openEditEvent} />
            : <MonthGrid activeDate={activeDate} eventsByDay={eventsByDay} onDayClick={openNewEvent} onEventClick={openEditEvent} />}
          <p className="ap-calendar__privacy">Your events are saved in this browser on this device.</p>
        </section>
      </div>

      {draft && <EventForm draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={saveEvent} onDelete={deleteEvent} />}
    </div>
  );
}
