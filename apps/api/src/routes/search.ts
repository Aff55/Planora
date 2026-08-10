import { Router } from "express";
import { searchSchema } from "@planora/shared";
import { asyncHandler, parseInput } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const { q } = parseInput(searchSchema, req.query);
    const [tasks, activities, journalEntries, calendarEvents] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } }
          ]
        },
        take: 8
      }),
      prisma.activity.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } }
          ]
        },
        take: 8
      }),
      prisma.journalEntry.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } }
          ]
        },
        take: 8
      }),
      prisma.calendarEvent.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } }
          ]
        },
        take: 8
      })
    ]);

    res.json({
      query: q,
      results: [
        ...tasks.map((item) => ({ type: "task", id: item.id, title: item.title, href: "/tasks", item })),
        ...activities.map((item) => ({ type: "activity", id: item.id, title: item.title, href: "/life", item })),
        ...journalEntries.map((item) => ({ type: "journal", id: item.id, title: item.title, href: "/wellbeing", item })),
        ...calendarEvents.map((item) => ({ type: "calendar", id: item.id, title: item.title, href: "/calendar", item }))
      ]
    });
  })
);
