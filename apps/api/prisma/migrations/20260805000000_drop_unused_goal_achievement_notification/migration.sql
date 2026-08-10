-- Drop Goal, Achievement, and Notification tables.
--
-- These models existed in the schema with full migrations behind them, but no
-- route or service in apps/api/src ever read or wrote to them (no
-- prisma.goal / prisma.achievement / prisma.notification calls anywhere), and
-- no web or mobile UI referenced them either. They were leftover schema from
-- an earlier iteration of the product. Removing them so the schema only
-- describes features that actually exist end to end.
--
-- If goals/achievements/in-app notifications become real features later,
-- reintroduce them with a fresh migration once there is a service layer and
-- UI actually using them.

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Goal" DROP CONSTRAINT IF EXISTS "Goal_userId_fkey";
ALTER TABLE "Achievement" DROP CONSTRAINT IF EXISTS "Achievement_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Notification";
DROP TABLE IF EXISTS "Goal";
DROP TABLE IF EXISTS "Achievement";
