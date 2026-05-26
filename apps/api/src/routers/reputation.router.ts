import { Router, type Response } from "express";
import { agentIdSchema } from "../schemas";
import { getReputationFactors, getStakingInfo, syncReputationScore } from "../services/reputation.service";
import { optionalApiKey, type AuthRequest } from "../middleware/auth.middleware";

export const reputationRouter = Router();

/**
 * GET /v1/reputation/:agentId
 * Get full reputation factor breakdown for an agent.
 * Returns activityScore, ageScore, stakeScore, communityScore, total.
 */
reputationRouter.get("/:agentId", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const parsed = agentIdSchema.safeParse(req.params.agentId);
  if (!parsed.success) return res.status(400).json({ error: "Invalid agentId" });

  try {
    const factors = await getReputationFactors(parsed.data);
    if (!factors) return res.status(404).json({ error: "Agent not found" });
    return res.json({ success: true, data: factors });
  } catch {
    return res.status(500).json({ error: "Failed to fetch reputation factors" });
  }
});

/**
 * GET /v1/reputation/:agentId/stake
 * Get staking information for an agent.
 */
reputationRouter.get("/:agentId/stake", async (req, res: Response) => {
  const parsed = agentIdSchema.safeParse(req.params.agentId);
  if (!parsed.success) return res.status(400).json({ error: "Invalid agentId" });

  try {
    const info = await getStakingInfo(parsed.data);
    if (!info) return res.status(404).json({ error: "Agent not found" });
    return res.json({ success: true, data: info });
  } catch {
    return res.status(500).json({ error: "Failed to fetch staking info" });
  }
});

/**
 * POST /v1/reputation/sync
 * Internal webhook: sync reputation score update from subgraph → Postgres.
 * Called when a ScoreComputed event is indexed.
 */
reputationRouter.post("/sync", async (req, res: Response) => {
  if (req.headers["x-vael-sync-secret"] !== process.env.API_SECRET) {
    return res.status(401).json({ error: "Unauthorised" });
  }
  const { agentId, newScore } = req.body;
  if (!agentId || newScore === undefined) {
    return res.status(400).json({ error: "agentId and newScore required" });
  }
  try {
    await syncReputationScore(agentId, Number(newScore));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Sync failed" });
  }
});
