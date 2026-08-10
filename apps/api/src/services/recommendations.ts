import { prisma } from "../lib/prisma.js";
import { getDayRange, getFutureDayBoundary, getRollingDayRange } from "../lib/dateTime.js";
import { getAiDataPolicy } from "./aiPolicy.js";
import { rankRecommendationCandidates } from "./neuralEngine.js";
import { KeyedSingleflight } from "../lib/singleflight.js";

type Candidate = {
  type:
    | "OVERDUE_TASK_REVIEW"
    | "LOW_WATER_INTAKE"
    | "POOR_SLEEP"
    | "HIGH_STRESS_LOW_MOOD"
    | "OVERWORK_WARNING"
    | "FOCUS_WINDOW"
    | "HABIT_RESTART";
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: object;
  priority?: number;
};

const recommendationSingleflight = new KeyedSingleflight();

export function generateRecommendations(userId: string) {
  return recommendationSingleflight.run(userId, () => generateRecommendationsOnce(userId));
}

async function generateRecommendationsOnce(userId: string) {
  const now = new Date();
  const policy = await getAiDataPolicy(userId);
  if (!recommendationsAllowedByPolicy(policy)) {
    return disablePersonalizedRecommendations(userId);
  }
  const fresh = await prisma.recommendation.findMany({
    where: {
      userId,
      active: true,
      updatedAt: { gte: new Date(now.getTime() - 5 * 60_000) }
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    take: 5
  });
  if (fresh.length > 0) return fresh;

  const dayRange = getDayRange(policy.timeZone, now);
  const weekRange = getRollingDayRange(policy.timeZone, 7, now);
  const dueSoonEnd = getFutureDayBoundary(policy.timeZone, 4, now);
  const calendarHorizon = getFutureDayBoundary(policy.timeZone, 14, now);

  const [
    overdueTasks,
    dueSoonTasks,
    highPriorityUnscheduled,
    todayWater,
    latestSleep,
    latestMood,
    habits,
    calendarEvents,
    activities,
    personalProfile
  ] = await Promise.all([
    prisma.task.findMany({
      where: { userId, dueDate: { lt: now }, status: { not: "COMPLETED" } },
      take: 5,
      orderBy: { dueDate: "asc" }
    }),
    prisma.task.findMany({
      where: { userId, dueDate: { gte: now, lt: dueSoonEnd }, status: { not: "COMPLETED" } },
      take: 6,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }]
    }),
    prisma.task.findMany({
      where: { userId, dueDate: null, status: { not: "COMPLETED" }, priority: { in: ["HIGH", "URGENT"] } },
      take: 5,
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.waterLog.aggregate({
      where: { userId, loggedAt: { gte: dayRange.start, lt: dayRange.end } },
      _sum: { amountMl: true }
    }),
    prisma.sleepLog.findFirst({ where: { userId }, orderBy: { loggedAt: "desc" } }),
    prisma.moodLog.findFirst({ where: { userId }, orderBy: { loggedAt: "desc" } }),
    prisma.habit.findMany({ where: { userId, active: true }, take: 10 }),
    prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: dayRange.start, lt: calendarHorizon } },
      orderBy: { startAt: "asc" },
      take: 30
    }),
    prisma.activity.findMany({
      where: { userId, occurredAt: { gte: weekRange.start, lt: weekRange.end } },
      orderBy: { occurredAt: "desc" },
      take: 120
    }),
    prisma.personalProfile.findUnique({ where: { userId } })
  ]);

  const candidates: Candidate[] = [];
  if (overdueTasks.length > 0) {
    candidates.push({
      type: "OVERDUE_TASK_REVIEW",
      title: "Clean up one overdue item",
      body: `${overdueTasks.length} task${overdueTasks.length === 1 ? " is" : "s are"} overdue. Finish, reschedule, or delete one so your plan stays honest.`,
      actionLabel: "Open tasks",
      actionUrl: "/tasks",
      metadata: { taskIds: overdueTasks.map((task) => task.id) },
      priority: 100
    });
  } else if (dueSoonTasks.length > 0) {
    candidates.push({
      type: "FOCUS_WINDOW",
      title: "Protect the next deadline",
      body: `"${dueSoonTasks[0]?.title ?? "A task"}" is due soon. Give it a short block before adding more plans.`,
      actionLabel: "Open tasks",
      actionUrl: "/tasks",
      metadata: { taskIds: dueSoonTasks.map((task) => task.id), dueSoon: true },
      priority: 82
    });
  }

  const waterMl = todayWater._sum.amountMl ?? 0;
  if (waterMl < 1500) {
    candidates.push({
      type: "LOW_WATER_INTAKE",
      title: "Hydrate before the next block",
      body: `You have logged ${waterMl}ml today. Add a glass now so the basics do not slip.`,
      actionLabel: "Log water",
      actionUrl: "/wellbeing",
      metadata: { waterMl },
      priority: 35
    });
  }

  if (latestSleep && latestSleep.hours < 6) {
    candidates.push({
      type: "POOR_SLEEP",
      title: "Keep tomorrow lighter",
      body: "Your latest sleep log was under 6 hours. Avoid stacking hard tasks back-to-back and protect an earlier wind-down.",
      actionLabel: "Open wellbeing",
      actionUrl: "/wellbeing",
      metadata: { hours: latestSleep.hours, quality: latestSleep.quality },
      priority: 75
    });
  }

  if (latestMood && (latestMood.stress >= 8 || latestMood.mood === "LOW" || latestMood.mood === "VERY_LOW")) {
    candidates.push({
      type: "HIGH_STRESS_LOW_MOOD",
      title: "Reduce the load today",
      body:
        "Your latest check-in shows elevated strain. Pick one must-do, one reset action, and avoid turning the day into a catch-up marathon.",
      actionLabel: "Journal",
      actionUrl: "/wellbeing",
      metadata: { stress: latestMood.stress, mood: latestMood.mood },
      priority: 90
    });
  }

  const calendarLoadMinutes = calendarEvents.reduce((sum, event) => sum + Math.max(0, event.endAt.getTime() - event.startAt.getTime()) / 60_000, 0);
  const calendarConflicts = findCalendarConflicts(calendarEvents);
  if (calendarLoadMinutes > 2400 || calendarConflicts.length > 0) {
    candidates.push({
      type: "OVERWORK_WARNING",
      title: calendarConflicts.length > 0 ? "Resolve a calendar overlap" : "Protect recovery time",
      body:
        calendarConflicts.length > 0
          ? `${calendarConflicts.length} calendar overlap${calendarConflicts.length === 1 ? "" : "s"} detected. Move or shorten one event before planning more.`
          : "Your upcoming calendar is getting dense. Add a buffer or remove one low-value commitment.",
      actionLabel: "Open calendar",
      actionUrl: "/calendar",
      metadata: { calendarLoadMinutes, conflicts: calendarConflicts },
      priority: calendarConflicts.length > 0 ? 88 : 70
    });
  }

  const foodRecommendation = buildFoodRecommendation(activities);
  if (foodRecommendation) candidates.push(foodRecommendation);

  const fitnessRecommendation = buildFitnessRecommendation(activities);
  if (fitnessRecommendation) candidates.push(fitnessRecommendation);

  const socialRecommendation = buildSocialRecommendation(activities);
  if (socialRecommendation) candidates.push(socialRecommendation);

  const outdoorRecommendation = buildOutdoorRecommendation(activities);
  if (outdoorRecommendation) candidates.push(outdoorRecommendation);

  const profileRecommendation = buildProfileRecommendation(personalProfile, activities);
  if (profileRecommendation) candidates.push(profileRecommendation);

  if (highPriorityUnscheduled.length > 0 && !candidates.some((candidate) => candidate.type === "FOCUS_WINDOW")) {
    candidates.push({
      type: "FOCUS_WINDOW",
      title: "Give priority work a time",
      body: `"${highPriorityUnscheduled[0]?.title ?? "A high-priority task"}" has no due date. Add a date or a small calendar block.`,
      actionLabel: "Open tasks",
      actionUrl: "/tasks",
      metadata: { taskIds: highPriorityUnscheduled.map((task) => task.id), unscheduled: true },
      priority: 58
    });
  }

  const staleHabits = habits.filter((habit) => {
    if (!habit.lastDoneAt) return true;
    const daysSinceDone = (now.getTime() - habit.lastDoneAt.getTime()) / 86_400_000;
    return daysSinceDone >= 3;
  });
  if (staleHabits.length > 0) {
    candidates.push({
      type: "HABIT_RESTART",
      title: "Restart one tiny routine",
      body: `${staleHabits[0]?.title ?? "A routine"} has been quiet. Restart with the smallest possible version today.`,
      actionLabel: "Open dashboard",
      actionUrl: "/",
      metadata: { habitIds: staleHabits.map((habit) => habit.id) },
      priority: 45
    });
  }

  const deduped = [...dedupeCandidates(candidates)];
  const candidateKeys = deduped.map(recommendationKey);
  const recentFeedback = await prisma.recommendationFeedback.findMany({
    where: {
      userId,
      updatedAt: { gte: new Date(now.getTime() - 7 * 86_400_000) },
      recommendation: { key: { in: candidateKeys } }
    },
    orderBy: { updatedAt: "desc" },
    include: { recommendation: { select: { key: true } } }
  });
  const latestFeedback = new Map<string, (typeof recentFeedback)[number]>();
  for (const feedback of recentFeedback) {
    if (!latestFeedback.has(feedback.recommendation.key)) {
      latestFeedback.set(feedback.recommendation.key, feedback);
    }
  }
  const eligible = deduped.filter((candidate) => {
    const feedback = latestFeedback.get(recommendationKey(candidate));
    if (!feedback) return true;
    const cooldownDays = feedback.action === "DISMISSED" ? 7 : feedback.action === "ACCEPTED" ? 3 : 1;
    return now.getTime() - feedback.updatedAt.getTime() >= cooldownDays * 86_400_000;
  });
  const rankedCandidates = policy.aiPersonalization
    ? await rankRecommendationCandidates(userId, eligible)
    : eligible
        .map((candidate) => ({ ...candidate, neuralScore: candidate.priority ?? 50 }))
        .sort((a, b) => b.neuralScore - a.neuralScore);
  const activeKeys = rankedCandidates.map(recommendationKey);
  const staleCutoff = new Date(now.getTime() - 30 * 86_400_000);
  const currentPolicy = await getAiDataPolicy(userId);
  if (!recommendationsAllowedByPolicy(currentPolicy)) {
    return disablePersonalizedRecommendations(userId);
  }

  await prisma.$transaction(async (tx) => {
    for (const candidate of rankedCandidates) {
      const { priority: _priority, neuralScore: _neuralScore, ...recommendationData } = candidate;
      const key = recommendationKey(candidate);
      const metadata = {
        ...(recommendationData.metadata ?? {}),
        ranking: {
          engine: policy.aiPersonalization ? "LOCAL_ONLINE_RANKER" : "LOCAL_RULES",
          score: candidate.neuralScore
        }
      };
      await tx.recommendation.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, ...recommendationData, metadata, active: true },
        update: { ...recommendationData, metadata, active: true }
      });
    }

    await tx.recommendation.updateMany({
      where: {
        userId,
        active: true,
        ...(activeKeys.length > 0 ? { key: { notIn: activeKeys } } : {})
      },
      data: { active: false }
    });
    await tx.recommendation.deleteMany({
      where: { userId, active: false, updatedAt: { lt: staleCutoff } }
    });
  });

  return prisma.recommendation.findMany({
    where: { userId, active: true },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    take: 5
  });
}

