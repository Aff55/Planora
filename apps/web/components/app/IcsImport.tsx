"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "../ui/controls";
import { Group } from "../ui/surfaces";
import { Banner } from "../ui/feedback";
import { apiRequest, toMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { IMPORT_EVENT_TYPE, parseIcs, type ParsedIcsEvent } from "../../lib/ics";

/**
 * Calendar import.
 *
 * Parsing is local, and nothing is written until the mapping below is
 * confirmed. Creation goes through the existing `POST /calendar` endpoint, one
 * event at a time, so quotas and validation apply exactly as they do to a
 * manually created event. Failures are counted and reported rather than
 * swallowed.
 */
export function IcsImport({ onImported }: { onImported: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [events, setEvents] = useState<ParsedIcsEvent[]>([]);
  const [skipped, setSkipped] = useState<Array<{ summary: string; reason: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const parsed = parseIcs(text);
      setEvents(parsed.events);
      setSkipped(parsed.skipped);
      setSelected(new Set(parsed.events.map((event) => event.id)));
      if (parsed.events.length === 0) setError("No readable events in that file.");
    } catch {
      setError("That file could not be read.");
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmImport() {
    const chosen = events.filter((event) => selected.has(event.id));
    if (chosen.length === 0) return;

    setImporting(true);
    setError(null);
    let created = 0;
    const failures: string[] = [];

    for (const event of chosen) {
      try {
        await apiRequest("/calendar", {
          method: "POST",
          body: {
            title: event.title,
            description: event.description,
            type: IMPORT_EVENT_TYPE,
            startAt: event.startAt,
            endAt: event.endAt
          }
        });
        created += 1;
      } catch (cause) {
        failures.push(`${event.title}: ${toMessage(cause)}`);
      }
    }

    setImporting(false);
    setEvents([]);
    setSelected(new Set());
    setResult(
      failures.length === 0
        ? `Imported ${created} event${created === 1 ? "" : "s"}.`
        : `Imported ${created}, failed ${failures.length}. First failure — ${failures[0]}`
    );
    await onImported();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".ics,text/calendar"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
            event.target.value = "";
          }}
        />
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          <FileUp className="size-4" aria-hidden="true" />
          Import .ics
        </Button>
        <p className="text-footnote text-muted">Read in your browser. The file is never uploaded.</p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {result && <Banner tone="success">{result}</Banner>}

      {events.length > 0 && (
        <Group>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-callout font-semibold">
              {selected.size} of {events.length} selected
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSelected(new Set(events.map((event) => event.id)))}>
                Select all
              </Button>
              <Button disabled={importing || selected.size === 0} onClick={() => void confirmImport()}>
                {importing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {importing ? "Importing" : "Import selected"}
              </Button>
            </div>
          </div>

          <div className="divide-hairline max-h-80 overflow-y-auto">
            {events.map((event) => (
              <label key={event.id} className="flex cursor-pointer items-start gap-3 px-5 py-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-[color:var(--accent-strong)]"
                  checked={selected.has(event.id)}
                  onChange={() => toggle(event.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-callout font-medium">{event.title}</span>
                  <span className="mt-1 block text-footnote text-muted">
                    {formatDateTime(event.startAt)} → {formatDateTime(event.endAt)}
                    {event.endAssumed && " · end assumed, one hour"}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {skipped.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-footnote font-semibold text-muted">
                {skipped.length} entr{skipped.length === 1 ? "y" : "ies"} skipped
              </p>
              <ul className="mt-2 space-y-1">
                {skipped.slice(0, 5).map((item, index) => (
                  <li key={`${item.summary}-${index}`} className="font-evidence text-micro text-evidence-key">
                    {item.summary} — {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Group>
      )}
    </div>
  );
}
