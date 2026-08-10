"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { calendarEventTypes } from "@planora/shared";
import { PageHeader } from "../../../components/app/PageHeader";
import { IcsImport } from "../../../components/app/IcsImport";
import { Group, Section, surface } from "../../../components/ui/surfaces";
import { Button, Field, IconButton, Segmented, Select, inputClass, textareaClass } from "../../../components/ui/controls";
import { Banner, EmptyState, SkeletonRows } from "../../../components/ui/feedback";
import { apiRequest, toMessage } from "../../../lib/api";
import {
  dayKey,
  formatDateTime,
  formatMonth,
  formatTime,
  fromDateTimeLocal,
  label as toLabel,
  monthKey,
  shiftMonth,
  toDateTimeLocal
} from "../../../lib/format";
import { useMessages } from "../../../lib/messages";
import type { CalendarEvent, PageInfo } from "../../../lib/types";

type View = "MONTH" | "WEEK" | "DAY" | "AGENDA";

const views = [
  { value: "MONTH" as const, label: "Month" },
  { value: "WEEK" as const, label: "Week" },
  { value: "DAY" as const, label: "Day" },
  { value: "AGENDA" as const, label: "Agenda" }
];

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Draft = {
  title: string;
  description: string;
  type: string;
  startAt: string;
  endAt: string;
};

function emptyDraft(): Draft {
  const now = new Date();
  return {
    title: "",
    description: "",
    type: "PERSONAL",
    startAt: toDateTimeLocal(now),
    endAt: toDateTimeLocal(new Date(now.getTime() + 60 * 60 * 1000))
  };
}

/** Six weeks from the Sunday on or before the first of the month. */
function buildMonthGrid(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year ?? 1970, (monthNumber ?? 1) - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, key: dayKey(date), inMonth: date.getMonth() === first.getMonth() };
  });
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Overlaps within a single day, computed the same way the API's signal does. */
function overlappingIds(events: CalendarEvent[]): Set<string> {
  const sorted = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const conflicted = new Set<string>();
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (!current || !next) continue;
    if (new Date(next.startAt).getTime() < new Date(current.endAt).getTime()) {
      conflicted.add(current.id);
      conflicted.add(next.id);
    }
  }
  return conflicted;
}

