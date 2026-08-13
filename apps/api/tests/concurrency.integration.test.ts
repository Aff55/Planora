import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

/**
 * Concurrent writes by a single account.
 *
 * Every quota check in `services/resourceLimits.ts` counts a user's rows and
 * then inserts into that same range, inside a Serializable transaction. Two
 * writes arriving together therefore conflict by construction: Postgres aborts
 * one with a serialization failure (Prisma P2034), and if enough are in flight
 * the next one cannot even acquire a transaction slot (P2028).
 *
 * Before the retry loop backed off, this was easy to hit: a burst of twelve
 * creates returned roughly three successes, six 409s and three 500s, and the
 * failed writes were simply lost. A user double-tapping "add", or a mobile
 * client flushing a queue of offline edits, is exactly this shape of load.
 *
 * These tests pin the fix. They are deliberately written against the observable
 * contract - every accepted write is persisted, and nothing 500s - rather than
 * against retry counts or timings, so tuning the backoff does not break them.
 *
 * Requires the local Postgres/Redis stack: `docker compose up -d` and
 * `npm run db:migrate` from the repo root before running `npm test`.
 */
describe("concurrent writes from one account", () => {
  const app = createApp();
  const email = `concurrency-integration-${Date.now()}@example.test`;
  const password = "Concurrency123!";
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const registration = await request(app).post("/api/auth/register").send({
      name: "Concurrency Integration",
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

  it("accepts a burst of simultaneous task creates and loses none of them", async () => {
    const burst = 12;
    const responses = await Promise.all(
      Array.from({ length: burst }, (_, index) =>
        request(app)
          .post("/api/tasks")
          .set("Authorization", `Bearer ${token}`)
          .send({ title: `Burst task ${index}`, category: "OTHER" })
      )
    );

    // No request may fail with a server error. A serialization conflict is a
    // condition this code is expected to absorb, not to surface as a 500.
    expect(responses.filter((response) => response.status >= 500)).toHaveLength(0);
    expect(responses.every((response) => response.status === 201)).toBe(true);

    // Every acknowledged create must actually be readable afterwards.
    const listed = await request(app)
      .get("/api/tasks?limit=100")
      .set("Authorization", `Bearer ${token}`);
    expect(listed.status).toBe(200);
    const persisted = listed.body.tasks.filter((task: { title: string }) =>
      task.title.startsWith("Burst task ")
    );
    expect(persisted).toHaveLength(burst);
  });

  it("absorbs simultaneous writes on a second quota path", async () => {
    const burst = 10;
    const responses = await Promise.all(
      Array.from({ length: burst }, () =>
        request(app)
          .post("/api/wellbeing/water")
          .set("Authorization", `Bearer ${token}`)
          .send({ amountMl: 100 })
      )
    );

    expect(responses.filter((response) => response.status >= 500)).toHaveLength(0);
    expect(responses.every((response) => response.status === 201)).toBe(true);
  });

  it("does not double-apply a completion replayed concurrently", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Concurrently completed recurring task",
        category: "PERSONAL",
        recurringRule: "DAILY",
        dueDate: new Date(Date.now() + 60_000).toISOString()
      });
    expect(created.status).toBe(201);
    const taskId = created.body.task.id;

    // The same completion fired five times at once. Exactly one follow-up may
    // exist afterwards: idempotency has to hold under races, not just replays.
    const completions = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .patch(`/api/tasks/${taskId}/complete`)
          .set("Authorization", `Bearer ${token}`)
          .send({ completed: true })
      )
    );
    expect(completions.filter((response) => response.status >= 500)).toHaveLength(0);

    const listed = await request(app)
      .get("/api/tasks?limit=100")
      .set("Authorization", `Bearer ${token}`);
    const occurrences = listed.body.tasks.filter(
      (task: { title: string }) => task.title === "Concurrently completed recurring task"
    );
    expect(occurrences).toHaveLength(2);
  });
});
