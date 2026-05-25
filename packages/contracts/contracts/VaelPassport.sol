// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaelPassport.sol";
import "./interfaces/IVaelRegistry.sol";

/// @title VaelPassport
/// @notice ERC-721 identity token for every registered Vael agent.
///         One passport per agent. Non-transferable (soulbound) by default —
///         the passport follows the agent, not the wallet.
///         Carries a cross-dApp reputation score (0–1000) updated by VaelReputation (Session 6).
/// @dev Minted automatically on agent registration or explicitly by the agent owner.
///      tokenId is a simple auto-incrementing counter; agentId is the canonical identifier.
contract VaelPassport is IVaelPassport, ERC721URIStorage, Ownable, Pausable, ReentrancyGuard {

    // ─── State ────────────────────────────────────────────────────────────────

    IVaelRegistry public immutable registry;

    uint256 private _nextTokenId;

    /// @notice agentId → Passport record
    mapping(bytes32 => Passport) private _passports;

    /// @notice tokenId → agentId (reverse lookup)
    mapping(uint256 => bytes32) private _tokenToAgent;

    /// @notice agentId → whether a passport has been issued
    mapping(bytes32 => bool) private _issued;

    /// @notice Addresses authorised to update reputation scores
    ///         (VaelReputation contract granted this in Session 6)
    mapping(address => bool) private _reputationOracles;

    /// @notice Addresses authorised to sync activity counts
    ///         (VaelLedger contract granted this after deployment)
    mapping(address => bool) private _activitySyncers;

    /// @notice Whether passports are soulbound (non-transferable)
    bool public soulbound = true;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address registryAddress)
        ERC721("Vael Agent Passport", "VAELPASS")
        Ownable(msg.sender)
    {
        require(registryAddress != address(0), "VaelPassport: zero registry address");
        registry = IVaelRegistry(registryAddress);
        _nextTokenId = 1;
    }

    // ─── Soulbound enforcement ────────────────────────────────────────────────

    /// @dev Override transfer to enforce soulbound behaviour.
    ///      Only minting (from == address(0)) is allowed when soulbound = true.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (soulbound && from != address(0)) {
            revert("VaelPassport: passport is soulbound and non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    // ─── Core: Issue Passport ─────────────────────────────────────────────────

    /// @notice Issue a passport ERC-721 token to a registered agent.
    ///         Can be called by the agent owner or an authorised issuer (e.g. VaelRegistry).
    /// @param agentId The registered agent to issue a passport for
    /// @param owner   Wallet that will receive the ERC-721 token
    /// @return tokenId The minted token ID
    function issuePassport(bytes32 agentId, address owner)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 tokenId)
    {
        require(registry.isRegistered(agentId),   "VaelPassport: agent not registered");
        require(!_issued[agentId],                "VaelPassport: passport already issued");

        IVaelRegistry.AgentRecord memory agent = registry.getAgent(agentId);
        require(
            agent.owner == msg.sender || _reputationOracles[msg.sender] || msg.sender == owner(),
            "VaelPassport: not authorised to issue"
        );

        tokenId = _nextTokenId++;

        _passports[agentId] = Passport({
            agentId:        agentId,
            tokenId:        tokenId,
            reputationScore: 0,
            totalActions:   0,
            issuedAt:       block.timestamp,
            lastActivityAt: 0,
            verified:       false
        });

        _tokenToAgent[tokenId] = agentId;
        _issued[agentId] = true;

        _safeMint(owner, tokenId);

        emit PassportIssued(agentId, tokenId, owner);
    }

    // ─── Core: Reputation + Activity Sync ─────────────────────────────────────

    /// @notice Update the reputation score for an agent's passport.
    ///         Called by VaelReputation contract (Session 6).
    /// @param agentId  Target agent
    /// @param newScore New reputation score (0–1000)
    function updateReputation(bytes32 agentId, uint256 newScore)
        external
    {
        require(_issued[agentId],                  "VaelPassport: no passport for agent");
        require(_reputationOracles[msg.sender],    "VaelPassport: not a reputation oracle");
        require(newScore <= 1000,                  "VaelPassport: score exceeds 1000");

        uint256 oldScore = _passports[agentId].reputationScore;
        _passports[agentId].reputationScore = newScore;

        emit ReputationUpdated(agentId, oldScore, newScore);
    }

    /// @notice Sync total activity count and last activity timestamp from VaelLedger.
    ///         Called by VaelLedger or an authorised syncer after each logged activity.
    function syncActivity(
        bytes32 agentId,
        uint256 totalActions,
        uint256 lastActivityAt
    ) external {
        require(_issued[agentId],               "VaelPassport: no passport for agent");
        require(_activitySyncers[msg.sender],   "VaelPassport: not an activity syncer");

        _passports[agentId].totalActions   = totalActions;
        _passports[agentId].lastActivityAt = lastActivityAt;
    }

    /// @notice Mark an agent's passport as verified by the Vael team.
    function verifyPassport(bytes32 agentId) external onlyOwner {
        require(_issued[agentId], "VaelPassport: no passport for agent");
        _passports[agentId].verified = true;
        emit PassportVerified(agentId);
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    function getPassport(bytes32 agentId)
        external
        view
        returns (Passport memory)
    {
        require(_issued[agentId], "VaelPassport: no passport for agent");
        return _passports[agentId];
    }

    function getPassportByToken(uint256 tokenId)
        external
        view
        returns (Passport memory)
    {
        bytes32 agentId = _tokenToAgent[tokenId];
        require(agentId != bytes32(0), "VaelPassport: token not found");
        return _passports[agentId];
    }

    function hasPassport(bytes32 agentId) external view returns (bool) {
        return _issued[agentId];
    }

    function totalPassports() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setReputationOracle(address oracle, bool status) external onlyOwner {
        _reputationOracles[oracle] = status;
    }

    function setActivitySyncer(address syncer, bool status) external onlyOwner {
        _activitySyncers[syncer] = status;
    }

    function setSoulbound(bool _soulbound) external onlyOwner {
        soulbound = _soulbound;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── ERC-165 ──────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
