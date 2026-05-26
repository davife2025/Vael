# @vael/sdk

**The official SDK for the Vael Agent Infrastructure Protocol on Somnia.**

Register AI agents, log their activity, and read their passports — all with a single, fully-typed npm package.

---

## Install

```bash
npm install @vael/sdk viem
# or
pnpm add @vael/sdk viem
```

---

## Quick start

```typescript
import { VaelClient, SOMNIA_TESTNET } from "@vael/sdk";
import { createWalletClient, createPublicClient, http, custom } from "viem";

// 1. Create the client
const vael = new VaelClient({
  rpcUrl:  SOMNIA_TESTNET.rpcUrl,
  chainId: SOMNIA_TESTNET.id,
  contracts: {
    registry: "0x...",   // VaelRegistry address
    ledger:   "0x...",   // VaelLedger address
    passport: "0x...",   // VaelPassport address
  },
  apiUrl: "https://api.vael.xyz",   // optional — enables fast indexed queries
  apiKey: "vael_sk_...",            // optional — higher rate limits
});

// 2. Connect a wallet (browser)
const wallet = createWalletClient({ transport: custom(window.ethereum) });
vael.connect(wallet);

// 3. Register an agent
const { agentId, txHash, passportTokenId } = await vael.registerAgent({
  agentType: "trading",
  metadata: {
    name:         "AlphaBot",
    description:  "Autonomous DeFi trading agent on Somnia",
    capabilities: ["swap", "stake", "vote"],
    model:        "gpt-4o",
    framework:    "eliza",
  },
  issuePassport: true,  // mint a VaelPassport ERC-721 (default: true)
});

console.log("Agent registered:", agentId);
console.log("Passport token:", passportTokenId);
```

---

## API Reference

### `new VaelClient(config)`

| Field | Type | Required | Description |
|---|---|---|---|
| `rpcUrl` | `string` | ✓ | Somnia RPC endpoint |
| `chainId` | `number` | ✓ | Chain ID (50312 mainnet / 50311 testnet) |
| `contracts.registry` | `Address` | ✓ | VaelRegistry contract address |
| `contracts.ledger` | `Address` | ✓ | VaelLedger contract address |
| `contracts.passport` | `Address` | ✓ | VaelPassport contract address |
| `apiUrl` | `string` | — | Vael REST API base URL for fast indexed queries |
| `apiKey` | `string` | — | Vael API key (get one at vael.xyz/keys) |

---

### Agent registration

```typescript
// Register a new agent
const { agentId, txHash, passportTokenId } = await vael.registerAgent({
  agentType:     "oracle",           // type tag — free-form string
  metadata:      { name: "...", description: "...", capabilities: ["..."] },
  issuePassport: true,               // default true
});

// Deactivate / reactivate
await vael.deactivateAgent(agentId);
await vael.reactivateAgent(agentId);
```

### Agent queries

```typescript
// Single agent
const agent = await vael.getAgent(agentId);

// All agents for a wallet
const myAgents = await vael.getAgentsByOwner("0x...");

// Total agents on the registry
const total = await vael.getTotalAgents();
```

### Activity ledger

```typescript
// Log an activity
const entryId = await vael.logActivity({
  agentId:   agentId,
  action:    "swap",
  payload:   { tokenIn: "STT", tokenOut: "USDC", amount: "1000" },
  target:    "0x...",                    // DEX contract address
  condition: "price_impact < 0.5%",     // trigger condition (stored as hash)
});

// Read recent activity
const entries = await vael.getLedger(agentId, {
  limit:    20,
  orderDir: "desc",
  action:   "swap",         // filter by action type (optional)
});

// Single entry
const entry = await vael.getLedgerEntry(agentId, 0n);

// Total entries
const count = await vael.getTotalEntries(agentId);
```

### Passport

```typescript
// Get passport by agentId
const passport = await vael.getPassport(agentId);
// passport.reputationScore → bigint (0–1000)
// passport.verified        → boolean
// passport.totalActions    → bigint

// Get by ERC-721 tokenId
const passport = await vael.getPassportByToken(1n);

// Issue a passport (if not done at registration)
await vael.issuePassport(agentId);
```

---

## Standalone functions (tree-shakeable)

For frameworks where bundle size matters, import functions directly:

```typescript
import { getAgent, getLedger, getPassport } from "@vael/sdk";
import { createPublicClient, http } from "viem";

const publicClient = createPublicClient({ transport: http(rpcUrl) });

const agent   = await getAgent(agentId, config, publicClient);
const ledger  = await getLedger(agentId, { limit: 10 }, config, publicClient);
const passport = await getPassport(agentId, config, publicClient);
```

---

## IPFS metadata

Agent metadata is stored on IPFS. Configure Pinata for production:

```typescript
const vael = new VaelClient({
  // ...
  pinataApiKey:    process.env.PINATA_API_KEY,
  pinataApiSecret: process.env.PINATA_API_SECRET,
});
```

Or use the `uploadMetadata` / `resolveMetadata` utilities directly:

```typescript
import { uploadMetadata, resolveMetadata } from "@vael/sdk";

const uri      = await uploadMetadata({ name: "MyAgent", ... }, { pinataApiKey: "..." });
const metadata = await resolveMetadata(uri);
```

---

## AgentMetadata schema

```typescript
interface AgentMetadata {
  name:          string;
  description:   string;
  image?:        string;          // ipfs:// or https://
  capabilities:  string[];        // e.g. ["swap", "vote", "message"]
  model?:        string;          // e.g. "gpt-4o", "claude-3-sonnet"
  framework?:    string;          // e.g. "eliza", "autogen", "custom"
  external_url?: string;
  attributes?:   Array<{ trait_type: string; value: string | number }>;
}
```

---

## Chain presets

```typescript
import { SOMNIA_MAINNET, SOMNIA_TESTNET } from "@vael/sdk";

// SOMNIA_MAINNET = { id: 50312, name: "Somnia", rpcUrl: "https://dream-rpc.somnia.network" }
// SOMNIA_TESTNET = { id: 50311, name: "Somnia Testnet", rpcUrl: "https://vsomnia-rpc.somnia.network" }
```

---

## Node.js usage (server-side agents)

```typescript
import { VaelClient, SOMNIA_TESTNET } from "@vael/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const wallet  = createWalletClient({ account, transport: http(SOMNIA_TESTNET.rpcUrl) });

const vael = new VaelClient({ ...config }).connect(wallet);

// Log activity autonomously
setInterval(async () => {
  await vael.logActivity({
    agentId:   myAgentId,
    action:    "heartbeat",
    payload:   { status: "active", timestamp: Date.now() },
    condition: "every_60s",
  });
}, 60_000);
```

---

Built for [Somnia](https://somnia.network) · Powered by [Vael](https://vael.xyz)
