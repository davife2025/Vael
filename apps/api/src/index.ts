import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { agentsRouter }   from "./routers/agents.router";
import { ledgerRouter }   from "./routers/ledger.router";
import { passportRouter } from "./routers/passport.router";
import { apiKeysRouter }  from "./routers/apiKeys.router";

const app  = express();
const PORT = process.env.API_PORT || 4000;

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));

// Public rate limit: 120 req/min per IP
app.use(rateLimit({
  windowMs:  60_000,
  max:       120,
  message:   { error: "Too many requests — add an API key for higher limits" },
  skip:      (req) => !!req.headers["x-api-key"], // key holders bypass IP limit
}));

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status:  "ok",
    service: "vael-api",
    version: "0.1.0",
    chain:   "somnia",
    time:    new Date().toISOString(),
  });
});

// ─── API v1 routes ────────────────────────────────────────────────────────────

app.use("/v1/agents",   agentsRouter);
app.use("/v1/ledger",   ledgerRouter);
app.use("/v1/passport", passportRouter);
app.use("/v1/keys",     apiKeysRouter);

// ─── API reference (root) ─────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.json({
    name:        "Vael API",
    description: "Agent infrastructure protocol for Somnia — REST API",
    version:     "v1",
    docs:        "https://docs.vael.xyz",
    endpoints: {
      agents:   "/v1/agents",
      ledger:   "/v1/ledger/:agentId",
      passport: "/v1/passport/:agentId",
      keys:     "/v1/keys",
      stats:    "/v1/agents/stats",
      feed:     "/v1/agents/feed",
    },
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found", hint: "See / for available endpoints" });
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[vael-api error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  Vael API  →  http://localhost:${PORT}`);
  console.log(`  Health    →  http://localhost:${PORT}/health`);
  console.log(`  Agents    →  http://localhost:${PORT}/v1/agents\n`);
});

export default app;
