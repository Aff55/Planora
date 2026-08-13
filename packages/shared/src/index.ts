import { z } from "zod";

export const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const taskStatuses = ["TODO", "IN_PROGRESS", "COMPLETED", "DEFERRED"] as const;
export const taskCategories = [
  "WORK",
  "WELLBEING",
  "PERSONAL",
  "FITNESS",
  "SOCIAL",
  "FINANCE",
  "OTHER"
] as const;
export const calendarEventTypes = [
  "TASK",
  "ACTIVITY",
  "HOLIDAY",
  "BREAK",
  "PERSONAL"
] as const;
export const moodValues = ["VERY_LOW", "LOW", "OKAY", "GOOD", "GREAT"] as const;
export const sleepQualities = ["POOR", "FAIR", "GOOD", "EXCELLENT"] as const;
export const themePreferences = ["SYSTEM", "LIGHT", "DARK"] as const;
export const exportFormats = ["JSON", "CSV"] as const;
export const recurringRules = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export const recommendationTypes = [
  "OVERDUE_TASK_REVIEW",
  "LOW_WATER_INTAKE",
  "POOR_SLEEP",
  "HIGH_STRESS_LOW_MOOD",
  "OVERWORK_WARNING",
  "FOCUS_WINDOW",
  "HABIT_RESTART"
] as const;
export const feedbackActions = ["ACCEPTED", "DISMISSED", "SNOOZED"] as const;
export const lifeStages = [
  "STUDENT",
  "WORKING_PROFESSIONAL",
  "SELF_EMPLOYED",
  "CAREGIVER",
  "RETIRED",
  "BETWEEN_ROLES",
  "OTHER",
  "PREFER_NOT_TO_SAY"
] as const;
export const activityLevels = [
  "SEDENTARY",
  "LIGHTLY_ACTIVE",
  "MODERATELY_ACTIVE",
  "VERY_ACTIVE",
  "ATHLETE"
] as const;
export const improvementStyles = ["GENTLE", "BALANCED", "AMBITIOUS"] as const;

export const defaultPageSize = 40;
export const maximumPageSize = 100;

export const nonEmptyString = z.string().trim().min(1);
export const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(isValidTimeZone, "Enter a valid IANA timezone, such as Asia/Kuala_Lumpur.");
export const optionalDateTime = z
  .union([z.string().datetime(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : undefined));

export const registerSchema = z.object({
  name: nonEmptyString.max(120),
  email: z.string().trim().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
  timezone: timeZoneSchema.default("UTC"),
  rememberMe: z.boolean().optional().default(false)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255).toLowerCase(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false)
});

export const profileSchema = z.object({
  name: nonEmptyString.max(120),
  timezone: timeZoneSchema.default("UTC")
});

export const settingsSchema = z.object({
  theme: z.enum(themePreferences).default("SYSTEM"),
  notificationEmail: z.boolean().default(false),
  notificationPush: z.boolean().default(false),
  privacyMode: z.boolean().default(false),
  aiPersonalization: z.boolean().default(true),
  exportFormat: z.enum(exportFormats).default("JSON")
});

