import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { getDayRange, getRollingDayRange, localDateKey, zonedDateParts } from "../lib/dateTime.js";
import { getAiDataPolicy } from "./aiPolicy.js";
import { calculateDateStreaks, refreshInferredHabits } from "./habitEngine.js";

type RecommendationAction = "ACCEPTED" | "DISMISSED" | "SNOOZED";

type RecommendationType =
  | "OVERDUE_TASK_REVIEW"
  | "LOW_WATER_INTAKE"
  | "POOR_SLEEP"
  | "HIGH_STRESS_LOW_MOOD"
  | "OVERWORK_WARNING"
  | "FOCUS_WINDOW"
  | "HABIT_RESTART";

export type RankableRecommendation = {
  type: RecommendationType | string;
  title: string;
  body: string;
  priority?: number;
  metadata?: object;
};

type FocusWindow = {
  label: "morning" | "afternoon" | "evening" | "night";
  averageFocus: number;
  sessions: number;
};

export type AdaptiveRankerStatus = {
  engine: "LOCAL_ONLINE_RANKER";
  version: string;
  learningMode: "user_scoped_online" | "disabled";
  trainedAt: string;
  confidence: number;
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
    readiness: "BUILDING_BASELINE" | "OPEN_TO_CHANGE" | "HIGHLY_ENGAGED";
  };
  profileSignals: {
    enabled: boolean;
    completeness: number;
    lifeStage: string | null;
    activityLevel: string | null;
    improvementStyle: string;
    goalCount: number;
    interestCount: number;
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
  recommendationWeights: Record<string, number>;
  categoryWeights: Record<string, number>;
  featureWeights: Record<string, number>;
  focusWindow: FocusWindow | null;
  topSignals: string[];
  nextImprovements: string[];
};

const version = "local-online-ranker-v2";

const baseRecommendationWeights: Record<RecommendationType, number> = {
  OVERDUE_TASK_REVIEW: 1.25,
  HIGH_STRESS_LOW_MOOD: 1.18,
  OVERWORK_WARNING: 1.1,
  POOR_SLEEP: 1.05,
  FOCUS_WINDOW: 1,
  HABIT_RESTART: 0.92,
  LOW_WATER_INTAKE: 0.82
};

export async function getAdaptiveRankerStatus(userId: string): Promise<AdaptiveRankerStatus> {
  return buildRankerProfile(userId);
}

export async function rankRecommendationCandidates<T extends RankableRecommendation>(userId: string, candidates: T[]) {
  if (candidates.length === 0) return [];

  const profile = await buildRankerProfile(userId);
  return candidates
    .map((candidate) => {
      const typeWeight = profile.recommendationWeights[candidate.type] ?? 1;
      const featureBoost = scoreCandidateFeatures(candidate, profile.featureWeights);
      const baseScore = candidate.priority ?? 50;
      const confidenceMultiplier = 0.55 + profile.confidence * 0.45;
      const rankerScore = round2(baseScore * typeWeight * confidenceMultiplier + featureBoost);
      return { ...candidate, rankerScore };
    })
    .sort((a, b) => b.rankerScore - a.rankerScore);
}

export async function recordRecommendationLearning(input: {
  userId: string;
  recommendationId: string;
  recommendationType: string;
  action: RecommendationAction;
}) {
  const policy = await getAiDataPolicy(input.userId);
  if (!policy.canPersistLearning) return;

  const profile = await buildRankerProfile(input.userId);
  await prisma.modelEvent.create({
    data: {
      userId: input.userId,
      // Deliberately still "neural_" after this service was renamed to the
      // adaptive ranker. This string is written into ModelEvent.eventType, so
      // it is stored data rather than an identifier: changing it would leave
      // existing rows under the old value and new rows under the new one, and
      // every query that filters by event type would silently read partial
      // history. Renaming it is only safe alongside a migration that rewrites
      // the rows already persisted.
      eventType: "neural_feedback_applied",
      payload: {
        engine: profile.engine,
        version: profile.version,
        recommendationId: input.recommendationId,
        recommendationType: input.recommendationType,
        action: input.action,
        confidence: profile.confidence,
        learnedWeight: profile.recommendationWeights[input.recommendationType] ?? 1
      }
    }
  });
}

