export type SettingsShape = {
  theme: "SYSTEM" | "LIGHT" | "DARK";
  notificationEmail: boolean;
  notificationPush: boolean;
  privacyMode: boolean;
  aiPersonalization: boolean;
  exportFormat: "JSON" | "CSV";
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  timezone: string;
  settings?: SettingsShape | null;
};

export type PersonalProfile = {
  id?: string;
  lifeStage:
    | "STUDENT"
    | "WORKING_PROFESSIONAL"
    | "SELF_EMPLOYED"
    | "CAREGIVER"
    | "RETIRED"
    | "BETWEEN_ROLES"
    | "OTHER"
    | "PREFER_NOT_TO_SAY"
    | null;
  profession: string | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: "SEDENTARY" | "LIGHTLY_ACTIVE" | "MODERATELY_ACTIVE" | "VERY_ACTIVE" | "ATHLETE" | null;
  interests: string[];
  primaryGoals: string[];
  preferredWakeTime: string | null;
  preferredSleepTime: string | null;
  improvementStyle: "GENTLE" | "BALANCED" | "AMBITIOUS";
  useForPersonalization: boolean;
  allowAnonymousTraining: boolean;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  priority: string;
  status: string;
  category: string;
  dueDate?: string | null;
  progress: number;
  color?: string | null;
  recurringRule?: string | null;
  subtasks?: Array<{ id: string; title: string; completed: boolean; order: number }>;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  startAt: string;
  endAt: string;
  color?: string | null;
};

export type PageInfo = {
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
};

export type ActivityEntry = {
  id: string;
  title: string;
  category: string;
  minutes: number;
  occurredAt: string;
  notes?: string | null;
};

export type Recommendation = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionLabel?: string | null;
  actionUrl?: string | null;
};

export type DashboardData = {
  todayTasks: Task[];
  todayTasksHasMore?: boolean;
  upcomingTasks: Task[];
  calendarEvents: CalendarEvent[];
  lifeSummary: { weeklyMinutes: number; fitnessMinutes: number; socialCount: number; foodCount: number; recent: ActivityEntry[] };
  moodSummary: { averageMood: number | null; latest: { mood: string; stress: number; energy: number } | null };
  sleepSummary: { averageHours: number | null; latest: { hours: number; quality: string } | null };
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
  habits: Array<{ id: string; title: string; streak: number; cadence: string }>;
  recommendations: Recommendation[];
  aiCompanion: { latestMessage: string | null; prompt: string };
  quickActions: Array<{ label: string; href: string; icon: string }>;
};

export type CompanionStatus = {
  provider: "LOCAL_RULES" | "OLLAMA";
  ollamaAvailable: boolean;
  model: string;
};

export type CompanionContext = {
  generatedAt: string;
  counts: {
    overdueTasks: number;
    todayTasks: number;
    upcomingTasks: number;
    calendarEvents: number;
    activeRecommendations: number;
    activeHabits: number;
  };
  tasks: {
    overdue: Task[];
    today: Task[];
    upcoming: Task[];
    highPriorityUnscheduled: Task[];
  };
  calendar: {
    today: CalendarEvent[];
    upcoming: CalendarEvent[];
    conflicts: Array<{ first: string; second: string; startsAt: string }>;
  };
  life: {
    today: ActivityEntry[];
    recent: ActivityEntry[];
    food: ActivityEntry[];
    fitness: ActivityEntry[];
    social: ActivityEntry[];
    outdoors: ActivityEntry[];
    weeklyMinutes: number;
  };
  wellbeing: {
    waterTodayMl: number;
    waterTargetMl: number;
    latestMood: { mood: string; stress: number; energy: number; reflection?: string | null; loggedAt: string } | null;
    averageMood: number | null;
    latestSleep: { hours: number; quality: string; notes?: string | null; loggedAt: string } | null;
    averageSleepHours: number | null;
  };
  habits: {
    stale: Array<{ title: string; cadence: string; streak: number; lastDoneAt: string | null }>;
  };
  recommendations: Recommendation[];
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
    topSignals: string[];
    recommendationWeights: Record<string, number>;
  };
  signals: string[];
};

export type WellbeingSummary = {
  moodLogs: Array<{ id: string; mood: string; stress: number; energy: number; reflection?: string | null; loggedAt: string }>;
  sleepLogs: Array<{ id: string; hours: number; quality: string; notes?: string | null; loggedAt: string }>;
  waterTodayMl: number;
  journals: Array<{ id: string; title: string; body: string; mood?: string | null; createdAt: string }>;
  safetyNote: string;
};

export type AdaptiveRankerStatus = {
  engine: "LOCAL_ONLINE_RANKER";
  version: string;
  learningMode: "user_scoped_online";
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

export type AIHistoryItem = {
  id: string;
  prompt: string;
  response: string;
  provider: string;
  createdAt: string;
};

export type SearchResult = {
  type: string;
  id: string;
  title: string;
  href: string;
  item: unknown;
};
