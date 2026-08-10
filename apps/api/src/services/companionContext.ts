import { prisma } from "../lib/prisma.js";
import { getDayRange, getFutureDayBoundary, getRollingDayRange } from "../lib/dateTime.js";
import { getAiDataPolicy } from "./aiPolicy.js";
import { generateRecommendations } from "./recommendations.js";
import { getNeuralEngineStatus } from "./neuralEngine.js";
import { resourceLimits } from "./resourceLimits.js";

type ContextTask = {
  id: string;
  title: string;
  priority: string;
  status: string;
  category: string;
  dueDate: string | null;
  progress: number;
  description: string | null;
  subtasks: Array<{ title: string; completed: boolean }>;
};

type ContextEvent = {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  description: string | null;
};

type ContextActivity = {
  id: string;
  title: string;
  category: string;
  minutes: number;
  occurredAt: string;
  notes: string | null;
};

type ContextRecommendation = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionLabel: string | null;
  actionUrl: string | null;
};

export type CompanionContextSnapshot = {
  generatedAt: string;
  day: {
    todayLabel: string;
    todayStart: string;
    todayEnd: string;
    upcomingEnd: string;
  };
  user: {
    name: string;
    timezone: string;
    aiPersonalization: boolean;
    privacyMode: boolean;
  };
  profile: {
    lifeStage: string | null;
    profession: string | null;
    heightCm: number | null;
    weightKg: number | null;
    activityLevel: string | null;
    interests: string[];
    primaryGoals: string[];
    preferredWakeTime: string | null;
    preferredSleepTime: string | null;
    improvementStyle: string;
  } | null;
  counts: {
    overdueTasks: number;
    todayTasks: number;
    upcomingTasks: number;
    calendarEvents: number;
    todayActivities: number;
    weeklyActivities: number;
    activeRecommendations: number;
    activeHabits: number;
  };
  tasks: {
    overdue: ContextTask[];
    today: ContextTask[];
    upcoming: ContextTask[];
    highPriorityUnscheduled: ContextTask[];
  };
  calendar: {
    today: ContextEvent[];
    upcoming: ContextEvent[];
    conflicts: Array<{ first: string; second: string; startsAt: string }>;
  };
  life: {
    today: ContextActivity[];
    recent: ContextActivity[];
    food: ContextActivity[];
    fitness: ContextActivity[];
    social: ContextActivity[];
    outdoors: ContextActivity[];
    weeklyMinutes: number;
  };
  wellbeing: {
    waterTodayMl: number;
    waterTargetMl: number;
    latestMood: { mood: string; stress: number; energy: number; reflection: string | null; loggedAt: string } | null;
    averageMood: number | null;
    latestSleep: { hours: number; quality: string; notes: string | null; loggedAt: string } | null;
    averageSleepHours: number | null;
  };
  habits: {
    active: Array<{
      title: string;
      cadence: string;
      streak: number;
      longestStreak: number;
      confidence: number;
      source: string;
      lastDoneAt: string | null;
    }>;
    stale: Array<{
      title: string;
      cadence: string;
      streak: number;
      longestStreak: number;
      confidence: number;
      source: string;
      lastDoneAt: string | null;
    }>;
  };
  recommendations: ContextRecommendation[];
  learning: {
    engine: string;
    confidence: number;
    focusWindow: string | null;
    samples: {
      events: number;
      recommendationFeedback: number;
      tasks: number;
      activities: number;
      wellbeingLogs: number;
      activeDays: number;
    };
    engagement: {
      score: number;
      activeDays30: number;
      currentAppStreak: number;
      longestAppStreak: number;
      actions30: number;
      feedbackActions: number;
      readiness: string;
    };
    detectedHabits: Array<{
      key: string;
      title: string;
      streak: number;
      longestStreak: number;
      occurrences: number;
      confidence: number;
      lastObservedAt: string | null;
    }>;
    topSignals: string[];
    recommendationWeights: Record<string, number>;
  };
  recentJournalEntries: Array<{ title: string; bodyPreview: string; mood: string | null; createdAt: string }>;
  recentAI: Array<{ prompt: string; response: string; provider: string; createdAt: string }>;
  signals: string[];
};

