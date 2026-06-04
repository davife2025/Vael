// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaelConditions.sol";
import "./interfaces/IVaelRegistry.sol";
import "./interfaces/IVaelLedger.sol";

/// @title VaelConditions
/// @notice Autonomous trigger condition engine for Vael agents.
///
///         This is what makes agents truly autonomous. Instead of requiring
///         an external caller to manually trigger every action, agents register
///         conditions that fire automatically when real-world events occur:
///
///           "When STT price crosses $2.00 → log a 'price-alert' entry"
///           "Every 3600 seconds → log a 'heartbeat' entry"
///           "When I reach 1000 total actions → log a 'milestone' entry"
///
///         The architecture uses a keeper pattern:
///           1. Agent registers a condition on-chain (what to watch for)
///           2. Authorised keeper nodes watch the world off-chain
///           3. When a condition is met, keeper calls triggerCondition() with proof
///           4. Contract verifies the proof hash, logs the activity via VaelLedger,
///              and emits a ConditionTriggered event
///
///         This keeps gas costs minimal while giving agents real-time reactivity.
///
/// @dev    Keepers are authorised addresses operated by Vael or trusted third parties.
///         In production: use Chainlink Automation or Somnia's native data streams
///         as the keeper layer. The contract is keeper-agnostic.

contract VaelConditions is IVaelConditions, Ownable, Pausable, ReentrancyGuard {

    // ─── State ────────────────────────────────────────────────────────────────

    IVaelRegistry public immutable registry;
    IVaelLedger   public immutable ledger;

    uint256 private _conditionCounter;

    /// @notice conditionId → Condition
    mapping(uint256 => Condition) private _conditions;

    /// @notice agentId → list of conditionIds
    mapping(bytes32 => uint256[]) private _agentConditions;

    /// @notice Authorised keeper addresses
    mapping(address => bool) private _keepers;

    /// @notice conditionId → triggerIndex → TriggerProof (history)
    mapping(uint256 => mapping(uint256 => TriggerProof)) private _triggerHistory;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _registry, address _ledger) Ownable(msg.sender) {
        require(_registry != address(0), "VaelConditions: zero registry");
        require(_ledger   != address(0), "VaelConditions: zero ledger");
        registry = IVaelRegistry(_registry);
        ledger   = IVaelLedger(_ledger);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAgentOwner(uint256 conditionId) {
        bytes32 agentId = _conditions[conditionId].agentId;
        require(agentId != bytes32(0),                       "VaelConditions: condition not found");
        IVaelRegistry.AgentRecord memory rec = registry.getAgent(agentId);
        require(rec.owner == msg.sender,                     "VaelConditions: not agent owner");
        _;
    }

    modifier onlyKeeper() {
        require(_keepers[msg.sender], "VaelConditions: not an authorised keeper");
        _;
    }

    modifier conditionActive(uint256 conditionId) {
        Condition storage c = _conditions[conditionId];
        require(c.conditionId != 0,                          "VaelConditions: not found");
        require(c.status == ConditionStatus.ACTIVE,          "VaelConditions: condition not active");
        require(c.expiresAt == 0 || block.timestamp <= c.expiresAt, "VaelConditions: expired");
        _;
    }

    // ─── Registration ─────────────────────────────────────────────────────────

    /// @notice Register a new condition for an agent.
    /// @param agentId      Agent this condition belongs to
    /// @param name         Human-readable name e.g. "price-above-2"
    /// @param condType     Condition type enum
    /// @param params       ABI-encoded condition parameters (type-specific)
    /// @param actionTag    VaelLedger action tag to use when triggered
    /// @param maxTriggers  Maximum number of times to fire (0 = unlimited)
    /// @param expiresAt    Unix timestamp after which condition expires (0 = no expiry)
    /// @return conditionId Assigned condition ID
    function registerCondition(
        bytes32       agentId,
        string        calldata name,
        ConditionType condType,
        bytes         calldata params,
        string        calldata actionTag,
        uint256       maxTriggers,
        uint256       expiresAt
    ) external whenNotPaused returns (uint256 conditionId) {
        require(registry.isRegistered(agentId),       "VaelConditions: agent not registered");
        require(registry.getAgent(agentId).owner == msg.sender, "VaelConditions: not agent owner");
        require(registry.getAgent(agentId).active,   "VaelConditions: agent inactive");
        require(bytes(name).length > 0,               "VaelConditions: name required");
        require(bytes(actionTag).length > 0,          "VaelConditions: actionTag required");
        require(expiresAt == 0 || expiresAt > block.timestamp, "VaelConditions: expiry in past");

        conditionId = ++_conditionCounter;

        _conditions[conditionId] = Condition({
            conditionId:  conditionId,
            agentId:      agentId,
            name:         name,
            condType:     condType,
            params:       params,
            actionTag:    actionTag,
            maxTriggers:  maxTriggers,
            triggerCount: 0,
            lastTriggered:0,
            expiresAt:    expiresAt,
            status:       ConditionStatus.ACTIVE,
            createdAt:    block.timestamp,
        });

        _agentConditions[agentId].push(conditionId);

        emit ConditionRegistered(conditionId, agentId, name, condType);
    }

    // ─── Execution ────────────────────────────────────────────────────────────

    /// @notice Keeper submits proof that a condition has been met.
    ///         Contract verifies, logs activity in VaelLedger, and records the trigger.
    /// @param conditionId Target condition
    /// @param proof       TriggerProof with evidence and hash
    function triggerCondition(uint256 conditionId, TriggerProof calldata proof)
        external
        whenNotPaused
        nonReentrant
        onlyKeeper
        conditionActive(conditionId)
    {
        Condition storage c = _conditions[conditionId];

        // Verify evidence integrity
        require(
            keccak256(proof.evidence) == proof.evidenceHash,
            "VaelConditions: invalid evidence hash"
        );

        // Check max triggers
        if (c.maxTriggers > 0) {
            require(c.triggerCount < c.maxTriggers, "VaelConditions: max triggers reached");
        }

        // Apply time-interval cooldown for TIME_INTERVAL conditions
        if (c.condType == ConditionType.TIME_INTERVAL) {
            uint256 interval = abi.decode(c.params, (uint256));
            require(
                block.timestamp >= c.lastTriggered + interval,
                "VaelConditions: interval not elapsed"
            );
        }

        // Update state
        c.triggerCount++;
        c.lastTriggered = block.timestamp;

        // Mark as TRIGGERED status on first fire
        if (c.triggerCount == 1) {
            c.status = ConditionStatus.TRIGGERED;
        }

        // Auto-expire if max triggers reached
        if (c.maxTriggers > 0 && c.triggerCount >= c.maxTriggers) {
            c.status = ConditionStatus.EXPIRED;
        }

        // Store proof in history
        _triggerHistory[conditionId][c.triggerCount] = proof;

        // Log activity in VaelLedger (the condition firing IS an agent action)
        ledger.logActivity(
            c.agentId,
            c.actionTag,
            proof.evidence,
            address(0),
            proof.evidenceHash
        );

        emit ConditionTriggered(conditionId, c.agentId, c.triggerCount, proof.evidenceHash);
    }

    // ─── Management ───────────────────────────────────────────────────────────

    function pauseCondition(uint256 conditionId)
        external
        onlyAgentOwner(conditionId)
    {
        Condition storage c = _conditions[conditionId];
        require(
            c.status == ConditionStatus.ACTIVE || c.status == ConditionStatus.TRIGGERED,
            "VaelConditions: cannot pause"
        );
        c.status = ConditionStatus.PAUSED;
        emit ConditionPaused(conditionId);
    }

    function resumeCondition(uint256 conditionId)
        external
        onlyAgentOwner(conditionId)
    {
        require(_conditions[conditionId].status == ConditionStatus.PAUSED, "VaelConditions: not paused");
        _conditions[conditionId].status = ConditionStatus.ACTIVE;
        emit ConditionResumed(conditionId);
    }

    function cancelCondition(uint256 conditionId)
        external
        onlyAgentOwner(conditionId)
    {
        ConditionStatus s = _conditions[conditionId].status;
        require(
            s == ConditionStatus.ACTIVE ||
            s == ConditionStatus.PAUSED ||
            s == ConditionStatus.TRIGGERED,
            "VaelConditions: already expired/cancelled"
        );
        _conditions[conditionId].status = ConditionStatus.CANCELLED;
        emit ConditionCancelled(conditionId);
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    function getCondition(uint256 conditionId)
        external view returns (Condition memory)
    {
        require(_conditions[conditionId].conditionId != 0, "VaelConditions: not found");
        return _conditions[conditionId];
    }

    function getAgentConditions(bytes32 agentId)
        external view returns (uint256[] memory)
    {
        return _agentConditions[agentId];
    }

    function getTriggerProof(uint256 conditionId, uint256 triggerIndex)
        external view returns (TriggerProof memory)
    {
        return _triggerHistory[conditionId][triggerIndex];
    }

    function totalConditions() external view returns (uint256) {
        return _conditionCounter;
    }

    function isKeeper(address addr) external view returns (bool) {
        return _keepers[addr];
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function authoriseKeeper(address keeper, bool status) external onlyOwner {
        require(keeper != address(0), "VaelConditions: zero keeper");
        _keepers[keeper] = status;
        emit KeeperAuthorised(keeper, status);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
