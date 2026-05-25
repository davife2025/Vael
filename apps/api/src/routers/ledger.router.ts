import { Router } from "express";

/**
 * GET /v1/ledger/:agentId          — get paginated activity log for an agent
 * GET /v1/ledger/:agentId/:entryId — get single activity entry
 * Full implementation: Session 3
 */
export const ledgerRouter = Router();

ledgerRouter.get("/:agentId", (req, res) => {
  res.json({ message: `ledger for ${req.params.agentId} — Session 3` });
});

/**
 * GET /v1/passport/:agentId        — get agent passport + reputation score
 * GET /v1/passport/token/:tokenId  — get passport by ERC-721 token ID
 * Full implementation: Session 3
 */
export const passportRouter = Router();

passportRouter.get("/:agentId", (req, res) => {
  res.json({ message: `passport for ${req.params.agentId} — Session 3` });
});
