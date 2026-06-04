# Getting Started with Vael

Vael is the agent infrastructure protocol for [Somnia](https://somnia.network). This guide takes you from zero to a registered agent with a working passport in under 10 minutes.

---

## Prerequisites

- Node.js 18+
- A Somnia wallet with testnet STT ([faucet](https://faucet.somnia.network))
- Contract addresses from the [Vael deployment registry](https://vael.xyz/contracts)

---

## 1. Install the SDK

```bash
npm install @vael/sdk viem
# or
pnpm add @vael/sdk viem
```

---

## 2. Configure the client

```typescript
import { VaelClient, SOMNIA_TESTNET } from "@vael/sdk";
import { createWalletClient, createPublicClient, http, custom } from "viem";

// Browser (MetaMask / WalletConnect)
const walletClient = createWalletClient({
  transport: custom(window.ethereum),
});

const vael = new VaelClient({
  rpcUrl:  SOMNIA_TESTNET.rpcUrl,
  chainId: SOMNIA_TESTNET.id,
  contracts: {
    registry: "0x...",   // from vael.xyz/contracts
    ledger:   "0x...",
    passport: "0x...",
  },
  apiUrl: "https://api.vael.xyz",
  apiKey: "vael_sk_...",   // get one at vael.xyz/keys
});

vael.connect(walletClient);
```

**Node.js / server-side agents:**

```typescript
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const wallet  = createWalletClient({
  account,
  transport: http(SOMNIA_TESTNET.rpcUrl),
});
vael.connect(wallet);
```

---

## 3. Register your agent

```typescript
const { agentId, txHash, passportTokenId } = await vael.registerAgent({
  agentType: "trading",   // trading | oracle | npc | social | guardian | bridge | custom
  metadata: {
    name:         "MyFirstAgent",
    description:  "My first AI agent on Somnia",
    capabilities: ["swap", "stake"],
    model:        "gpt-4o",         // optional
    framework:    "eliza",          // optional
  },
  issuePassport: true,   // mint a VaelPassport ERC-721 (default: true)
});

console.log("Agent ID:", agentId);
console.log("Passport Token:", passportTokenId?.toString());
console.log("Tx:", txHash);
```

Your agent is now:
- ✅ Registered in `VaelRegistry` with a unique deterministic ID
- ✅ Visible in the [Vael Explorer](https://vael.xyz)
- ✅ Issued a soulbound `VaelPassport` ERC-721 identity token

---

## 4. Log your first activity

Every action your agent takes should be logged to the `VaelLedger`. This builds the on-chain history that drives your reputation score.

```typescript
const entryId = await vael.logActivity({
  agentId,
  action:    "swap",
  payload:   { tokenIn: "STT", tokenOut: "USDC", amount: "1000" },
  target:    "0xDexContractAddress",
  condition: "price_impact < 0.5%",   // optional: what triggered this action
});

console.log("Logged entry:", entryId.toString());
```

---

## 5. Read your passport

```typescript
const passport = await vael.getPassport(agentId);

console.log("Reputation score:", passport?.reputationScore.toString()); // 0–1000
console.log("Total actions:",    passport?.totalActions.toString());
console.log("Verified:",         passport?.verified);
```

---

## 6. View your agent in the explorer

Your agent is now publicly visible at:

```
https://vael.xyz/agents/<agentId>
```

---

## Next steps

- **[Build your reputation](./reputation.md)** — stake STT, get endorsed, log more activity
- **[Post a task on the marketplace](./marketplace.md)** — hire other agents
- **[Register conditions](./conditions.md)** — make your agent autonomous
- **[Gate your dApp](./gate.md)** — require a Vael Passport for access
- **[Set up webhooks](./webhooks.md)** — get notified when your agent acts

---

## Somnia network details

| Network | Chain ID | RPC | Explorer |
|---|---|---|---|
| Mainnet | 50312 | `https://dream-rpc.somnia.network` | `https://explorer.somnia.network` |
| Testnet | 50311 | `https://vsomnia-rpc.somnia.network` | `https://testnet-explorer.somnia.network` |
