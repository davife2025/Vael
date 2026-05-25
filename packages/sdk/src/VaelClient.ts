import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from "viem";
import type {
  VaelConfig,
  AgentRecord,
  ActivityEntry,
  Passport,
  RegisterAgentParams,
  RegisterAgentResult,
  AgentFilter,
  ActivityFilter,
  PaginatedResponse,
} from "./types";

/**
 * VaelClient
 *
 * The main entry point for the Vael SDK.
 * Wraps VaelRegistry, VaelLedger, and VaelPassport contract interactions
 * with a clean, fully-typed developer interface.
 *
 * Usage:
 *   const vael = new VaelClient(config);
 *   await vael.connect(walletClient);
 *   const { agentId } = await vael.registerAgent({ agentType: "trading", metadata: { ... } });
 */
export class VaelClient {
  private config: VaelConfig;
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;

  constructor(config: VaelConfig) {
    this.config = config;
    this.publicClient = createPublicClient({
      transport: http(config.rpcUrl),
    });
  }

  // ── Wallet Connection ──────────────────────────────────────────────────────

  connect(walletClient: WalletClient): VaelClient {
    this.walletClient = walletClient;
    return this;
  }

  // ── Agent Registration ─────────────────────────────────────────────────────

  /**
   * Register a new agent on Somnia via VaelRegistry.
   * Optionally issues a VaelPassport ERC-721 token to the agent.
   * Full implementation in Session 4.
   */
  async registerAgent(_params: RegisterAgentParams): Promise<RegisterAgentResult> {
    this.requireWallet();
    // Session 4: implement contract write + IPFS metadata upload
    throw new Error("registerAgent: implemented in Session 4");
  }

  // ── Agent Queries ──────────────────────────────────────────────────────────

  async getAgent(_agentId: `0x${string}`): Promise<AgentRecord> {
    // Session 4: read from VaelRegistry contract
    throw new Error("getAgent: implemented in Session 4");
  }

  async getAgents(_filter?: AgentFilter): Promise<PaginatedResponse<AgentRecord>> {
    // Session 4: query via subgraph or API
    throw new Error("getAgents: implemented in Session 4");
  }

  async getAgentsByOwner(_owner: `0x${string}`): Promise<AgentRecord[]> {
    // Session 4: read from VaelRegistry contract
    throw new Error("getAgentsByOwner: implemented in Session 4");
  }

  // ── Activity Ledger ────────────────────────────────────────────────────────

  async logActivity(_agentId: `0x${string}`, _action: string, _payload?: Uint8Array, _target?: `0x${string}`): Promise<bigint> {
    this.requireWallet();
    // Session 4: write to VaelLedger contract
    throw new Error("logActivity: implemented in Session 4");
  }

  async getLedger(_filter: ActivityFilter): Promise<ActivityEntry[]> {
    // Session 4: query via subgraph
    throw new Error("getLedger: implemented in Session 4");
  }

  // ── Passport ───────────────────────────────────────────────────────────────

  async getPassport(_agentId: `0x${string}`): Promise<Passport> {
    // Session 4: read from VaelPassport contract
    throw new Error("getPassport: implemented in Session 4");
  }

  async hasPassport(_agentId: `0x${string}`): Promise<boolean> {
    // Session 4: check VaelPassport
    throw new Error("hasPassport: implemented in Session 4");
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private requireWallet(): void {
    if (!this.walletClient) {
      throw new Error("VaelClient: call .connect(walletClient) before writing to chain");
    }
  }

  getPublicClient(): PublicClient {
    return this.publicClient;
  }

  getConfig(): VaelConfig {
    return this.config;
  }
}