export async function buildTrainingManifest(userId: string, limit = 500) {
  const policy = await getAiDataPolicy(userId);
  const personalProfile = await prisma.personalProfile.findUnique({ where: { userId } });
  if (!policy.canPersistLearning || !personalProfile?.allowAnonymousTraining) {
    return {
      generatedAt: new Date().toISOString(),
      eligible: false,
      reason: !policy.canPersistLearning ? "Personal learning is disabled." : "Anonymous training contribution is not enabled in My Profile.",
      engine: "LOCAL_ONLINE_RANKER",
      version,
      eventCount: 0,
      feedbackCount: 0,
      featureFamilies: [],
      rows: []
    };
  }

  const [events, feedback] = await Promise.all([
    prisma.modelEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit
    }),
    prisma.recommendationFeedback.findMany({
      where: { userId },
      include: { recommendation: true },
      orderBy: { createdAt: "desc" },
      take: limit
    })
  ]);

  return {
    generatedAt: new Date().toISOString(),
    eligible: true,
    participantId: createHash("sha256")
      .update(`${process.env.TRAINING_EXPORT_SALT ?? "planora-local-training"}:${userId}`)
      .digest("hex")
      .slice(0, 16),
    engine: "LOCAL_ONLINE_RANKER",
    version,
    eventCount: events.length,
    feedbackCount: feedback.length,
    featureFamilies: [
      "task category, priority, due date, delay, and completion behavior",
      "calendar load and conflict pressure",
      "mood, stress, energy, sleep, and water signals",
      "life activities, fitness/social/food logs, and preferred active window",
      "habit staleness and streak continuity",
      "recommendation accepted, dismissed, or snoozed feedback"
    ],
    profileFeatures: {
      lifeStage: personalProfile.lifeStage,
      activityLevel: personalProfile.activityLevel,
      improvementStyle: personalProfile.improvementStyle,
      hasProfession: Boolean(personalProfile.profession),
      goalCount: personalProfile.primaryGoals.length,
      interestCount: personalProfile.interests.length
    },
    rows: [
      ...events.map((event) => ({
        source: "ModelEvent",
        type: event.eventType,
        payload: sanitizeTrainingPayload(event.payload),
        createdAt: event.createdAt.toISOString()
      })),
      ...feedback.map((item) => ({
        source: "RecommendationFeedback",
        type: item.recommendation.type,
        action: item.action,
        createdAt: item.createdAt.toISOString()
      }))
    ]
  };
}

