// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaelRegistry.sol";

/// @title VaelRegistry
/// @notice Canonical on-chain registry for every AI agent born on Somnia.
///         Every agent gets a deterministic ID, a timestamped birth record,
///         and a permanent entry in the Vael ledger of existence.
/// @dev Deployed first. VaelLedger and VaelPassport reference this contract.
contract VaelRegistry is IVaelRegistry, Ownable, Pausable, ReentrancyGuard {

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Total agents ever registered (never decrements)
    uint256 private _totalAgents;

    /// @notice agentId → AgentRecord
    mapping(bytes32 => AgentRecord) private _agents;

    /// @notice owner → list of agentIds they own
    mapping(address => bytes32[]) private _ownerAgents;

    /// @notice owner → nonce for deterministic ID generation
    mapping(address => uint256) private _nonces;

    /// @notice Authorised callers that can log activity on behalf of agents
    ///         (VaelLedger is granted this role after deployment)
    mapping(address => bool) private _authorised;

    // ─── Registration fee (optional, default 0) ───────────────────────────────

    uint256 public registrationFee;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {
        registrationFee = 0;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAgentOwner(bytes32 agentId) {
        require(_agents[agentId].owner == msg.sender, "VaelRegistry: not agent owner");
        _;
    }

    modifier agentExists(bytes32 agentId) {
        require(_agents[agentId].createdAt != 0, "VaelRegistry: agent not found");
        _;
    }

    // ─── Core: Registration ───────────────────────────────────────────────────

    /// @notice Register a new AI agent on Somnia.
    ///         Generates a deterministic agentId from caller + nonce + chainId.
    /// @param agentType  Free-form type tag e.g. "trading", "npc", "oracle"
    /// @param metadataURI IPFS URI pointing to AgentMetadata JSON
    /// @return agentId The unique identifier for this agent
    function registerAgent(
        string calldata agentType,
        string calldata metadataURI
    ) external payable whenNotPaused nonReentrant returns (bytes32 agentId) {
        require(bytes(agentType).length > 0,    "VaelRegistry: agentType required");
        require(bytes(metadataURI).length > 0,  "VaelRegistry: metadataURI required");
        require(msg.value >= registrationFee,   "VaelRegistry: insufficient fee");

        // Deterministic ID: owner address + nonce + chainId prevents collisions
        uint256 nonce = _nonces[msg.sender]++;
        agentId = keccak256(abi.encodePacked(msg.sender, nonce, block.chainid));

        // Sanity: ID must be unique (astronomically unlikely collision but we check)
        require(_agents[agentId].createdAt == 0, "VaelRegistry: agentId collision");

        _agents[agentId] = AgentRecord({
            agentId:     agentId,
            owner:       msg.sender,
            agentType:   agentType,
            metadataURI: metadataURI,
            createdAt:   block.timestamp,
            blockNumber: block.number,
            active:      true
        });

        _ownerAgents[msg.sender].push(agentId);
        _totalAgents++;

        emit AgentRegistered(agentId, msg.sender, agentType, block.timestamp);

        // Refund excess fee
        if (msg.value > registrationFee) {
            payable(msg.sender).transfer(msg.value - registrationFee);
        }
    }

    // ─── Core: State Management ───────────────────────────────────────────────

    function deactivateAgent(bytes32 agentId)
        external
        agentExists(agentId)
        onlyAgentOwner(agentId)
    {
        require(_agents[agentId].active, "VaelRegistry: already inactive");
        _agents[agentId].active = false;
        emit AgentDeactivated(agentId, msg.sender);
    }

    function reactivateAgent(bytes32 agentId)
        external
        agentExists(agentId)
        onlyAgentOwner(agentId)
    {
        require(!_agents[agentId].active, "VaelRegistry: already active");
        _agents[agentId].active = true;
        emit AgentReactivated(agentId, msg.sender);
    }

    function updateMetadata(bytes32 agentId, string calldata metadataURI)
        external
        agentExists(agentId)
        onlyAgentOwner(agentId)
    {
        require(bytes(metadataURI).length > 0, "VaelRegistry: metadataURI required");
        _agents[agentId].metadataURI = metadataURI;
        emit AgentMetadataUpdated(agentId, metadataURI);
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    function getAgent(bytes32 agentId)
        external
        view
        agentExists(agentId)
        returns (AgentRecord memory)
    {
        return _agents[agentId];
    }

    function getAgentsByOwner(address owner)
        external
        view
        returns (bytes32[] memory)
    {
        return _ownerAgents[owner];
    }

    function isRegistered(bytes32 agentId) external view returns (bool) {
        return _agents[agentId].createdAt != 0;
    }

    function totalAgents() external view returns (uint256) {
        return _totalAgents;
    }

    function getNonce(address owner) external view returns (uint256) {
        return _nonces[owner];
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setRegistrationFee(uint256 fee) external onlyOwner {
        registrationFee = fee;
    }

    function authorise(address caller, bool status) external onlyOwner {
        _authorised[caller] = status;
    }

    function isAuthorised(address caller) external view returns (bool) {
        return _authorised[caller];
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
