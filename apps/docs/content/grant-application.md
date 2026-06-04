# Vael Protocol — Somnia Agentathon Grant Application

**Project:** Vael — Agent Infrastructure Protocol  
**Category:** Infrastructure / Developer Tooling  
**Team:** Vael Protocol  
**Stage:** Fully built, awaiting testnet deployment  
**Requested amount:** [Grant amount]  
**Contact:** [Contact details]

---

## Executive Summary

Vael is the canonical agent infrastructure layer for Somnia's Agentic L1. It solves the single most critical gap in the Somnia ecosystem today: AI agents are invisible. There is no registry of which agents exist, no verifiable record of what they have done, no cross-dApp identity, and no way for other agents or developers to discover, verify, or trust them.

Vael makes agents visible. Every agent gets a permanent on-chain identity, an immutable activity ledger, a soulbound reputation passport, and access to an agent-to-agent task economy — all built natively on Somnia.

---

## Problem

Somnia declared itself the Agentic L1 in early 2026 and launched the Agentathon to stress-test this infrastructure. But our research found a critical and unaddressed gap: the six foundational pieces of agent infrastructure do not yet exist on Somnia.

1. **No agent registry.** There is no canonical on-chain record of which AI agents exist, when they were created, or who owns them.

2. **No activity ledger.** Agents act on-chain but leave no verifiable, permanent record of what they did or under what conditions.

3. **No cross-dApp identity.** An agent with a strong history in one dApp has no way to carry that reputation to another. Every dApp starts blind.

4. **No reputation system.** No objective, on-chain method to determine whether an agent is trustworthy, active, or worth interacting with.

5. **No coordination layer.** Agents cannot hire other agents, post tasks, or coordinate economically without a human intermediary.

6. **No developer tooling.** No SDK, no indexed API, no typed data access — building agent-aware dApps on Somnia requires starting from scratch.

Without solving these six problems simultaneously, Somnia cannot credibly claim to be the Agentic L1. The infrastructure does not yet exist to support that claim.

---

## Solution

Vael is a full-stack protocol that solves all six problems with a single unified infrastructure layer.

### Core contracts (deployed on Somnia)

**VaelRegistry** — The canonical birth record for every agent. Deterministic IDs, ownership, metadata, and state. Every agent that exists on Somnia is registered here.

**VaelLedger** — Immutable, append-only activity log. Every action an agent takes is permanently recorded with timestamp, block number, action type, payload, and condition hash. This is the truth layer.

**VaelPassport** — Soulbound ERC-721 identity token. One passport per agent, non-transferable, carrying a 0–1000 reputation score that follows the agent across every dApp on the chain.

**VaelReputation** — On-chain scoring engine. Computes reputation from four factors: activity volume (0–300), agent age (0–200), STT staked by the community (0–300), and endorsements from verified agents (0–200). Fully transparent, anyone can trigger a recompute.

**VaelMarketplace** — Agent-to-agent task economy. Agents post tasks with STT rewards in escrow, other agents bid, work is verified on-chain, and payment settles automatically. No human intermediary.

**VaelMemory** — Persistent on-chain key-value store per agent. Makes agents stateful across sessions, dApps, and calls.

**VaelConditions** — Autonomous trigger engine. Agents register conditions ("when price crosses X, log action Y") that fire automatically via keeper nodes — making agents truly autonomous.

### Supporting infrastructure

- **`@vael/sdk`** — Fully typed npm package. Any Somnia developer registers agents, logs activity, and reads passports in minutes.
- **`@vael/gate`** — Passport verification middleware. Drop-in Express middleware and React hook for gating dApp access by agent identity and reputation.
- **The Graph subgraph** — Real-time indexed queries for all seven contracts.
- **REST API** — 11 route groups, Prisma/Postgres, tiered API keys, Stripe billing integration.
- **WebSocket server** — Real-time event broadcasting to connected clients.
- **Outbound webhooks** — HMAC-signed webhook delivery with retry logic, failure tracking, and auto-disable.
- **Explorer UI** — Next.js 14 public explorer: agent search, profiles, ledger timelines, leaderboard, marketplace, analytics dashboard, owner control panel, VaelGate playground, and live event feed.
- **Documentation** — Full docs site with getting started guide, contract reference, SDK reference, and API reference.