async function buildRankerProfile(userId: string): Promise<AdaptiveRankerStatus> {
  const now = new Date();
  const policy = await getAiDataPolicy(userId);
  if (!policy.canPersistLearning) return disabledRankerStatus(now);
  const monthRange = getRollingDayRange(policy.timeZone, 31, now);
  const dayRange = getDayRange(policy.timeZone, now);

  const [events, feedback, tasks, activities, moodLogs, sleepLogs, waterLogs, personalProfile, detectedHabits] = await Promise.all([
    prisma.modelEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.recommendationFeedback.findMany({
      where: { userId },
      include: { recommendation: true },
      orderBy: { createdAt: "desc" },
      take: 300
    }),
    prisma.task.findMany({ where: { userId, createdAt: { gte: monthRange.start, lt: monthRange.end } }, take: 250 }),
    prisma.activity.findMany({ where: { userId, occurredAt: { gte: monthRange.start, lt: monthRange.end } }, take: 250 }),
    prisma.moodLog.findMany({ where: { userId, loggedAt: { gte: monthRange.start, lt: monthRange.end } }, take: 120 }),
    prisma.sleepLog.findMany({ where: { userId, loggedAt: { gte: monthRange.start, lt: monthRange.end } }, take: 120 }),
    prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: monthRange.start, lt: monthRange.end } }, take: 200 }),
    prisma.personalProfile.findUnique({ where: { userId } }),
    refreshInferredHabits(userId, policy.timeZone)
  ]);

  const recommendationWeights: Record<string, number> = { ...baseRecommendationWeights };
  const categoryWeights = buildCategoryWeights(tasks);
  const feedbackSignals = buildFeedbackSignals(feedback);
  for (const [type, delta] of Object.entries(feedbackSignals.typeDeltas)) {
    recommendationWeights[type] = clamp(round2((recommendationWeights[type as RecommendationType] ?? 1) + delta), 0.45, 1.85);
  }

  const focusWindow = findBestActiveWindow(activities, policy.timeZone);
  const weeklyActiveMinutes = activities.reduce((sum, activity) => sum + activity.minutes, 0);
  const latestMood = moodLogs[0];
  const latestSleep = sleepLogs[0];
  const todayWater = waterLogs
    .filter((log) => log.loggedAt >= dayRange.start && log.loggedAt < dayRange.end)
    .reduce((sum, log) => sum + log.amountMl, 0);
  const completionRate = tasks.length ? tasks.filter((task) => task.status === "COMPLETED").length / tasks.length : 0;
  const overdueOpen = tasks.filter((task) => task.dueDate && task.dueDate < now && task.status !== "COMPLETED").length;

  const featureWeights = {
    urgency: round2(1 + Math.min(overdueOpen, 6) * 0.08 + feedbackSignals.urgency),
    wellbeing: round2(1 + (latestMood && latestMood.stress >= 8 ? 0.24 : 0) + (latestSleep && latestSleep.hours < 6 ? 0.2 : 0) + feedbackSignals.wellbeing),
    focus: round2(1 + (focusWindow ? Math.min(focusWindow.averageFocus, 10) / 40 : 0) + feedbackSignals.focus),
    recovery: round2(1 + (weeklyActiveMinutes > 1800 ? 0.2 : 0) + feedbackSignals.recovery),
    habit: round2(1 + feedbackSignals.habit),
    hydration: round2(1 + (todayWater < 1500 ? 0.16 : 0) + feedbackSignals.hydration),
    completionMomentum: round2(0.8 + completionRate * 0.6)
  };
  if (personalProfile?.useForPersonalization) {
    if (personalProfile.improvementStyle === "GENTLE") featureWeights.recovery = round2(featureWeights.recovery + 0.12);
    if (personalProfile.improvementStyle === "AMBITIOUS") featureWeights.focus = round2(featureWeights.focus + 0.08);
    if (["SEDENTARY", "LIGHTLY_ACTIVE"].includes(personalProfile.activityLevel ?? "")) {
      featureWeights.habit = round2(featureWeights.habit + 0.08);
    }
  }

  const engagementDates = [
    ...events.map((item) => item.createdAt),
    ...feedback.map((item) => item.createdAt),
    ...tasks.flatMap((item) => [item.createdAt, ...(item.completedAt ? [item.completedAt] : [])]),
    ...activities.map((item) => item.occurredAt),
    ...moodLogs.map((item) => item.loggedAt),
    ...sleepLogs.map((item) => item.loggedAt),
    ...waterLogs.map((item) => item.loggedAt)
  ];
  const engagementStreak = calculateDateStreaks(
    engagementDates.map((date) => localDateKey(date, policy.timeZone)),
    localDateKey(now, policy.timeZone)
  );
  const actions30 = engagementDates.length;
  const engagementScore = round2(
    clamp(
      Math.min(engagementStreak.occurrences / 14, 1) * 0.45 +
        Math.min(actions30 / 60, 1) * 0.3 +
        Math.min(feedback.length / 10, 1) * 0.25,
      0,
      1
    )
  );
  const readiness =
    engagementScore >= 0.7 ? "HIGHLY_ENGAGED" : engagementScore >= 0.35 ? "OPEN_TO_CHANGE" : "BUILDING_BASELINE";
  const profileSignals = buildProfileSignals(personalProfile);

  const sampleScore =
    Math.min(events.length / 120, 0.28) +
    Math.min(feedback.length / 30, 0.32) +
    Math.min(tasks.length / 60, 0.18) +
    Math.min(activities.length / 40, 0.1) +
    Math.min((moodLogs.length + sleepLogs.length + waterLogs.length) / 90, 0.12);
  const confidence = round2(clamp(sampleScore, 0.05, 0.95));

  return {
    engine: "LOCAL_ONLINE_RANKER",
    version,
    learningMode: "user_scoped_online",
    trainedAt: now.toISOString(),
    confidence,
    samples: {
      events: events.length,
      recommendationFeedback: feedback.length,
      tasks: tasks.length,
      activities: activities.length,
      wellbeingLogs: moodLogs.length + sleepLogs.length + waterLogs.length,
      activeDays: engagementStreak.occurrences
    },
    engagement: {
      score: engagementScore,
      activeDays30: engagementStreak.occurrences,
      currentAppStreak: engagementStreak.currentStreak,
      longestAppStreak: engagementStreak.longestStreak,
      actions30,
      feedbackActions: feedback.length,
      readiness
    },
    profileSignals,
    detectedHabits: detectedHabits.map((habit) => ({
      key: habit.key ?? habit.id,
      title: habit.title,
      streak: habit.streak,
      longestStreak: habit.longestStreak,
      occurrences: habit.occurrences,
      confidence: habit.confidence,
      lastObservedAt: habit.lastObservedAt?.toISOString() ?? null
    })),
    recommendationWeights,
    categoryWeights,
    featureWeights,
    focusWindow,
    topSignals: buildTopSignals({
      feedbackCount: feedback.length,
      overdueOpen,
      latestMood,
      latestSleep,
      todayWater,
      focusWindow,
      completionRate,
      weeklyActiveMinutes
    }),
    nextImprovements: buildNextImprovements({
      feedbackCount: feedback.length,
      tasks: tasks.length,
      activities: activities.length,
      wellbeingLogs: moodLogs.length + sleepLogs.length + waterLogs.length,
      profileEnabled: profileSignals.enabled,
      profileCompleteness: profileSignals.completeness
    })
  };
}