const optionalClockTime = z
  .union([z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const personalProfileSchema = z.object({
  lifeStage: z.enum(lifeStages).optional().nullable(),
  profession: z.string().trim().max(120).optional().nullable(),
  heightCm: z.number().min(80).max(250).optional().nullable(),
  weightKg: z.number().min(25).max(400).optional().nullable(),
  activityLevel: z.enum(activityLevels).optional().nullable(),
  interests: z.array(nonEmptyString.max(60)).max(12).default([]),
  primaryGoals: z.array(nonEmptyString.max(120)).max(8).default([]),
  preferredWakeTime: optionalClockTime,
  preferredSleepTime: optionalClockTime,
  improvementStyle: z.enum(improvementStyles).default("BALANCED"),
  useForPersonalization: z.boolean().default(false),
  allowAnonymousTraining: z.boolean().default(false)
});

export const accountDeleteSchema = z.object({
  emailConfirmation: z.string().trim().email().toLowerCase(),
  currentPassword: z.string().min(8).max(128)
});

export const subtaskSchema = z.object({
  id: z.string().optional(),
  title: nonEmptyString.max(180),
  completed: z.boolean().optional().default(false),
  order: z.number().int().min(0).optional()
});

export const taskCreateSchema = z.object({
  title: nonEmptyString.max(180),
  description: z.string().trim().max(4000).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  priority: z.enum(taskPriorities).default("MEDIUM"),
  status: z.enum(taskStatuses).default("TODO"),
  category: z.enum(taskCategories).default("OTHER"),
  dueDate: optionalDateTime,
  progress: z.number().int().min(0).max(100).default(0),
  color: z.string().trim().max(32).optional().nullable(),
  recurringRule: z.enum(recurringRules).optional().nullable(),
  subtasks: z.array(subtaskSchema).max(30).optional().default([])
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const taskQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(taskStatuses).optional(),
  category: z.enum(taskCategories).optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(maximumPageSize).default(defaultPageSize)
});

export const taskReorderSchema = z.object({
  orderedIds: z.array(z.string().cuid()).min(1).max(500)
}).refine((value) => new Set(value.orderedIds).size === value.orderedIds.length, {
  message: "Task reorder ids must be unique.",
  path: ["orderedIds"]
});

export const calendarEventSchema = z
  .object({
    title: nonEmptyString.max(180),
    description: z.string().trim().max(4000).optional().nullable(),
    type: z.enum(calendarEventTypes).default("PERSONAL"),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    color: z.string().trim().max(32).optional().nullable(),
    taskId: z.string().cuid().optional().nullable()
  })
  .refine((value) => new Date(value.endAt).getTime() >= new Date(value.startAt).getTime(), {
    message: "Event end time must be after start time.",
    path: ["endAt"]
  });

export const calendarQuerySchema = z.object({
  month: z.string().regex(/^(?:19|20|21|22)\d{2}-(?:0[1-9]|1[0-2])$/).optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(maximumPageSize).default(defaultPageSize)
});

export const moodLogSchema = z.object({
  mood: z.enum(moodValues),
  stress: z.number().int().min(1).max(10),
  energy: z.number().int().min(1).max(10),
  reflection: z.string().trim().max(4000).optional().nullable()
});

export const sleepLogSchema = z.object({
  hours: z.number().min(0).max(24),
  quality: z.enum(sleepQualities),
  notes: z.string().trim().max(2000).optional().nullable()
});

export const activitySchema = z.object({
  title: nonEmptyString.max(180),
  category: z.enum(taskCategories).default("PERSONAL"),
  minutes: z.number().int().min(0).max(1440).default(0),
  occurredAt: z.string().datetime().optional(),
  notes: z.string().trim().max(4000).optional().nullable()
});

export const waterLogSchema = z.object({
  amountMl: z.number().int().min(1).max(5000),
  loggedAt: z.string().datetime().optional()
});

export const journalEntrySchema = z.object({
  title: nonEmptyString.max(180),
  body: nonEmptyString.max(20000),
  mood: z.enum(moodValues).optional().nullable()
});

export const companionChatSchema = z.object({
  message: nonEmptyString.max(800)
});

export const recommendationFeedbackSchema = z.object({
  action: z.enum(feedbackActions),
  note: z.string().trim().max(1000).optional().nullable()
});

export const searchSchema = z.object({
  q: nonEmptyString.max(100)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type PersonalProfileInput = z.infer<typeof personalProfileSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
export type MoodLogInput = z.infer<typeof moodLogSchema>;
export type SleepLogInput = z.infer<typeof sleepLogSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
export type WaterLogInput = z.infer<typeof waterLogSchema>;
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
export type CompanionChatInput = z.infer<typeof companionChatSchema>;

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
