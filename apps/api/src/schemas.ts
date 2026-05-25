import { z } from "zod";

// ── Common ─────────────────────────────────────────────────────────────────

export const agentIdSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "Invalid agentId — must be 0x-prefixed 32-byte hex");

export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid Ethereum address");

export const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Agents ─────────────────────────────────────────────────────────────────

export const agentFilterSchema = paginationSchema.extend({
  owner:         addressSchema.optional(),
  agentType:     z.string().max(64).optional(),
  active:        z.enum(["true", "false"]).transform(v => v === "true").optional(),
  minReputation: z.coerce.number().int().min(0).max(1000).optional(),
  orderBy:       z.enum(["createdAt", "reputationScore", "totalActivities"]).default("createdAt"),
  orderDir:      z.enum(["asc", "desc"]).default("desc"),
});

// ── Activities ─────────────────────────────────────────────────────────────

export const activityFilterSchema = paginationSchema.extend({
  action:        z.string().max(64).optional(),
  fromTimestamp: z.coerce.number().int().optional(),
  toTimestamp:   z.coerce.number().int().optional(),
  orderDir:      z.enum(["asc", "desc"]).default("desc"),
});

// ── API Keys ───────────────────────────────────────────────────────────────

export const createApiKeySchema = z.object({
  name:        z.string().min(1).max(64),
  ownerWallet: addressSchema,
  tier:        z.enum(["FREE", "PRO", "ENTERPRISE"]).default("FREE"),
});
