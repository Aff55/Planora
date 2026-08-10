import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  accountDeleteSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  settingsSchema
} from "@planora/shared";
import { asyncHandler, HttpError, parseInput } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import {
  type AuthRequest,
  getSessionExpiry,
  readLogoutSession,
  requireAuth,
  sessionCookieName,
  signToken
} from "../middleware/auth.js";
import { resourceLimits, withSerializableTransaction } from "../services/resourceLimits.js";

export const authRouter = Router();

const userSelect = {
  id: true,
  email: true,
  name: true,
  timezone: true,
  createdAt: true,
  settings: true
};

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = parseInput(registerSchema, req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new HttpError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        timezone: input.timezone,
        settings: { create: {} }
      },
      select: userSelect
    });

    const rememberMe = Boolean(input.rememberMe);
    const token = await issueSession(user, rememberMe);
    setSessionCookie(res, token, rememberMe);
    res.status(201).json({ token, user });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = parseInput(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: { settings: true } });
    if (!user) throw new HttpError(401, "Invalid email or password");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid email or password");

    const rememberMe = Boolean(input.rememberMe);
    const token = await issueSession(user, rememberMe);
    setSessionCookie(res, token, rememberMe);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const session = readLogoutSession(req);
    if (session) {
      await prisma.authSession.updateMany({
        where: { id: session.sid, userId: session.sub, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  })
);

authRouter.post(
  "/logout-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = (req as AuthRequest).user;
    await prisma.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    clearSessionCookie(res);
    res.json({ ok: true });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: (req as AuthRequest).user.id },
      select: userSelect
    });
    res.json({ user });
  })
);

authRouter.put(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseInput(profileSchema, req.body);
    const user = await prisma.user.update({
      where: { id: (req as AuthRequest).user.id },
      data: input,
      select: userSelect
    });
    res.json({ user });
  })
);

authRouter.put(
  "/settings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseInput(settingsSchema, req.body);
    const settings = await prisma.settings.upsert({
      where: { userId: (req as AuthRequest).user.id },
      create: { userId: (req as AuthRequest).user.id, ...input },
      update: input
    });
    res.json({ settings });
  })
);

authRouter.delete(
  "/account",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseInput(accountDeleteSchema, req.body);
    const user = (req as AuthRequest).user;
    if (input.emailConfirmation !== user.email) {
      throw new HttpError(400, "Type your account email exactly to confirm deletion");
    }
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true }
    });
    if (!account || !(await bcrypt.compare(input.currentPassword, account.passwordHash))) {
      throw new HttpError(401, "Current password is incorrect");
    }

    await prisma.user.delete({ where: { id: user.id } });
    clearSessionCookie(res);
    res.status(204).send();
  })
);

authRouter.delete(
  "/ai-data",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const [interactions, memories, events] = await prisma.$transaction([
      prisma.aIInteraction.deleteMany({ where: { userId } }),
      prisma.embeddingMemory.deleteMany({ where: { userId } }),
      prisma.modelEvent.deleteMany({ where: { userId } })
    ]);
    res.json({
      cleared: {
        interactions: interactions.count,
        memories: memories.count,
        learningEvents: events.count
      }
    });
  })
);

authRouter.get(
  "/export",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const data = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        createdAt: true,
        settings: true,
        personalProfile: true,
        tasks: { include: { subtasks: true } },
        calendarEvents: true,
        activities: true,
        moodLogs: true,
        sleepLogs: true,
        waterLogs: true,
        journalEntries: true,
        recommendations: { include: { feedback: true } },
        habits: true
      }
    });
    if (!data) throw new HttpError(404, "Account not found");

    if (data.settings?.exportFormat === "CSV") {
      res.setHeader("Content-Disposition", 'attachment; filename="planora-export.csv"');
      res.type("text/csv").send(buildCsvExport(data));
      return;
    }
    res.setHeader("Content-Disposition", 'attachment; filename="planora-export.json"');
    res.type("application/json").send(JSON.stringify({ exportedAt: new Date().toISOString(), account: data }, null, 2));
  })
);

authRouter.post("/forgot-password", (_req, res) => {
  res.status(501).json({
    status: "unavailable",
    message: "Password reset is not enabled on this deployment."
  });
});

async function issueSession(user: { id: string; email: string; name: string }, rememberMe: boolean) {
  const expiresAt = getSessionExpiry(rememberMe);
  const session = await withSerializableTransaction(async (tx) => {
    const created = await tx.authSession.create({
      data: { userId: user.id, expiresAt }
    });
    await tx.authSession.deleteMany({
      where: { userId: user.id, OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] }
    });
    const surplus = await tx.authSession.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: resourceLimits.sessionsPerUser,
      select: { id: true }
    });
    if (surplus.length > 0) {
      await tx.authSession.deleteMany({ where: { id: { in: surplus.map((item) => item.id) } } });
    }
    return created;
  });
  return signToken(user, session.id, rememberMe);
}

function setSessionCookie(
  res: import("express").Response,
  token: string,
  rememberMe: boolean
) {
  res.cookie(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    ...(rememberMe ? { maxAge: 30 * 86_400_000 } : {})
  });
}

function clearSessionCookie(res: import("express").Response) {
  res.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api"
  });
}

function buildCsvExport(data: Record<string, unknown>) {
  const rows: string[][] = [["section", "id", "timestamp", "title", "details"]];
  for (const [section, value] of Object.entries(data)) {
    if (!Array.isArray(value)) continue;
    for (const item of value as Array<Record<string, unknown>>) {
      rows.push([
        section,
        String(item.id ?? ""),
        String(item.createdAt ?? item.loggedAt ?? item.occurredAt ?? item.startAt ?? ""),
        String(item.title ?? item.mood ?? item.quality ?? ""),
        JSON.stringify(item)
      ]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
