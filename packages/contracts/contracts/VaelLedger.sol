// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaelLedger.sol";
import "./interfaces/IVaelRegistry.sol";

/// @title VaelLedger
/// @notice Immutable, append-only activity log for every AI agent on Somnia.
///         Records what each agent did, when, and under what condition.
///         Once written, entries cannot be modified or deleted — this is the truth layer.
/// @dev Requires a registered agent in VaelRegistry before accepting entries.
///      Only the agent's owner or an authorised caller (e.g. an agent's own contract)
///      may write to an agent's ledger.
contract VaelLedger is IVaelLedger, Ownable, Pausable, ReentrancyGuard {

    // ─── State ────────────────────────────────────────────────────────────────

    IVaelRegistry public immutable registry;

    /// @notice agentId → entryId → ActivityEntry
    mapping(bytes32 => mapping(uint256 => ActivityEntry)) private _entries;

    /// @notice agentId → total number of entries ever logged
    mapping(bytes32 => uint256) private _totals;

    /// @notice Global activity count across all agents
    uint256 private _globalTotal;

    /// @notice Addresses authorised to log activity for any registered agent
    ///         (e.g. Vael-certified dApps, agent execution environments)
    mapping(address => bool) private _authorisedLoggers;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address registryAddress) Ownable(msg.sender) {
        require(registryAddress != address(0), "VaelLedger: zero registry address");
        registry = IVaelRegistry(registryAddress);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier canLog(bytes32 agentId) {
        require(registry.isRegistered(agentId), "VaelLedger: agent not registered");
        IVaelRegistry.AgentRecord memory agent = registry.getAgent(agentId);
        require(
            agent.owner == msg.sender || _authorisedLoggers[msg.sender],
            "VaelLedger: not authorised to log"
        );
        require(agent.active, "VaelLedger: agent is inactive");
        _;
    }

    // ─── Core: Log Activity ───────────────────────────────────────────────────

    /// @notice Log an activity entry for a registered agent.
    ///         Callable by the agent owner or an authorised logger.
    /// @param agentId       The agent performing the action
    /// @param action        Action tag e.g. "transfer", "vote", "trade"
    /// @param payload       ABI-encoded action-specific data
    /// @param target        Address the agent acted upon (address(0) if N/A)
    /// @param conditionHash Hash of the trigger condition (bytes32(0) if N/A)
    /// @return entryId      The sequential ID of this entry within the agent's ledger
    function logActivity(
        bytes32 agentId,
        string  calldata action,
        bytes   calldata payload,
        address target,
        bytes32 conditionHash
    ) external whenNotPaused nonReentrant canLog(agentId) returns (uint256 entryId) {
        require(bytes(action).length > 0, "VaelLedger: action required");

        entryId = _totals[agentId];

        _entries[agentId][entryId] = ActivityEntry({
            entryId:       entryId,
            agentId:       agentId,
            action:        action,
            payload:       payload,
            target:        target,
            timestamp:     block.timestamp,
            blockNumber:   block.number,
            conditionHash: conditionHash
        });

        _totals[agentId]++;
        _globalTotal++;

        emit ActivityLogged(agentId, entryId, action, block.timestamp);
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    function getEntry(bytes32 agentId, uint256 entryId)
        external
        view
        returns (ActivityEntry memory)
    {
        require(entryId < _totals[agentId], "VaelLedger: entry not found");
        return _entries[agentId][entryId];
    }

    /// @notice Returns the most recent `count` entries for an agent, newest first.
    function getRecentEntries(bytes32 agentId, uint256 count)
        external
        view
        returns (ActivityEntry[] memory entries)
    {
        uint256 total = _totals[agentId];
        if (total == 0) return new ActivityEntry[](0);

        uint256 size = count > total ? total : count;
        entries = new ActivityEntry[](size);

        for (uint256 i = 0; i < size; i++) {
            entries[i] = _entries[agentId][total - 1 - i];
        }
    }

    /// @notice Returns a paginated slice of entries for an agent.
    /// @param agentId  Target agent
    /// @param offset   Start index (0 = oldest)
    /// @param limit    Max entries to return
    function getEntriesPaginated(
        bytes32 agentId,
        uint256 offset,
        uint256 limit
    ) external view returns (ActivityEntry[] memory entries) {
        uint256 total = _totals[agentId];
        if (offset >= total) return new ActivityEntry[](0);

        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 size = end - offset;
        entries = new ActivityEntry[](size);

        for (uint256 i = 0; i < size; i++) {
            entries[i] = _entries[agentId][offset + i];
        }
    }

    function getTotalEntries(bytes32 agentId) external view returns (uint256) {
        return _totals[agentId];
    }

    function globalTotal() external view returns (uint256) {
        return _globalTotal;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function authoriseLogger(address logger, bool status) external onlyOwner {
        _authorisedLoggers[logger] = status;
    }

    function isAuthorisedLogger(address logger) external view returns (bool) {
        return _authorisedLoggers[logger];
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
