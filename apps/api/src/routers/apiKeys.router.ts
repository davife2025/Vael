import { Router, type Response } from "express";
import { createApiKeySchema } from "../schemas";
import { db } from "../db";
import { requireApiKey, type AuthRequest } from "../middleware/auth.middleware";
import crypto from "crypto";

export const apiKeysRouter = Router();

/**
 * POST /v1/keys
 * Create a new API key for a wallet address.
 * Returns the key once — store it safely, it is not shown again.
 */
apiKeysRouter.post("/", async (req, res: Response) => {
  const parsed = createApiKeySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { name, ownerWallet, tier } = parsed.data;

  // Generate a secure random key: vael_sk_<32 random bytes as hex>
  const rawKey = `vael_sk_${crypto.randomBytes(32).toString("hex")}`;

  try {
    const apiKey = await db.apiKey.create({
      data: {
        key:         rawKey,
        name,
        ownerWallet: ownerWallet.toLowerCase(),
        tier,
        usageLimit:  tier === "FREE" ? 1_000 : tier === "PRO" ? 100_000 : 999_999_999,
      },
      select: { id: true, name: true, tier: true, createdAt: true, usageLimit: true },
    });

    return res.status(201).json({
      success: true,
      data: {
        ...apiKey,
        key: rawKey, // shown once only
        warning: "Store this key securely — it will not be shown again.",
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to create API key" });
  }
});

/**
 * GET /v1/keys/me
 * Get API key info and usage stats for the authenticated key.
 */
apiKeysRouter.get("/me", requireApiKey, async (req: AuthRequest, res: Response) => {
  try {
    const key = await db.apiKey.findUnique({
      where:  { id: req.apiKey!.id },
      select: {
        id:          true,
        name:        true,
        tier:        true,
        usageLimit:  true,
        createdAt:   true,
        expiresAt:   true,
        active:      true,
        _count:      { select: { usage: true } },
      },
    });

    if (!key) return res.status(404).json({ error: "Key not found" });

    return res.json({
      success: true,
      data: {
        ...key,
        usageToday: key._count.usage,
        remaining:  Math.max(0, key.usageLimit - key._count.usage),
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch key info" });
  }
});

/**
 * DELETE /v1/keys/me
 * Deactivate the authenticated API key.
 */
apiKeysRouter.delete("/me", requireApiKey, async (req: AuthRequest, res: Response) => {
  try {
    await db.apiKey.update({
      where:  { id: req.apiKey!.id },
      data:   { active: false },
    });
    return res.json({ success: true, message: "API key deactivated" });
  } catch {
    return res.status(500).json({ error: "Failed to deactivate key" });
  }
});