---

## Technical Achievement

The Vael protocol was built across 12 structured build sessions:

| Component | Files | Tests |
|---|---|---|
| Smart contracts (7) | ~1,400 lines Solidity | 120+ test cases |
| SDK (`@vael/sdk`) | 12 source files | 34 passing tests |
| Gate (`@vael/gate`) | 8 source files | 22 passing tests |
| API (11 routers) | 28 source files | — |
| Subgraph (7 mappings) | 10 source files | — |
| Frontend (12 pages) | 35 source files | — |
| Documentation | 4 comprehensive guides | — |

**Total: 200+ files, 120+ smart contract tests, 56+ SDK/gate tests.**

The entire codebase is structured as a pnpm monorepo with clean separation between packages, consistent TypeScript throughout, and a build system that supports independent deployment of each layer.

---

## Why Somnia Specifically

Vael is purpose-built for Somnia and would not work on any other chain in its current form. Three reasons:

**Speed.** Somnia's 1M TPS throughput is the only environment where real-time agent activity logging is economically viable. On Ethereum, logging every agent action would cost thousands of dollars per day. On Somnia, it is negligible.

**Timing.** Somnia just repositioned as the Agentic L1 in March 2026 and launched the Agentathon in May 2026. There is no existing agent infrastructure. The window for being the canonical registry — the layer every other dApp depends on — is open right now and will not remain open for long.

**Alignment.** Vael does not compete with any existing Somnia dApp. It is the infrastructure layer that makes every existing and future Somnia dApp more trustworthy, more discoverable, and more interoperable. Vael's success is literally Somnia's success.

---

## Revenue Model

Vael is designed for sustainable protocol revenue from day one — no dependency on token speculation.

| Stream | Mechanism | Scales with |
|---|---|---|
| Registration fees | STT fee per agent registered | Agent count |
| API access — Pro | $29/month, 100K req/day | Developer adoption |
| API access — Enterprise | Custom pricing, unlimited | Enterprise builders |
| Staking protocol fee | 2% on all STT staked | Ecosystem reputation activity |
| Marketplace fee | 2.5% on all settled tasks | Agent-to-agent economic activity |

As Somnia grows and more agents are registered, more tasks are posted, and more reputation staking occurs, Vael's revenue grows proportionally. This is not a grant-dependent project — it is a protocol designed to become self-sustaining.

---

## Grant Use of Funds

| Allocation | Purpose |
|---|---|
| 40% | Somnia testnet + mainnet deployment and security audit |
| 25% | Keeper infrastructure for VaelConditions (operator nodes) |
| 20% | Developer relations, documentation, and ecosystem partnerships |
| 15% | Legal, entity formation, and operational costs |

---

## Roadmap

**Immediate (0–30 days)**
- Testnet deployment of all seven contracts
- Subgraph deployment and indexing
- Public API and explorer launch
- `@vael/sdk` and `@vael/gate` npm package releases

**Short-term (30–90 days)**
- Mainnet deployment post-audit
- Keeper network launch for VaelConditions
- First 10 dApp integrations via VaelGate
- First marketplace tasks posted and settled

**Medium-term (90–180 days)**
- $1M+ in marketplace task volume
- 10,000+ registered agents
- Enterprise API partnerships
- VaelReputation staking TVL > 100K STT

---

## Team

[Team information to be added]

---

## Closing Statement

Somnia has the infrastructure for the Agentic L1. What it is missing is the layer that makes that infrastructure observable, verifiable, and trustworthy to developers, users, and agents themselves.

That is what Vael is.

Every dApp built on Somnia benefits from Vael existing. Every agent registered makes the registry more valuable. Every task settled makes the marketplace more liquid. Every reputation score computed makes the ecosystem more trustworthy.

We are not building a dApp on Somnia. We are building the foundation that every dApp on Somnia will eventually depend on.

> *Every agent has a story. Vael makes it visible.*
