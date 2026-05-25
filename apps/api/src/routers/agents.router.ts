import { Router } from "express";

/**
 * GET  /v1/agents          — list agents (filter by owner, type, active, reputation)
 * GET  /v1/agents/:agentId — get single agent record + metadata
 * POST /v1/agents/sync     — sync on-chain agent data to Postgres (called by subgraph webhook)
 *
 * Full implementation: Session 3
 */
export const agentsRouter = Router();

agentsRouter.get("/", (_req, res) => {
  res.json({ message: "agents list — Session 3" });
});

agentsRouter.get("/:agentId", (req, res) => {
  res.json({ message: `agent ${req.params.agentId} — Session 3` });
});
