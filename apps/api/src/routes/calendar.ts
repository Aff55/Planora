import { Router } from "express";
import { calendarEventSchema, calendarQuerySchema, defaultPageSize } from "@planora/shared";
import { getMonthRange, normalizeTimeZone } from "../lib/dateTime.js";
import { asyncHandler, HttpError, parseInput, routeParam } from "../lib/http.js";
import { buildPage } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { upsertMemory } from "../services/memory.js";
import { assertCalendarEventQuota, withSerializableTransaction } from "../services/resourceLimits.js";

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

calendarRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const query = parseInput(calendarQuerySchema, req.query);
    const limit = query.limit ?? defaultPageSize;
    const where: Record<string, unknown> = { userId };
    if (query.month) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
      const range = getMonthRange(query.month, normalizeTimeZone(user?.timezone));
      where.startAt = { gte: range.start, lt: range.end };
    }
    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
    });
    const page = buildPage(events, limit);
    res.json({ events: page.items, pageInfo: page.pageInfo });
  })
);

calendarRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(calendarEventSchema, req.body);
    await assertTaskOwnership(userId, input.taskId);
    const event = await withSerializableTransaction(async (tx) => {
      await assertCalendarEventQuota(tx, userId);
      return tx.calendarEvent.create({
        data: {
          userId,
          ...input,
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt)
        }
      });
    });
    await upsertEventMemory(event);
    res.status(201).json({ event });
  })
);

calendarRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const existing = await getOwnedEvent(userId, routeParam(req.params.id, "Event id"));
    const input = parseInput(calendarEventSchema, req.body);
    await assertTaskOwnership(userId, input.taskId);
    const event = await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: {
        ...input,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt)
      }
    });
    await upsertEventMemory(event);
    res.json({ event });
  })
);

calendarRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const event = await getOwnedEvent(userId, routeParam(req.params.id, "Event id"));
    await prisma.$transaction([
      prisma.embeddingMemory.deleteMany({
        where: { userId, sourceType: "CalendarEvent", sourceId: event.id }
      }),
      prisma.calendarEvent.delete({ where: { id: event.id } })
    ]);
    res.status(204).send();
  })
);

async function getOwnedEvent(userId: string, id: string | undefined) {
  if (!id) throw new HttpError(400, "Event id is required");
  const event = await prisma.calendarEvent.findFirst({ where: { userId, id } });
  if (!event) throw new HttpError(404, "Calendar event not found");
  return event;
}

async function assertTaskOwnership(userId: string, taskId?: string | null) {
  if (!taskId) return;
  const task = await prisma.task.findFirst({ where: { userId, id: taskId } });
  if (!task) throw new HttpError(400, "Linked task does not belong to this user");
}

async function upsertEventMemory(event: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: string;
  startAt: Date;
}) {
  await upsertMemory({
    userId: event.userId,
    sourceType: "CalendarEvent",
    sourceId: event.id,
    content: `${event.title}. ${event.description ?? ""} Starts ${event.startAt.toISOString()}`,
    metadata: { type: event.type }
  });
}