const moodScore: Record<string, number> = {
  VERY_LOW: 1,
  LOW: 2,
  OKAY: 3,
  GOOD: 4,
  GREAT: 5
};

export async function getCompanionContextSnapshot(userId: string): Promise<CompanionContextSnapshot> {
  const now = new Date();
  const policy = await getAiDataPolicy(userId);
  const todayRange = getDayRange(policy.timeZone, now);
  const weekRange = getRollingDayRange(policy.timeZone, 7, now);
  const todayStart = todayRange.start;
  const todayEnd = todayRange.end;
  const upcomingEnd = getFutureDayBoundary(policy.timeZone, 30, now);
  const dueSoonEnd = getFutureDayBoundary(policy.timeZone, 4, now);

  const [
    user,
    overdueTasks,
    todayTasks,
    upcomingTasks,
    highPriorityUnscheduled,
    calendarEvents,
    activities,
    moodLogs,
    sleepLogs,
    waterAgg,
    habits,
    recommendations,
    neuralStatus,
    journals,
    recentAI
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { settings: true, personalProfile: true } }),
    prisma.task.findMany({
      where: { userId, dueDate: { lt: todayStart }, status: { not: "COMPLETED" } },
      include: { subtasks: { orderBy: { order: "asc" }, take: resourceLimits.subtasksPerTask } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 12
    }),
    prisma.task.findMany({
      where: { userId, dueDate: { gte: todayStart, lt: todayEnd }, status: { not: "COMPLETED" } },
      include: { subtasks: { orderBy: { order: "asc" }, take: resourceLimits.subtasksPerTask } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 12
    }),
    prisma.task.findMany({
      where: { userId, dueDate: { gte: todayEnd, lt: upcomingEnd }, status: { not: "COMPLETED" } },
      include: { subtasks: { orderBy: { order: "asc" }, take: resourceLimits.subtasksPerTask } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 18
    }),
    prisma.task.findMany({
      where: { userId, dueDate: null, priority: { in: ["HIGH", "URGENT"] }, status: { not: "COMPLETED" } },
      include: { subtasks: { orderBy: { order: "asc" }, take: resourceLimits.subtasksPerTask } },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 8
    }),
    prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: todayStart, lt: upcomingEnd } },
      orderBy: { startAt: "asc" },
      take: 30
    }),
    prisma.activity.findMany({
      where: { userId, occurredAt: { gte: weekRange.start, lt: weekRange.end } },
      orderBy: { occurredAt: "desc" },
      take: 100
    }),
    prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: weekRange.start, lt: weekRange.end } },
      orderBy: { loggedAt: "desc" },
      take: 12
    }),
    prisma.sleepLog.findMany({
      where: { userId, loggedAt: { gte: weekRange.start, lt: weekRange.end } },
      orderBy: { loggedAt: "desc" },
      take: 12
    }),
    prisma.waterLog.aggregate({ where: { userId, loggedAt: { gte: todayStart, lt: todayEnd } }, _sum: { amountMl: true } }),
    prisma.habit.findMany({ where: { userId, active: true }, orderBy: [{ lastDoneAt: "asc" }, { updatedAt: "desc" }], take: 12 }),
    generateRecommendations(userId),
    getNeuralEngineStatus(userId),
    policy.canUseSensitiveContext
      ? prisma.journalEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 4 })
      : Promise.resolve([]),
    policy.canUseSensitiveContext
      ? prisma.aIInteraction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 4 })
      : Promise.resolve([])
  ]);

  const averageMood = moodLogs.length
    ? round1(moodLogs.reduce((sum, log) => sum + (moodScore[log.mood] ?? 3), 0) / moodLogs.length)
    : null;
  const averageSleepHours = sleepLogs.length ? round1(sleepLogs.reduce((sum, log) => sum + log.hours, 0) / sleepLogs.length) : null;
  const waterTodayMl = waterAgg._sum.amountMl ?? 0;
  const mappedEvents = calendarEvents.map((event) => ({
    id: event.id,
    title: event.title,
    type: event.type,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    description: event.description
  }));
  const mappedActivities = activities.map(mapActivity);
  const todayActivities = mappedActivities.filter((activity) => new Date(activity.occurredAt) >= todayStart);
  const staleHabits = habits.filter((habit) => {
    if (!habit.lastDoneAt) return true;
    return (now.getTime() - habit.lastDoneAt.getTime()) / 86_400_000 >= 3;
  });
  const dueSoonTasks = [...todayTasks, ...upcomingTasks].filter((task) => task.dueDate && task.dueDate <= dueSoonEnd);

  const snapshot: CompanionContextSnapshot = {
    generatedAt: now.toISOString(),
    day: {
      todayLabel: now.toLocaleDateString("en-US", {
        timeZone: policy.timeZone,
        weekday: "long",
        month: "short",
        day: "numeric"
      }),
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
      upcomingEnd: upcomingEnd.toISOString()
    },
    user: {
      name: user?.name ?? "Planora user",
      timezone: policy.timeZone,
      aiPersonalization: policy.aiPersonalization,
      privacyMode: policy.privacyMode
    },
    profile:
      user?.personalProfile?.useForPersonalization && policy.canUsePersonalContext
        ? {
            lifeStage: user.personalProfile.lifeStage,
            profession: user.personalProfile.profession,
            heightCm: policy.canUseSensitiveContext ? user.personalProfile.heightCm : null,
            weightKg: policy.canUseSensitiveContext ? user.personalProfile.weightKg : null,
            activityLevel: user.personalProfile.activityLevel,
            interests: user.personalProfile.interests,
            primaryGoals: user.personalProfile.primaryGoals,
            preferredWakeTime: user.personalProfile.preferredWakeTime,
            preferredSleepTime: user.personalProfile.preferredSleepTime,
            improvementStyle: user.personalProfile.improvementStyle
          }
        : null,
    counts: {
      overdueTasks: overdueTasks.length,
      todayTasks: todayTasks.length,
      upcomingTasks: upcomingTasks.length,
      calendarEvents: calendarEvents.length,
      todayActivities: todayActivities.length,
      weeklyActivities: mappedActivities.length,
      activeRecommendations: recommendations.length,
      activeHabits: habits.length
    },
    tasks: {
      overdue: overdueTasks.map(mapTask),
      today: todayTasks.map(mapTask),
      upcoming: upcomingTasks.map(mapTask),
      highPriorityUnscheduled: highPriorityUnscheduled.map(mapTask)
    },
    calendar: {
      today: mappedEvents.filter((event) => new Date(event.startAt) < todayEnd),
      upcoming: mappedEvents.filter((event) => new Date(event.startAt) >= todayEnd),
      conflicts: findCalendarConflicts(mappedEvents)
    },
    life: {
      today: todayActivities,
      recent: mappedActivities.slice(0, 20),
      food: mappedActivities.filter(isFoodActivity),
      fitness: mappedActivities.filter((activity) => activity.category === "FITNESS" || /\b(gym|workout|run|walk|chest|legs|push|pull|cardio)\b/i.test(activityText(activity))),
      social: mappedActivities.filter((activity) => activity.category === "SOCIAL" || /\b(friend|call|text|met|social|family|date|hangout)\b/i.test(activityText(activity))),
      outdoors: mappedActivities.filter((activity) => /\b(outside|outdoors|walk|park|sun|fresh air|went out|errand)\b/i.test(activityText(activity))),
      weeklyMinutes: mappedActivities.reduce((sum, activity) => sum + activity.minutes, 0)
    },
    wellbeing: {
      waterTodayMl,
      waterTargetMl: 2200,
      latestMood: moodLogs[0]
        ? {
            mood: moodLogs[0].mood,
            stress: moodLogs[0].stress,
            energy: moodLogs[0].energy,
            reflection: policy.canUseSensitiveContext ? moodLogs[0].reflection : null,
            loggedAt: moodLogs[0].loggedAt.toISOString()
          }
        : null,
      averageMood,
      latestSleep: sleepLogs[0]
        ? {
            hours: sleepLogs[0].hours,
            quality: sleepLogs[0].quality,
            notes: policy.canUseSensitiveContext ? sleepLogs[0].notes : null,
            loggedAt: sleepLogs[0].loggedAt.toISOString()
          }
        : null,
      averageSleepHours
    },
    habits: {
      active: habits.map((habit) => ({
        title: habit.title,
        cadence: habit.cadence,
        streak: habit.streak,
        longestStreak: habit.longestStreak,
        confidence: habit.confidence,
        source: habit.source,
        lastDoneAt: habit.lastDoneAt?.toISOString() ?? null
      })),
      stale: staleHabits.map((habit) => ({
        title: habit.title,
        cadence: habit.cadence,
        streak: habit.streak,
        longestStreak: habit.longestStreak,
        confidence: habit.confidence,
        source: habit.source,
        lastDoneAt: habit.lastDoneAt?.toISOString() ?? null
      }))
    },
    recommendations: recommendations.map((recommendation) => ({
      id: recommendation.id,
      type: recommendation.type,
      title: recommendation.title,
      body: recommendation.body,
      actionLabel: recommendation.actionLabel,
      actionUrl: recommendation.actionUrl
    })),
    learning: {
      engine: neuralStatus.engine,
      confidence: neuralStatus.confidence,
      focusWindow: neuralStatus.focusWindow
        ? `${neuralStatus.focusWindow.label} (${neuralStatus.focusWindow.averageFocus}/10, ${neuralStatus.focusWindow.sessions} actions)`
        : null,
      samples: neuralStatus.samples,
      engagement: neuralStatus.engagement,
      detectedHabits: neuralStatus.detectedHabits,
      topSignals: neuralStatus.topSignals,
      recommendationWeights: neuralStatus.recommendationWeights
    },
    recentJournalEntries: journals.map((journal) => ({
      title: journal.title,
      bodyPreview: truncate(journal.body, 260),
      mood: journal.mood,
      createdAt: journal.createdAt.toISOString()
    })),
    recentAI: recentAI.map((interaction) => ({
      prompt: truncate(interaction.prompt, 180),
      response: truncate(interaction.response, 260),
      provider: interaction.provider,
      createdAt: interaction.createdAt.toISOString()
    })),
    signals: []
  };

  snapshot.signals = buildSignals(snapshot, dueSoonTasks.length);
  return snapshot;
}

