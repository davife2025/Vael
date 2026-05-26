// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IVaelReputation
/// @notice Interface for the Vael reputation engine.
///         Computes on-chain reputation scores (0–1000) from agent activity,
///         age, stake weight, and community signals. Pushes scores to VaelPassport.
interface IVaelReputation {

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct ReputationFactors {
        uint256 activityScore;   // 0–300: derived from total ledger entries + action diversity
        uint256 ageScore;        // 0–200: time since registration (older = higher)
        uint256 stakeScore;      // 0–300: based on STT tokens staked against this agent
        uint256 communityScore;  // 0–200: endorsements from other verified agents
        uint256 total;           // 0–1000: weighted sum
        uint256 lastComputed;    // timestamp of last score update
    }

    struct StakePosition {
        address staker;
        bytes32 agentId;
        uint256 amount;          // STT staked
        uint256 stakedAt;
        bool    withdrawn;
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event ScoreComputed(bytes32 indexed agentId, uint256 oldScore, uint256 newScore, uint256 timestamp);
    event Staked(bytes32 indexed agentId, address indexed staker, uint256 amount);
    event Unstaked(bytes32 indexed agentId, address indexed staker, uint256 amount);
    event Endorsed(bytes32 indexed agentId, bytes32 indexed endorser, uint256 weight);
    event SlashProposed(bytes32 indexed agentId, address indexed proposer, string reason);

    // ─── Scoring ──────────────────────────────────────────────────────────────

    function computeScore(bytes32 agentId) external returns (uint256 score);
    function getFactors(bytes32 agentId) external view returns (ReputationFactors memory);
    function getScore(bytes32 agentId) external view returns (uint256);

    // ─── Staking ──────────────────────────────────────────────────────────────

    function stake(bytes32 agentId) external payable;
    function unstake(bytes32 agentId) external;
    function getStake(bytes32 agentId, address staker) external view returns (uint256);
    function getTotalStake(bytes32 agentId) external view returns (uint256);

    // ─── Endorsement ──────────────────────────────────────────────────────────

    function endorse(bytes32 agentId, bytes32 endorserAgentId) external;
    function getEndorsements(bytes32 agentId) external view returns (uint256);
}
