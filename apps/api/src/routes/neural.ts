import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { buildTrainingManifest, getNeuralEngineStatus } from "../services/neuralEngine.js";
import { getPatternReport } from "../services/patterns.js";

export const neuralRouter = Router();
neuralRouter.use(requireAuth);

neuralRouter.get(
  "/patterns",
  asyncHandler(async (req, res) => {
    const report = await getPatternReport((req as AuthRequest).user.id);
    res.json({ report });
  })
);

neuralRouter.get(
  "/status",
  asyncHandler(async (req, res) => {
    const status = await getNeuralEngineStatus((req as AuthRequest).user.id);
    res.json({ status });
  })
);

neuralRouter.get(
  "/training-manifest",
  asyncHandler(async (req, res) => {
    const rawLimit = Number(req.query.limit ?? 500);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(1000, rawLimit)) : 500;
    const manifest = await buildTrainingManifest((req as AuthRequest).user.id, limit);
    res.json({ manifest });
  })
);