export function recommendationsAllowedByPolicy(policy: { aiPersonalization: boolean; privacyMode: boolean }) {
  return policy.aiPersonalization && !policy.privacyMode;
}

async function disablePersonalizedRecommendations(userId: string) {
  await prisma.recommendation.updateMany({
    where: { userId, active: true },
    data: { active: false }
  });
  return [];
}

function buildFoodRecommendation(activities: Array<{ title: string; notes: string | null; occurredAt: Date }>): Candidate | null {
  const food = activities.filter((activity) => isFoodActivity(activity));
  const latest = food[0];
  if (!latest) {
    return {
      type: "HABIT_RESTART",
      title: "Log one meal",
      body: "No recent food log found. Add what you ate today so Planora can spot patterns and make better suggestions tomorrow.",
      actionLabel: "Log life",
      actionUrl: "/life",
      metadata: { food: "missing" },
      priority: 46
    };
  }

  const text = activityText(latest);
  if (/\b(pizza|burger|fried|soda|cake|cookies|chips|fast food|takeout|ice cream)\b/i.test(text)) {
    return {
      type: "HABIT_RESTART",
      title: "Balance tomorrow's food",
      body: `You logged "${latest.title}". Tomorrow, aim for protein plus something fresh like fruit, vegetables, or a simple home meal.`,
      actionLabel: "Log life",
      actionUrl: "/life",
      metadata: { food: latest.title, balance: true },
      priority: 64
    };
  }

  if (food.length < 2) {
    return {
      type: "HABIT_RESTART",
      title: "Keep food tracking light",
      body: "Log one more meal or snack today. Patterns only become useful when the app sees ordinary days, not perfect ones.",
      actionLabel: "Log life",
      actionUrl: "/life",
      metadata: { foodCount: food.length },
      priority: 38
    };
  }

  return null;
}

