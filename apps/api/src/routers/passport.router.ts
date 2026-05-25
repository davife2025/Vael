import { Router, type Response } from "express";
import { agentIdSchema } from "../schemas";
import { z } from "zod";
import {
  getPassport,
  getPassportByToken,
  getLeaderboard,
} from "../services/passport.service";
import { optionalApiKey, type AuthRequest } from "../middleware/auth.middleware";

export const passportRouter = Router();

/**
 * GET /v1/passport/leaderboard
 * Top agents ranked by reputation score.
 * Query: limit (default 20, max 100)
 */
passportRouter.get("/leaderboard", async (req, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  try {
    const data = await getLeaderboard(limit);
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

/**
 * GET /v1/passport/token/:tokenId
 * Get passport by ERC-721 tokenId (numeric).
 */
passportRouter.get("/token/:tokenId", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const parsed = z.coerce.number().int().min(1).safeParse(req.params.tokenId);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid tokenId" });
  }

  try {
    const passport = await getPassportByToken(parsed.data.toString());
    if (!passport) return res.status(404).json({ error: "Passport not found" });
    return res.json({ success: true, data: passport });
  } catch {
    return res.status(500).json({ error: "Failed to fetch passport" });
  }
});

/**
 * GET /v1/passport/:agentId
 * Get passport by agentId (bytes32 hex).
 */
passportRouter.get("/:agentId", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const parsed = agentIdSchema.safeParse(req.params.agentId);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid agentId format" });
  }

  try {
    const passport = await getPassport(parsed.data);
    if (!passport) return res.status(404).json({ error: "Passport not found" });
    return res.json({ success: true, data: passport });
  } catch {
    return res.status(500).json({ error: "Failed to fetch passport" });
  }
});
