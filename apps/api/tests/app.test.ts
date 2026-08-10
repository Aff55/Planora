import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("Planora API app", () => {
  const app = createApp();

  it("returns a useful 404 for unknown routes", async () => {
    const response = await request(app).get("/api/nope");
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Route not found");
  });

  it("fails closed when password reset delivery is not configured", async () => {
    const response = await request(app).post("/api/auth/forgot-password").send({ email: "demo@planora.local" });
    expect(response.status).toBe(501);
    expect(response.body.status).toBe("unavailable");
  });

  it("protects user-owned routes", async () => {
    const response = await request(app).get("/api/tasks");
    expect(response.status).toBe(401);
  });

  it("returns a client error for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":');
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/valid JSON/);
  });

  it("sets baseline browser security headers", async () => {
    const response = await request(app).get("/api/nope");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});
