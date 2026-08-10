import { prisma } from "../lib/prisma.js";
import { getRollingDayRange, localDateKey } from "../lib/dateTime.js";
import { getAiDataPolicy } from "./aiPolicy.js";

/**
 * Behavioural pattern detection.
 *
 * The habit engine counts frequency: how often something happened and whether
 * the run is unbroken. That answers "how much", never "when", "with what", or
 * "is this changing". This module adds those, using only arithmetic that can be
 * read off the evidence object attached to every result — no learned weights,
 * no embeddings, nothing a user could not check by hand. Transparency here is a
 * product requirement, not an implementation detail.
 */

export type PatternKind = "weekday_rhythm" | "co_occurrence" | "trend" | "lapse" | "time_of_day";

export type DetectedPattern = {
  kind: PatternKind;
  key: string;
  /** One human sentence, safe to show directly in the UI. */
  title: string;
  /** The reasoning, in the user's own numbers. */
  detail: string;
  /** 0..1. Derived from sample size and effect strength, never asserted. */
  confidence: number;
  /** Everything the conclusion was computed from, so it can be audited. */
  evidence: Record<string, unknown>;
};

export type PatternReport = {
  generatedAt: string;
  windowDays: number;
  observedDays: number;
  patterns: DetectedPattern[];
  /** Named checks that ran but found nothing, so absence is explainable. */
  inconclusive: Array<{ key: string; reason: string }>;
};

const WINDOW_DAYS = 60;
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Minimum paired observations before a correlation is reportable at all. */
const MIN_PAIRED_DAYS = 8;
/** Below this absolute Pearson r the relationship is treated as noise. */
const MIN_CORRELATION = 0.45;

const MOOD_SCORE: Record<string, number> = {
  VERY_LOW: 1,
  LOW: 2,
  OKAY: 3,
  GOOD: 4,
  GREAT: 5
};

type DaySeries = Map<string, number>;

