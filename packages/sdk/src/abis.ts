// ─── VaelRegistry ABI ────────────────────────────────────────────────────────

export const VAEL_REGISTRY_ABI = [
  // Events
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agentId",   type: "bytes32", indexed: true  },
      { name: "owner",     type: "address", indexed: true  },
      { name: "agentType", type: "string",  indexed: false },
      { name: "createdAt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AgentDeactivated",
    inputs: [
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "owner",   type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "AgentReactivated",
    inputs: [
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "owner",   type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "AgentMetadataUpdated",
    inputs: [
      { name: "agentId",        type: "bytes32", indexed: true  },
      { name: "newMetadataURI", type: "string",  indexed: false },
    ],
  },
  // Read functions
  {
    type: "function", name: "getAgent", stateMutability: "view",
    inputs:  [{ name: "agentId", type: "bytes32" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "agentId",     type: "bytes32" },
        { name: "owner",       type: "address" },
        { name: "agentType",   type: "string"  },
        { name: "metadataURI", type: "string"  },
        { name: "createdAt",   type: "uint256" },
        { name: "blockNumber", type: "uint256" },
        { name: "active",      type: "bool"    },
      ],
    }],
  },
  {
    type: "function", name: "getAgentsByOwner", stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }],
    outputs: [{ type: "bytes32[]" }],
  },
  {
    type: "function", name: "isRegistered", stateMutability: "view",
    inputs:  [{ name: "agentId", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "totalAgents", stateMutability: "view",
    inputs:  [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "registrationFee", stateMutability: "view",
    inputs:  [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "getNonce", stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  // Write functions
  {
    type: "function", name: "registerAgent", stateMutability: "payable",
    inputs:  [
      { name: "agentType",   type: "string" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ name: "agentId", type: "bytes32" }],
  },
  {
    type: "function", name: "deactivateAgent", stateMutability: "nonpayable",
    inputs:  [{ name: "agentId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function", name: "reactivateAgent", stateMutability: "nonpayable",
    inputs:  [{ name: "agentId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function", name: "updateMetadata", stateMutability: "nonpayable",
    inputs:  [
      { name: "agentId",     type: "bytes32" },
      { name: "metadataURI", type: "string"  },
    ],
    outputs: [],
  },
] as const;

// ─── VaelLedger ABI ──────────────────────────────────────────────────────────

export const VAEL_LEDGER_ABI = [
  {
    type: "event",
    name: "ActivityLogged",
    inputs: [
      { name: "agentId",   type: "bytes32", indexed: true  },
      { name: "entryId",   type: "uint256", indexed: true  },
      { name: "action",    type: "string",  indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function", name: "logActivity", stateMutability: "nonpayable",
    inputs: [
      { name: "agentId",       type: "bytes32" },
      { name: "action",        type: "string"  },
      { name: "payload",       type: "bytes"   },
      { name: "target",        type: "address" },
      { name: "conditionHash", type: "bytes32" },
    ],
    outputs: [{ name: "entryId", type: "uint256" }],
  },
  {
    type: "function", name: "getEntry", stateMutability: "view",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "entryId", type: "uint256" },
    ],
    outputs: [{
      type: "tuple",
      components: [
        { name: "entryId",       type: "uint256" },
        { name: "agentId",       type: "bytes32" },
        { name: "action",        type: "string"  },
        { name: "payload",       type: "bytes"   },
        { name: "target",        type: "address" },
        { name: "timestamp",     type: "uint256" },
        { name: "blockNumber",   type: "uint256" },
        { name: "conditionHash", type: "bytes32" },
      ],
    }],
  },
  {
    type: "function", name: "getRecentEntries", stateMutability: "view",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "count",   type: "uint256" },
    ],
    outputs: [{
      type: "tuple[]",
      components: [
        { name: "entryId",       type: "uint256" },
        { name: "agentId",       type: "bytes32" },
        { name: "action",        type: "string"  },
        { name: "payload",       type: "bytes"   },
        { name: "target",        type: "address" },
        { name: "timestamp",     type: "uint256" },
        { name: "blockNumber",   type: "uint256" },
        { name: "conditionHash", type: "bytes32" },
      ],
    }],
  },
  {
    type: "function", name: "getTotalEntries", stateMutability: "view",
    inputs:  [{ name: "agentId", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "globalTotal", stateMutability: "view",
    inputs:  [],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ─── VaelPassport ABI ────────────────────────────────────────────────────────

export const VAEL_PASSPORT_ABI = [
  {
    type: "event",
    name: "PassportIssued",
    inputs: [
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "owner",   type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "ReputationUpdated",
    inputs: [
      { name: "agentId",  type: "bytes32", indexed: true  },
      { name: "oldScore", type: "uint256", indexed: false },
      { name: "newScore", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PassportVerified",
    inputs: [{ name: "agentId", type: "bytes32", indexed: true }],
  },
  {
    type: "function", name: "issuePassport", stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "owner",   type: "address" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function", name: "getPassport", stateMutability: "view",
    inputs:  [{ name: "agentId", type: "bytes32" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "agentId",         type: "bytes32" },
        { name: "tokenId",         type: "uint256" },
        { name: "reputationScore", type: "uint256" },
        { name: "totalActions",    type: "uint256" },
        { name: "issuedAt",        type: "uint256" },
        { name: "lastActivityAt",  type: "uint256" },
        { name: "verified",        type: "bool"    },
      ],
    }],
  },
  {
    type: "function", name: "hasPassport", stateMutability: "view",
    inputs:  [{ name: "agentId", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "totalPassports", stateMutability: "view",
    inputs:  [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "getPassportByToken", stateMutability: "view",
    inputs:  [{ name: "tokenId", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "agentId",         type: "bytes32" },
        { name: "tokenId",         type: "uint256" },
        { name: "reputationScore", type: "uint256" },
        { name: "totalActions",    type: "uint256" },
        { name: "issuedAt",        type: "uint256" },
        { name: "lastActivityAt",  type: "uint256" },
        { name: "verified",        type: "bool"    },
      ],
    }],
  },
] as const;
