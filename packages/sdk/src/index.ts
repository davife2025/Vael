// ─── Main client ─────────────────────────────────────────────────────────────
export { VaelClient } from "./VaelClient";

// ─── Standalone functions (tree-shakeable) ────────────────────────────────────
export { registerAgent }                           from "./registerAgent";
export { logActivity }                             from "./logActivity";
export { getLedger, getLedgerEntry, getTotalEntries } from "./getLedger";
export { getPassport, getPassportByToken }         from "./getPassport";
export { getAgent, getAgentsByOwner, getTotalAgents } from "./getAgent";

// ─── IPFS utilities ───────────────────────────────────────────────────────────
export { uploadMetadata, resolveMetadata }         from "./ipfs";

// ─── ABIs (for advanced use — custom contract reads) ─────────────────────────
export { VAEL_REGISTRY_ABI, VAEL_LEDGER_ABI, VAEL_PASSPORT_ABI } from "./abis";

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  VaelConfig,
  AgentRecord,
  AgentMetadata,
  ActivityEntry,
  Passport,
  RegisterAgentParams,
  RegisterAgentResult,
  LogActivityParams,
  ActivityFilter,
  AgentFilter,
  PaginatedResponse,
  ApiResponse,
} from "./types";

// ─── Chain presets ────────────────────────────────────────────────────────────
export const SOMNIA_MAINNET = {
  id:     50312,
  name:   "Somnia",
  rpcUrl: "https://dream-rpc.somnia.network",
} as const;

export const SOMNIA_TESTNET = {
  id:     50311,
  name:   "Somnia Testnet",
  rpcUrl: "https://vsomnia-rpc.somnia.network",
} as const;