export async function getPatternReport(userId: string): Promise<PatternReport> {
  const now = new Date();
  const policy = await getAiDataPolicy(userId);

  if (!policy.canUsePersonalContext) {
    return {
      generatedAt: now.toISOString(),
      windowDays: WINDOW_DAYS,
      observedDays: 0,
      patterns: [],
      inconclusive: [{ key: "personalization", reason: "Personalization is off, so no history was read." }]
    };
  }

  const zone = policy.timeZone;
  const range = getRollingDayRange(zone, WINDOW_DAYS, now);

  const [activities, completedTasks, moodLogs, sleepLogs, waterLogs] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, occurredAt: { gte: range.start, lt: range.end } },
      select: { title: true, notes: true, category: true, minutes: true, occurredAt: true },
      take: 1000
    }),
    prisma.task.findMany({
      where: { userId, completedAt: { gte: range.start, lt: range.end } },
      select: { completedAt: true, category: true },
      take: 1000
    }),
    prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: range.start, lt: range.end } },
      select: { mood: true, stress: true, energy: true, loggedAt: true },
      take: 400
    }),
    prisma.sleepLog.findMany({
      where: { userId, loggedAt: { gte: range.start, lt: range.end } },
      select: { hours: true, loggedAt: true },
      take: 400
    }),
    prisma.waterLog.findMany({
      where: { userId, loggedAt: { gte: range.start, lt: range.end } },
      select: { amountMl: true, loggedAt: true },
      take: 1000
    })
  ]);

  const patterns: DetectedPattern[] = [];
  const inconclusive: Array<{ key: string; reason: string }> = [];

  const activityText = (item: { title: string; notes: string | null }) =>
    `${item.title} ${item.notes ?? ""}`.toLowerCase();

  const fitnessDates = activities
    .filter((item) => item.category === "FITNESS" || /\b(gym|workout|run|walk|cardio|lift|swim|cycle)\b/.test(activityText(item)))
    .map((item) => item.occurredAt);
  const socialDates = activities
    .filter((item) => item.category === "SOCIAL" || /\b(friend|family|call|called|met|social|hangout)\b/.test(activityText(item)))
    .map((item) => item.occurredAt);
  const foodDates = activities
    .filter((item) => /\b(ate|food|meal|breakfast|lunch|dinner|snack)\b/.test(activityText(item)))
    .map((item) => item.occurredAt);
  const taskDates = completedTasks.flatMap((task) => (task.completedAt ? [task.completedAt] : []));

  const groups: Array<{ key: string; label: string; dates: Date[] }> = [
    { key: "movement", label: "Movement", dates: fitnessDates },
    { key: "social", label: "Social contact", dates: socialDates },
    { key: "meals", label: "Meal logging", dates: foodDates },
    { key: "task-completion", label: "Finishing tasks", dates: taskDates }
  ];

  const observedDayKeys = new Set(
    [...activities.map((a) => a.occurredAt), ...taskDates, ...moodLogs.map((m) => m.loggedAt)].map((d) =>
      localDateKey(d, zone)
    )
  );

  for (const group of groups) {
    const rhythm = detectWeekdayRhythm(group.key, group.label, group.dates, zone, now);
    if (rhythm) patterns.push(rhythm);
    else if (group.dates.length < 4) {
      inconclusive.push({ key: `${group.key}.weekday_rhythm`, reason: `Only ${group.dates.length} logs in ${WINDOW_DAYS} days.` });
    }

    const clock = detectTimeOfDay(group.key, group.label, group.dates, zone);
    if (clock) patterns.push(clock);

    const lapse = detectLapse(group.key, group.label, group.dates, zone, now);
    if (lapse) patterns.push(lapse);
  }

  const moodSeries = averageByDay(moodLogs.map((m) => [localDateKey(m.loggedAt, zone), MOOD_SCORE[m.mood] ?? 3]));
  const energySeries = averageByDay(moodLogs.map((m) => [localDateKey(m.loggedAt, zone), m.energy]));
  const stressSeries = averageByDay(moodLogs.map((m) => [localDateKey(m.loggedAt, zone), m.stress]));
  const sleepSeries = averageByDay(sleepLogs.map((s) => [localDateKey(s.loggedAt, zone), s.hours]));
  const waterSeries = sumByDay(waterLogs.map((w) => [localDateKey(w.loggedAt, zone), w.amountMl]));
  const activeMinutesSeries = sumByDay(activities.map((a) => [localDateKey(a.occurredAt, zone), a.minutes]));

  const correlationChecks: Array<{
    key: string;
    left: DaySeries;
    right: DaySeries;
    leftLabel: string;
    rightLabel: string;
    /** Shift the left series forward a day, e.g. last night's sleep against today's mood. */
    lagDays?: number;
    unit?: string;
  }> = [
    { key: "sleep-mood", left: sleepSeries, right: moodSeries, leftLabel: "sleep", rightLabel: "mood", lagDays: 1, unit: "h" },
    { key: "sleep-energy", left: sleepSeries, right: energySeries, leftLabel: "sleep", rightLabel: "energy", lagDays: 1, unit: "h" },
    { key: "movement-mood", left: activeMinutesSeries, right: moodSeries, leftLabel: "active minutes", rightLabel: "mood", unit: "m" },
    { key: "water-energy", left: waterSeries, right: energySeries, leftLabel: "water", rightLabel: "energy", unit: "ml" },
    { key: "sleep-stress", left: sleepSeries, right: stressSeries, leftLabel: "sleep", rightLabel: "stress", lagDays: 1, unit: "h" }
  ];

  for (const check of correlationChecks) {
    const found = detectCoOccurrence(check);
    if (found) patterns.push(found);
    else {
      const paired = pairSeries(check.left, check.right, check.lagDays ?? 0).length;
      inconclusive.push({
        key: `${check.key}.co_occurrence`,
        reason:
          paired < MIN_PAIRED_DAYS
            ? `Only ${paired} days where both were logged; needs ${MIN_PAIRED_DAYS}.`
            : "No relationship strong enough to report."
      });
    }
  }

  const trendChecks: Array<{ key: string; label: string; series: DaySeries; unit: string; goodDirection: "up" | "down" }> = [
    { key: "sleep", label: "Sleep", series: sleepSeries, unit: "h", goodDirection: "up" },
    { key: "mood", label: "Mood", series: moodSeries, unit: "/5", goodDirection: "up" },
    { key: "stress", label: "Stress", series: stressSeries, unit: "/10", goodDirection: "down" },
    { key: "active-minutes", label: "Active minutes", series: activeMinutesSeries, unit: "m", goodDirection: "up" }
  ];

  for (const check of trendChecks) {
    const trend = detectTrend(check.key, check.label, check.series, check.unit, check.goodDirection, zone, now);
    if (trend) {
      patterns.push(trend);
    } else {
      // Say why a trend is absent, so an empty result is explainable rather
      // than looking like the check never ran.
      inconclusive.push({
        key: `${check.key}.trend`,
        reason:
          check.series.size === 0
            ? `Nothing logged for ${check.label.toLowerCase()} in the window.`
            : `Not enough weeks with repeated ${check.label.toLowerCase()} logs, or the direction is inconsistent.`
      });
    }
  }

  patterns.sort((a, b) => b.confidence - a.confidence);

  return {
    generatedAt: now.toISOString(),
    windowDays: WINDOW_DAYS,
    observedDays: observedDayKeys.size,
    patterns,
    inconclusive
  };
}

