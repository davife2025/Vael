import { Router, type Response } from "express";
import { z } from "zod";
import { addressSchema } from "../schemas";
import {
  getGrowthData,
  getActionBreakdown,
  getTypeDistribution,
  getReputationDistribution,
  getProtocolSummary,
  getOwnerDashboard,
} from "../services/analytics.service";
import { requireApiKey, optionalApiKey, type AuthRequest } from "../middleware/auth.middleware";

export const analyticsRouter = Router();

/**
 * GET /v1/analytics/summary
 * Protocol-level summary: total agents, activities, active rate, avg reputation.
 */
analyticsRouter.get("/summary", async (_req, res: Response) => {
  try {
    const summary = await getProtocolSummary();
    return res.json({ success: true, data: summary });
  } catch {
    return res.status(500).json({ error: "Failed to fetch summary" });
  }
});

/**
 * GET /v1/analytics/growth
 * Daily agent and activity growth. Query: days (default 30, max 90).
 */
analyticsRouter.get("/growth", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const days = Math.min(Number(req.query.days) || 30, 90);
  try {
    const data = await getGrowthData(days);
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ error: "Failed to fetch growth data" });
  }
});

/**
 * GET /v1/analytics/actions
 * Top action types by count with percentage breakdown.
 */
analyticsRouter.get("/actions", optionalApiKey, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getActionBreakdown();
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ error: "Failed to fetch action breakdown" });
  }
});

/**
 * GET /v1/analytics/types
 * Agent type distribution with percentage breakdown.
 */
analyticsRouter.get("/types", optionalApiKey, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getTypeDistribution();
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ error: "Failed to fetch type distribution" });
  }
});

/**
 * GET /v1/analytics/reputation
 * Reputation score distribution across 10 buckets (0-100, 101-200, ...).
 */
analyticsRouter.get("/reputation", optionalApiKey, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getReputationDistribution();
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ error: "Failed to fetch reputation distribution" });
  }
});

/**
 * GET /v1/analytics/dashboard/:wallet
 * Owner dashboard — all agents, recent activity, API keys, and summary stats
 * for a specific wallet address. Requires API key.
 */
analyticsRouter.get("/dashboard/:wallet", requireApiKey, async (req: AuthRequest, res: Response) => {
  const parsed = addressSchema.safeParse(req.params.wallet);
  if (!parsed.success) return res.status(400).json({ error: "Invalid wallet address" });

  // Owners can only view their own dashboard (unless enterprise tier)
  if (
    req.apiKey?.tier !== "ENTERPRISE" &&
    req.apiKey?.ownerWallet?.toLowerCase() !== parsed.data.toLowerCase()
  ) {
    return res.status(403).json({ error: "You can only view your own dashboard" });
  }

  try {
    const data = await getOwnerDashboard(parsed.data);
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});