function buildFeedbackSignals(
  feedback: Array<{
    action: RecommendationAction;
    createdAt: Date;
    recommendation: { type: string };
  }>
) {
  const typeDeltas: Record<string, number> = {};
  const signals = {
    typeDeltas,
    urgency: 0,
    wellbeing: 0,
    focus: 0,
    recovery: 0,
    habit: 0,
    hydration: 0
  };

  const now = Date.now();
  for (const item of feedback) {
    const ageDays = Math.max(0, (now - item.createdAt.getTime()) / 86_400_000);
    const recency = Math.max(0.35, 1 - ageDays / 90);
    const actionScore = item.action === "ACCEPTED" ? 0.16 : item.action === "DISMISSED" ? -0.13 : -0.06;
    const delta = round2(actionScore * recency);
    signals.typeDeltas[item.recommendation.type] = round2((signals.typeDeltas[item.recommendation.type] ?? 0) + delta);

    if (item.recommendation.type === "OVERDUE_TASK_REVIEW") signals.urgency += delta;
    if (item.recommendation.type === "HIGH_STRESS_LOW_MOOD" || item.recommendation.type === "POOR_SLEEP") signals.wellbeing += delta;
    if (item.recommendation.type === "FOCUS_WINDOW") signals.focus += delta;
    if (item.recommendation.type === "OVERWORK_WARNING") signals.recovery += delta;
    if (item.recommendation.type === "HABIT_RESTART") signals.habit += delta;
    if (item.recommendation.type === "LOW_WATER_INTAKE") signals.hydration += delta;
  }

  return signals;
}

