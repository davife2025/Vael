// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IVaelLedger
/// @notice Interface for the Vael activity ledger — records every action an agent takes on Somnia
/// @dev Implemented by VaelLedger.sol in Session 2
interface IVaelLedger {

    // ─── Structs ─────────────────────────────────────────────────────────────

    struct ActivityEntry {
        uint256 entryId;        // Auto-incrementing entry ID per agent
        bytes32 agentId;        // The agent this entry belongs to
        string  action;         // Action tag e.g. "transfer", "vote", "trade", "message"
        bytes   payload;        // ABI-encoded action payload (flexible per action type)
        address target;         // Address the agent acted upon (zero if not applicable)
        uint256 timestamp;      // block.timestamp
        uint256 blockNumber;    // Block at which action was recorded
        bytes32 conditionHash;  // Hash of the trigger condition that caused this action
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event ActivityLogged(
        bytes32 indexed agentId,
        uint256 indexed entryId,
        string  action,
        uint256 timestamp
    );

    // ─── Functions ────────────────────────────────────────────────────────────

    function logActivity(
        bytes32 agentId,
        string  calldata action,
        bytes   calldata payload,
        address target,
        bytes32 conditionHash
    ) external returns (uint256 entryId);

    function getEntry(bytes32 agentId, uint256 entryId) external view returns (ActivityEntry memory);
    function getRecentEntries(bytes32 agentId, uint256 count) external view returns (ActivityEntry[] memory);
    function getTotalEntries(bytes32 agentId) external view returns (uint256);
}
