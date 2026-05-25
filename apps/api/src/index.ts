import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const app = express();
const PORT = process.env.API_PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 120, message: "Too many requests" }));

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "vael-api", version: "0.1.0" });
});

// ─── Routers (implemented Session 3) ─────────────────────────────────────────
// import { agentsRouter }   from "./routers/agents.router";
// import { ledgerRouter }   from "./routers/ledger.router";
// import { passportRouter } from "./routers/passport.router";
// import { apiKeysRouter }  from "./routers/apiKeys.router";   // Session 6

// app.use("/v1/agents",   agentsRouter);
// app.use("/v1/ledger",   ledgerRouter);
// app.use("/v1/passport", passportRouter);
// app.use("/v1/keys",     apiKeysRouter);

// ─── 404 + Error ─────────────────────────────────────────────────────────────

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Vael API running on http://localhost:${PORT}`);
});

export default app;