function buildFitnessRecommendation(activities: Array<{ title: string; category: string; notes: string | null }>): Candidate | null {
  const fitness = activities.filter((activity) => activity.category === "FITNESS" || /\b(gym|workout|run|walk|chest|legs|push|pull|cardio)\b/i.test(activityText(activity)));
  const latest = fitness[0];
  if (!latest) {
    return {
      type: "FOCUS_WINDOW",
      title: "Move a little today",
      body: "No recent fitness log found. A 20-minute walk or light workout is enough to give the app a baseline.",
      actionLabel: "Log life",
      actionUrl: "/life",
      metadata: { fitness: "missing" },
      priority: 44
    };
  }

  const text = activityText(latest);
  const next = /\b(chest|push)\b/i.test(text)
    ? "rest or legs tomorrow"
    : /\b(legs|squat)\b/i.test(text)
      ? "rest or pull tomorrow"
      : /\b(pull|back|biceps)\b/i.test(text)
        ? "legs or a light cardio day tomorrow"
        : "alternate intensity tomorrow so recovery stays built in";
  return {
    type: "FOCUS_WINDOW",
    title: "Rotate your next workout",
    body: `You last logged "${latest.title}". Consider ${next}.`,
    actionLabel: "Log life",
    actionUrl: "/life",
    metadata: { lastFitness: latest.title },
    priority: 55
  };
}

