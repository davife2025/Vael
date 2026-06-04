# VaelGate — Passport Verification Middleware

VaelGate lets any Somnia dApp gate access by agent identity and reputation. Drop it into Express, React, or any JavaScript environment.

```bash
npm install @vael/gate
```

---

## Core concepts

**GatePolicy** defines the rules an agent must satisfy:

```typescript
interface GatePolicy {
  requirePassport?:  boolean;    // Must have a VaelPassport (default: true)
  requireVerified?:  boolean;    // Must be Vael-verified (default: false)
  minReputation?:    number;     // Minimum score 0–1000 (default: 0)
  allowedTypes?:     string[];   // Whitelist of agent types
  blockedTypes?:     string[];   // Blacklist of agent types
  minActivities?:    number;     // Minimum ledger entries
  registeredAfter?:  number;     // Unix timestamp
  customValidator?:  (agent: AgentRecord) => boolean | Promise<boolean>;
}
```

**GateResult** is a discriminated union:

```typescript
type GateResult =
  | { allowed: true;  agent: AgentRecord }
  | { allowed: false; reason: GateDenyReason; message: string }
```

---

## Express middleware

```typescript
import { createExpressGate } from "@vael/gate/express";

const gate = createExpressGate({
  apiUrl:        "https://api.vael.xyz",
  apiKey:        process.env.VAEL_API_KEY,
  defaultPolicy: { requirePassport: true },
  cacheTtl:      60,  // cache agent lookups for 60 seconds
});

// Any registered agent with a passport
app.get("/agent-only", gate(), handler);

// Oracle agents with 500+ reputation
app.post("/oracle-data", gate({
  minReputation: 500,
  allowedTypes:  ["oracle"],
}), handler);

// Verified agents only
app.delete("/admin", gate({ requireVerified: true }), handler);

// Custom validator
app.get("/custom", gate({
  customValidator: async (agent) => {
    return agent.totalActivities >= 100n;
  },
}), handler);

// Access verified agent in handler
app.get("/me", gate(), (req, res) => {
  const agent = req.vaelAgent;  // AgentRecord
  res.json({ agentId: agent?.agentId });
});
```

**Agent ID is read from (in order):**
1. `x-vael-agent-id` header
2. `?agentId` query param
3. `req.body.agentId`

**Error responses:**

```json
{ "error": "Agent reputation score 150 is below minimum 500", "denied": true, "reason": "INSUFFICIENT_REP" }
```

---

## React hook

```typescript
import { useVaelGate } from "@vael/gate/react";

function MyComponent({ agentId }: { agentId: string }) {
  const { allowed, loading, result, verify, reset } = useVaelGate({
    agentId,
    policy: { minReputation: 300, requireVerified: false },
    config: { apiUrl: "https://api.vael.xyz" },
  });

  if (loading)  return <Spinner />;
  if (!allowed) return <AccessDenied reason={result?.reason} />;
  return <ProtectedFeature />;
}
```

---

## React component

```typescript
import { PassportVerifier } from "@vael/gate/react";

<PassportVerifier
  agentId={connectedAgentId}
  policy={{ minReputation: 400 }}
  config={{ apiUrl: "https://api.vael.xyz" }}
  fallbackLoading={<Spinner />}
  fallbackDenied={(reason, message) => <AccessDenied reason={reason} message={message} />}
  fallbackNoAgent={<ConnectPrompt />}
>
  <ProtectedContent />
</PassportVerifier>
```

---

## Core function (framework-agnostic)

```typescript
import { evaluatePolicy, canPass, GateDenyReason } from "@vael/gate";

const config = { apiUrl: "https://api.vael.xyz", cacheTtl: 60 };

// Full result
const result = await evaluatePolicy(agentId, { minReputation: 500 }, config);
if (result.allowed) {
  console.log("Agent type:", result.agent.agentType);
} else {
  console.log("Denied:", result.reason, result.message);
}

// Boolean shorthand
const allowed = await canPass(agentId, { requireVerified: true }, config);
```

---

## Deny reasons

| Reason | Description |
|---|---|
| `NOT_REGISTERED` | Agent ID not found in VaelRegistry |
| `AGENT_INACTIVE` | Agent has been deactivated |
| `NO_PASSPORT` | Agent has no VaelPassport |
| `NOT_VERIFIED` | Passport is not Vael-verified |
| `INSUFFICIENT_REP` | Reputation score below minimum |
| `TYPE_NOT_ALLOWED` | Agent type not in allowedTypes |
| `TYPE_BLOCKED` | Agent type in blockedTypes |
| `TOO_NEW` | Agent registered before registeredAfter |
| `INSUFFICIENT_ACTIVITY` | Ledger entry count below minActivities |
| `CUSTOM_REJECTED` | customValidator returned false |
| `NETWORK_ERROR` | Vael API unreachable |

---

## Webhook signature verification

```typescript
import { verifySignature } from "@vael/gate";

app.post("/webhooks/vael", express.raw({ type: "application/json" }), (req, res) => {
  const valid = verifySignature(
    req.body.toString(),
    req.headers["x-vael-timestamp"] as string,
    req.headers["x-vael-signature"] as string,
    process.env.VAEL_WEBHOOK_SECRET!
  );

  if (!valid) return res.status(401).send("Invalid signature");

  const event = JSON.parse(req.body.toString());
  // handle event...
  res.json({ received: true });
});
```
