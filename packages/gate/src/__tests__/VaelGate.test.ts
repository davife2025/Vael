import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluatePolicy, canPass, clearCache } from "../VaelGate";
import { GateDenyReason } from "../types";
import type { VaelGateConfig, GatePolicy } from "../types";

const AGENT_ID = "0xabc1230000000000000000000000000000000000000000000000000000000001" as `0x${string}`;

const config: VaelGateConfig = {
  apiUrl:   "http://localhost:4000",
  cacheTtl: 0, // disable cache for tests
};

function mockAgent(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id:              AGENT_ID,
      owner:           "0x1234567890123456789012345678901234567890",
      agentType:       "trading",
      active:          true,
      createdAt:       "1716000000",
      totalActivities: "50",
      ...overrides,
    },
  };
}

function mockPassport(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      agentId:         AGENT_ID,
      tokenId:         "1",
      reputationScore: "750",
      verified:        true,
      issuedAt:        "1716000000",
      ...overrides,
    },
  };
}

function setupFetch(agentData: any, passportData: any) {
  global.fetch = vi.fn((url: string) => {
    if ((url as string).includes("/passport/")) {
      if (!passportData) return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as any);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(passportData) } as any);
    }
    if (!agentData) return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as any);
    return Promise.resolve({ ok: true, json: () => Promise.resolve(agentData) } as any);
  }) as any;
}

describe("VaelGate — evaluatePolicy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearCache();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe("allowed scenarios", () => {
    it("allows agent with passport and passing reputation", async () => {
      setupFetch(mockAgent(), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, { minReputation: 500 }, config);
      expect(result.allowed).toBe(true);
      if (result.allowed) expect(result.agent.agentType).toBe("trading");
    });

    it("allows with no policy restrictions (empty policy)", async () => {
      setupFetch(mockAgent(), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, {}, config);
      expect(result.allowed).toBe(true);
    });

    it("allows matching agent type in allowedTypes", async () => {
      setupFetch(mockAgent(), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, { allowedTypes: ["trading", "oracle"] }, config);
      expect(result.allowed).toBe(true);
    });

    it("allows verified agent when requireVerified is true", async () => {
      setupFetch(mockAgent(), mockPassport({ verified: true }));
      const result = await evaluatePolicy(AGENT_ID, { requireVerified: true }, config);
      expect(result.allowed).toBe(true);
    });

    it("allows agent with sufficient activities", async () => {
      setupFetch(mockAgent({ totalActivities: "100" }), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, { minActivities: 50 }, config);
      expect(result.allowed).toBe(true);
    });

    it("passes custom validator", async () => {
      setupFetch(mockAgent(), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, {
        customValidator: (agent) => agent.agentType === "trading",
      }, config);
      expect(result.allowed).toBe(true);
    });
  });

  // ── Deny scenarios ─────────────────────────────────────────────────────────

  describe("denied scenarios", () => {
    it("denies when agent not found", async () => {
      setupFetch(null, null);
      const result = await evaluatePolicy(AGENT_ID, {}, config);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe(GateDenyReason.NETWORK_ERROR);
    });

    it("denies inactive agent", async () => {
      setupFetch(mockAgent({ active: false }), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, {}, config);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe(GateDenyReason.AGENT_INACTIVE);
    });

    it("denies agent with no passport when requirePassport is default", async () => {
      setupFetch(mockAgent(), null);
      const result = await evaluatePolicy(AGENT_ID, {}, config);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe(GateDenyReason.NO_PASSPORT);
    });

    it("allows agent without passport when requirePassport is false", async () => {
      setupFetch(mockAgent(), null);
      const result = await evaluatePolicy(AGENT_ID, { requirePassport: false }, config);
      expect(result.allowed).toBe(true);
    });

    it("denies unverified agent when requireVerified is true", async () => {
      setupFetch(mockAgent(), mockPassport({ verified: false }));
      const result = await evaluatePolicy(AGENT_ID, { requireVerified: true }, config);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe(GateDenyReason.NOT_VERIFIED);
    });

    it("denies insufficient reputation", async () => {
      setupFetch(mockAgent(), mockPassport({ reputationScore: "100" }));
      const result = await evaluatePolicy(AGENT_ID, { minReputation: 500 }, config);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe(GateDenyReason.INSUFFICIENT_REP);
    });

    it("denies wrong agent type", async () => {
      setupFetch(mockAgent({ agentType: "npc" }), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, { allowedTypes: ["oracle", "trading"] }, config);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe(GateDenyReason.TYPE_NOT_ALLOWED);
    });

    it("denies blocked agent type", async () => {
      setupFetch(mockAgent({ agentType: "trading" }), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, { blockedTypes: ["trading"] }, config);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe(GateDenyReason.TYPE_BLOCKED);
    });

    it("denies insufficient activity", async () => {
      setupFetch(mockAgent({ totalActivities: "5" }), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, { minActivities: 100 }, config);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe(GateDenyReason.INSUFFICIENT_ACTIVITY);
    });

    it("denies failing custom validator", async () => {
      setupFetch(mockAgent(), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, {
        customValidator: () => false,
      }, config);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe(GateDenyReason.CUSTOM_REJECTED);
    });

    it("supports async custom validator", async () => {
      setupFetch(mockAgent(), mockPassport());
      const result = await evaluatePolicy(AGENT_ID, {
        customValidator: async (agent) => {
          await new Promise(r => setTimeout(r, 10));
          return agent.agentType === "oracle"; // trading agent will fail
        },
      }, config);
      expect(result.allowed).toBe(false);
    });
  });

  // ── canPass helper ─────────────────────────────────────────────────────────

  describe("canPass", () => {
    it("returns true when allowed", async () => {
      setupFetch(mockAgent(), mockPassport());
      expect(await canPass(AGENT_ID, {}, config)).toBe(true);
    });

    it("returns false when denied", async () => {
      setupFetch(mockAgent({ active: false }), mockPassport());
      expect(await canPass(AGENT_ID, {}, config)).toBe(false);
    });
  });

  // ── Default policy merging ─────────────────────────────────────────────────

  describe("default policy", () => {
    it("merges default policy with per-gate policy", async () => {
      setupFetch(mockAgent({ agentType: "npc" }), mockPassport());
      const configWithDefault: VaelGateConfig = {
        ...config,
        defaultPolicy: { allowedTypes: ["trading", "oracle"] },
      };
      const result = await evaluatePolicy(AGENT_ID, {}, configWithDefault);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe(GateDenyReason.TYPE_NOT_ALLOWED);
    });

    it("per-gate policy overrides default", async () => {
      setupFetch(mockAgent({ agentType: "npc" }), mockPassport());
      const configWithDefault: VaelGateConfig = {
        ...config,
        defaultPolicy: { allowedTypes: ["trading"] },
      };
      // Per-gate override allows npc
      const result = await evaluatePolicy(AGENT_ID, { allowedTypes: ["npc"] }, configWithDefault);
      expect(result.allowed).toBe(true);
    });
  });
});
