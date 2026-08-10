import { Router } from "express";
import { recommendationFeedbackSchema } from "@planora/shared";
import { asyncHandler, HttpError, parseInput, routeParam } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { generateRecommendations } from "../services/recommendations.js";
import { recordModelEvent } from "../services/modelEvents.js";
import { recordRecommendationLearning } from "../services/neuralEngine.js";

export const recommendationsRouter = Router();
recommendationsRouter.use(requireAuth);

recommendationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const recommendations = await generateRecommendations((req as AuthRequest).user.id);
    res.json({ recommendations });
  })
);

recommendationsRouter.post(
  "/:id/feedback",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user.id;
    const input = parseInput(recommendationFeedbackSchema, req.body);
    const recommendation = await prisma.recommendation.findFirst({
      where: { userId, id: routeParam(req.params.id, "Recommendation id"), active: true }
    });
    if (!recommendation) throw new HttpError(404, "Recommendation not found");

    const feedback = await prisma.$transaction(async (tx) => {
      const saved = await tx.recommendationFeedback.upsert({
        where: {
          userId_recommendationId: {
            userId,
            recommendationId: recommendation.id
          }
        },
        create: {
          userId,
          recommendationId: recommendation.id,
          action: input.action,
          note: input.note
        },
        update: {
          action: input.action,
          note: input.note
        }
      });
      await tx.recommendation.update({
        where: { id: recommendation.id },
        data: { active: false }
      });
      return saved;
    });

    await recordModelEvent(userId, "recommendation_feedback", {
      recommendationId: recommendation.id,
      type: recommendation.type,
      action: input.action
    });
    await recordRecommendationLearning({
      userId,
      recommendationId: recommendation.id,
      recommendationType: recommendation.type,
      action: input.action
    });
    res.json({ feedback });
  })
);
