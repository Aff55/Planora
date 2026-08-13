/**
 * Response shapes returned by the API.
 *
 * `@planora/shared` is the source of truth for enums and for the *input*
 * schemas a client sends. It does not describe what the server sends back —
 * persisted rows carry ids and timestamps, and aggregates like the dashboard
 * and the ranker status have no schema at all. Those are declared here.
 *
 * Every enum-valued field below is derived from a shared tuple rather than
 * respelled, so adding a category or mood in `packages/shared` immediately
 * type-errors anything in the web app that has not accounted for it.
 *
 * Shapes were read off the route handlers in `apps/api/src/routes/**` and the
 * services they call, not guessed.
 */
import type {
  activityLevels,
  calendarEventTypes,
  exportFormats,
  feedbackActions,
  improvementStyles,
  lifeStages,
  moodValues,
  recommendationTypes,
  recurringRules,
  sleepQualities,
  taskCategories,
  taskPriorities,
  taskStatuses,
  themePreferences
} from "@planora/shared";

export type TaskPriority = (typeof taskPriorities)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskCategory = (typeof taskCategories)[number];
export type CalendarEventType = (typeof calendarEventTypes)[number];
export type MoodValue = (typeof moodValues)[number];
export type SleepQuality = (typeof sleepQualities)[number];
export type ThemePreference = (typeof themePreferences)[number];
export type ExportFormat = (typeof exportFormats)[number];
export type RecurringRule = (typeof recurringRules)[number];
export type RecommendationType = (typeof recommendationTypes)[number];
export type FeedbackAction = (typeof feedbackActions)[number];
export type LifeStage = (typeof lifeStages)[number];
export type ActivityLevel = (typeof activityLevels)[number];
export type ImprovementStyle = (typeof improvementStyles)[number];

/* -------------------------------------------------------------------------- */
/* Account                                                                     */
/* -------------------------------------------------------------------------- */

export type AccountSettings = {
  theme: ThemePreference;
  notificationEmail: boolean;
  notificationPush: boolean;
  privacyMode: boolean;
  aiPersonalization: boolean;
  exportFormat: ExportFormat;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: string;
  settings: AccountSettings | null;
};

export type PersonalProfile = {
  lifeStage: LifeStage | null;
  profession: string | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  interests: string[];
  primaryGoals: string[];
  preferredWakeTime: string | null;
  preferredSleepTime: string | null;
  improvementStyle: ImprovementStyle;
  useForPersonalization: boolean;
  allowAnonymousTraining: boolean;
};

/* -------------------------------------------------------------------------- */
/* Planning                                                                    */
/* -------------------------------------------------------------------------- */

export type Subtask = {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  dueDate: string | null;
  progress: number;
  color: string | null;
  recurringRule: string | null;
  order: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks?: Subtask[];
};

export type CalendarEvent = {
  id: string;
  taskId: string | null;
  title: string;
  description: string | null;
  type: CalendarEventType;
  startAt: string;
  endAt: string;
  color: string | null;
};

export type ActivityEntry = {
  id: string;
  title: string;
  category: TaskCategory;
  minutes: number;
  occurredAt: string;
  notes: string | null;
};

/** `buildPage` in the API returns exactly this alongside every cursor list. */
export type PageInfo = {
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
};

/* -------------------------------------------------------------------------- */
/* Wellbeing                                                                   */
/* -------------------------------------------------------------------------- */

export type MoodLog = {
  id: string;
  mood: MoodValue;
  stress: number;
  energy: number;
  reflection: string | null;
  loggedAt: string;
};

export type SleepLog = {
  id: string;
  hours: number;
  quality: SleepQuality;
  notes: string | null;
  loggedAt: string;
};

export type WaterLog = {
  id: string;
  amountMl: number;
  loggedAt: string;
};

export type JournalEntry = {
  id: string;
  title: string;
  body: string;
  mood: MoodValue | null;
  createdAt: string;
  updatedAt: string;
};

export type WellbeingSummary = {
  moodLogs: MoodLog[];
  sleepLogs: SleepLog[];
  waterTodayMl: number;
  journals: JournalEntry[];
  safetyNote: string;
};

/* -------------------------------------------------------------------------- */
/* Adaptation                                                                  */
/* -------------------------------------------------------------------------- */

