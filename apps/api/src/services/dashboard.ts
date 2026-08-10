import { prisma } from "../lib/prisma.js";
import { getDayRange, getFutureDayBoundary, getRollingDayRange } from "../lib/dateTime.js";
import { getAiDataPolicy } from "./aiPolicy.js";
import { generateRecommendations } from "./recommendations.js";
import { resourceLimits } from "./resourceLimits.js";

const moodScore: Record<string, number> = {
  VERY_LOW: 1,
  LOW: 2,
  OKAY: 3,
  GOOD: 4,
  GREAT: 5
};

export async function getDashboard(userId: string) {
  const now = new Date();
  const policy = await getAiDataPolicy(userId);
  const todayRange = getDayRange(policy.timeZone, now);
  const weekRange = getRollingDayRange(policy.timeZone, 7, now);
  const todayStart = todayRange.start;
  const todayEnd = todayRange.end;
  const upcomingEnd = getFutureDayBoundary(policy.timeZone, 14, now);

  const [
    todayTasks,
    upcomingTasks,
    events,
    activities,
    moodLogs,
    sleepLogs,
    waterAgg,
    completedThisWeek,
    activeTasks,
    habits,
    recommendations,
    latestInteraction
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        dueDate: { gte: todayStart, lt: todayEnd },
        status: { not: "COMPLETED" }
      },
      include: { subtasks: { orderBy: { order: "asc" }, take: resourceLimits.subtasksPerTask } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { id: "asc" }],
      take: resourceLimits.dashboardTasks + 1
    }),
    prisma.task.findMany({
      where: {
        userId,
        dueDate: { gte: todayEnd, lt: upcomingEnd },
        status: { not: "COMPLETED" }
      },
      take: 8,
      orderBy: { dueDate: "asc" }
    }),
    prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: todayStart, lt: upcomingEnd } },
      orderBy: { startAt: "asc" },
      take: 10
    }),
    prisma.activity.findMany({
      where: { userId, occurredAt: { gte: weekRange.start, lt: weekRange.end } },
      orderBy: { occurredAt: "desc" },
      take: 80
    }),
    prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: weekRange.start, lt: weekRange.end } },
      orderBy: { loggedAt: "desc" },
      take: 50
    }),
    prisma.sleepLog.findMany({
      where: { userId, loggedAt: { gte: weekRange.start, lt: weekRange.end } },
      orderBy: { loggedAt: "desc" },
      take: 50
    }),
    prisma.waterLog.aggregate({ where: { userId, loggedAt: { gte: todayStart, lt: todayEnd } }, _sum: { amountMl: true } }),
    prisma.task.count({
      where: { userId, status: "COMPLETED", completedAt: { gte: weekRange.start, lt: weekRange.end } }
    }),
    prisma.task.count({ where: { userId, status: { not: "COMPLETED" } } }),
    prisma.habit.findMany({ where: { userId, active: true }, orderBy: { updatedAt: "desc" }, take: 6 }),
    generateRecommendations(userId),
    policy.canUseSensitiveContext
      ? prisma.aIInteraction.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } })
      : Promise.resolve(null)
  ]);

  const weeklyLifeMinutes = activities.reduce((sum, activity) => sum + activity.minutes, 0);
  const fitnessMinutes = activities.filter((activity) => activity.category === "FITNESS").reduce((sum, activity) => sum + activity.minutes, 0);
  const socialCount = activities.filter((activity) => activity.category === "SOCIAL").length;
  const foodCount = activities.filter((activity) => isFoodActivity(activity.title, activity.notes)).length;
  const averageMood = moodLogs.length
    ? Number((moodLogs.reduce((sum, log) => sum + (moodScore[log.mood] ?? 3), 0) / moodLogs.length).toFixed(1))
    : null;
  const averageSleep = sleepLogs.length
    ? Number((sleepLogs.reduce((sum, log) => sum + log.hours, 0) / sleepLogs.length).toFixed(1))
    : null;
  const waterTodayMl = waterAgg._sum.amountMl ?? 0;
  const productivityScore = Math.min(
    100,
    Math.round(completedThisWeek * 9 + weeklyLifeMinutes / 18 + (waterTodayMl >= 1800 ? 12 : 0) + (averageSleep ?? 0) * 3 + socialCount * 3)
  );
  const streak = Math.max(0, ...habits.map((habit) => habit.streak), completedThisWeek > 0 ? 1 : 0);

  const todayTasksHasMore = todayTasks.length > resourceLimits.dashboardTasks;

  return {
    today: now.toISOString(),
    todayTasks: todayTasks.slice(0, resourceLimits.dashboardTasks),
    todayTasksHasMore,
    upcomingTasks,
    calendarEvents: events,
    lifeSummary: {
      weeklyMinutes: weeklyLifeMinutes,
      fitnessMinutes,
      socialCount,
      foodCount,
      recent: activities.slice(0, 8)
    },
    moodSummary: {
      averageMood,
      latest: moodLogs[0] ?? null
    },
    sleepSummary: {
      averageHours: averageSleep,
      latest: sleepLogs[0] ?? null
    },
    waterIntake: {
      todayMl: waterTodayMl,
      targetMl: 2200
    },
    productivityScore,
    streak,
    weeklyStatistics: {
      completedTasks: completedThisWeek,
      activeTasks,
      activeMinutes: weeklyLifeMinutes,
      moodLogs: moodLogs.length,
      sleepLogs: sleepLogs.length
    },
    habits,
    recommendations,
    aiCompanion: {
      latestMessage: latestInteraction ? normalizeLegacyCompanionLabel(latestInteraction.response) : null,
      prompt: "Ask Planora to plan the day, turn a thought into a task, or explain a recommendation."
    },
    quickActions: [
      { label: "New task", href: "/tasks", icon: "check" },
      { label: "Log water", href: "/wellbeing", icon: "droplet" },
      { label: "Log life", href: "/life", icon: "heart" },
      { label: "Add event", href: "/calendar", icon: "calendar" }
    ]
  };
}

function normalizeLegacyCompanionLabel(value: string) {
  return value.replace(/\bPlanora Mini\b/gi, "Planora");
}

function isFoodActivity(title: string, notes: string | null) {
  return /\b(ate|food|meal|breakfast|lunch|dinner|snack|pizza|burger|rice|chicken|salad|protein|coffee|drink)\b/i.test(
    `${title} ${notes ?? ""}`
  );
}
