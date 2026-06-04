import type { Request, Response, NextFunction } from "express";
import { evaluatePolicy } from "../VaelGate";
import type { GatePolicy, VaelGateConfig, AgentRecord } from "../types";
import { GateDenyReason } from "../types";

// Extend Express Request with agent info
export interface VaelRequest extends Request {
  vaelAgent?: AgentRecord;
}

/**
 * vaelGate — Express middleware that verifies an agent's Vael Passport
 * before allowing access to a route.
 *
 * Usage:
 * ────────────────────────────────────────────────────────────
 * import { vaelGate } from "@vael/gate/express";
 *
 * const gate = createGate({ apiUrl: "https://api.vael.xyz" });
 *
 * // Require any registered agent with a passport
 * app.get("/agent-only", gate(), handler);
 *
 * // Require minimum 500 reputation + oracle type
 * app.post("/premium", gate({
 *   minReputation:  500,
 *   allowedTypes:   ["oracle", "trading"],
 * }), handler);
 *
 * // Access verified agent in handler
 * app.get("/me", gate(), (req, res) => {
 *   const agent = (req as VaelRequest).vaelAgent;
 *   res.json({ agentId: agent?.agentId });
 * });
 * ────────────────────────────────────────────────────────────
 *
 * The agent ID is read from:
 *   1. x-vael-agent-id header
 *   2. req.query.agentId
 *   3. req.body.agentId
 */
export function createExpressGate(config: VaelGateConfig) {
  return function vaelGate(policy: GatePolicy = {}) {
    return async function (req: VaelRequest, res: Response, next: NextFunction): Promise<void> {
      const agentId =
        (req.headers["x-vael-agent-id"] as string) ||
        (req.query.agentId as string)               ||
        (req.body?.agentId as string);

      if (!agentId) {
        res.status(401).json({
          error:  "Agent ID required",
          hint:   "Pass x-vael-agent-id header, ?agentId query param, or agentId in request body",
          denied: true,
          reason: "MISSING_AGENT_ID",
        });
        return;
      }

      const result = await evaluatePolicy(agentId, policy, config);

      if (!result.allowed) {
        const statusCode = result.reason === GateDenyReason.NETWORK_ERROR ? 503 : 403;
        res.status(statusCode).json({
          error:  result.message,
          denied: true,
          reason: result.reason,
        });
        return;
      }

      req.vaelAgent = result.agent;
      next();
    };
  };
}