function buildSocialRecommendation(activities: Array<{ title: string; category: string; notes: string | null; occurredAt: Date }>): Candidate | null {
  const social = activities.filter((activity) => activity.category === "SOCIAL" || /\b(friend|call|text|met|social|family|date|hangout)\b/i.test(activityText(activity)));
  if (social.length > 0) return null;
  return {
    type: "HABIT_RESTART",
    title: "Add one human touchpoint",
    body: "No social log this week. Send one check-in text, ask someone about their day, or call an old friend for five minutes.",
    actionLabel: "Log life",
    actionUrl: "/life",
    metadata: { social: "missing" },
    priority: 42
  };
}

function buildOutdoorRecommendation(activities: Array<{ title: string; notes: string | null; occurredAt: Date }>): Candidate | null {
  const outdoor = activities.filter((activity) => /\b(outside|outdoors|walk|park|sun|fresh air|went out|errand)\b/i.test(activityText(activity)));
  if (outdoor.length > 0) return null;
  return {
    type: "HABIT_RESTART",
    title: "Get outside briefly",
    body: "No outdoor activity is logged this week. Step outside for ten minutes or pair an errand with a short walk.",
    actionLabel: "Log life",
    actionUrl: "/life",
    metadata: { outdoors: "missing" },
    priority: 36
  };
}

