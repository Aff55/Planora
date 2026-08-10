-- Remove the retired student-specific domain while preserving general planning records.
UPDATE "Task" SET "category" = 'OTHER' WHERE "category"::text = 'STUDY';
UPDATE "Activity" SET "category" = 'OTHER' WHERE "category"::text = 'STUDY';
UPDATE "Goal" SET "category" = 'OTHER' WHERE "category"::text = 'STUDY';
UPDATE "Habit" SET "category" = 'OTHER' WHERE "category"::text = 'STUDY';
UPDATE "CalendarEvent" SET "type" = 'PERSONAL' WHERE "type"::text IN ('STUDY', 'EXAM', 'ASSIGNMENT');

DELETE FROM "EmbeddingMemory" WHERE "sourceType" IN ('Subject', 'StudySession');
DROP TABLE IF EXISTS "StudySession";
DROP TABLE IF EXISTS "Subject";

ALTER TABLE "Task" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Activity" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Goal" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Habit" ALTER COLUMN "category" DROP DEFAULT;
CREATE TYPE "TaskCategory_new" AS ENUM ('WORK', 'WELLBEING', 'PERSONAL', 'FITNESS', 'SOCIAL', 'FINANCE', 'OTHER');
ALTER TABLE "Task" ALTER COLUMN "category" TYPE "TaskCategory_new" USING ("category"::text::"TaskCategory_new");
ALTER TABLE "Activity" ALTER COLUMN "category" TYPE "TaskCategory_new" USING ("category"::text::"TaskCategory_new");
ALTER TABLE "Goal" ALTER COLUMN "category" TYPE "TaskCategory_new" USING ("category"::text::"TaskCategory_new");
ALTER TABLE "Habit" ALTER COLUMN "category" TYPE "TaskCategory_new" USING ("category"::text::"TaskCategory_new");
DROP TYPE "TaskCategory";
ALTER TYPE "TaskCategory_new" RENAME TO "TaskCategory";
ALTER TABLE "Task" ALTER COLUMN "category" SET DEFAULT 'OTHER';
ALTER TABLE "Activity" ALTER COLUMN "category" SET DEFAULT 'OTHER';
ALTER TABLE "Goal" ALTER COLUMN "category" SET DEFAULT 'OTHER';
ALTER TABLE "Habit" ALTER COLUMN "category" SET DEFAULT 'WELLBEING';

ALTER TABLE "CalendarEvent" ALTER COLUMN "type" DROP DEFAULT;
CREATE TYPE "CalendarEventType_new" AS ENUM ('TASK', 'ACTIVITY', 'HOLIDAY', 'BREAK', 'PERSONAL');
ALTER TABLE "CalendarEvent" ALTER COLUMN "type" TYPE "CalendarEventType_new" USING ("type"::text::"CalendarEventType_new");
DROP TYPE "CalendarEventType";
ALTER TYPE "CalendarEventType_new" RENAME TO "CalendarEventType";
ALTER TABLE "CalendarEvent" ALTER COLUMN "type" SET DEFAULT 'PERSONAL';

-- Make recommendation generation idempotent and feedback replay-safe.
ALTER TABLE "Recommendation" ADD COLUMN "key" TEXT;
UPDATE "Recommendation"
SET "key" = "type"::text || ':' ||
  lower(trim(both '-' from regexp_replace("title", '[^A-Za-z0-9]+', '-', 'g')));

WITH ranked AS (
  SELECT "id", row_number() OVER (
    PARTITION BY "userId", "key"
    ORDER BY "active" DESC, "updatedAt" DESC, "createdAt" DESC
  ) AS position
  FROM "Recommendation"
)
DELETE FROM "Recommendation"
USING ranked
WHERE "Recommendation"."id" = ranked."id" AND ranked.position > 1;

ALTER TABLE "Recommendation" ALTER COLUMN "key" SET NOT NULL;
ALTER TABLE "RecommendationFeedback" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

WITH ranked AS (
  SELECT "id", row_number() OVER (
    PARTITION BY "userId", "recommendationId"
    ORDER BY "createdAt" DESC
  ) AS position
  FROM "RecommendationFeedback"
)
DELETE FROM "RecommendationFeedback"
USING ranked
WHERE "RecommendationFeedback"."id" = ranked."id" AND ranked.position > 1;

CREATE UNIQUE INDEX "Recommendation_userId_key_key" ON "Recommendation"("userId", "key");
CREATE INDEX "RecommendationFeedback_recommendationId_idx" ON "RecommendationFeedback"("recommendationId");
CREATE UNIQUE INDEX "RecommendationFeedback_userId_recommendationId_key"
  ON "RecommendationFeedback"("userId", "recommendationId");

-- Add revocable, server-backed authentication sessions.
CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
ALTER TABLE "AuthSession"
  ADD CONSTRAINT "AuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index ownership and cascade paths used by account deletion and daily summaries.
CREATE INDEX "Activity_userId_occurredAt_idx" ON "Activity"("userId", "occurredAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Goal_userId_completedAt_idx" ON "Goal"("userId", "completedAt");
CREATE INDEX "Achievement_userId_earnedAt_idx" ON "Achievement"("userId", "earnedAt");
CREATE INDEX "Habit_userId_active_idx" ON "Habit"("userId", "active");
CREATE INDEX "CalendarEvent_taskId_idx" ON "CalendarEvent"("taskId");

ALTER TABLE "Settings" ALTER COLUMN "notificationEmail" SET DEFAULT false;
