import { Router, type Response } from "express";
import { z } from "zod";
import { agentIdSchema } from "../schemas";
import {
  getAgentMemory,
  getMemoryEntry,
  getAgentConditions,
  getConditionStats,
} from "../services/memory.service";
import { optionalApiKey, type AuthRequest } from "../middleware/auth.middleware";

export const memoryRouter = Router();

/**
 * GET /v1/memory/stats
 * Global condition engine statistics.
 */
memoryRouter.get("/stats", async (_req, res: Response) => {
  try {
    const stats = await getConditionStats();
    return res.json({ success: true, data: stats });
  } catch {
    return res.status(500).json({ error: "Failed to fetch condition stats" });
  }
});

/**
 * GET /v1/memory/:agentId
 * Get all memory entries for an agent.
 */
memoryRouter.get("/:agentId", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const parsed = agentIdSchema.safeParse(req.params.agentId);
  if (!parsed.success) return res.status(400).json({ error: "Invalid agentId" });

  try {
    const memory = await getAgentMemory(parsed.data);
    return res.json({ success: true, data: memory });
  } catch {
    return res.status(500).json({ error: "Failed to fetch memory" });
  }
});

/**
 * GET /v1/memory/:agentId/:key
 * Get a single memory entry by key.
 */
memoryRouter.get("/:agentId/:key", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const parsedId  = agentIdSchema.safeParse(req.params.agentId);
  const parsedKey = z.string().min(1).max(128).safeParse(req.params.key);

  if (!parsedId.success)  return res.status(400).json({ error: "Invalid agentId" });
  if (!parsedKey.success) return res.status(400).json({ error: "Invalid key" });

  try {
    const entry = await getMemoryEntry(parsedId.data, parsedKey.data);
    if (!entry) return res.status(404).json({ error: "Memory key not found" });
    return res.json({ success: true, data: entry });
  } catch {
    return res.status(500).json({ error: "Failed to fetch memory entry" });
  }
});

/**
 * GET /v1/memory/:agentId/conditions
 * Get all registered conditions for an agent.
 */
memoryRouter.get("/:agentId/conditions", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const parsed = agentIdSchema.safeParse(req.params.agentId);
  if (!parsed.success) return res.status(400).json({ error: "Invalid agentId" });

  try {
    const conds = await getAgentConditions(parsed.data);
    return res.json({ success: true, data: conds });
  } catch {
    return res.status(500).json({ error: "Failed to fetch conditions" });
  }
});