function buildProfileRecommendation(
  profile: {
    useForPersonalization: boolean;
    activityLevel: string | null;
    improvementStyle: string;
    primaryGoals: string[];
  } | null,
  activities: Array<{ title: string; category: string; notes: string | null }>
): Candidate | null {
  if (!profile?.useForPersonalization) return null;
  const movementLogs = activities.filter(
    (activity) =>
      activity.category === "FITNESS" || /\b(gym|workout|walk|run|cycle|swim|cardio|chest|legs|push|pull)\b/i.test(activityText(activity))
  );
  if (["SEDENTARY", "LIGHTLY_ACTIVE"].includes(profile.activityLevel ?? "") && movementLogs.length < 2) {
    const tone =
      profile.improvementStyle === "AMBITIOUS"
        ? "Choose a clear 20-minute movement block today."
        : profile.improvementStyle === "GENTLE"
          ? "A relaxed ten-minute walk is enough to begin."
          : "Choose a manageable 15-minute walk or mobility block.";
    return {
      type: "HABIT_RESTART",
      title: "Build a movement baseline",
      body: `Your self-described activity level is ${profile.activityLevel?.toLowerCase().replaceAll("_", " ")}. ${tone}`,
      actionLabel: "Log life",
      actionUrl: "/life",
      metadata: { profileGuided: true, activityLevel: profile.activityLevel },
      priority: 54
    };
  }

  const goal = profile.primaryGoals[0];
  if (!goal) return null;
  return {
    type: "FOCUS_WINDOW",
    title: "Move one goal forward",
    body: `You chose "${goal}" as a goal. Give it one small, observable action today so Planora can learn what progress looks like for you.`,
    actionLabel: "Open tasks",
    actionUrl: "/tasks",
    metadata: { profileGuided: true, goalIndex: 0 },
    priority: 48
  };
}

function dedupeCandidates(candidates: Candidate[]) {
  const byKey = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const key = `${candidate.type}:${candidate.title}`;
    const existing = byKey.get(key);
    if (!existing || (candidate.priority ?? 0) > (existing.priority ?? 0)) {
      byKey.set(key, candidate);
    }
  }
  return byKey.values();
}

function recommendationKey(candidate: Pick<Candidate, "type" | "title">) {
  return `${candidate.type}:${candidate.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function findCalendarConflicts(events: Array<{ title: string; startAt: Date; endAt: Date }>) {
  const conflicts: Array<{ first: string; second: string; startsAt: string }> = [];
  for (let index = 0; index < events.length - 1; index += 1) {
    const current = events[index];
    const next = events[index + 1];
    if (!current || !next) continue;
    if (next.startAt.getTime() < current.endAt.getTime()) {
      conflicts.push({ first: current.title, second: next.title, startsAt: next.startAt.toISOString() });
    }
  }
  return conflicts.slice(0, 5);
}

function isFoodActivity(activity: { title: string; notes: string | null }) {
  return /\b(ate|food|meal|breakfast|lunch|dinner|snack|pizza|burger|rice|chicken|salad|protein|coffee|drink)\b/i.test(
    activityText(activity)
  );
}

function activityText(activity: { title: string; notes: string | null }) {
  return `${activity.title} ${activity.notes ?? ""}`;
}
