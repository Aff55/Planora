import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

/**
 * End-to-end coverage for the account lifecycle: register, login, session use,
 * logout, and session revocation. Auth guards every other route, but before
 * this file the only auth-related test was the 401-when-unauthenticated case
 * in app.test.ts - nothing exercised a real register/login/logout round trip
 * or confirmed that logout actually revokes the session server-side.
 *
 * Requires the local Postgres/Redis stack: `docker compose up -d` and
 * `npm run db:migrate` from the repo root before running `npm test`.
 */
describe("account lifecycle", () => {
  const app = createApp();
  const email = `auth-integration-${Date.now()}@example.test`;
  const password = "AuthIntegration123!";
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) {
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
  });

  it("registers a new account and returns a usable session token", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Auth Integration",
      email,
      password,
      timezone: "UTC",
      rememberMe: false
    });
    expect(response.status).toBe(201);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.passwordHash).toBeUndefined();
    createdUserIds.push(response.body.user.id);
  });

  it("rejects registering the same email twice", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Duplicate",
      email,
      password,
      timezone: "UTC"
    });
    expect(response.status).toBe(409);
  });

  it("logs in with correct credentials and rejects incorrect ones", async () => {
    const good = await request(app).post("/api/auth/login").send({ email, password });
    expect(good.status).toBe(200);
    expect(good.body.token).toBeTruthy();

    const bad = await request(app).post("/api/auth/login").send({ email, password: "WrongPassword123!" });
    expect(bad.status).toBe(401);
  });

  it("uses the session token to fetch the current user", async () => {
    const login = await request(app).post("/api/auth/login").send({ email, password });
    const token = login.body.token;

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it("logout revokes the session so the token can no longer be used", async () => {
    const login = await request(app).post("/api/auth/login").send({ email, password });
    const token = login.body.token;

    const meBeforeLogout = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(meBeforeLogout.status).toBe(200);

    const logout = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);
    expect(logout.status).toBe(200);

    const meAfterLogout = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(meAfterLogout.status).toBe(401);
  });

  it("logout-all revokes every session for the account, not just the current one", async () => {
    const sessionA = await request(app).post("/api/auth/login").send({ email, password });
    const sessionB = await request(app).post("/api/auth/login").send({ email, password });
    expect(sessionA.body.token).not.toBe(sessionB.body.token);

    const logoutAll = await request(app)
      .post("/api/auth/logout-all")
      .set("Authorization", `Bearer ${sessionA.body.token}`);
    expect(logoutAll.status).toBe(200);

    const checkA = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${sessionA.body.token}`);
    const checkB = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${sessionB.body.token}`);
    expect(checkA.status).toBe(401);
    expect(checkB.status).toBe(401);
  });
});
