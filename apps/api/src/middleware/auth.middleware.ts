import type { Request, Response, NextFunction } from "express";
import { db } from "../db";

export interface AuthRequest extends Request {
  apiKey?: {
    id:         string;
    tier:       string;
    ownerWallet:string;
  };
}

/**
 * requireApiKey — validates the x-api-key header against the database.
 * Attaches key metadata to req.apiKey for downstream use.
 * Logs each request for usage tracking.
 */
export async function requireApiKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const key = req.headers["x-api-key"] as string | undefined;

  if (!key) {
    res.status(401).json({ error: "Missing x-api-key header" });
    return;
  }

  try {
    const apiKey = await db.apiKey.findUnique({
      where: { key },
      select: { id: true, tier: true, ownerWallet: true, active: true, expiresAt: true, usageLimit: true },
    });

    if (!apiKey || !apiKey.active) {
      res.status(401).json({ error: "Invalid or inactive API key" });
      return;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      res.status(401).json({ error: "API key expired" });
      return;
    }

    // Log usage (fire and forget — don't block the request)
    db.apiKeyUsage.create({
      data: {
        apiKeyId:  apiKey.id,
        endpoint:  req.path,
        timestamp: new Date(),
      },
    }).catch(() => {/* non-critical */});

    req.apiKey = { id: apiKey.id, tier: apiKey.tier, ownerWallet: apiKey.ownerWallet };
    next();
  } catch {
    res.status(500).json({ error: "Auth service error" });
  }
}

/**
 * optionalApiKey — attaches key if present but does not block if missing.
 * Used for public read routes that offer enriched data to authenticated callers.
 */
export async function optionalApiKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const key = req.headers["x-api-key"] as string | undefined;
  if (!key) return next();

  try {
    const apiKey = await db.apiKey.findUnique({
      where: { key },
      select: { id: true, tier: true, ownerWallet: true, active: true },
    });
    if (apiKey?.active) {
      req.apiKey = { id: apiKey.id, tier: apiKey.tier, ownerWallet: apiKey.ownerWallet };
    }
  } catch {/* ignore */}
  next();
}
