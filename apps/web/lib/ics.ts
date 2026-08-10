import type { CalendarEventType } from "./types";

/**
 * A deliberately small .ics reader.
 *
 * Only the fields Planora can actually store are read: summary, description,
 * start and end. Anything else in the file is ignored rather than guessed at,
 * and every parsed row is shown for confirmation before a single event is
 * created — an importer that silently writes 400 events is not a feature.
 *
 * Parsing happens entirely in the browser. The file is never uploaded; the
 * confirmed events are created through the ordinary `POST /calendar` endpoint.
 */

export type ParsedIcsEvent = {
  /** Stable within one parse, used as a React key and for selection. */
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  /** Set when the source had no end, so the UI can say the duration was assumed. */
  endAssumed: boolean;
};

export type IcsParseResult = {
  events: ParsedIcsEvent[];
  /** Blocks that could not be read, with the reason, so nothing fails silently. */
  skipped: Array<{ summary: string; reason: string }>;
};

/** Unfolds RFC 5545 line continuations, which begin with a space or tab. */
function unfold(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Handles the three forms that actually appear in exports: UTC (suffix Z),
 * floating local, and date-only. Anything else returns null and is skipped.
 */
function parseIcsDate(value: string, isDateOnly: boolean): Date | null {
  const trimmed = value.trim();

  if (isDateOnly || /^\d{8}$/.test(trimmed)) {
    const match = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
    if (!match) return null;
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(trimmed);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, zulu] = match;

  const date = zulu
    ? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)))
    : new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));

  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseIcs(raw: string): IcsParseResult {
  const lines = unfold(raw);
  const events: ParsedIcsEvent[] = [];
  const skipped: Array<{ summary: string; reason: string }> = [];

  let inEvent = false;
  let summary = "";
  let description = "";
  let start: Date | null = null;
  let end: Date | null = null;
  let index = 0;

  const reset = () => {
    summary = "";
    description = "";
    start = null;
    end = null;
  };

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      reset();
      continue;
    }

    if (line.startsWith("END:VEVENT")) {
      inEvent = false;
      const title = summary.trim();
      if (!title) {
        skipped.push({ summary: "(untitled)", reason: "No SUMMARY field." });
        continue;
      }
      if (!start) {
        skipped.push({ summary: title, reason: "No readable DTSTART." });
        continue;
      }
      const endAssumed = end === null;
      const resolvedEnd = end ?? new Date(start.getTime() + 60 * 60 * 1000);
      if (resolvedEnd.getTime() < start.getTime()) {
        skipped.push({ summary: title, reason: "End is before start." });
        continue;
      }
      events.push({
        id: `ics-${index++}`,
        title: title.slice(0, 180),
        description: description.trim() ? description.trim().slice(0, 4000) : null,
        startAt: start.toISOString(),
        endAt: resolvedEnd.toISOString(),
        endAssumed
      });
      continue;
    }

    if (!inEvent) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const rawName = line.slice(0, separator);
    const value = line.slice(separator + 1);
    const name = rawName.split(";")[0]?.toUpperCase() ?? "";
    const isDateOnly = /VALUE=DATE(?!-TIME)/i.test(rawName);

    if (name === "SUMMARY") summary = unescapeText(value);
    else if (name === "DESCRIPTION") description = unescapeText(value);
    else if (name === "DTSTART") start = parseIcsDate(value, isDateOnly);
    else if (name === "DTEND") end = parseIcsDate(value, isDateOnly);
  }

  return { events, skipped };
}

/** Imported events are PERSONAL; the calendar's other types carry app meaning. */
export const IMPORT_EVENT_TYPE: CalendarEventType = "PERSONAL";
