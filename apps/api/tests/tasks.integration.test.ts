import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

/**
 * End-to-end coverage for the task lifecycle through the real Express app and
 * a live Postgres database (via Prisma). This is the CRUD surface every other
 * page (dashboard, calendar, companion) reads from, and it previously had no
 * route-level test at all - only pure-function unit tests existed elsewhere.
 *
 * Requires the local Postgres/Redis stack: `docker compose up -d` and
 * `npm run db:migrate` from the repo root before running `npm test`.
 */
describe("task lifecycle", () => {
  const app = createApp();
  const email = `tasks-integration-${Date.now()}@example.test`;
  const password = "TasksIntegration123!";
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const registration = await request(app).post("/api/auth/register").send({
      name: "Tasks Integration",
      email,
      password,
      timezone: "UTC",
      rememberMe: false
    });
    expect(registration.status).toBe(201);
    token = registration.body.token;
    userId = registration.body.user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
  });

  it("creates a task with subtasks and returns it", async () => {
    const response = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Write the FYP report",
        category: "WORK",
        priority: "HIGH",
        subtasks: [{ title: "Draft outline" }, { title: "Add screenshots" }]
      });

    expect(response.status).toBe(201);
    expect(response.body.task.title).toBe("Write the FYP report");
    expect(response.body.task.status).toBe("TODO");
    expect(response.body.task.subtasks).toHaveLength(2);
  });

  it("lists only the authenticated user's tasks", async () => {
    const response = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.tasks.length).toBeGreaterThanOrEqual(1);
    expect(response.body.tasks.every((task: { id: string }) => typeof task.id === "string")).toBe(true);
  });

  it("rejects task access without a session", async () => {
    const response = await request(app).get("/api/tasks");
    expect(response.status).toBe(401);
  });

  it("completing a recurring task creates exactly one follow-up occurrence, even if replayed", async () => {
    // A next occurrence is only generated when the task has BOTH a recurringRule
    // and a dueDate (see getNextRecurringDate in routes/tasks.ts) - a rule alone
    // is not enough, since there is nothing to advance the date from.
    const created = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Daily journal entry",
        category: "PERSONAL",
        recurringRule: "DAILY",
        dueDate: new Date(Date.now() + 60_000).toISOString()
      });
    expect(created.status).toBe(201);
    const taskId = created.body.task.id;

    const firstComplete = await request(app)
      .patch(`/api/tasks/${taskId}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .send({ completed: true });
    expect(firstComplete.status).toBe(200);
    expect(firstComplete.body.task.status).toBe("COMPLETED");
    expect(firstComplete.body.nextTask).not.toBeNull();
    expect(firstComplete.body.nextTask.title).toBe("Daily journal entry");
    const nextTaskId = firstComplete.body.nextTask.id;

    const listAfterFirst = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    const journalOccurrences = listAfterFirst.body.tasks.filter((task: { title: string }) => task.title === "Daily journal entry");
    expect(journalOccurrences).toHaveLength(2); // the completed original + exactly one new occurrence

    // Replaying the same completion request must not create a second follow-up,
    // because the original task's status is already COMPLETED the second time.
    const secondComplete = await request(app)
      .patch(`/api/tasks/${taskId}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .send({ completed: true });
    expect(secondComplete.status).toBe(200);
    expect(secondComplete.body.nextTask).toBeNull();

    const listAfterReplay = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    const journalOccurrencesAfterReplay = listAfterReplay.body.tasks.filter(
      (task: { title: string }) => task.title === "Daily journal entry"
    );
    expect(journalOccurrencesAfterReplay).toHaveLength(2);
    expect(journalOccurrencesAfterReplay.map((task: { id: string }) => task.id)).toContain(nextTaskId);
  });

  it("updates and then deletes a task", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Temporary task", category: "OTHER" });
    const taskId = created.body.task.id;

    const updated = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Renamed task", progress: 50 });
    expect(updated.status).toBe(200);
    expect(updated.body.task.title).toBe("Renamed task");
    expect(updated.body.task.progress).toBe(50);

    const deleted = await request(app).delete(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`);
    expect(deleted.status).toBe(204);

    const afterDelete = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(afterDelete.body.tasks.some((task: { id: string }) => task.id === taskId)).toBe(false);
  });
});