export function summarizeCompanionContext(
  snapshot: CompanionContextSnapshot,
  options: { includePersonal?: boolean; includeSensitive?: boolean } = {}
) {
  if (options.includePersonal === false) {
    return `Today: ${snapshot.day.todayLabel}. Personal context is disabled in settings. Give a general answer and do not infer private facts.`;
  }

  const includeSensitive = options.includeSensitive !== false;
  return [
    `Snapshot generated: ${snapshot.generatedAt}`,
    `Today: ${snapshot.day.todayLabel}. User timezone: ${snapshot.user.timezone}. AI personalization: ${snapshot.user.aiPersonalization ? "on" : "off"}.`,
    snapshot.profile
      ? `User-provided profile: life stage ${friendly(snapshot.profile.lifeStage)}, profession or role ${snapshot.profile.profession ?? "not set"}, activity level ${friendly(snapshot.profile.activityLevel)}, coaching style ${friendly(snapshot.profile.improvementStyle)}, goals ${snapshot.profile.primaryGoals.join(", ") || "not set"}, interests ${snapshot.profile.interests.join(", ") || "not set"}${includeSensitive && snapshot.profile.heightCm ? `, height ${snapshot.profile.heightCm}cm` : ""}${includeSensitive && snapshot.profile.weightKg ? `, weight ${snapshot.profile.weightKg}kg` : ""}. Do not infer diagnoses or worth from these fields.`
      : "User-provided profile: not enabled for personalization.",
    `Counts: ${snapshot.counts.overdueTasks} overdue tasks, ${snapshot.counts.todayTasks} due today, ${snapshot.counts.upcomingTasks} upcoming tasks, ${snapshot.counts.calendarEvents} calendar events, ${snapshot.counts.todayActivities} activities today, ${snapshot.counts.weeklyActivities} activities this week, ${snapshot.counts.activeRecommendations} recommendations.`,
    section("Overdue tasks", snapshot.tasks.overdue.map(formatTask)),
    section("Today tasks", snapshot.tasks.today.map(formatTask)),
    section("Upcoming tasks", snapshot.tasks.upcoming.slice(0, 12).map(formatTask)),
    section("High priority unscheduled tasks", snapshot.tasks.highPriorityUnscheduled.map(formatTask)),
    section("Today calendar", snapshot.calendar.today.map(formatEvent)),
    section("Upcoming calendar", snapshot.calendar.upcoming.slice(0, 12).map(formatEvent)),
    section("Calendar conflicts", snapshot.calendar.conflicts.map((item) => `${item.startsAt}: ${item.first} overlaps ${item.second}`)),
    `Life log: ${snapshot.life.weeklyMinutes} active minutes this week; ${snapshot.life.food.length} food logs; ${snapshot.life.fitness.length} fitness logs; ${snapshot.life.social.length} social logs; ${snapshot.life.outdoors.length} outdoor logs.`,
    section("Today life log", snapshot.life.today.map(formatActivity)),
    section("Recent food", snapshot.life.food.slice(0, 5).map(formatActivity)),
    section("Recent fitness", snapshot.life.fitness.slice(0, 5).map(formatActivity)),
    section("Recent social", snapshot.life.social.slice(0, 5).map(formatActivity)),
    `Wellbeing: water ${snapshot.wellbeing.waterTodayMl}/${snapshot.wellbeing.waterTargetMl}ml today; average mood ${snapshot.wellbeing.averageMood ?? "unknown"}/5; average sleep ${snapshot.wellbeing.averageSleepHours ?? "unknown"}h.`,
    includeSensitive && snapshot.wellbeing.latestMood
      ? `Latest mood: ${snapshot.wellbeing.latestMood.mood}, stress ${snapshot.wellbeing.latestMood.stress}/10, energy ${snapshot.wellbeing.latestMood.energy}/10${snapshot.wellbeing.latestMood.reflection ? `; reflection ${snapshot.wellbeing.latestMood.reflection}` : ""}.`
      : "Latest mood: none.",
    includeSensitive && snapshot.wellbeing.latestSleep
      ? `Latest sleep: ${snapshot.wellbeing.latestSleep.hours}h, ${snapshot.wellbeing.latestSleep.quality}${snapshot.wellbeing.latestSleep.notes ? `; notes ${snapshot.wellbeing.latestSleep.notes}` : ""}.`
      : "Latest sleep: none.",
    section("Habits needing attention", snapshot.habits.stale.map((habit) => `${habit.title} (${habit.cadence}, streak ${habit.streak})`)),
    section(
      "Detected routines",
      snapshot.learning.detectedHabits.map(
        (habit) =>
          `${habit.title}: current streak ${habit.streak}, longest ${habit.longestStreak}, ${Math.round(habit.confidence * 100)}% confidence`
      )
    ),
    section("Active recommendations", snapshot.recommendations.map((rec) => `${rec.title}: ${rec.body}`)),
    `Learning engine: ${snapshot.learning.engine}; confidence ${Math.round(snapshot.learning.confidence * 100)}%; most active window ${snapshot.learning.focusWindow ?? "unknown"}.`,
    `Engagement signal: ${snapshot.learning.engagement.readiness.toLowerCase().replaceAll("_", " ")}; ${snapshot.learning.engagement.activeDays30} active days in the last 30; current app streak ${snapshot.learning.engagement.currentAppStreak}. This is a changing product signal, not a judgment of the user.`,
    section("Learning signals", snapshot.learning.topSignals),
    includeSensitive
      ? section("Recent journal", snapshot.recentJournalEntries.map((entry) => `${entry.title}: ${entry.bodyPreview}`))
      : "Recent journal: withheld by privacy mode.",
    includeSensitive
      ? section("Recent conversation", snapshot.recentAI.map((entry) => `User: ${entry.prompt}\nPlanora: ${entry.response}`))
      : "Recent conversation: withheld by privacy mode.",
    section("Derived signals", snapshot.signals)
  ].join("\n");
}

