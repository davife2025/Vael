# SDK Reference — @vael/sdk

The official TypeScript SDK for Vael. Works in Node.js, browser, and React Native.

## Install

```bash
npm install @vael/sdk viem
```

---

## VaelClient

```typescript
import { VaelClient, SOMNIA_TESTNET } from "@vael/sdk";

const vael = new VaelClient({
  rpcUrl:    string;          // Somnia RPC URL
  chainId:   number;          // 50312 (mainnet) | 50311 (testnet)
  contracts: {
    registry:   Address;      // VaelRegistry contract address
    ledger:     Address;      // VaelLedger contract address
    passport:   Address;      // VaelPassport contract address
    reputation?: Address;     // VaelReputation (optional)
  };
  apiUrl?:   string;          // Vael API — enables fast indexed queries
  apiKey?:   string;          // API key for higher rate limits
  cacheTtl?: number;          // Cache TTL in seconds (default: 60)
});

vael.connect(walletClient);  // Attach a viem WalletClient for writes
```

---

## Agent methods

### registerAgent

```typescript
const { agentId, txHash, passportTokenId } = await vael.registerAgent({
  agentType:    string;               // Agent type tag
  metadata:     AgentMetadata;        // Uploaded to IPFS
  issuePassport?: boolean;            // Default: true
});
```

**AgentMetadata:**
```typescript
interface AgentMetadata {
  name:          string;
  description:   string;
  image?:        string;              // ipfs:// or https://
  capabilities:  string[];
  model?:        string;              // e.g. "gpt-4o"
  framework?:    string;              // e.g. "eliza", "autogen"
  external_url?: string;
  attributes?:   Array<{ trait_type: string; value: string | number }>;
}
```

### getAgent

```typescript
const agent = await vael.getAgent(agentId);
// Returns AgentRecord | null
```

### getAgentsByOwner

```typescript
const agents = await vael.getAgentsByOwner("0x...");
// Returns AgentRecord[]
```

### deactivateAgent / reactivateAgent

```typescript
await vael.deactivateAgent(agentId);
await vael.reactivateAgent(agentId);
```

---

## Ledger methods

### logActivity

```typescript
const entryId = await vael.logActivity({
  agentId:    Hex;
  action:     string;                 // e.g. "swap", "vote", "transfer"
  payload?:   Uint8Array | Record<string, unknown>;
  target?:    Address;
  condition?: string;                 // Hashed to bytes32 on-chain
});
// Returns: bigint (entryId)
```

### getLedger

```typescript
const entries = await vael.getLedger(agentId, {
  limit?:         number;             // Default: 20
  action?:        string;             // Filter by action type
  fromTimestamp?: bigint;
  toTimestamp?:   bigint;
  orderDir?:      "asc" | "desc";     // Default: "desc"
});
// Returns: ActivityEntry[]
```

### getLedgerEntry

```typescript
const entry = await vael.getLedgerEntry(agentId, entryId);
// Returns: ActivityEntry
```

### getTotalEntries

```typescript
const count = await vael.getTotalEntries(agentId);
// Returns: bigint
```

---

## Passport methods

### getPassport

```typescript
const passport = await vael.getPassport(agentId);
// Returns: Passport | null

interface Passport {
  agentId:         Hex;
  tokenId:         bigint;
  reputationScore: bigint;  // 0–1000
  totalActions:    bigint;
  issuedAt:        bigint;
  lastActivityAt:  bigint;
  verified:        boolean;
}
```

### getPassportByToken

```typescript
const passport = await vael.getPassportByToken(tokenId);
```

### issuePassport

```typescript
await vael.issuePassport(agentId);
```

---

## Standalone functions (tree-shakeable)

All SDK methods are available as standalone functions for bundle-size optimised builds:

```typescript
import {
  registerAgent,
  logActivity,
  getLedger,
  getLedgerEntry,
  getTotalEntries,
  getPassport,
  getPassportByToken,
  getAgent,
  getAgentsByOwner,
  getTotalAgents,
  uploadMetadata,
  resolveMetadata,
} from "@vael/sdk";

// Each function takes (params, config, publicClient, walletClient?)
const agent = await getAgent(agentId, config, publicClient);
```

---

## IPFS utilities

```typescript
import { uploadMetadata, resolveMetadata } from "@vael/sdk";

// Upload to Pinata (production)
const uri = await uploadMetadata(metadata, {
  pinataApiKey:    process.env.PINATA_API_KEY,
  pinataApiSecret: process.env.PINATA_API_SECRET,
});

// Fetch metadata from IPFS URI
const metadata = await resolveMetadata("ipfs://QmXxx...");
const metadata = await resolveMetadata("ipfs://QmXxx...", "https://gateway.pinata.cloud/ipfs/");
```

---

## Chain presets

```typescript
import { SOMNIA_MAINNET, SOMNIA_TESTNET } from "@vael/sdk";

SOMNIA_MAINNET = { id: 50312, name: "Somnia", rpcUrl: "https://dream-rpc.somnia.network" }
SOMNIA_TESTNET = { id: 50311, name: "Somnia Testnet", rpcUrl: "https://vsomnia-rpc.somnia.network" }
```

---

## Error handling

```typescript
try {
  const { agentId } = await vael.registerAgent({ ... });
} catch (err) {
  if (err.message.includes("insufficient fee")) {
    // Registration fee not met
  }
  if (err.message.includes("call .connect")) {
    // Wallet not connected
  }
}
```

---

## @vael/gate — Passport verification

```bash
npm install @vael/gate
```

**Express middleware:**
```typescript
import { createExpressGate } from "@vael/gate/express";

const gate = createExpressGate({ apiUrl: "https://api.vael.xyz" });

app.get("/premium", gate({ minReputation: 500, allowedTypes: ["oracle"] }), handler);
```

**React hook:**
```typescript
import { useVaelGate } from "@vael/gate/react";

const { allowed, loading, result } = useVaelGate({
  agentId: connectedAgentId,
  policy:  { minReputation: 300 },
  config:  { apiUrl: "https://api.vael.xyz" },
});
```

**React component:**
```typescript
import { PassportVerifier } from "@vael/gate/react";

<PassportVerifier agentId={agentId} policy={{ requireVerified: true }} config={config}>
  <ProtectedContent />
</PassportVerifier>
```
