import { Router } from "express";
import { journalEntrySchema, moodLogSchema, sleepLogSchema, waterLogSchema } from "@planora/shared";
import { getDayRange, getRollingDayRange, normalizeTimeZone } from "../lib/dateTime.js";
import { asyncHandler, HttpError, parseInput, routeParam } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { upsertMemory } from "../services/memory.js";
import { recordModelEvent } from "../services/modelEvents.js";
import {
  assertJournalEntryQuota,
  assertMoodLogQuota,
  assertSleepLogQuota,
  assertWaterLogQuota,
  withSerializableTransaction
} from "../services/resourceLimits.js";

export const wellbeingRouter = Router();
wellbeingRouter.use(requireAuth);

wellbeingRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    const timeZone = normalizeTimeZone(user?.timezone);
    const todayRange = getDayRange(timeZone);
    const weekRange = getRollingDayRange(timeZone, 7);
    const [moodLogs, sleepLogs, waterToday, journals] = await Promise.all([
      prisma.moodLog.findMany({
        where: { userId, loggedAt: { gte: weekRange.start, lt: weekRange.end } },
        orderBy: { loggedAt: "desc" },
        take: 50
      }),
      prisma.sleepLog.findMany({
        where: { userId, loggedAt: { gte: weekRange.start, lt: weekRange.end } },
        orderBy: { loggedAt: "desc" },
        take: 50
      }),
      prisma.waterLog.aggregate({
        where: { userId, loggedAt: { gte: todayRange.start, lt: todayRange.end } },
        _sum: { amountMl: true }
      }),
      prisma.journalEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 6 })
    ]);
    res.json({
      moodLogs,
      sleepLogs,
      waterTodayMl: waterToday._sum.amountMl ?? 0,
      journals,
      safetyNote:
        "Planora tracks patterns and can suggest planning adjustments, but it does not diagnose or treat medical or mental health conditions."
    });
  })
);

wellbeingRouter.get(
  "/mood",
  asyncHandler(async (req, res) => {
    const logs = await prisma.moodLog.findMany({
      where: { userId: (req as AuthRequest).user.id },
      orderBy: { loggedAt: "desc" },
      take: 40
    });
    res.json({ logs });
  })
);

wellbeingRouter.post(
  "/mood",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(moodLogSchema, req.body);
    const log = await withSerializableTransaction(async (tx) => {
      await assertMoodLogQuota(tx, userId);
      return tx.moodLog.create({ data: { userId, ...input } });
    });
    await recordModelEvent(userId, "mood_logged", input);
    res.status(201).json({ log });
  })
);

wellbeingRouter.delete(
  "/mood/:id",
  asyncHandler(async (req, res) => {
    await deleteOwnedRecord("moodLog", (req as AuthRequest).user.id, routeParam(req.params.id, "Mood log id"));
    res.status(204).send();
  })
);

wellbeingRouter.get(
  "/sleep",
  asyncHandler(async (req, res) => {
    const logs = await prisma.sleepLog.findMany({
      where: { userId: (req as AuthRequest).user.id },
      orderBy: { loggedAt: "desc" },
      take: 40
    });
    res.json({ logs });
  })
);

wellbeingRouter.post(
  "/sleep",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(sleepLogSchema, req.body);
    const log = await withSerializableTransaction(async (tx) => {
      await assertSleepLogQuota(tx, userId);
      return tx.sleepLog.create({ data: { userId, ...input } });
    });
    await recordModelEvent(userId, "sleep_logged", input);
    res.status(201).json({ log });
  })
);

wellbeingRouter.delete(
  "/sleep/:id",
  asyncHandler(async (req, res) => {
    await deleteOwnedRecord("sleepLog", (req as AuthRequest).user.id, routeParam(req.params.id, "Sleep log id"));
    res.status(204).send();
  })
);

wellbeingRouter.get(
  "/water",
  asyncHandler(async (req, res) => {
    const logs = await prisma.waterLog.findMany({
      where: { userId: (req as AuthRequest).user.id },
      orderBy: { loggedAt: "desc" },
      take: 60
    });
    res.json({ logs });
  })
);

wellbeingRouter.post(
  "/water",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(waterLogSchema, req.body);
    const log = await withSerializableTransaction(async (tx) => {
      await assertWaterLogQuota(tx, userId);
      return tx.waterLog.create({
        data: {
          userId,
          amountMl: input.amountMl,
          loggedAt: input.loggedAt ? new Date(input.loggedAt) : undefined
        }
      });
    });
    await recordModelEvent(userId, "water_logged", input);
    res.status(201).json({ log });
  })
);

wellbeingRouter.delete(
  "/water/:id",
  asyncHandler(async (req, res) => {
    await deleteOwnedRecord("waterLog", (req as AuthRequest).user.id, routeParam(req.params.id, "Water log id"));
    res.status(204).send();
  })
);

wellbeingRouter.get(
  "/journal",
  asyncHandler(async (req, res) => {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: (req as AuthRequest).user.id },
      orderBy: { createdAt: "desc" },
      take: 40
    });
    res.json({ entries });
  })
);

wellbeingRouter.post(
  "/journal",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(journalEntrySchema, req.body);
    const entry = await withSerializableTransaction(async (tx) => {
      await assertJournalEntryQuota(tx, userId);
      return tx.journalEntry.create({ data: { userId, ...input } });
    });
    await upsertMemory({
      userId,
      sourceType: "JournalEntry",
      sourceId: entry.id,
      content: `${entry.title}. ${entry.body}`,
      metadata: { mood: entry.mood }
    });
    await recordModelEvent(userId, "journal_created", { entryId: entry.id, mood: entry.mood });
    res.status(201).json({ entry });
  })
);

wellbeingRouter.put(
  "/journal/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const id = routeParam(req.params.id, "Journal entry id");
    const input = parseInput(journalEntrySchema, req.body);
    const existing = await prisma.journalEntry.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, "Journal entry not found");
    const entry = await prisma.journalEntry.update({ where: { id: existing.id }, data: input });
    await upsertMemory({
      userId,
      sourceType: "JournalEntry",
      sourceId: entry.id,
      content: `${entry.title}. ${entry.body}`,
      metadata: { mood: entry.mood }
    });
    res.json({ entry });
  })
);

wellbeingRouter.delete(
  "/journal/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const id = routeParam(req.params.id, "Journal entry id");
    const existing = await prisma.journalEntry.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, "Journal entry not found");
    await prisma.$transaction([
      prisma.embeddingMemory.deleteMany({ where: { userId, sourceType: "JournalEntry", sourceId: existing.id } }),
      prisma.journalEntry.delete({ where: { id: existing.id } })
    ]);
    await recordModelEvent(userId, "journal_deleted", { entryId: existing.id });
    res.status(204).send();
  })
);

async function deleteOwnedRecord(model: "moodLog" | "sleepLog" | "waterLog", userId: string, id: string) {
  const existing =
    model === "moodLog"
      ? await prisma.moodLog.findFirst({ where: { id, userId }, select: { id: true } })
      : model === "sleepLog"
        ? await prisma.sleepLog.findFirst({ where: { id, userId }, select: { id: true } })
        : await prisma.waterLog.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new HttpError(404, "Wellbeing log not found");
  if (model === "moodLog") await prisma.moodLog.delete({ where: { id: existing.id } });
  else if (model === "sleepLog") await prisma.sleepLog.delete({ where: { id: existing.id } });
  else await prisma.waterLog.delete({ where: { id: existing.id } });
  await recordModelEvent(userId, `${model}_deleted`, { id: existing.id });
}