function buildCategoryWeights(tasks: Array<{ category: string; status: string }>) {
  const byCategory = new Map<string, { total: number; completed: number }>();
  for (const task of tasks) {
    const current = byCategory.get(task.category) ?? { total: 0, completed: 0 };
    current.total += 1;
    if (task.status === "COMPLETED") current.completed += 1;
    byCategory.set(task.category, current);
  }

  const weights: Record<string, number> = {};
  for (const [category, stats] of byCategory.entries()) {
    const completionRate = stats.total ? stats.completed / stats.total : 0;
    weights[category] = round2(0.85 + completionRate * 0.45 + Math.min(stats.total, 10) * 0.015);
  }
  return weights;
}

function findBestActiveWindow(
  activities: Array<{ occurredAt: Date; minutes: number }>,
  timeZone: string
): FocusWindow | null {
  const groups: Record<FocusWindow["label"], { total: number; count: number }> = {
    morning: { total: 0, count: 0 },
    afternoon: { total: 0, count: 0 },
    evening: { total: 0, count: 0 },
    night: { total: 0, count: 0 }
  };

  for (const activity of activities) {
    const label = timeOfDay(activity.occurredAt, timeZone);
    groups[label].total += Math.max(1, Math.min(10, activity.minutes / 12));
    groups[label].count += 1;
  }

  const ranked = Object.entries(groups)
    .filter((entry): entry is [FocusWindow["label"], { total: number; count: number }] => entry[1].count > 0)
    .map(([label, stats]) => ({
      label,
      averageFocus: round1(stats.total / stats.count),
      sessions: stats.count
    }))
    .sort((a, b) => b.averageFocus - a.averageFocus || b.sessions - a.sessions);

  return ranked[0] ?? null;
}

function scoreCandidateFeatures(candidate: RankableRecommendation, featureWeights: Record<string, number>) {
  const metadata = candidate.metadata ?? {};
  const baseTypeBonus: Record<string, number> = {
    OVERDUE_TASK_REVIEW: featureWeights.urgency ?? 1,
    HIGH_STRESS_LOW_MOOD: featureWeights.wellbeing ?? 1,
    POOR_SLEEP: featureWeights.wellbeing ?? 1,
    OVERWORK_WARNING: featureWeights.recovery ?? 1,
    FOCUS_WINDOW: featureWeights.focus ?? 1,
    HABIT_RESTART: featureWeights.habit ?? 1,
    LOW_WATER_INTAKE: featureWeights.hydration ?? 1
  };
  const metadataBonus =
    "dueSoon" in metadata ? 4 : "unscheduled" in metadata ? 3 : "conflicts" in metadata ? 5 : "taskIds" in metadata ? 2 : 0;
  return round2(((baseTypeBonus[candidate.type] ?? 1) - 1) * 18 + metadataBonus);
}

function buildTopSignals(input: {
  feedbackCount: number;
  overdueOpen: number;
  latestMood?: { stress: number; mood: string } | null;
  latestSleep?: { hours: number; quality: string } | null;
  todayWater: number;
  focusWindow: FocusWindow | null;
  completionRate: number;
  weeklyActiveMinutes: number;
}) {
  const signals: string[] = [];
  if (input.feedbackCount > 0) signals.push(`Learned from ${input.feedbackCount} recommendation feedback action${input.feedbackCount === 1 ? "" : "s"}.`);
  if (input.overdueOpen > 0) signals.push(`${input.overdueOpen} open overdue task${input.overdueOpen === 1 ? "" : "s"} increase urgency weighting.`);
  if (input.focusWindow) signals.push(`Most active time window is ${input.focusWindow.label} with ${input.focusWindow.sessions} logged action${input.focusWindow.sessions === 1 ? "" : "s"}.`);
  if (input.latestMood && input.latestMood.stress >= 8) signals.push("Recent high stress increases lighter-planning and recovery weighting.");
  if (input.latestSleep && input.latestSleep.hours < 6) signals.push("Recent short sleep increases recovery-aware recommendations.");
  if (input.todayWater < 1500) signals.push("Low logged water today increases hydration reminder relevance.");
  if (input.weeklyActiveMinutes > 1800) signals.push("High weekly active minutes increase recovery protection.");
  signals.push(`Recent task completion momentum is ${Math.round(input.completionRate * 100)}%.`);
  return signals.slice(0, 6);
}

