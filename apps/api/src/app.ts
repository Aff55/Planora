import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { prisma } from "./lib/prisma.js";
import { pingRedis } from "./lib/redis.js";
import { errorHandler } from "./lib/http.js";
import { getTrustProxyHops } from "./lib/config.js";
import { authRouter } from "./routes/auth.js";
import { activitiesRouter } from "./routes/activities.js";
import { calendarRouter } from "./routes/calendar.js";
import { companionRouter } from "./routes/companion.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { neuralRouter } from "./routes/neural.js";
import { profileRouter } from "./routes/profile.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { searchRouter } from "./routes/search.js";
import { tasksRouter } from "./routes/tasks.js";
import { wellbeingRouter } from "./routes/wellbeing.js";

export function createApp() {
  const app = express();
  const webOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  app.disable("x-powered-by");
  app.set("trust proxy", getTrustProxyHops());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || webOrigins.includes(origin));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb", strict: true }));

  app.use(
    "/api/health",
    rateLimit({
      windowMs: 60_000,
      limit: 30,
      standardHeaders: "draft-7",
      legacyHeaders: false
    })
  );
  app.get("/api/health", async (_req, res) => {
    const [db, redis] = await Promise.all([
      withTimeout(
        prisma.$queryRaw`SELECT 1`.then(() => ({ ok: true })),
        5_000,
        { ok: false }
      ).catch(() => ({ ok: false })),
      withTimeout(pingRedis(), 2_000, { configured: Boolean(process.env.REDIS_URL), ok: false })
    ]);
    const ok = db.ok && (!redis.configured || redis.ok);
    res.status(ok ? 200 : 503).json({
      ok,
      service: "planora-api",
      timestamp: new Date().toISOString(),
      db,
      redis
    });
  });

  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false
    })
  );
  app.use(
    ["/api/auth/login", "/api/auth/register", "/api/auth/forgot-password"],
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 10,
      standardHeaders: "draft-7",
      legacyHeaders: false
    })
  );
  app.use(
    "/api/companion/chat",
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 30,
      standardHeaders: "draft-7",
      legacyHeaders: false
    })
  );

  app.use("/api/auth", authRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/wellbeing", wellbeingRouter);
  app.use("/api/activities", activitiesRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/recommendations", recommendationsRouter);
  app.use("/api/neural", neuralRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/companion", companionRouter);
  app.use("/api/search", searchRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  app.use(errorHandler);

  return app;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T) {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
