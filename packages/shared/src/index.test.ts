import { describe, expect, it } from "vitest";
import {
  accountDeleteSchema,
  calendarQuerySchema,
  moodLogSchema,
  personalProfileSchema,
  profileSchema,
  registerSchema,
  taskReorderSchema,
  taskCreateSchema,
  taskQuerySchema
} from "./index.js";

describe("shared validators", () => {
  it("accepts a complete task payload", () => {
    const result = taskCreateSchema.parse({
      title: "Prep weekly grocery list",
      priority: "HIGH",
      status: "TODO",
      category: "PERSONAL",
      progress: 20,
      dueDate: new Date().toISOString(),
      recurringRule: "WEEKLY",
      subtasks: [{ title: "Check pantry", completed: false }]
    });

    expect(result.title).toBe("Prep weekly grocery list");
    expect(result.subtasks).toHaveLength(1);
  });

  it("rejects invalid wellbeing ranges", () => {
    expect(() => moodLogSchema.parse({ mood: "GOOD", stress: 11, energy: 5 })).toThrow();
  });

  it("rejects ambiguous date-only values and invalid timezones", () => {
    expect(() => taskCreateSchema.parse({ title: "Ambiguous", dueDate: "2026-07-20" })).toThrow();
    expect(() => profileSchema.parse({ name: "Test User", timezone: "Mars/Olympus" })).toThrow();
  });

  it("captures a valid account timezone and keeps UTC compatibility", () => {
    const base = { name: "Test User", email: "user@example.com", password: "Planora123!" };
    expect(registerSchema.parse({ ...base, timezone: "Asia/Kuala_Lumpur" }).timezone).toBe("Asia/Kuala_Lumpur");
    expect(registerSchema.parse(base).timezone).toBe("UTC");
    expect(() => registerSchema.parse({ ...base, timezone: "Local/Unknown" })).toThrow();
  });

  it("requires a current password for account deletion", () => {
    expect(() => accountDeleteSchema.parse({ emailConfirmation: "a@example.com" })).toThrow();
    expect(
      accountDeleteSchema.parse({
        emailConfirmation: "A@EXAMPLE.COM",
        currentPassword: "Planora123!"
      })
    ).toEqual({ emailConfirmation: "a@example.com", currentPassword: "Planora123!" });
  });

  it("rejects duplicate or unbounded task reorder payloads", () => {
    const id = "clx1234567890abcdefghijk";
    expect(() => taskReorderSchema.parse({ orderedIds: [id, id] })).toThrow();
    expect(() =>
      taskReorderSchema.parse({
        orderedIds: Array.from({ length: 501 }, (_, index) => `cl${String(index).padStart(23, "0")}`)
      })
    ).toThrow();
  });

  it("enforces server-compatible pagination bounds", () => {
    expect(taskQuerySchema.parse({})).toMatchObject({ limit: 40 });
    expect(calendarQuerySchema.parse({ month: "2026-07", limit: "100" })).toMatchObject({ limit: 100 });
    expect(() => taskQuerySchema.parse({ limit: 101 })).toThrow();
    expect(() => taskQuerySchema.parse({ search: "x".repeat(101) })).toThrow();
    expect(() => calendarQuerySchema.parse({ limit: 0 })).toThrow();
    expect(() => calendarQuerySchema.parse({ month: "2026-13" })).toThrow();
  });

  it("validates optional profile details and keeps consent off by default", () => {
    const profile = personalProfileSchema.parse({
      lifeStage: "WORKING_PROFESSIONAL",
      profession: "Product designer",
      heightCm: 178,
      weightKg: 76.5,
      activityLevel: "MODERATELY_ACTIVE",
      interests: ["Cooking", "Design"],
      primaryGoals: ["Train consistently"],
      preferredWakeTime: "07:30"
    });
    expect(profile).toMatchObject({
      improvementStyle: "BALANCED",
      useForPersonalization: false,
      allowAnonymousTraining: false,
      allowProductAnalytics: false
    });
    expect(() => personalProfileSchema.parse({ heightCm: 30 })).toThrow();
    expect(() => personalProfileSchema.parse({ preferredSleepTime: "25:00" })).toThrow();
    expect(() => personalProfileSchema.parse({ interests: Array.from({ length: 13 }, () => "Too many") })).toThrow();
  });
});