function buildNextImprovements(input: {
  feedbackCount: number;
  tasks: number;
  activities: number;
  wellbeingLogs: number;
  profileEnabled: boolean;
  profileCompleteness: number;
}) {
  const improvements: string[] = [];
  if (!input.profileEnabled) improvements.push("Enable profile personalization to tailor coaching style, goals, and routine suggestions.");
  else if (input.profileCompleteness < 0.6) improvements.push("Add a few more profile details so suggestions can fit your real routine.");
  if (input.feedbackCount < 8) improvements.push("Accept or dismiss more recommendations so ranking can personalize faster.");
  if (input.tasks < 12) improvements.push("Add due dates, priorities, and categories to more tasks.");
  if (input.activities < 8) improvements.push("Log ordinary food, movement, social, and rest actions so the app can learn your real rhythm.");
  if (input.wellbeingLogs < 12) improvements.push("Log sleep, mood, and water for better wellbeing-aware planning.");
  if (improvements.length === 0) improvements.push("Enough data exists for stable local ranking; keep giving feedback to refine it.");
  return improvements;
}

function timeOfDay(date: Date, timeZone: string): FocusWindow["label"] {
  const hour = zonedDateParts(date, timeZone).hour;
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function disabledRankerStatus(now: Date): AdaptiveRankerStatus {
  return {
    engine: "LOCAL_ONLINE_RANKER",
    version,
    learningMode: "disabled",
    trainedAt: now.toISOString(),
    confidence: 0,
    samples: { events: 0, recommendationFeedback: 0, tasks: 0, activities: 0, wellbeingLogs: 0, activeDays: 0 },
    engagement: {
      score: 0,
      activeDays30: 0,
      currentAppStreak: 0,
      longestAppStreak: 0,
      actions30: 0,
      feedbackActions: 0,
      readiness: "BUILDING_BASELINE"
    },
    profileSignals: {
      enabled: false,
      completeness: 0,
      lifeStage: null,
      activityLevel: null,
      improvementStyle: "BALANCED",
      goalCount: 0,
      interestCount: 0
    },
    detectedHabits: [],
    recommendationWeights: { ...baseRecommendationWeights },
    categoryWeights: {},
    featureWeights: {},
    focusWindow: null,
    topSignals: ["AI personalization is disabled."],
    nextImprovements: []
  };
}

function buildProfileSignals(
  profile:
    | {
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
        useForPersonalization: boolean;
      }
    | null
) {
  if (!profile) {
    return {
      enabled: false,
      completeness: 0,
      lifeStage: null,
      activityLevel: null,
      improvementStyle: "BALANCED",
      goalCount: 0,
      interestCount: 0
    };
  }
  const values = [
    profile.lifeStage,
    profile.profession,
    profile.heightCm,
    profile.weightKg,
    profile.activityLevel,
    profile.interests.length,
    profile.primaryGoals.length,
    profile.preferredWakeTime,
    profile.preferredSleepTime
  ];
  return {
    enabled: profile.useForPersonalization,
    completeness: round2(values.filter(Boolean).length / values.length),
    lifeStage: profile.useForPersonalization ? profile.lifeStage : null,
    activityLevel: profile.useForPersonalization ? profile.activityLevel : null,
    improvementStyle: profile.useForPersonalization ? profile.improvementStyle : "BALANCED",
    goalCount: profile.useForPersonalization ? profile.primaryGoals.length : 0,
    interestCount: profile.useForPersonalization ? profile.interests.length : 0
  };
}

function sanitizeTrainingPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 40).map(sanitizeTrainingPayload);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/(title|name|email|prompt|response|body|description|note|reflection|journal|user)/i.test(key))
      .map(([key, item]) => [key, sanitizeTrainingPayload(item)])
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Number(value.toFixed(1));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}