function friendly(value: string | null) {
  return value ? value.toLowerCase().replaceAll("_", " ") : "not set";
}

function mapTask(task: {
  id: string;
  title: string;
  priority: string;
  status: string;
  category: string;
  dueDate: Date | null;
  progress: number;
  description: string | null;
  subtasks: Array<{ title: string; completed: boolean }>;
}): ContextTask {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    category: task.category,
    dueDate: task.dueDate?.toISOString() ?? null,
    progress: task.progress,
    description: task.description,
    subtasks: task.subtasks.map((subtask) => ({ title: subtask.title, completed: subtask.completed }))
  };
}

function mapActivity(activity: {
  id: string;
  title: string;
  category: string;
  minutes: number;
  occurredAt: Date;
  notes: string | null;
}): ContextActivity {
  return {
    id: activity.id,
    title: activity.title,
    category: activity.category,
    minutes: activity.minutes,
    occurredAt: activity.occurredAt.toISOString(),
    notes: activity.notes
  };
}

function findCalendarConflicts(events: ContextEvent[]) {
  const sorted = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const conflicts: Array<{ first: string; second: string; startsAt: string }> = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (!current || !next) continue;
    if (new Date(next.startAt).getTime() < new Date(current.endAt).getTime()) {
      conflicts.push({ first: current.title, second: next.title, startsAt: next.startAt });
    }
  }
  return conflicts.slice(0, 5);
}

