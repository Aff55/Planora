import { Router } from "express";
import { personalProfileSchema } from "@planora/shared";
import { asyncHandler, parseInput } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { getAiDataPolicy } from "../services/aiPolicy.js";
import { upsertMemory } from "../services/memory.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const profile = await prisma.personalProfile.findUnique({
      where: { userId: (req as AuthRequest).user.id }
    });
    res.json({ profile });
  })
);

profileRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(personalProfileSchema, req.body);
    const profile = await prisma.personalProfile.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input
    });

    const policy = await getAiDataPolicy(userId);
    if (profile.useForPersonalization && policy.canPersistLearning) {
      await upsertMemory({
        userId,
        sourceType: "PersonalProfile",
        sourceId: profile.id,
        content: buildProfileMemory(profile),
        metadata: {
          userProvided: true,
          improvementStyle: profile.improvementStyle,
          consentedAt: profile.updatedAt.toISOString()
        }
      });
      await prisma.modelEvent.create({
        data: {
          userId,
          eventType: "personal_profile_updated",
          payload: {
            completeness: profileCompleteness(profile),
            goals: profile.primaryGoals.length,
            interests: profile.interests.length,
            personalizationEnabled: true
          }
        }
      });
    } else {
      await prisma.embeddingMemory.deleteMany({
        where: { userId, sourceType: "PersonalProfile" }
      });
    }

    res.json({ profile });
  })
);

profileRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    await prisma.$transaction([
      prisma.personalProfile.deleteMany({ where: { userId } }),
      prisma.embeddingMemory.deleteMany({ where: { userId, sourceType: "PersonalProfile" } })
    ]);
    res.status(204).send();
  })
);

function buildProfileMemory(profile: {
  lifeStage: string | null;
  profession: string | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: string | null;
  interests: string[];
  primaryGoals: string[];
  preferredWakeTime: string | null;
  preferredSleepTime: string | null;
  improvementStyle: string;
}) {
  return [
    "User-provided profile.",
    profile.lifeStage ? `Life stage: ${friendly(profile.lifeStage)}.` : "",
    profile.profession ? `Profession or role: ${profile.profession}.` : "",
    profile.activityLevel ? `Self-described activity level: ${friendly(profile.activityLevel)}.` : "",
    profile.heightCm ? `Height: ${profile.heightCm} cm.` : "",
    profile.weightKg ? `Weight: ${profile.weightKg} kg.` : "",
    profile.interests.length ? `Interests: ${profile.interests.join(", ")}.` : "",
    profile.primaryGoals.length ? `Goals: ${profile.primaryGoals.join(", ")}.` : "",
    profile.preferredWakeTime ? `Preferred wake time: ${profile.preferredWakeTime}.` : "",
    profile.preferredSleepTime ? `Preferred sleep time: ${profile.preferredSleepTime}.` : "",
    `Coaching style: ${friendly(profile.improvementStyle)}.`
  ]
    .filter(Boolean)
    .join(" ");
}

function profileCompleteness(profile: {
  lifeStage: string | null;
  profession: string | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: string | null;
  interests: string[];
  primaryGoals: string[];
  preferredWakeTime: string | null;
  preferredSleepTime: string | null;
}) {
  const values = [
    profile.lifeStage,
    profile.profession,
    profile.heightCm,
    profile.weightKg,
    profile.activityLevel,
    profile.interests.length,
    profile.primaryGoals.length,
    profile.preferredWakeTime,
    profile.preferredSleepTime
  ];
  return Number((values.filter(Boolean).length / values.length).toFixed(2));
}

function friendly(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}
