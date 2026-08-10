import { describe, expect, it } from "vitest";
import { calculateDateStreaks } from "../src/services/habitEngine.js";

describe("habit streak analysis", () => {
  it("deduplicates same-day events and keeps a streak alive through yesterday", () => {
    expect(
      calculateDateStreaks(
        ["2026-07-20", "2026-07-20", "2026-07-21", "2026-07-22"],
        "2026-07-23"
      )
    ).toEqual({ currentStreak: 3, longestStreak: 3, occurrences: 3 });
  });

  it("separates the longest historical run from the current run", () => {
    expect(
      calculateDateStreaks(
        ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-10", "2026-07-12"],
        "2026-07-14"
      )
    ).toEqual({ currentStreak: 0, longestStreak: 3, occurrences: 5 });
  });

  it("handles an empty history", () => {
    expect(calculateDateStreaks([], "2026-07-24")).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      occurrences: 0
    });
  });
});