/* -------------------------------------------------------------------------- */
/* Detectors                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Finds weekdays a behaviour concentrates on. Uses a rate rather than a raw
 * count, because a 60-day window contains a different number of each weekday
 * depending on where it starts.
 */
function detectWeekdayRhythm(
  key: string,
  label: string,
  dates: Date[],
  zone: string,
  now: Date
): DetectedPattern | null {
  if (dates.length < 4) return null;

  const uniqueDayKeys = new Set(dates.map((date) => localDateKey(date, zone)));
  const perWeekday = new Array(7).fill(0) as number[];
  for (const dayKey of uniqueDayKeys) {
    const index = weekdayOf(dayKey);
    perWeekday[index] = (perWeekday[index] ?? 0) + 1;
  }

  const weekdayOpportunities = countWeekdayOccurrences(zone, now, WINDOW_DAYS);
  const rates = perWeekday.map((count, index) => (weekdayOpportunities[index] ? count / weekdayOpportunities[index]! : 0));

  const ranked = rates
    .map((rate, index) => ({ index, rate, count: perWeekday[index]! }))
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.rate - a.rate);

  if (ranked.length === 0) return null;

  const overallRate = uniqueDayKeys.size / WINDOW_DAYS;
  const top = ranked.filter((entry) => entry.rate >= 0.5 && entry.rate >= overallRate * 1.6).slice(0, 3);
  if (top.length === 0) return null;

  const names = top.map((entry) => WEEKDAY_NAMES[entry.index]!);
  const strength = Math.min(1, top[0]!.rate / Math.max(overallRate, 0.01) / 3);
  const sampleWeight = Math.min(1, uniqueDayKeys.size / 12);

  return {
    kind: "weekday_rhythm",
    key: `${key}.weekday_rhythm`,
    title: `${label} clusters on ${formatList(names)}.`,
    detail: `${Math.round(top[0]!.rate * 100)}% of ${names[0]}s had ${label.toLowerCase()}, against ${Math.round(overallRate * 100)}% of all days.`,
    confidence: round2(Math.min(0.9, strength * 0.6 + sampleWeight * 0.4)),
    evidence: {
      perWeekdayDays: Object.fromEntries(WEEKDAY_NAMES.map((name, index) => [name, perWeekday[index]])),
      weekdayOpportunities: Object.fromEntries(WEEKDAY_NAMES.map((name, index) => [name, weekdayOpportunities[index]])),
      overallRate: round2(overallRate),
      windowDays: WINDOW_DAYS
    }
  };
}

/** Which part of the day a behaviour lands in, when it is strongly concentrated. */
function detectTimeOfDay(key: string, label: string, dates: Date[], zone: string): DetectedPattern | null {
  if (dates.length < 5) return null;

  const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const date of dates) {
    const hour = zonedHour(date, zone);
    if (hour >= 5 && hour < 12) buckets.morning += 1;
    else if (hour >= 12 && hour < 17) buckets.afternoon += 1;
    else if (hour >= 17 && hour < 22) buckets.evening += 1;
    else buckets.night += 1;
  }

  const entries = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
  const [topName, topCount] = entries[0]!;
  const share = topCount / dates.length;
  if (share < 0.6) return null;

  return {
    kind: "time_of_day",
    key: `${key}.time_of_day`,
    title: `${label} usually happens in the ${topName}.`,
    detail: `${topCount} of ${dates.length} logs fell in the ${topName}.`,
    confidence: round2(Math.min(0.9, share * 0.7 + Math.min(dates.length / 20, 1) * 0.3)),
    evidence: { buckets, totalLogs: dates.length, share: round2(share) }
  };
}

/**
 * Something that used to be regular and has stopped. Compares the gap since the
 * last occurrence against the user's own typical gap, so it adapts to whether
 * they log daily or twice a week.
 */
