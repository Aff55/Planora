import { Router } from "express";
import { defaultPageSize, taskCreateSchema, taskQuerySchema, taskReorderSchema, taskUpdateSchema, subtaskSchema } from "@planora/shared";
import { asyncHandler, HttpError, parseInput, routeParam } from "../lib/http.js";
import { buildPage } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { upsertMemory } from "../services/memory.js";
import { recordModelEvent } from "../services/modelEvents.js";
import {
  assertSubtaskQuota,
  assertTaskQuota,
  resourceLimits,
  withSerializableTransaction
} from "../services/resourceLimits.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const query = parseInput(taskQuerySchema, req.query);
    const limit = query.limit ?? defaultPageSize;
    const where: Record<string, unknown> = { userId };
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } }
      ];
    }
    const tasks = await prisma.task.findMany({
      where,
      include: { subtasks: { orderBy: { order: "asc" }, take: resourceLimits.subtasksPerTask } },
      orderBy: [{ status: "asc" }, { order: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
    });
    const page = buildPage(tasks, limit);
    res.json({ tasks: page.items, pageInfo: page.pageInfo });
  })
);

tasksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(taskCreateSchema, req.body);
    const { subtasks, dueDate, ...taskInput } = input;
    const task = await withSerializableTransaction(async (tx) => {
      const order = await assertTaskQuota(tx, userId);
      return tx.task.create({
        data: {
          userId,
          ...taskInput,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          order,
          completedAt: taskInput.status === "COMPLETED" ? new Date() : undefined,
          subtasks: {
            create: (subtasks ?? []).map((subtask, index) => ({
              title: subtask.title,
              completed: subtask.completed,
              order: subtask.order ?? index
            }))
          }
        },
        include: { subtasks: { orderBy: { order: "asc" } } }
      });
    });
    await upsertTaskMemory(task);
    await recordModelEvent(userId, "task_created", { taskId: task.id, category: task.category, priority: task.priority });
    res.status(201).json({ task });
  })
);

tasksRouter.post(
  "/reorder",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(taskReorderSchema, req.body);
    const existing = await prisma.task.findMany({ where: { userId, id: { in: input.orderedIds } }, select: { id: true } });
    if (existing.length !== input.orderedIds.length) throw new HttpError(400, "One or more tasks do not belong to this user");
    await prisma.$transaction(
      input.orderedIds.map((id, order) => prisma.task.update({ where: { id }, data: { order } }))
    );
    res.json({ ok: true });
  })
);

tasksRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const task = await getOwnedTask((req as AuthRequest).user.id, routeParam(req.params.id, "Task id"));
    res.json({ task });
  })
);

tasksRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const existing = await getOwnedTask(userId, routeParam(req.params.id, "Task id"));
    const input = parseInput(taskUpdateSchema, req.body);
    const { subtasks, dueDate, ...taskInput } = input;
    const data: Record<string, unknown> = { ...taskInput };
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (taskInput.status === "COMPLETED" && existing.status !== "COMPLETED") data.completedAt = new Date();
    if (taskInput.status && taskInput.status !== "COMPLETED") data.completedAt = null;

    const task = await prisma.$transaction(async (tx) => {
      if (subtasks) {
        await tx.subtask.deleteMany({ where: { taskId: existing.id } });
        data.subtasks = {
          create: subtasks.map((subtask, index) => ({
            title: subtask.title,
            completed: subtask.completed,
            order: subtask.order ?? index
          }))
        };
      }
      return tx.task.update({
        where: { id: existing.id },
        data,
        include: { subtasks: { orderBy: { order: "asc" } } }
      });
    });

    await upsertTaskMemory(task);
    await recordModelEvent(userId, "task_updated", { taskId: task.id, status: task.status, progress: task.progress });
    res.json({ task });
  })
);

