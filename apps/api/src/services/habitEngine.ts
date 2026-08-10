import { prisma } from "../lib/prisma.js";
import { getRollingDayRange, localDateKey } from "../lib/dateTime.js";
import { KeyedSingleflight } from "../lib/singleflight.js";

type HabitSignal = {
  key: string;
  title: string;
  category: "WORK" | "WELLBEING" | "PERSONAL" | "FITNESS" | "SOCIAL";
  dates: Date[];
};

const habitRefresh = new KeyedSingleflight();

export function refreshInferredHabits(userId: string, timeZone: string) {
  return habitRefresh.run(userId, () => refreshInferredHabitsOnce(userId, timeZone));
}

async function refreshInferredHabitsOnce(userId: string, timeZone: string) {
  const now = new Date();
  const range = getRollingDayRange(timeZone, 60, now);
  const [activities, completedTasks, moodLogs, sleepLogs, waterLogs] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, occurredAt: { gte: range.start, lt: range.end } },
      select: { title: true, notes: true, category: true, occurredAt: true },
      take: 500
    }),
    prisma.task.findMany({
      where: { userId, completedAt: { gte: range.start, lt: range.end } },
      select: { completedAt: true },
      take: 500
    }),
    prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: range.start, lt: range.end } },
      select: { loggedAt: true },
      take: 200
    }),
    prisma.sleepLog.findMany({
      where: { userId, loggedAt: { gte: range.start, lt: range.end } },
      select: { loggedAt: true },
      take: 200
    }),
    prisma.waterLog.findMany({
      where: { userId, loggedAt: { gte: range.start, lt: range.end } },
      select: { loggedAt: true },
      take: 500
    })
  ]);

  const activityDates = (matcher: (text: string, category: string) => boolean) =>
    activities
      .filter((activity) => matcher(`${activity.title} ${activity.notes ?? ""}`.toLowerCase(), activity.category))
      .map((activity) => activity.occurredAt);

  const signals: HabitSignal[] = [
    {
      key: "movement",
      title: "Regular movement",
      category: "FITNESS",
      dates: activityDates(
        (text, category) =>
          category === "FITNESS" || /\b(gym|workout|walk|run|cardio|chest|legs|push|pull|lift|cycle|swim)\b/i.test(text)
      )
    },
    {
      key: "meal-logging",
      title: "Meal awareness",
      category: "WELLBEING",
      dates: activityDates((text) =>
        /\b(ate|food|meal|breakfast|lunch|dinner|snack|pizza|burger|rice|chicken|salad|coffee)\b/i.test(text)
      )
    },
    {
      key: "social-connection",
      title: "Social connection",
      category: "SOCIAL",
      dates: activityDates(
        (text, category) => category === "SOCIAL" || /\b(friend|family|call|called|text|met|social|hangout|date)\b/i.test(text)
      )
    },
    {
      key: "outdoor-time",
      title: "Outdoor time",
      category: "PERSONAL",
      dates: activityDates((text) => /\b(outside|outdoors|park|fresh air|sun|went out|errand|walk)\b/i.test(text))
    },
    {
      key: "task-follow-through",
      title: "Task follow-through",
      category: "WORK",
      dates: completedTasks.flatMap((task) => (task.completedAt ? [task.completedAt] : []))
    },
    {
      key: "wellbeing-checkin",
      title: "Wellbeing check-ins",
      category: "WELLBEING",
      dates: [
        ...moodLogs.map((item) => item.loggedAt),
        ...sleepLogs.map((item) => item.loggedAt),
        ...waterLogs.map((item) => item.loggedAt)
      ]
    }
  ];

  const detectedKeys: string[] = [];
  for (const signal of signals) {
    const dateKeys = signal.dates.map((date) => localDateKey(date, timeZone));
    const streaks = calculateDateStreaks(dateKeys, localDateKey(now, timeZone));
    if (streaks.occurrences < 2) continue;
    detectedKeys.push(signal.key);
    const confidence = Number(
      Math.min(0.95, 0.2 + Math.min(streaks.occurrences / 14, 1) * 0.55 + Math.min(streaks.longestStreak / 7, 1) * 0.2).toFixed(2)
    );
    const lastObservedAt = latestDate(signal.dates);

    await prisma.habit.upsert({
      where: { userId_key: { userId, key: signal.key } },
      create: {
        userId,
        key: signal.key,
        title: signal.title,
        category: signal.category,
        source: "inferred",
        cadence: "daily",
        streak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        occurrences: streaks.occurrences,
        confidence,
        lastDoneAt: lastObservedAt,
        lastObservedAt,
        active: true
      },
      update: {
        title: signal.title,
        category: signal.category,
        streak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        occurrences: streaks.occurrences,
        confidence,
        lastDoneAt: lastObservedAt,
        lastObservedAt,
        active: true
      }
    });
  }

  await prisma.habit.updateMany({
    where: {
      userId,
      source: "inferred",
      active: true,
      ...(detectedKeys.length ? { key: { notIn: detectedKeys } } : {})
    },
    data: { active: false, streak: 0 }
  });

  return prisma.habit.findMany({
    where: { userId, source: "inferred", active: true },
    orderBy: [{ confidence: "desc" }, { streak: "desc" }]
  });
}

export function calculateDateStreaks(dateKeys: string[], todayKey: string) {
  const uniqueDays = [...new Set(dateKeys)].sort();
  if (uniqueDays.length === 0) return { currentStreak: 0, longestStreak: 0, occurrences: 0 };

  let longestStreak = 1;
  let run = 1;
  for (let index = 1; index < uniqueDays.length; index += 1) {
    if (dayNumber(uniqueDays[index]!) - dayNumber(uniqueDays[index - 1]!) === 1) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 1;
    }
  }

  const latest = uniqueDays[uniqueDays.length - 1]!;
  const latestAge = dayNumber(todayKey) - dayNumber(latest);
  let currentStreak = latestAge <= 1 ? 1 : 0;
  if (currentStreak) {
    for (let index = uniqueDays.length - 1; index > 0; index -= 1) {
      if (dayNumber(uniqueDays[index]!) - dayNumber(uniqueDays[index - 1]!) !== 1) break;
      currentStreak += 1;
    }
  }

  return { currentStreak, longestStreak, occurrences: uniqueDays.length };
}

function dayNumber(dateKey: string) {
  return Math.floor(new Date(`${dateKey}T00:00:00Z`).getTime() / 86_400_000);
}

function latestDate(dates: Date[]) {
  return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
}
