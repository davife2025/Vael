// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IVaelRegistry
/// @notice Interface for the Vael agent registry — the canonical record of every AI agent on Somnia
/// @dev Implemented by VaelRegistry.sol in Session 2
interface IVaelRegistry {

    // ─── Structs ─────────────────────────────────────────────────────────────

    /// @notice Core agent record written at registration time
    struct AgentRecord {
        bytes32 agentId;        // Unique deterministic ID: keccak256(owner + nonce + chainId)
        address owner;          // Wallet that registered the agent
        string  agentType;      // Free-form type tag e.g. "trading", "npc", "oracle"
        string  metadataURI;    // IPFS URI pointing to extended agent metadata JSON
        uint256 createdAt;      // block.timestamp at registration
        uint256 blockNumber;    // Block number at registration
        bool    active;         // Whether the agent is currently active
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event AgentRegistered(
        bytes32 indexed agentId,
        address indexed owner,
        string  agentType,
        uint256 createdAt
    );

    event AgentDeactivated(bytes32 indexed agentId, address indexed owner);
    event AgentReactivated(bytes32 indexed agentId, address indexed owner);
    event AgentMetadataUpdated(bytes32 indexed agentId, string newMetadataURI);

    // ─── Functions ────────────────────────────────────────────────────────────

    function registerAgent(string calldata agentType, string calldata metadataURI) external returns (bytes32 agentId);
    function deactivateAgent(bytes32 agentId) external;
    function reactivateAgent(bytes32 agentId) external;
    function updateMetadata(bytes32 agentId, string calldata metadataURI) external;
    function getAgent(bytes32 agentId) external view returns (AgentRecord memory);
    function getAgentsByOwner(address owner) external view returns (bytes32[] memory);
    function isRegistered(bytes32 agentId) external view returns (bool);
    function totalAgents() external view returns (uint256);
}
