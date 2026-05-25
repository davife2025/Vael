import { Router, type Response } from "express";
import { agentIdSchema, agentFilterSchema } from "../schemas";
import {
  getAgentById,
  listAgents,
  getRegistryStats,
  getLiveFeed,
  syncAgentToDb,
} from "../services/agents.service";
import { optionalApiKey, type AuthRequest } from "../middleware/auth.middleware";

export const agentsRouter = Router();

/**
 * GET /v1/agents
 * List agents with filtering, pagination, and ordering.
 * Query params: owner, agentType, active, minReputation, orderBy, orderDir, page, limit
 */
agentsRouter.get("/", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const parsed = agentFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  try {
    const result = await listAgents(parsed.data);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("GET /agents error:", err);
    return res.status(500).json({ error: "Failed to fetch agents" });
  }
});

/**
 * GET /v1/agents/stats
 * Global registry statistics: total agents, activities, passports.
 */
agentsRouter.get("/stats", async (_req, res: Response) => {
  try {
    const stats = await getRegistryStats();
    return res.json({ success: true, data: stats });
  } catch {
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/**
 * GET /v1/agents/feed
 * Live feed of most recently registered agents and activities.
 * Query: limit (default 10, max 50)
 */
agentsRouter.get("/feed", async (req, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  try {
    const feed = await getLiveFeed(limit);
    return res.json({ success: true, data: feed });
  } catch {
    return res.status(500).json({ error: "Failed to fetch live feed" });
  }
});

/**
 * GET /v1/agents/:agentId
 * Get a single agent by its bytes32 agentId (0x-prefixed hex).
 */
agentsRouter.get("/:agentId", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const parsed = agentIdSchema.safeParse(req.params.agentId);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid agentId format" });
  }

  try {
    const agent = await getAgentById(parsed.data);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    return res.json({ success: true, data: agent });
  } catch {
    return res.status(500).json({ error: "Failed to fetch agent" });
  }
});

/**
 * POST /v1/agents/sync
 * Webhook endpoint called by subgraph or indexer to sync agent data to Postgres.
 * Protected by internal secret header.
 */
agentsRouter.post("/sync", async (req, res: Response) => {
  const secret = req.headers["x-vael-sync-secret"];
  if (secret !== process.env.API_SECRET) {
    return res.status(401).json({ error: "Unauthorised sync" });
  }

  try {
    await syncAgentToDb(req.body);
    return res.json({ success: true });
  } catch (err) {
    console.error("Sync error:", err);
    return res.status(500).json({ error: "Sync failed" });
  }
});