function detectLapse(key: string, label: string, dates: Date[], zone: string, now: Date): DetectedPattern | null {
  const dayKeys = [...new Set(dates.map((date) => localDateKey(date, zone)))].sort();
  if (dayKeys.length < 4) return null;

  const gaps: number[] = [];
  for (let index = 1; index < dayKeys.length; index += 1) {
    gaps.push(dayNumber(dayKeys[index]!) - dayNumber(dayKeys[index - 1]!));
  }
  const typicalGap = median(gaps);
  if (typicalGap <= 0) return null;

  const daysSince = dayNumber(localDateKey(now, zone)) - dayNumber(dayKeys[dayKeys.length - 1]!);
  if (daysSince < Math.max(3, typicalGap * 2.5)) return null;

  return {
    kind: "lapse",
    key: `${key}.lapse`,
    title: `${label} has paused.`,
    detail: `Normally about every ${formatDays(typicalGap)}, but nothing for ${daysSince} days.`,
    confidence: round2(Math.min(0.85, 0.35 + Math.min(dayKeys.length / 15, 1) * 0.5)),
    evidence: { typicalGapDays: typicalGap, daysSinceLast: daysSince, loggedDays: dayKeys.length }
  };
}

/**
 * Pearson correlation between two daily series, optionally lagged so that, for
 * example, last night's sleep is compared with today's mood.
 *
 * Deliberately reported as co-occurrence rather than cause. Two logs moving
 * together in 60 days of self-reported data is not evidence of a mechanism, and
 * the wording must not imply otherwise.
 */
function detectCoOccurrence(check: {
  key: string;
  left: DaySeries;
  right: DaySeries;
  leftLabel: string;
  rightLabel: string;
  lagDays?: number;
  unit?: string;
}): DetectedPattern | null {
  const paired = pairSeries(check.left, check.right, check.lagDays ?? 0);
  if (paired.length < MIN_PAIRED_DAYS) return null;

  const r = pearson(paired.map((p) => p[0]), paired.map((p) => p[1]));
  if (!Number.isFinite(r) || Math.abs(r) < MIN_CORRELATION) return null;

  const direction = r > 0 ? "higher" : "lower";
  const lagText = check.lagDays ? "the night before " : "";

  const lows = paired.filter((p) => p[0] <= median(paired.map((q) => q[0])));
  const highs = paired.filter((p) => p[0] > median(paired.map((q) => q[0])));
  const lowAvg = average(lows.map((p) => p[1]));
  const highAvg = average(highs.map((p) => p[1]));

  return {
    kind: "co_occurrence",
    key: `${check.key}.co_occurrence`,
    title: `More ${check.leftLabel} ${lagText}tends to coincide with ${direction} ${check.rightLabel}.`,
    detail: `On your higher-${check.leftLabel} days, ${check.rightLabel} averaged ${round2(highAvg)} against ${round2(lowAvg)} on lower ones, across ${paired.length} days.`,
    confidence: round2(Math.min(0.85, Math.abs(r) * 0.6 + Math.min(paired.length / 30, 1) * 0.35)),
    evidence: {
      pearsonR: round2(r),
      pairedDays: paired.length,
      lagDays: check.lagDays ?? 0,
      averageWhenHigh: round2(highAvg),
      averageWhenLow: round2(lowAvg),
      note: "Association only. This is not evidence of cause."
    }
  };
}

