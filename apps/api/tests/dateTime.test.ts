import { describe, expect, it } from "vitest";
import {
  getDayRange,
  getLocalDateTimeForDayOffset,
  getMonthRange,
  isValidTimeZone,
  localDateKey,
  normalizeTimeZone
} from "../src/lib/dateTime.js";

describe("timezone-aware date helpers", () => {
  it("uses the user's local midnight instead of the server timezone", () => {
    const now = new Date("2026-07-20T18:30:00.000Z");
    const range = getDayRange("Asia/Kuala_Lumpur", now);

    expect(range.start.toISOString()).toBe("2026-07-20T16:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-21T16:00:00.000Z");
    expect(localDateKey(now, "Asia/Kuala_Lumpur")).toBe("2026-07-21");
  });

  it("builds month boundaries in the requested timezone", () => {
    const range = getMonthRange("2026-07", "America/New_York");
    expect(range.start.toISOString()).toBe("2026-07-01T04:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-01T04:00:00.000Z");
  });

  it("schedules tomorrow at a local wall-clock time", () => {
    const now = new Date("2026-07-20T02:00:00.000Z");
    const due = getLocalDateTimeForDayOffset("Asia/Kuala_Lumpur", 1, 12, 0, now);
    expect(due.toISOString()).toBe("2026-07-21T04:00:00.000Z");
  });

  it("rejects invalid IANA zones and falls back only in internal normalization", () => {
    expect(isValidTimeZone("Asia/Kuala_Lumpur")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(normalizeTimeZone("Mars/Olympus")).toBe("UTC");
  });
});
