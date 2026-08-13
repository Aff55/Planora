import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/http.js";
import { getPositiveInteger } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";

export const resourceLimits = {
  sessionsPerUser: getPositiveInteger("MAX_ACTIVE_SESSIONS_PER_USER", 20),
  tasksPerUser: getPositiveInteger("MAX_TASKS_PER_USER", 2_000),
  calendarEventsPerUser: getPositiveInteger("MAX_CALENDAR_EVENTS_PER_USER", 5_000),
  activitiesPerUser: getPositiveInteger("MAX_ACTIVITIES_PER_USER", 10_000),
  moodLogsPerUser: getPositiveInteger("MAX_MOOD_LOGS_PER_USER", 5_000),
  sleepLogsPerUser: getPositiveInteger("MAX_SLEEP_LOGS_PER_USER", 5_000),
  waterLogsPerUser: getPositiveInteger("MAX_WATER_LOGS_PER_USER", 20_000),
  journalEntriesPerUser: getPositiveInteger("MAX_JOURNAL_ENTRIES_PER_USER", 2_000),
  subtasksPerTask: getPositiveInteger("MAX_SUBTASKS_PER_TASK", 30),
  dashboardTasks: getPositiveInteger("MAX_DASHBOARD_TASKS", 50)
};

const TRANSACTION_ATTEMPTS = 5;

/**
 * Retryable failures when running at Serializable isolation.
 *
 * P2034 is the serialization conflict itself: two transactions read and wrote
 * an overlapping range and Postgres aborted one of them. Every quota check in
 * this file counts rows for a user and then inserts into that same range, so
 * two concurrent writes by one account conflict by construction.
 *
 * P2028 is the transaction failing to *start* within Prisma's queue timeout.
 * That is back-pressure rather than a fault: enough transactions were already
 * in flight that this one never got a slot. Both are transient, and both are
 * worth another attempt.
 */
function isRetryableTransactionError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "P2028")
  );
}

/**
 * Retrying immediately is what turns one conflict into a storm: the losing
 * transactions all wake at the same instant and collide again. Backing off
 * exponentially with jitter spreads them out, which is the difference between
 * a burst of concurrent writes mostly succeeding and mostly failing.
 */
function retryDelayMs(attempt: number) {
  const base = 25 * 2 ** attempt;
  return base + Math.random() * base;
}

export async function withSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableTransactionError(error) || attempt === TRANSACTION_ATTEMPTS - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)));
    }
  }
  throw lastError ?? new Error("Serializable transaction retry limit reached");
}

export async function assertTaskQuota(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.task.count({ where: { userId } });
  assertBelowQuota(count, resourceLimits.tasksPerUser, "task");
  return count;
}

export async function assertCalendarEventQuota(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.calendarEvent.count({ where: { userId } });
  assertBelowQuota(count, resourceLimits.calendarEventsPerUser, "calendar event");
  return count;
}

export async function assertSubtaskQuota(tx: Prisma.TransactionClient, taskId: string) {
  const count = await tx.subtask.count({ where: { taskId } });
  assertBelowQuota(count, resourceLimits.subtasksPerTask, "subtask");
  return count;
}

export async function assertActivityQuota(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.activity.count({ where: { userId } });
  assertBelowQuota(count, resourceLimits.activitiesPerUser, "life log");
  return count;
}

export async function assertMoodLogQuota(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.moodLog.count({ where: { userId } });
  assertBelowQuota(count, resourceLimits.moodLogsPerUser, "mood log");
  return count;
}

export async function assertSleepLogQuota(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.sleepLog.count({ where: { userId } });
  assertBelowQuota(count, resourceLimits.sleepLogsPerUser, "sleep log");
  return count;
}

export async function assertWaterLogQuota(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.waterLog.count({ where: { userId } });
  assertBelowQuota(count, resourceLimits.waterLogsPerUser, "water log");
  return count;
}

export async function assertJournalEntryQuota(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.journalEntry.count({ where: { userId } });
  assertBelowQuota(count, resourceLimits.journalEntriesPerUser, "journal entry");
  return count;
}

export function assertBelowQuota(count: number, limit: number, resource: string) {
  if (count >= limit) {
    throw new HttpError(409, `This account has reached the ${resource} limit (${limit}). Remove an older item before adding another.`);
  }
}