function buildSignals(snapshot: CompanionContextSnapshot, dueSoonTasks: number) {
  const signals: string[] = [];
  if (snapshot.counts.overdueTasks > 0) signals.push(`${snapshot.counts.overdueTasks} overdue task(s) need review before adding new work.`);
  if (dueSoonTasks > 0) signals.push(`${dueSoonTasks} task(s) are due within 3 days.`);
  if (snapshot.calendar.conflicts.length > 0) signals.push(`${snapshot.calendar.conflicts.length} calendar overlap(s) need attention.`);
  if (snapshot.tasks.highPriorityUnscheduled.length > 0) signals.push(`${snapshot.tasks.highPriorityUnscheduled.length} high-priority task(s) have no due date.`);
  if (snapshot.life.today.length === 0) signals.push("Nothing has been logged for today yet; ask a short day check-in.");
  if (snapshot.life.food.length === 0) signals.push("No food pattern logged this week; meal recommendations need a food log.");
  if (snapshot.life.fitness.length === 0) signals.push("No fitness or movement logged this week.");
  if (snapshot.life.social.length === 0) signals.push("No social touchpoint logged this week.");
  if (snapshot.wellbeing.waterTodayMl < 1500) signals.push("Water intake is below the usual daily target.");
  if (snapshot.wellbeing.latestSleep && snapshot.wellbeing.latestSleep.hours < 6) signals.push("Latest sleep log is under 6 hours.");
  if (snapshot.wellbeing.latestMood && (snapshot.wellbeing.latestMood.stress >= 8 || ["LOW", "VERY_LOW"].includes(snapshot.wellbeing.latestMood.mood))) {
    signals.push("Latest mood check-in shows elevated strain; keep planning lighter and supportive.");
  }
  if (snapshot.habits.stale.length > 0) signals.push(`${snapshot.habits.stale.length} habit(s) have not been checked off recently.`);
  if (signals.length === 0) signals.push("No urgent planning risks detected from the current account context.");
  return signals;
}

