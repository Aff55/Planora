import { Router } from "express";
import { activitySchema } from "@planora/shared";
import { getDayRange, getRollingDayRange, normalizeTimeZone } from "../lib/dateTime.js";
import { asyncHandler, parseInput, routeParam } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { upsertMemory } from "../services/memory.js";
import { recordModelEvent } from "../services/modelEvents.js";
import { assertActivityQuota, withSerializableTransaction } from "../services/resourceLimits.js";

export const activitiesRouter = Router();
activitiesRouter.use(requireAuth);

activitiesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    const timeZone = normalizeTimeZone(user?.timezone);
    const todayRange = getDayRange(timeZone);
    const weekRange = getRollingDayRange(timeZone, 7);

    const [today, recent] = await Promise.all([
      prisma.activity.findMany({
        where: { userId, occurredAt: { gte: todayRange.start, lt: todayRange.end } },
        orderBy: { occurredAt: "desc" },
        take: 40
      }),
      prisma.activity.findMany({
        where: { userId, occurredAt: { gte: weekRange.start, lt: weekRange.end } },
        orderBy: { occurredAt: "desc" },
        take: 80
      })
    ]);

    res.json({ today, recent });
  })
);

activitiesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(activitySchema, req.body);
    const activity = await withSerializableTransaction(async (tx) => {
      await assertActivityQuota(tx, userId);
      return tx.activity.create({
        data: {
          userId,
          title: input.title,
          category: input.category,
          minutes: input.minutes,
          notes: input.notes,
          occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined
        }
      });
    });

    await upsertMemory({
      userId,
      sourceType: "Activity",
      sourceId: activity.id,
      content: `${activity.title}. ${activity.notes ?? ""} Category ${activity.category}. Minutes ${activity.minutes}.`,
      metadata: { category: activity.category, minutes: activity.minutes, occurredAt: activity.occurredAt.toISOString() }
    });
    await recordModelEvent(userId, "activity_logged", {
      activityId: activity.id,
      title: activity.title,
      category: activity.category,
      minutes: activity.minutes,
      occurredAt: activity.occurredAt.toISOString()
    });

    res.status(201).json({ activity });
  })
);

activitiesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(activitySchema.partial(), req.body);
    const id = routeParam(req.params.id, "Activity id");
    const existing = await prisma.activity.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ message: "Activity not found." });

    const activity = await prisma.activity.update({
      where: { id: existing.id },
      data: {
        ...input,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined
      }
    });

    await upsertMemory({
      userId,
      sourceType: "Activity",
      sourceId: activity.id,
      content: `${activity.title}. ${activity.notes ?? ""} Category ${activity.category}. Minutes ${activity.minutes}.`,
      metadata: { category: activity.category, minutes: activity.minutes, occurredAt: activity.occurredAt.toISOString() }
    });
    await recordModelEvent(userId, "activity_updated", {
      activityId: activity.id,
      title: activity.title,
      category: activity.category,
      minutes: activity.minutes,
      occurredAt: activity.occurredAt.toISOString()
    });

    res.json({ activity });
  })
);

activitiesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const id = routeParam(req.params.id, "Activity id");
    const existing = await prisma.activity.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ message: "Activity not found." });

    await prisma.$transaction([
      prisma.embeddingMemory.deleteMany({
        where: { userId, sourceType: "Activity", sourceId: existing.id }
      }),
      prisma.activity.delete({ where: { id: existing.id } })
    ]);
    await recordModelEvent(userId, "activity_deleted", { activityId: existing.id });
    res.status(204).send();
  })
);
