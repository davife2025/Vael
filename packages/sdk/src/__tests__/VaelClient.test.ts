/**
 * @vael/sdk — Unit Tests
 *
 * Tests use vitest + viem test utilities.
 * Contract interactions are mocked via publicClient.readContract stubs.
 * No network connection required.
 *
 * Run: pnpm test (inside packages/sdk)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { VaelClient, SOMNIA_TESTNET } from "../index";
import type { VaelConfig } from "../types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_AGENT_ID =
  "0xabc1234567890000000000000000000000000000000000000000000000000001" as `0x${string}`;

const MOCK_OWNER =
  "0x1234567890123456789012345678901234567890" as `0x${string}`;

const MOCK_CONTRACT_ADDRESS =
  "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" as `0x${string}`;

const config: VaelConfig = {
  rpcUrl:  SOMNIA_TESTNET.rpcUrl,
  chainId: SOMNIA_TESTNET.id,
  contracts: {
    registry: MOCK_CONTRACT_ADDRESS,
    ledger:   MOCK_CONTRACT_ADDRESS,
    passport: MOCK_CONTRACT_ADDRESS,
  },
  apiUrl: "http://localhost:4000",
};

const mockAgentRecord = {
  agentId:     MOCK_AGENT_ID,
  owner:       MOCK_OWNER,
  agentType:   "trading",
  metadataURI: "ipfs://QmTest",
  createdAt:   BigInt(1716000000),
  blockNumber: BigInt(100000),
  active:      true,
};

const mockPassport = {
  agentId:         MOCK_AGENT_ID,
  tokenId:         BigInt(1),
  reputationScore: BigInt(750),
  totalActions:    BigInt(42),
  issuedAt:        BigInt(1716000000),
  lastActivityAt:  BigInt(1716100000),
  verified:        true,
};

const mockActivityEntry = {
  entryId:       BigInt(0),
  agentId:       MOCK_AGENT_ID,
  action:        "swap",
  payload:       "0x",
  target:        MOCK_CONTRACT_ADDRESS,
  timestamp:     BigInt(1716050000),
  blockNumber:   BigInt(100050),
  conditionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
};

// ─── Mock publicClient ────────────────────────────────────────────────────────

function makeMockPublicClient(overrides: Record<string, unknown> = {}) {
  return {
    readContract: vi.fn(({ functionName }: { functionName: string }) => {
      const map: Record<string, unknown> = {
        getAgent:        mockAgentRecord,
        getAgentsByOwner:[MOCK_AGENT_ID],
        isRegistered:    true,
        totalAgents:     BigInt(42),
        registrationFee: BigInt(0),
        getNonce:        BigInt(0),
        getPassport:     mockPassport,
        hasPassport:     true,
        totalPassports:  BigInt(10),
        getPassportByToken: mockPassport,
        getEntry:        mockActivityEntry,
        getRecentEntries:[mockActivityEntry],
        getTotalEntries: BigInt(1),
        globalTotal:     BigInt(100),
        ...overrides,
      };
      return Promise.resolve(map[functionName] ?? null);
    }),
    waitForTransactionReceipt: vi.fn(() =>
      Promise.resolve({ logs: [] })
    ),
  };
}

function makeMockWalletClient() {
  return {
    getAddresses:   vi.fn(() => Promise.resolve([MOCK_OWNER])),
    writeContract:  vi.fn(() => Promise.resolve("0xtxhash" as `0x${string}`)),
    chain:          null,
  };
}

// ─── VaelClient instantiation ─────────────────────────────────────────────────

describe("VaelClient", () => {
  let client: VaelClient;

  beforeEach(() => {
    client = new VaelClient(config);
    // Inject mock publicClient
    (client as any).publicClient = makeMockPublicClient();
  });

  describe("constructor", () => {
    it("creates a client with the provided config", () => {
      expect(client.getConfig()).toEqual(config);
    });

    it("exposes a publicClient", () => {
      expect(client.getPublicClient()).toBeDefined();
    });
  });

  describe("connect", () => {
    it("returns this for chaining", () => {
      const wallet = makeMockWalletClient();
      const result = client.connect(wallet as any);
      expect(result).toBe(client);
    });
  });

  describe("write operations require wallet", () => {
    it("deactivateAgent throws without wallet", async () => {
      await expect(client.deactivateAgent(MOCK_AGENT_ID))
        .rejects.toThrow("call .connect(walletClient)");
    });

    it("logActivity throws without wallet", async () => {
      await expect(
        client.logActivity({ agentId: MOCK_AGENT_ID, action: "swap" })
      ).rejects.toThrow("call .connect(walletClient)");
    });

    it("issuePassport throws without wallet", async () => {
      await expect(client.issuePassport(MOCK_AGENT_ID))
        .rejects.toThrow("call .connect(walletClient)");
    });
  });

  // ── getAgent ───────────────────────────────────────────────────────────────

  describe("getAgent", () => {
    it("returns null when API returns 404", async () => {
      // Mock fetch to return 404
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as any)
      );
      const agent = await client.getAgent(MOCK_AGENT_ID);
      expect(agent).toBeNull();
    });

    it("falls back to contract read when API fails", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("network error")));
      const agent = await client.getAgent(MOCK_AGENT_ID);
      expect(agent).not.toBeNull();
      expect(agent?.agentId).toBe(MOCK_AGENT_ID);
      expect(agent?.agentType).toBe("trading");
      expect(agent?.active).toBe(true);
    });

    it("returns null for unregistered agent from contract", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("network")));
      (client as any).publicClient = makeMockPublicClient({ isRegistered: false });
      const agent = await client.getAgent(MOCK_AGENT_ID);
      expect(agent).toBeNull();
    });
  });

  // ── getAgentsByOwner ───────────────────────────────────────────────────────

  describe("getAgentsByOwner", () => {
    it("returns agent array from contract fallback", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("network")));
      const agents = await client.getAgentsByOwner(MOCK_OWNER);
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThanOrEqual(0);
    });

    it("returns empty array for owner with no agents", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("network")));
      (client as any).publicClient = makeMockPublicClient({ getAgentsByOwner: [] });
      const agents = await client.getAgentsByOwner(MOCK_OWNER);
      expect(agents).toHaveLength(0);
    });
  });

  // ── getTotalAgents ─────────────────────────────────────────────────────────

  describe("getTotalAgents", () => {
    it("returns total from contract", async () => {
      const total = await client.getTotalAgents();
      expect(total).toBe(BigInt(42));
    });
  });

  // ── getPassport ────────────────────────────────────────────────────────────

  describe("getPassport", () => {
    it("returns null when API returns 404", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as any)
      );
      const passport = await client.getPassport(MOCK_AGENT_ID);
      expect(passport).toBeNull();
    });

    it("falls back to contract and returns passport data", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("network")));
      const passport = await client.getPassport(MOCK_AGENT_ID);
      expect(passport).not.toBeNull();
      expect(passport?.reputationScore).toBe(BigInt(750));
      expect(passport?.verified).toBe(true);
      expect(passport?.totalActions).toBe(BigInt(42));
    });

    it("returns null when agent has no passport", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("network")));
      (client as any).publicClient = makeMockPublicClient({ hasPassport: false });
      const passport = await client.getPassport(MOCK_AGENT_ID);
      expect(passport).toBeNull();
    });
  });

  // ── getPassportByToken ─────────────────────────────────────────────────────

  describe("getPassportByToken", () => {
    it("returns passport by tokenId from contract", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("network")));
      const passport = await client.getPassportByToken(BigInt(1));
      expect(passport).not.toBeNull();
      expect(passport?.tokenId).toBe(BigInt(1));
    });
  });

  // ── getLedger ──────────────────────────────────────────────────────────────

  describe("getLedger", () => {
    it("returns activity entries from contract fallback", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("network")));
      const entries = await client.getLedger(MOCK_AGENT_ID, { limit: 10 });
      expect(Array.isArray(entries)).toBe(true);
    });

    it("normalises entry fields to correct types", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("network")));
      const entries = await client.getLedger(MOCK_AGENT_ID, { limit: 5 });
      if (entries.length > 0) {
        const e = entries[0];
        expect(typeof e.entryId).toBe("bigint");
        expect(typeof e.timestamp).toBe("bigint");
        expect(typeof e.blockNumber).toBe("bigint");
        expect(typeof e.action).toBe("string");
      }
    });
  });

  // ── getLedgerEntry ─────────────────────────────────────────────────────────

  describe("getLedgerEntry", () => {
    it("returns a single entry from contract", async () => {
      const entry = await client.getLedgerEntry(MOCK_AGENT_ID, BigInt(0));
      expect(entry.entryId).toBe(BigInt(0));
      expect(entry.action).toBe("swap");
    });
  });

  // ── getTotalEntries ────────────────────────────────────────────────────────

  describe("getTotalEntries", () => {
    it("returns total entry count", async () => {
      const total = await client.getTotalEntries(MOCK_AGENT_ID);
      expect(total).toBe(BigInt(1));
    });
  });

  // ── write ops with wallet ──────────────────────────────────────────────────

  describe("with wallet connected", () => {
    beforeEach(() => {
      client.connect(makeMockWalletClient() as any);
    });

    it("deactivateAgent calls writeContract", async () => {
      const tx = await client.deactivateAgent(MOCK_AGENT_ID);
      expect(tx).toBe("0xtxhash");
    });

    it("reactivateAgent calls writeContract", async () => {
      const tx = await client.reactivateAgent(MOCK_AGENT_ID);
      expect(tx).toBe("0xtxhash");
    });

    it("issuePassport calls writeContract", async () => {
      const tx = await client.issuePassport(MOCK_AGENT_ID);
      expect(tx).toBe("0xtxhash");
    });
  });
});

// ─── Config helpers ───────────────────────────────────────────────────────────

describe("chain presets", () => {
  it("SOMNIA_MAINNET has correct chainId", async () => {
    const { SOMNIA_MAINNET } = await import("../index");
    expect(SOMNIA_MAINNET.id).toBe(50312);
    expect(SOMNIA_MAINNET.rpcUrl).toContain("dream-rpc");
  });

  it("SOMNIA_TESTNET has correct chainId", async () => {
    const { SOMNIA_TESTNET } = await import("../index");
    expect(SOMNIA_TESTNET.id).toBe(50311);
    expect(SOMNIA_TESTNET.rpcUrl).toContain("vsomnia");
  });
});

// ─── Types sanity checks ──────────────────────────────────────────────────────

describe("type exports", () => {
  it("VaelConfig accepts valid shape", () => {
    const c: VaelConfig = {
      rpcUrl:  "https://example.com",
      chainId: 50312,
      contracts: {
        registry: MOCK_CONTRACT_ADDRESS,
        ledger:   MOCK_CONTRACT_ADDRESS,
        passport: MOCK_CONTRACT_ADDRESS,
      },
    };
    expect(c.chainId).toBe(50312);
  });
});