export default function CalendarPage() {
  const { guard } = useMessages();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [view, setView] = useState<View>("MONTH");
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ hasMore: false, nextCursor: null, limit: 40 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const data = await apiRequest<{ events: CalendarEvent[]; pageInfo: PageInfo }>(
          `/calendar?month=${month}&limit=100`,
          { signal }
        );
        if (signal?.aborted) return;
        setEvents(data.events);
        setPageInfo(data.pageInfo);
        setLoadError(null);
      } catch (cause) {
        if (signal?.aborted) return;
        setLoadError(toMessage(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [month]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** A month can exceed the 100-row page, so the cursor has to be usable. */
  async function loadMore() {
    if (!pageInfo.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await apiRequest<{ events: CalendarEvent[]; pageInfo: PageInfo }>(
        `/calendar?month=${month}&limit=100&cursor=${encodeURIComponent(pageInfo.nextCursor)}`
      );
      setEvents((current) => [...current, ...data.events]);
      setPageInfo(data.pageInfo);
    } catch (cause) {
      setLoadError(toMessage(cause));
    } finally {
      setLoadingMore(false);
    }
  }

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dayKey(new Date(event.startAt));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [events]);

  const conflicts = useMemo(() => {
    const all = new Set<string>();
    for (const list of byDay.values()) {
      for (const id of overlappingIds(list)) all.add(id);
    }
    return all;
  }, [byDay]);

  function reset() {
    setDraft(emptyDraft());
    setEditingId(null);
    setComposerOpen(false);
  }

  function edit(event: CalendarEvent) {
    setEditingId(event.id);
    setDraft({
      title: event.title,
      description: event.description ?? "",
      type: event.type,
      startAt: toDateTimeLocal(new Date(event.startAt)),
      endAt: toDateTimeLocal(new Date(event.endAt))
    });
    setComposerOpen(true);
  }

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    const startAt = fromDateTimeLocal(draft.startAt);
    const endAt = fromDateTimeLocal(draft.endAt);
    if (!startAt || !endAt) return;

    await guard(async () => {
      const body = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        type: draft.type,
        startAt,
        endAt
      };
      if (editingId) await apiRequest(`/calendar/${editingId}`, { method: "PUT", body });
      else await apiRequest("/calendar", { method: "POST", body });
      reset();
      await load();
    }, editingId ? "Event updated." : "Event added.");
  }

  async function remove(event: CalendarEvent) {
    if (!window.confirm(`Delete “${event.title}”? This cannot be undone.`)) return;
    await guard(async () => {
      await apiRequest(`/calendar/${event.id}`, { method: "DELETE" });
      await load();
    }, "Event deleted.");
  }

  /**
   * Drag to reschedule. Keeps the time of day and the duration, changing only
   * the date — which is what dropping onto a day cell means. Uses the existing
   * PUT endpoint, so validation and ownership checks are unchanged.
   */
  async function rescheduleTo(eventId: string, target: Date) {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;

    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    const duration = end.getTime() - start.getTime();

    const nextStart = new Date(target);
    nextStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
    if (nextStart.getTime() === start.getTime()) return;
    const nextEnd = new Date(nextStart.getTime() + duration);

    const previous = events;
    setEvents((current) =>
      current.map((item) =>
        item.id === eventId ? { ...item, startAt: nextStart.toISOString(), endAt: nextEnd.toISOString() } : item
      )
    );

    const ok = await guard(async () => {
      await apiRequest(`/calendar/${eventId}`, {
        method: "PUT",
        body: {
          title: event.title,
          description: event.description,
          type: event.type,
          startAt: nextStart.toISOString(),
          endAt: nextEnd.toISOString(),
          taskId: event.taskId
        }
      });
      await load();
    }, "Event moved.");
    if (!ok) setEvents(previous);
  }

  function onDrop(target: Date) {
    return (dropEvent: DragEvent) => {
      dropEvent.preventDefault();
      const id = dropEvent.dataTransfer.getData("text/plain") || dragId;
      setDragId(null);
      if (id) void rescheduleTo(id, target);
    };
  }

  function EventChip({ event, draggable = true }: { event: CalendarEvent; draggable?: boolean }) {
    const conflicted = conflicts.has(event.id);
    return (
      <button
        type="button"
        draggable={draggable}
        onDragStart={(dragEvent) => {
          dragEvent.dataTransfer.setData("text/plain", event.id);
          dragEvent.dataTransfer.effectAllowed = "move";
          setDragId(event.id);
        }}
        onDragEnd={() => setDragId(null)}
        onClick={() => edit(event)}
        title={`${event.title} — ${formatDateTime(event.startAt)}${conflicted ? " (overlaps another event)" : ""}`}
        className={clsx(
          "focus-ring block w-full rounded-sm px-1.5 py-1 text-left transition-colors",
          conflicted ? "bg-caution-wash hover:bg-caution-wash/70" : "bg-accent-wash hover:bg-accent-wash/70",
          dragId === event.id && "opacity-50"
        )}
      >
        <span className="flex items-center gap-1">
          {conflicted && <AlertTriangle className="size-3 shrink-0 text-caution" aria-hidden="true" />}
          <span className={clsx("block truncate text-micro font-medium tracking-normal", conflicted ? "text-caution" : "text-accent-text")}>
            {event.title}
          </span>
        </span>
        <span className="block text-micro tracking-normal text-muted">{formatTime(event.startAt)}</span>
      </button>
    );
  }

  const monthGrid = buildMonthGrid(month);
  const todayKey = dayKey(new Date());
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const agenda = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const dayEvents = byDay.get(dayKey(anchor)) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Calendar"
        description="Drag an event to another day to move it. Overlaps are flagged rather than hidden."
        action={
          <Button onClick={() => (composerOpen ? reset() : setComposerOpen(true))} variant={composerOpen ? "secondary" : "primary"}>
            {composerOpen ? <X className="size-4" aria-hidden="true" /> : <CalendarDays className="size-4" aria-hidden="true" />}
            {composerOpen ? "Close" : "Add event"}
          </Button>
        }
      />

      <div className="space-y-6">
        {composerOpen && (
          <Section title={editingId ? "Edit event" : "New event"}>
            <Group className="enter-sheet">
              <form onSubmit={submit} className="space-y-5 p-5">
                <Field label="Title">
                  {({ id }) => (
                    <input
                      id={id}
                      className={inputClass}
                      value={draft.title}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      maxLength={180}
                      required
                    />
                  )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Type">
                    {({ id }) => (
                      <Select
                        id={id}
                        value={draft.type}
                        onChange={(value) => setDraft({ ...draft, type: value })}
                        options={calendarEventTypes.map((value) => ({ value, label: toLabel(value) }))}
                      />
                    )}
                  </Field>
                  <Field label="Starts">
                    {({ id }) => (
                      <input
                        id={id}
                        className={inputClass}
                        type="datetime-local"
                        value={draft.startAt}
                        onChange={(event) => setDraft({ ...draft, startAt: event.target.value })}
                        required
                      />
                    )}
                  </Field>
                  <Field label="Ends">
                    {({ id }) => (
                      <input
                        id={id}
                        className={inputClass}
                        type="datetime-local"
                        value={draft.endAt}
                        onChange={(event) => setDraft({ ...draft, endAt: event.target.value })}
                        required
                      />
                    )}
                  </Field>
                </div>
                <Field label="Description" hint="Optional.">
                  {({ id, describedBy }) => (
                    <textarea
                      id={id}
                      aria-describedby={describedBy}
                      className={textareaClass}
                      value={draft.description}
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    />
                  )}
                </Field>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={!draft.title.trim()}>
                    {editingId ? "Save event" : "Add event"}
                  </Button>
                  <Button variant="ghost" onClick={reset}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Group>
          </Section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <IconButton
              icon={ChevronLeft}
              label="Previous month"
              onClick={() => {
                const next = shiftMonth(month, -1);
                setMonth(next);
                setAnchor(new Date(`${next}-01T12:00:00`));
              }}
            />
            <p className="min-w-44 px-2 text-center text-callout font-semibold">{formatMonth(month)}</p>
            <IconButton
              icon={ChevronRight}
              label="Next month"
              onClick={() => {
                const next = shiftMonth(month, 1);
                setMonth(next);
                setAnchor(new Date(`${next}-01T12:00:00`));
              }}
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              const now = new Date();
              setMonth(monthKey(now));
              setAnchor(now);
            }}
          >
            Today
          </Button>
          <Segmented className="ml-auto" label="Calendar view" options={views} value={view} onChange={setView} />
        </div>

        {loadError && <Banner tone="error">{loadError}</Banner>}

        {loading ? (
          <SkeletonRows rows={6} />
        ) : events.length === 0 ? (
          <Group>
            <EmptyState
              icon={CalendarDays}
              title="Nothing this month"
              body="Add an event when something belongs on a specific day, or import an .ics file below."
            />
          </Group>
        ) : view === "MONTH" ? (
          <div className="no-scrollbar overflow-x-auto">
            <div className="grid min-w-[44rem] grid-cols-7 gap-1.5">
              {weekdayNames.map((day) => (
                <div key={day} className="pb-1 text-center text-micro font-bold uppercase text-muted">
                  {day}
                </div>
              ))}
              {monthGrid.map((cell) => {
                const items = byDay.get(cell.key) ?? [];
                const isToday = cell.key === todayKey;
                return (
                  <div
                    key={cell.key}
                    onDragOver={(dragEvent) => dragEvent.preventDefault()}
                    onDrop={onDrop(cell.date)}
                    className={clsx(
                      "min-h-28 rounded-md border p-1.5 transition-colors",
                      cell.inMonth ? `${surface}` : "border-transparent bg-sunken/50",
                      dragId && "hover:border-accent"
                    )}
                  >
                    <p
                      className={clsx(
                        "tabular mb-1 grid size-6 place-items-center rounded-full text-micro font-semibold tracking-normal",
                        isToday ? "bg-accent-strong text-white" : cell.inMonth ? "text-ink" : "text-muted"
                      )}
                    >
                      {cell.date.getDate()}
                    </p>
                    <div className="space-y-1">
                      {items.map((event) => (
                        <EventChip key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === "WEEK" ? (
          <div className="no-scrollbar overflow-x-auto">
            <div className="grid min-w-[44rem] grid-cols-7 gap-1.5">
              {weekDays.map((date) => {
                const key = dayKey(date);
                const items = byDay.get(key) ?? [];
                return (
                  <div
                    key={key}
                    onDragOver={(dragEvent) => dragEvent.preventDefault()}
                    onDrop={onDrop(date)}
                    className={clsx("min-h-56 rounded-md border p-2", surface, dragId && "hover:border-accent")}
                  >
                    <p className="mb-2 text-micro font-bold uppercase text-muted">
                      {weekdayNames[date.getDay()]} {date.getDate()}
                    </p>
                    <div className="space-y-1">
                      {items.length === 0 ? (
                        <p className="text-micro tracking-normal text-muted">—</p>
                      ) : (
                        items.map((event) => <EventChip key={event.id} event={event} />)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === "DAY" ? (
          <Group>
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <IconButton
                icon={ChevronLeft}
                label="Previous day"
                onClick={() => setAnchor(new Date(anchor.getTime() - 86_400_000))}
              />
              <p className="text-callout font-semibold">
                {anchor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <IconButton
                icon={ChevronRight}
                label="Next day"
                onClick={() => setAnchor(new Date(anchor.getTime() + 86_400_000))}
              />
            </div>
            {dayEvents.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nothing on this day" body="Use Add event, or drag one here from another view." />
            ) : (
              <div className="divide-hairline">
                {dayEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 break-words text-callout font-medium">
                        {conflicts.has(event.id) && <AlertTriangle className="size-4 shrink-0 text-caution" aria-hidden="true" />}
                        {event.title}
                      </p>
                      <p className="mt-1 text-footnote text-muted">
                        {formatTime(event.startAt)} → {formatTime(event.endAt)} · {toLabel(event.type)}
                        {conflicts.has(event.id) && " · overlaps another event"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconButton icon={Pencil} label={`Edit “${event.title}”`} variant="ghost" onClick={() => edit(event)} />
                      <IconButton icon={Trash2} label={`Delete “${event.title}”`} variant="ghost" onClick={() => void remove(event)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Group>
        ) : (
          <Group className="stagger">
            {agenda.map((event) => (
              <div key={event.id} className="enter-row flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 break-words text-callout font-medium">
                    {conflicts.has(event.id) && <AlertTriangle className="size-4 shrink-0 text-caution" aria-hidden="true" />}
                    {event.title}
                  </p>
                  <p className="mt-1 text-footnote text-muted">
                    {formatDateTime(event.startAt)} · {toLabel(event.type)}
                    {event.taskId && " · linked to a task"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton icon={Pencil} label={`Edit “${event.title}”`} variant="ghost" onClick={() => edit(event)} />
                  <IconButton icon={Trash2} label={`Delete “${event.title}”`} variant="ghost" onClick={() => void remove(event)} />
                </div>
              </div>
            ))}
          </Group>
        )}

        {pageInfo.hasMore && pageInfo.nextCursor && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-footnote text-muted">Showing the first {events.length} events this month.</p>
            <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? "Loading" : "Load more events"}
            </Button>
          </div>
        )}

        <Section title="Import">
          <IcsImport onImported={load} />
        </Section>
      </div>
    </>
  );
}
