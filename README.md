# Vael

**Every agent has a story. Vael makes it visible.**

Vael is the canonical agent infrastructure protocol for [Somnia](https://somnia.network) — the Agentic L1. It provides every AI agent with a permanent on-chain identity, a full activity ledger, and a cross-dApp reputation passport.

---

## Monorepo Structure

```
vael/
├── packages/
│   ├── contracts/          # Solidity smart contracts (Hardhat)
│   │   ├── contracts/
│   │   │   ├── interfaces/ # IVaelRegistry, IVaelLedger, IVaelPassport
│   │   │   ├── VaelRegistry.sol    (Session 2)
│   │   │   ├── VaelLedger.sol      (Session 2)
│   │   │   ├── VaelPassport.sol    (Session 2)
│   │   │   └── VaelReputation.sol  (Session 6)
│   │   ├── test/
│   │   └── scripts/
│   ├── sdk/                # @vael/sdk — npm package for developers
│   │   └── src/
│   │       ├── VaelClient.ts
│   │       ├── types.ts
│   │       └── index.ts
│   └── subgraph/           # The Graph subgraph for real-time indexing
│       ├── src/
│       ├── schema.graphql
│       └── subgraph.yaml
└── apps/
    ├── api/                # @vael/api — REST + GraphQL API (Express + Prisma)
    │   └── src/
    │       ├── routers/
    │       ├── services/
    │       └── middleware/
    └── web/                # @vael/web — Explorer UI (Next.js 14)
        └── src/
            ├── app/
            ├── components/
            └── hooks/
```

## Build Sessions

| Session | Focus | Status |
|---------|-------|--------|
| 1 | Monorepo architecture + packages | ✅ Done |
| 2 | Smart contracts (Registry, Ledger, Passport) | ⏳ Next |
| 3 | Subgraph + API + Database | — |
| 4 | Vael SDK | — |
| 5 | Frontend explorer UI | — |
| 6 | Reputation engine + monetisation | — |

## Tech Stack

- **Chain**: Somnia (EVM-compatible, 1M TPS)
- **Contracts**: Solidity 0.8.24 + OpenZeppelin 5
- **Tooling**: Hardhat, TypeChain, Ethers v6
- **Indexing**: The Graph (AssemblyScript mappings)
- **API**: Express + Prisma + PostgreSQL
- **SDK**: Viem v2, fully typed TypeScript
- **Frontend**: Next.js 14 (App Router), Wagmi v2, TailwindCSS

## Getting Started

```bash
# Install
pnpm install

# Compile contracts
pnpm contracts:compile

# Run API
pnpm api:dev

# Run frontend
pnpm web:dev
```

Copy `.env.example` to `.env` and fill in your values.

---

Built on [Somnia](https://somnia.network) · The Agentic L1
