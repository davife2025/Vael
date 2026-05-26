import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
} from "viem";
import type {
  VaelConfig,
  AgentRecord,
  ActivityEntry,
  Passport,
  RegisterAgentParams,
  RegisterAgentResult,
  LogActivityParams,
  ActivityFilter,
  PaginatedResponse,
} from "./types";
import { registerAgent }    from "./registerAgent";
import { logActivity }      from "./logActivity";
import { getLedger, getLedgerEntry, getTotalEntries } from "./getLedger";
import { getPassport, getPassportByToken }            from "./getPassport";
import { getAgent, getAgentsByOwner, getTotalAgents } from "./getAgent";

/**
 * VaelClient
 *
 * The single entry point for the Vael SDK.
 * Wraps all Vael protocol interactions — registry, ledger, passport — with
 * a clean, fully-typed API. Works in Node.js and browser environments.
 *
 * Quick start:
 * ─────────────────────────────────────────────────────────────
 * import { VaelClient, SOMNIA_TESTNET } from "@vael/sdk";
 * import { createWalletClient, custom } from "viem";
 *
 * const vael = new VaelClient({
 *   rpcUrl:    SOMNIA_TESTNET.rpcUrl,
 *   chainId:   SOMNIA_TESTNET.id,
 *   contracts: {
 *     registry: "0x...",
 *     ledger:   "0x...",
 *     passport: "0x...",
 *   },
 *   apiUrl: "https://api.vael.xyz",
 *   apiKey: "vael_sk_...",
 * });
 *
 * const wallet = createWalletClient({ transport: custom(window.ethereum) });
 * vael.connect(wallet);
 *
 * const { agentId } = await vael.registerAgent({
 *   agentType: "trading",
 *   metadata:  { name: "AlphaBot", description: "...", capabilities: ["swap", "stake"] },
 * });
 * ─────────────────────────────────────────────────────────────
 */
export class VaelClient {
  private config:       VaelConfig;
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;

  constructor(config: VaelConfig) {
    this.config = config;
    this.publicClient = createPublicClient({
      transport: http(config.rpcUrl),
    });
  }

  // ── Wallet connection ──────────────────────────────────────────────────────

  /**
   * connect — attach a WalletClient for write operations.
   * Returns `this` for chaining: `const vael = new VaelClient(config).connect(wallet);`
   */
  connect(walletClient: WalletClient): this {
    this.walletClient = walletClient;
    return this;
  }

  // ── Agent registration ─────────────────────────────────────────────────────

  /**
   * registerAgent
   * Uploads metadata to IPFS, registers the agent on-chain, and optionally
   * issues a Vael Passport ERC-721 token — all in one call.
   */
  async registerAgent(params: RegisterAgentParams): Promise<RegisterAgentResult> {
    return registerAgent(params, this.config, this.publicClient, this.requireWallet());
  }

  /**
   * deactivateAgent — mark an agent as inactive on-chain.
   * Only callable by the agent owner.
   */
  async deactivateAgent(agentId: `0x${string}`): Promise<`0x${string}`> {
    const wallet    = this.requireWallet();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
      address:      this.config.contracts.registry,
      abi:          (await import("./abis")).VAEL_REGISTRY_ABI,
      functionName: "deactivateAgent",
      args:         [agentId],
      account,
      chain:        wallet.chain ?? null,
    });
  }

  /**
   * reactivateAgent — restore a deactivated agent.
   */
  async reactivateAgent(agentId: `0x${string}`): Promise<`0x${string}`> {
    const wallet    = this.requireWallet();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
      address:      this.config.contracts.registry,
      abi:          (await import("./abis")).VAEL_REGISTRY_ABI,
      functionName: "reactivateAgent",
      args:         [agentId],
      account,
      chain:        wallet.chain ?? null,
    });
  }

  // ── Agent queries ──────────────────────────────────────────────────────────

  /**
   * getAgent — fetch a single agent record by agentId.
   * Returns null if not found.
   */
  async getAgent(agentId: `0x${string}`): Promise<AgentRecord | null> {
    return getAgent(agentId, this.config, this.publicClient);
  }

  /**
   * getAgentsByOwner — fetch all agents owned by a wallet address.
   */
  async getAgentsByOwner(owner: `0x${string}`): Promise<AgentRecord[]> {
    return getAgentsByOwner(owner, this.config, this.publicClient);
  }

  /**
   * getTotalAgents — total number of agents ever registered on Vael.
   */
  async getTotalAgents(): Promise<bigint> {
    return getTotalAgents(this.config, this.publicClient);
  }

  // ── Activity ledger ────────────────────────────────────────────────────────

  /**
   * logActivity — write an activity entry to the VaelLedger for an agent.
   * Returns the sequential entryId assigned by the contract.
   */
  async logActivity(params: LogActivityParams): Promise<bigint> {
    return logActivity(params, this.config, this.publicClient, this.requireWallet());
  }

  /**
   * getLedger — fetch paginated activity entries for an agent.
   * Uses API (fast, indexed) when apiUrl is configured, falls back to contract.
   */
  async getLedger(agentId: `0x${string}`, filter: ActivityFilter = {}): Promise<ActivityEntry[]> {
    return getLedger(agentId, filter, this.config, this.publicClient);
  }

  /**
   * getLedgerEntry — fetch a single activity entry by agentId + entryId.
   */
  async getLedgerEntry(agentId: `0x${string}`, entryId: bigint): Promise<ActivityEntry> {
    return getLedgerEntry(agentId, entryId, this.config, this.publicClient);
  }

  /**
   * getTotalEntries — total number of ledger entries for an agent.
   */
  async getTotalEntries(agentId: `0x${string}`): Promise<bigint> {
    return getTotalEntries(agentId, this.config, this.publicClient);
  }

  // ── Passport ───────────────────────────────────────────────────────────────

  /**
   * getPassport — fetch an agent's Vael Passport by agentId.
   * Returns null if no passport has been issued.
   */
  async getPassport(agentId: `0x${string}`): Promise<Passport | null> {
    return getPassport(agentId, this.config, this.publicClient);
  }

  /**
   * getPassportByToken — fetch a passport by its ERC-721 tokenId.
   */
  async getPassportByToken(tokenId: bigint): Promise<Passport | null> {
    return getPassportByToken(tokenId, this.config, this.publicClient);
  }

  /**
   * issuePassport — mint a Vael Passport for a registered agent.
   * Only needed if `issuePassport: false` was set during registerAgent.
   */
  async issuePassport(agentId: `0x${string}`): Promise<`0x${string}`> {
    const wallet    = this.requireWallet();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
      address:      this.config.contracts.passport,
      abi:          (await import("./abis")).VAEL_PASSPORT_ABI,
      functionName: "issuePassport",
      args:         [agentId, account],
      account,
      chain:        wallet.chain ?? null,
    });
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private requireWallet(): WalletClient {
    if (!this.walletClient) {
      throw new Error(
        "VaelClient: call .connect(walletClient) before performing write operations.\n" +
        "Example: vael.connect(createWalletClient({ transport: custom(window.ethereum) }))"
      );
    }
    return this.walletClient;
  }

  /** Access the underlying viem PublicClient for custom reads. */
  getPublicClient(): PublicClient { return this.publicClient; }

  /** Access the current config. */
  getConfig(): VaelConfig { return this.config; }
}