/** Least-squares slope over weekly averages, so day-to-day noise does not dominate. */
function detectTrend(
  key: string,
  label: string,
  series: DaySeries,
  unit: string,
  goodDirection: "up" | "down",
  zone: string,
  now: Date
): DetectedPattern | null {
  const weeks = new Map<number, number[]>();
  const todayNumber = dayNumber(localDateKey(now, zone));

  for (const [dayKey, value] of series) {
    const weeksAgo = Math.floor((todayNumber - dayNumber(dayKey)) / 7);
    if (weeksAgo < 0 || weeksAgo > 7) continue;
    const bucket = weeks.get(weeksAgo) ?? [];
    bucket.push(value);
    weeks.set(weeksAgo, bucket);
  }

  const points = [...weeks.entries()]
    .filter(([, values]) => values.length >= 2)
    .map(([weeksAgo, values]) => [-weeksAgo, average(values)] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  if (points.length < 3) return null;

  const slope = linearSlope(points);
  const values = points.map((p) => p[1]);
  const spread = Math.max(...values) - Math.min(...values);
  if (spread === 0) return null;

  // Judge a trend by how well a straight line explains the weekly averages, and
  // by whether the weekly change is large enough to matter next to the typical
  // value. An earlier version compared the per-week slope against the total
  // spread, which is self-defeating: for a clean linear trend the spread grows
  // with the number of weeks, so the longer and tidier the trend, the more
  // likely it was discarded.
  const fit = rSquared(points, slope);
  const magnitude = Math.abs(average(values)) || 1;
  const relativeSlope = Math.abs(slope) / magnitude;
  if (fit < 0.5 || relativeSlope < 0.02) return null;

  const rising = slope > 0;
  const improving = goodDirection === "up" ? rising : !rising;

  return {
    kind: "trend",
    key: `${key}.trend`,
    title: `${label} is ${rising ? "rising" : "falling"} week over week.`,
    detail: `About ${round2(Math.abs(slope))}${unit} per week across ${points.length} weeks. ${improving ? "Moving the way you would want." : "Worth a look."}`,
    confidence: round2(Math.min(0.85, Math.min(points.length / 6, 1) * 0.4 + fit * 0.45)),
    evidence: {
      weeklyAverages: points.map(([weeksAgo, value]) => ({ weeksAgo: -weeksAgo, average: round2(value) })),
      slopePerWeek: round2(slope),
      rSquared: round2(fit),
      improving
    }
  };
}

/* -------------------------------------------------------------------------- */
/* Maths and date helpers                                                      */
/* -------------------------------------------------------------------------- */

function averageByDay(entries: Array<[string, number]>): DaySeries {
  const buckets = new Map<string, number[]>();
  for (const [day, value] of entries) {
    const bucket = buckets.get(day) ?? [];
    bucket.push(value);
    buckets.set(day, bucket);
  }
  return new Map([...buckets].map(([day, values]) => [day, average(values)]));
}

function sumByDay(entries: Array<[string, number]>): DaySeries {
  const result: DaySeries = new Map();
  for (const [day, value] of entries) {
    result.set(day, (result.get(day) ?? 0) + value);
  }
  return result;
}

/** Aligns two day-keyed series, optionally shifting the left one back by `lagDays`. */
function pairSeries(left: DaySeries, right: DaySeries, lagDays: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (const [dayKey, rightValue] of right) {
    const sourceKey = lagDays ? dayKeyFromNumber(dayNumber(dayKey) - lagDays) : dayKey;
    const leftValue = left.get(sourceKey);
    if (leftValue !== undefined) pairs.push([leftValue, rightValue]);
  }
  return pairs;
}

export function pearson(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n === 0 || n !== ys.length) return Number.NaN;
  const meanX = average(xs);
  const meanY = average(ys);
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (let index = 0; index < n; index += 1) {
    const dx = xs[index]! - meanX;
    const dy = ys[index]! - meanY;
    covariance += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }
  const denominator = Math.sqrt(varianceX * varianceY);
  return denominator === 0 ? Number.NaN : covariance / denominator;
}

/** Share of the variance in the weekly averages explained by the fitted line. */
export function rSquared(points: Array<[number, number]>, slope: number) {
  if (points.length < 2) return 0;
  const meanX = average(points.map((p) => p[0]));
  const meanY = average(points.map((p) => p[1]));
  const intercept = meanY - slope * meanX;
  let residual = 0;
  let total = 0;
  for (const [x, y] of points) {
    residual += (y - (slope * x + intercept)) ** 2;
    total += (y - meanY) ** 2;
  }
  return total === 0 ? 0 : Math.max(0, 1 - residual / total);
}

function linearSlope(points: Array<[number, number]>) {
  const meanX = average(points.map((p) => p[0]));
  const meanY = average(points.map((p) => p[1]));
  let numerator = 0;
  let denominator = 0;
  for (const [x, y] of points) {
    numerator += (x - meanX) * (y - meanY);
    denominator += (x - meanX) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function dayNumber(dateKey: string) {
  return Math.floor(new Date(`${dateKey}T00:00:00Z`).getTime() / 86_400_000);
}

function dayKeyFromNumber(value: number) {
  return new Date(value * 86_400_000).toISOString().slice(0, 10);
}

function weekdayOf(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

/** How many of each weekday fall inside the lookback window. */
function countWeekdayOccurrences(zone: string, now: Date, windowDays: number) {
  const counts = new Array(7).fill(0) as number[];
  const today = dayNumber(localDateKey(now, zone));
  for (let offset = 0; offset < windowDays; offset += 1) {
    const index = weekdayOf(dayKeyFromNumber(today - offset));
    counts[index] = (counts[index] ?? 0) + 1;
  }
  return counts;
}

function zonedHour(date: Date, zone: string) {
  const formatted = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hour12: false }).format(date);
  const parsed = Number(formatted);
  return Number.isFinite(parsed) ? parsed % 24 : date.getHours();
}

function formatList(items: string[]) {
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function formatDays(days: number) {
  if (days <= 1.2) return "day";
  if (days <= 2.5) return "2 days";
  if (days <= 4) return "3 days";
  return `${Math.round(days)} days`;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}
