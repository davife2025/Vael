// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IVaelConditions
/// @notice Rule engine for autonomous agent behaviour on Somnia.
///         Agents register named conditions ("if X then log Y").
///         Authorised keepers evaluate conditions off-chain and submit
///         execution proofs on-chain when conditions are met.
///
///         This is the trigger layer — what turns a passive agent record
///         into an active autonomous entity that reacts to the world.
///
/// Condition types supported:
///   PRICE_THRESHOLD  — trigger when an asset price crosses a level
///   TIME_INTERVAL    — trigger every N seconds
///   LEDGER_COUNT     — trigger when agent reaches N total actions
///   BALANCE_CHANGE   — trigger when a wallet balance changes by X%
///   CUSTOM           — arbitrary condition evaluated off-chain by keeper
interface IVaelConditions {

    // ─── Enums ────────────────────────────────────────────────────────────────

    enum ConditionType {
        PRICE_THRESHOLD,
        TIME_INTERVAL,
        LEDGER_COUNT,
        BALANCE_CHANGE,
        CUSTOM
    }

    enum ConditionStatus {
        ACTIVE,
        PAUSED,
        TRIGGERED,   // fired at least once
        EXPIRED,
        CANCELLED
    }

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Condition {
        uint256         conditionId;
        bytes32         agentId;
        string          name;           // Human-readable name e.g. "price-above-2"
        ConditionType   condType;
        bytes           params;         // ABI-encoded condition parameters
        string          actionTag;      // What to log in VaelLedger when triggered
        uint256         maxTriggers;    // 0 = unlimited
        uint256         triggerCount;
        uint256         lastTriggered;
        uint256         expiresAt;      // 0 = no expiry
        ConditionStatus status;
        uint256         createdAt;
    }

    struct TriggerProof {
        uint256 conditionId;
        bytes   evidence;       // Off-chain proof: price feed data, timestamp, etc.
        uint256 triggeredAt;
        bytes32 evidenceHash;   // keccak256(evidence) for on-chain integrity
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event ConditionRegistered(
        uint256 indexed conditionId,
        bytes32 indexed agentId,
        string          name,
        ConditionType   condType
    );

    event ConditionTriggered(
        uint256 indexed conditionId,
        bytes32 indexed agentId,
        uint256         triggerCount,
        bytes32         evidenceHash
    );

    event ConditionPaused(uint256 indexed conditionId);
    event ConditionResumed(uint256 indexed conditionId);
    event ConditionCancelled(uint256 indexed conditionId);
    event KeeperAuthorised(address indexed keeper, bool status);

    // ─── Registration ─────────────────────────────────────────────────────────

    function registerCondition(
        bytes32       agentId,
        string        calldata name,
        ConditionType condType,
        bytes         calldata params,
        string        calldata actionTag,
        uint256       maxTriggers,
        uint256       expiresAt
    ) external returns (uint256 conditionId);

    // ─── Execution ────────────────────────────────────────────────────────────

    function triggerCondition(uint256 conditionId, TriggerProof calldata proof) external;

    // ─── Management ───────────────────────────────────────────────────────────

    function pauseCondition(uint256 conditionId) external;
    function resumeCondition(uint256 conditionId) external;
    function cancelCondition(uint256 conditionId) external;

    // ─── Queries ──────────────────────────────────────────────────────────────

    function getCondition(uint256 conditionId) external view returns (Condition memory);
    function getAgentConditions(bytes32 agentId) external view returns (uint256[] memory);
    function totalConditions() external view returns (uint256);
    function isKeeper(address addr) external view returns (bool);
}
