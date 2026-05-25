import { Router, type Response } from "express";
import { agentIdSchema, activityFilterSchema } from "../schemas";
import { z } from "zod";
import {
  getLedger,
  getActivityEntry,
  syncActivityToDb,
} from "../services/ledger.service";
import { optionalApiKey, type AuthRequest } from "../middleware/auth.middleware";

export const ledgerRouter = Router();

/**
 * GET /v1/ledger/:agentId
 * Get paginated activity ledger for an agent.
 * Query: action, fromTimestamp, toTimestamp, orderDir, page, limit
 */
ledgerRouter.get("/:agentId", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const idParsed = agentIdSchema.safeParse(req.params.agentId);
  if (!idParsed.success) {
    return res.status(400).json({ error: "Invalid agentId format" });
  }

  const filterParsed = activityFilterSchema.safeParse(req.query);
  if (!filterParsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: filterParsed.error.flatten() });
  }

  try {
    const result = await getLedger(idParsed.data, filterParsed.data);
    return res.json({ success: true, ...result });
  } catch {
    return res.status(500).json({ error: "Failed to fetch ledger" });
  }
});

/**
 * GET /v1/ledger/:agentId/:entryId
 * Get a single ledger entry by agentId and sequential entryId.
 */
ledgerRouter.get("/:agentId/:entryId", optionalApiKey, async (req: AuthRequest, res: Response) => {
  const idParsed = agentIdSchema.safeParse(req.params.agentId);
  if (!idParsed.success) {
    return res.status(400).json({ error: "Invalid agentId format" });
  }

  const entryId = z.coerce.number().int().min(0).safeParse(req.params.entryId);
  if (!entryId.success) {
    return res.status(400).json({ error: "Invalid entryId" });
  }

  try {
    const entry = await getActivityEntry(idParsed.data, entryId.data.toString());
    if (!entry) return res.status(404).json({ error: "Activity entry not found" });
    return res.json({ success: true, data: entry });
  } catch {
    return res.status(500).json({ error: "Failed to fetch entry" });
  }
});

/**
 * POST /v1/ledger/sync
 * Internal webhook: sync activity entry to Postgres from subgraph.
 */
ledgerRouter.post("/sync", async (req, res: Response) => {
  if (req.headers["x-vael-sync-secret"] !== process.env.API_SECRET) {
    return res.status(401).json({ error: "Unauthorised" });
  }
  try {
    await syncActivityToDb(req.body);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Sync failed" });
  }
});