export type Recommendation = {
  id: string;
  key: string;
  type: RecommendationType;
  title: string;
  body: string;
  actionLabel: string | null;
  actionUrl: string | null;
  active: boolean;
  metadata: Record<string, unknown> | null;
};

export type Habit = {
  id: string;
  key: string | null;
  title: string;
  category: TaskCategory;
  cadence: string;
  streak: number;
  longestStreak: number;
  occurrences: number;
  confidence: number;
  source: string;
  lastDoneAt: string | null;
  active: boolean;
};

export type DashboardData = {
  today: string;
  todayTasks: Task[];
  todayTasksHasMore: boolean;
  upcomingTasks: Task[];
  calendarEvents: CalendarEvent[];
  lifeSummary: {
    weeklyMinutes: number;
    fitnessMinutes: number;
    socialCount: number;
    foodCount: number;
    recent: ActivityEntry[];
  };
  moodSummary: { averageMood: number | null; latest: MoodLog | null };
  sleepSummary: { averageHours: number | null; latest: SleepLog | null };
  waterIntake: { todayMl: number; targetMl: number };
  productivityScore: number;
  streak: number;
  weeklyStatistics: {
    completedTasks: number;
    activeTasks: number;
    activeMinutes: number;
    moodLogs: number;
    sleepLogs: number;
  };
  habits: Habit[];
  recommendations: Recommendation[];
  aiCompanion: { latestMessage: string | null; prompt: string };
  quickActions: Array<{ label: string; href: string; icon: string }>;
};

/** `patterns.ts` — the detector kinds, and the audit object each one carries. */
export type PatternKind = "weekday_rhythm" | "co_occurrence" | "trend" | "lapse" | "time_of_day";

export type DetectedPattern = {
  kind: PatternKind;
  key: string;
  title: string;
  detail: string;
  confidence: number;
  evidence: Record<string, unknown>;
};

export type PatternReport = {
  generatedAt: string;
  windowDays: number;
  observedDays: number;
  patterns: DetectedPattern[];
  /** Checks that ran and found nothing, so an empty result is explainable. */
  inconclusive: Array<{ key: string; reason: string }>;
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
  focusWindow: { label: string; averageFocus: number; sessions: number } | null;
  topSignals: string[];
  nextImprovements: string[];
};

/* -------------------------------------------------------------------------- */
/* Companion                                                                   */
/* -------------------------------------------------------------------------- */

export type CompanionProvider = "LOCAL_RULES" | "OLLAMA";

export type CompanionStatus = {
  provider: CompanionProvider;
  ollamaAvailable: boolean;
  model: string;
};

export type CompanionTurn = {
  id: string;
  provider: CompanionProvider;
  prompt: string;
  response: string;
  createdAt: string;
};

export type CompanionReply = {
  response: string;
  provider: CompanionProvider;
  metadata: Record<string, unknown>;
};

type ContextTask = {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  dueDate: string | null;
  progress: number;
};

type ContextEvent = {
  id: string;
  title: string;
  type: CalendarEventType;
  startAt: string;
  endAt: string;
};

/** The snapshot from `companionContext.ts`, narrowed to what the UI reads. */
export type CompanionContext = {
  generatedAt: string;
  day: { todayLabel: string };
  user: { name: string; timezone: string; aiPersonalization: boolean; privacyMode: boolean };
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
    today: ActivityEntry[];
    food: ActivityEntry[];
    fitness: ActivityEntry[];
    social: ActivityEntry[];
    outdoors: ActivityEntry[];
    weeklyMinutes: number;
  };
  wellbeing: {
    waterTodayMl: number;
    waterTargetMl: number;
    averageMood: number | null;
    averageSleepHours: number | null;
  };
  habits: {
    stale: Array<{ title: string; cadence: string; streak: number; lastDoneAt: string | null }>;
  };
  recommendations: Array<Pick<Recommendation, "id" | "type" | "title" | "body" | "actionLabel" | "actionUrl">>;
  learning: {
    engine: string;
    confidence: number;
    focusWindow: string | null;
    topSignals: string[];
  };
  signals: string[];
};

export type CompanionContextResponse = {
  context: CompanionContext | null;
  personalizationEnabled: boolean;
  privacyMode: boolean;
};

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export type SearchResultType = "task" | "activity" | "journal" | "calendar";

export type SearchResult = {
  type: SearchResultType;
  id: string;
  title: string;
  href: string;
};
