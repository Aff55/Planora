import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { type AuthRequest, requireAuth } from "../middleware/auth.js";
import { getDashboard } from "../services/dashboard.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const dashboard = await getDashboard((req as AuthRequest).user.id);
    res.json(dashboard);
  })
);