tasksRouter.patch(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const existing = await getOwnedTask(userId, routeParam(req.params.id, "Task id"));
    const completed = req.body?.completed === undefined ? true : req.body.completed === true;
    const shouldCreateNext =
      completed && existing.status !== "COMPLETED" && Boolean(existing.recurringRule && existing.dueDate);
    const result = await withSerializableTransaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: existing.id },
        data: {
          status: completed ? "COMPLETED" : "TODO",
          progress: completed ? 100 : existing.progress,
          completedAt: completed ? new Date() : null
        },
        include: { subtasks: { orderBy: { order: "asc" } } }
      });

      const nextDueDate = shouldCreateNext
        ? getNextRecurringDate(existing.dueDate!, existing.recurringRule!)
        : null;
      const taskCount = nextDueDate ? await tx.task.count({ where: { userId } }) : 0;
      const nextTask = nextDueDate && taskCount < resourceLimits.tasksPerUser
        ? await tx.task.create({
            data: {
              userId,
              title: existing.title,
              description: existing.description,
              notes: existing.notes,
              priority: existing.priority,
              category: existing.category,
              dueDate: nextDueDate,
              progress: 0,
              color: existing.color,
              recurringRule: existing.recurringRule,
              order: existing.order,
              subtasks: {
                create: existing.subtasks.map((subtask) => ({
                  title: subtask.title,
                  completed: false,
                  order: subtask.order
                }))
              }
            },
            include: { subtasks: { orderBy: { order: "asc" } } }
          })
        : null;

      return {
        task,
        nextTask,
        recurrenceSkipped: nextDueDate && !nextTask ? "TASK_QUOTA" : null
      };
    });
    if (result.nextTask) await upsertTaskMemory(result.nextTask);
    await recordModelEvent(userId, completed ? "task_completed" : "task_reopened", {
      taskId: result.task.id,
      nextTaskId: result.nextTask?.id
    });
    res.json(result);
  })
);

tasksRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const task = await getOwnedTask(userId, routeParam(req.params.id, "Task id"));
    await prisma.$transaction([
      prisma.embeddingMemory.deleteMany({ where: { userId, sourceType: "Task", sourceId: task.id } }),
      prisma.task.delete({ where: { id: task.id } })
    ]);
    await recordModelEvent(userId, "task_deleted", { taskId: task.id });
    res.status(204).send();
  })
);

tasksRouter.post(
  "/:id/subtasks",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const task = await getOwnedTask(userId, routeParam(req.params.id, "Task id"));
    const input = parseInput(subtaskSchema.omit({ id: true }), req.body);
    const subtask = await withSerializableTransaction(async (tx) => {
      const order = await assertSubtaskQuota(tx, task.id);
      return tx.subtask.create({
        data: {
          taskId: task.id,
          title: input.title,
          completed: input.completed,
          order: input.order ?? order
        }
      });
    });
    res.status(201).json({ subtask });
  })
);

tasksRouter.patch(
  "/:id/subtasks/:subtaskId",
  asyncHandler(async (req, res) => {
    const task = await getOwnedTask((req as AuthRequest).user.id, routeParam(req.params.id, "Task id"));
    const subtask = await prisma.subtask.findFirst({ where: { id: routeParam(req.params.subtaskId, "Subtask id"), taskId: task.id } });
    if (!subtask) throw new HttpError(404, "Subtask not found");
    const input = parseInput(subtaskSchema.partial(), req.body);
    const updated = await prisma.subtask.update({ where: { id: subtask.id }, data: input });
    res.json({ subtask: updated });
  })
);

tasksRouter.delete(
  "/:id/subtasks/:subtaskId",
  asyncHandler(async (req, res) => {
    const task = await getOwnedTask((req as AuthRequest).user.id, routeParam(req.params.id, "Task id"));
    const subtask = await prisma.subtask.findFirst({ where: { id: routeParam(req.params.subtaskId, "Subtask id"), taskId: task.id } });
    if (!subtask) throw new HttpError(404, "Subtask not found");
    await prisma.subtask.delete({ where: { id: subtask.id } });
    res.status(204).send();
  })
);

async function getOwnedTask(userId: string, id: string | undefined) {
  if (!id) throw new HttpError(400, "Task id is required");
  const task = await prisma.task.findFirst({
    where: { userId, id },
    include: { subtasks: { orderBy: { order: "asc" }, take: resourceLimits.subtasksPerTask } }
  });
  if (!task) throw new HttpError(404, "Task not found");
  return task;
}

async function upsertTaskMemory(task: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  notes: string | null;
  category: string;
  priority: string;
}) {
  await upsertMemory({
    userId: task.userId,
    sourceType: "Task",
    sourceId: task.id,
    content: `${task.title}. ${task.description ?? ""} ${task.notes ?? ""}`,
    metadata: { category: task.category, priority: task.priority }
  });
}

function getNextRecurringDate(dueDate: Date, recurringRule: string) {
  const next = new Date(dueDate);
  if (recurringRule === "DAILY") next.setUTCDate(next.getUTCDate() + 1);
  else if (recurringRule === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
  else if (recurringRule === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + 1);
  else return null;
  return next;
}