function formatTask(task: ContextTask) {
  const subtasks = task.subtasks.length
    ? `; subtasks ${task.subtasks.filter((subtask) => subtask.completed).length}/${task.subtasks.length}`
    : "";
  return `${task.title} (${task.category}, ${task.priority}, ${task.status}, progress ${task.progress}%, due ${task.dueDate ? formatWhen(task.dueDate) : "none"}${subtasks})${task.description ? ` - ${task.description}` : ""}`;
}

function formatEvent(event: ContextEvent) {
  return `${formatWhen(event.startAt)}-${formatWhen(event.endAt)}: ${event.title} (${event.type})${event.description ? ` - ${event.description}` : ""}`;
}

function formatActivity(activity: ContextActivity) {
  return `${formatWhen(activity.occurredAt)}: ${activity.title} (${activity.category}, ${activity.minutes}m)${activity.notes ? ` - ${activity.notes}` : ""}`;
}

function section(label: string, rows: string[]) {
  return `${label}:\n${rows.length ? rows.map((row) => `- ${row}`).join("\n") : "- none"}`;
}

function isFoodActivity(activity: ContextActivity) {
  return /\b(ate|food|meal|breakfast|lunch|dinner|snack|pizza|burger|rice|chicken|salad|protein|coffee|drink)\b/i.test(
    activityText(activity)
  );
}

function activityText(activity: ContextActivity) {
  return `${activity.title} ${activity.notes ?? ""}`;
}

function formatWhen(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function round1(value: number) {
  return Number(value.toFixed(1));
}
