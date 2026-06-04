import express        from "express";
import http           from "http";
import cors           from "cors";
import helmet         from "helmet";
import rateLimit      from "express-rate-limit";
import dotenv         from "dotenv";
import path           from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { agentsRouter }     from "./routers/agents.router";
import { ledgerRouter }     from "./routers/ledger.router";
import { passportRouter }   from "./routers/passport.router";
import { apiKeysRouter }    from "./routers/apiKeys.router";
import { reputationRouter } from "./routers/reputation.router";
import { billingRouter }    from "./routers/billing.router";
import { marketplaceRouter }from "./routers/marketplace.router";
import { memoryRouter }     from "./routers/memory.router";
import { analyticsRouter }  from "./routers/analytics.router";
import { webhookRouter }    from "./routers/webhook.router";
import { initWebSocketServer, broadcastEvent } from "./ws/ws.server";

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.API_PORT || 4000;

// ─── WebSocket ────────────────────────────────────────────────────────────────
const wss = initWebSocketServer(server);

// Export broadcastEvent for use in sync routes
export { broadcastEvent };

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({
  windowMs: 60_000,
  max:      120,
  message:  { error: "Too many requests — add an x-api-key header for higher limits" },
  skip:     (req) => !!req.headers["x-api-key"],
}));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:     "ok",
    service:    "vael-api",
    version:    "0.1.0",
    chain:      "somnia",
    wsClients:  wss.clients.size,
    time:       new Date().toISOString(),
  });
});

// ─── API v1 ───────────────────────────────────────────────────────────────────
app.use("/v1/agents",      agentsRouter);
app.use("/v1/ledger",      ledgerRouter);
app.use("/v1/passport",    passportRouter);
app.use("/v1/reputation",  reputationRouter);
app.use("/v1/keys",        apiKeysRouter);
app.use("/v1/billing",     billingRouter);
app.use("/v1/marketplace", marketplaceRouter);
app.use("/v1/memory",      memoryRouter);
app.use("/v1/analytics",   analyticsRouter);
app.use("/v1/webhooks",    webhookRouter);

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name:    "Vael API",
    version: "v1",
    docs:    "https://docs.vael.xyz",
    ws:      "wss://api.vael.xyz/ws",
    endpoints: {
      agents:      "/v1/agents",
      ledger:      "/v1/ledger/:agentId",
      passport:    "/v1/passport/:agentId",
      reputation:  "/v1/reputation/:agentId",
      marketplace: "/v1/marketplace/tasks",
      memory:      "/v1/memory/:agentId",
      analytics:   "/v1/analytics/summary",
      webhooks:    "/v1/webhooks",
      keys:        "/v1/keys",
      billing:     "/v1/billing/plans",
    },
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found", hint: "See / for available endpoints" });
});

// ─── Error ────────────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[vael-api]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start (use server.listen, not app.listen — needed for WebSocket) ─────────
server.listen(PORT, () => {
  console.log(`\n  Vael API       →  http://localhost:${PORT}`);
  console.log(`  WebSocket      →  ws://localhost:${PORT}/ws`);
  console.log(`  Health         →  http://localhost:${PORT}/health`);
  console.log(`  Webhooks       →  http://localhost:${PORT}/v1/webhooks\n`);
});

export default app;
