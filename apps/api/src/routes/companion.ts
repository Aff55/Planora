import { Router } from "express";
import { companionChatSchema } from "@planora/shared";
import { asyncHandler, parseInput } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { getAiDataPolicy } from "../services/aiPolicy.js";
import { answerCompanion, getCompanionContext, getCompanionProviderStatus } from "../services/companion.js";

export const companionRouter = Router();
companionRouter.use(requireAuth);

companionRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const status = await getCompanionProviderStatus();
    res.json(status);
  })
);

companionRouter.get(
  "/context",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const policy = await getAiDataPolicy(userId);
    const context = policy.canUsePersonalContext ? await getCompanionContext(userId) : null;
    res.json({ context, personalizationEnabled: policy.aiPersonalization, privacyMode: policy.privacyMode });
  })
);

companionRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const policy = await getAiDataPolicy(userId);
    if (!policy.canUseSensitiveContext) return res.json({ history: [] });
    const history = await prisma.aIInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    res.json({ history: history.reverse() });
  })
);

companionRouter.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const input = parseInput(companionChatSchema, req.body);
    const answer = await answerCompanion((req as AuthRequest).user.id, input.message);
    res.status(201).json(answer);
  })
);
