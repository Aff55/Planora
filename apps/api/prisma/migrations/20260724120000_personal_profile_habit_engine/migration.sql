-- CreateEnum
CREATE TYPE "LifeStage" AS ENUM ('STUDENT', 'WORKING_PROFESSIONAL', 'SELF_EMPLOYED', 'CAREGIVER', 'RETIRED', 'BETWEEN_ROLES', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'ATHLETE');

-- CreateEnum
CREATE TYPE "ImprovementStyle" AS ENUM ('GENTLE', 'BALANCED', 'AMBITIOUS');

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "key" TEXT,
ADD COLUMN "lastObservedAt" TIMESTAMP(3),
ADD COLUMN "longestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "occurrences" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "RecommendationFeedback" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PersonalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lifeStage" "LifeStage",
    "profession" TEXT,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "activityLevel" "ActivityLevel",
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredWakeTime" TEXT,
    "preferredSleepTime" TEXT,
    "improvementStyle" "ImprovementStyle" NOT NULL DEFAULT 'BALANCED',
    "useForPersonalization" BOOLEAN NOT NULL DEFAULT false,
    "allowAnonymousTraining" BOOLEAN NOT NULL DEFAULT false,
    "allowProductAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalProfile_userId_key" ON "PersonalProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Habit_userId_key_key" ON "Habit"("userId", "key");

-- AddForeignKey
ALTER TABLE "PersonalProfile" ADD CONSTRAINT "PersonalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
