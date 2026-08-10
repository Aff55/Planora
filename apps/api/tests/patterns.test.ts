import { describe, expect, it } from "vitest";
import { median, pearson, rSquared } from "../src/services/patterns.js";

describe("pattern detection maths", () => {
  it("computes Pearson correlation for a perfect positive relationship", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 5);
  });

  it("computes Pearson correlation for a perfect negative relationship", () => {
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 5);
  });

  it("returns NaN when a series has no variance, rather than dividing by zero", () => {
    expect(Number.isNaN(pearson([5, 5, 5], [1, 2, 3]))).toBe(true);
  });

  it("returns NaN for mismatched or empty input instead of throwing", () => {
    expect(Number.isNaN(pearson([], []))).toBe(true);
    expect(Number.isNaN(pearson([1, 2], [1]))).toBe(true);
  });

  it("takes the median of odd and even length samples", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("trend goodness of fit", () => {
  it("reports a perfect straight line as fully explained", () => {
    const points: Array<[number, number]> = [[-3, 9], [-2, 7], [-1, 5], [0, 3]];
    expect(rSquared(points, -2)).toBeCloseTo(1, 5);
  });

  it("accepts a long clean decline that the old spread-based guard rejected", () => {
    // Eight weekly averages falling 9 -> 3. The previous rule compared the
    // per-week slope against the total spread, so this was discarded.
    const points: Array<[number, number]> = Array.from({ length: 8 }, (_, index) => {
      const weeksAgo = 7 - index;
      return [-weeksAgo, 9 - ((7 - weeksAgo) / 7) * 6] as [number, number];
    });
    const slope = (points[7]![1] - points[0]![1]) / (points[7]![0] - points[0]![0]);
    const fit = rSquared(points, slope);
    const magnitude = Math.abs(points.reduce((sum, p) => sum + p[1], 0) / points.length);
    expect(fit).toBeGreaterThanOrEqual(0.5);
    expect(Math.abs(slope) / magnitude).toBeGreaterThanOrEqual(0.02);
  });

  it("rejects pure noise", () => {
    const points: Array<[number, number]> = [[-3, 5], [-2, 1], [-1, 6], [0, 2]];
    expect(rSquared(points, 0.1)).toBeLessThan(0.5);
  });

  it("returns 0 when every value is identical", () => {
    expect(rSquared([[-2, 4], [-1, 4], [0, 4]], 0)).toBe(0);
  });
});
