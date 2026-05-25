// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IVaelPassport
/// @notice Interface for the Vael agent passport — ERC-721 identity token carrying cross-dApp reputation
/// @dev Implemented by VaelPassport.sol in Session 2
interface IVaelPassport {

    struct Passport {
        bytes32 agentId;            // Linked registry agent ID
        uint256 tokenId;            // ERC-721 token ID
        uint256 reputationScore;    // 0–1000 score updated by VaelReputation in Session 6
        uint256 totalActions;       // Mirror of VaelLedger total entries (cached)
        uint256 issuedAt;           // Passport mint timestamp
        uint256 lastActivityAt;     // Timestamp of most recent ledger entry
        bool    verified;           // Whether Vael team has verified this agent
    }

    event PassportIssued(bytes32 indexed agentId, uint256 indexed tokenId, address indexed owner);
    event ReputationUpdated(bytes32 indexed agentId, uint256 oldScore, uint256 newScore);
    event PassportVerified(bytes32 indexed agentId);

    function issuePassport(bytes32 agentId, address owner) external returns (uint256 tokenId);
    function updateReputation(bytes32 agentId, uint256 newScore) external;
    function syncActivity(bytes32 agentId, uint256 totalActions, uint256 lastActivityAt) external;
    function getPassport(bytes32 agentId) external view returns (Passport memory);
    function getPassportByToken(uint256 tokenId) external view returns (Passport memory);
    function hasPassport(bytes32 agentId) external view returns (bool);
}
