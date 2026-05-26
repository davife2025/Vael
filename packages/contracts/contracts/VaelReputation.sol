// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVaelReputation.sol";
import "./interfaces/IVaelRegistry.sol";
import "./interfaces/IVaelLedger.sol";
import "./interfaces/IVaelPassport.sol";

/// @title VaelReputation
/// @notice On-chain reputation engine for Vael agents.
///         Computes a 0–1000 score from four factors:
///           - Activity  (0–300): ledger entry count + action diversity
///           - Age       (0–200): time since agent registration
///           - Stake     (0–300): STT tokens staked against the agent by the community
///           - Community (0–200): endorsements from verified agents
///
///         Scores are pushed to VaelPassport via updateReputation().
///         Anyone can trigger a recompute for any agent — the math is on-chain and transparent.
///
/// @dev   STT is the native token of Somnia. Staking uses msg.value (native token).
///        No ERC-20 dependency — keeps the contract simple and gas-efficient.
contract VaelReputation is IVaelReputation, Ownable, Pausable, ReentrancyGuard {

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MAX_SCORE            = 1000;
    uint256 public constant MAX_ACTIVITY_SCORE   = 300;
    uint256 public constant MAX_AGE_SCORE        = 200;
    uint256 public constant MAX_STAKE_SCORE      = 300;
    uint256 public constant MAX_COMMUNITY_SCORE  = 200;

    /// @notice After this many ledger entries, activity score is capped
    uint256 public constant ACTIVITY_CAP         = 1000;

    /// @notice After this many seconds (~1 year), age score is capped
    uint256 public constant AGE_CAP              = 365 days;

    /// @notice After this much STT staked (10 STT in wei), stake score is capped
    uint256 public constant STAKE_CAP            = 10 ether;

    /// @notice After this many endorsements, community score is capped
    uint256 public constant ENDORSEMENT_CAP      = 50;

    /// @notice Minimum stake amount (0.01 STT)
    uint256 public constant MIN_STAKE            = 0.01 ether;

    /// @notice Unstake lockup period (7 days)
    uint256 public constant UNSTAKE_LOCKUP       = 7 days;

    // ─── State ────────────────────────────────────────────────────────────────

    IVaelRegistry public immutable registry;
    IVaelLedger   public immutable ledger;
    IVaelPassport public immutable passport;

    /// @notice agentId → computed factors
    mapping(bytes32 => ReputationFactors) private _factors;

    /// @notice agentId → staker → amount staked
    mapping(bytes32 => mapping(address => uint256)) private _stakes;

    /// @notice agentId → staker → timestamp of stake
    mapping(bytes32 => mapping(address => uint256)) private _stakeTimestamps;

    /// @notice agentId → total STT staked
    mapping(bytes32 => uint256) private _totalStakes;

    /// @notice agentId → endorser agentId → has endorsed
    mapping(bytes32 => mapping(bytes32 => bool)) private _endorsed;

    /// @notice agentId → total endorsements received
    mapping(bytes32 => uint256) private _endorsements;

    /// @notice Protocol fee on staking rewards (basis points, e.g. 200 = 2%)
    uint256 public protocolFeeBps = 200;

    /// @notice Accumulated protocol fees
    uint256 public accumulatedFees;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address _registry,
        address _ledger,
        address _passport
    ) Ownable(msg.sender) {
        require(_registry != address(0), "VaelReputation: zero registry");
        require(_ledger   != address(0), "VaelReputation: zero ledger");
        require(_passport != address(0), "VaelReputation: zero passport");

        registry = IVaelRegistry(_registry);
        ledger   = IVaelLedger(_ledger);
        passport = IVaelPassport(_passport);
    }

    // ─── Scoring ──────────────────────────────────────────────────────────────

    /// @notice Compute and store the reputation score for an agent.
    ///         Pushes the updated score to VaelPassport.
    ///         Anyone can call this — the math is public and verifiable.
    /// @param agentId Target agent
    /// @return score  Computed score (0–1000)
    function computeScore(bytes32 agentId)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 score)
    {
        require(registry.isRegistered(agentId), "VaelReputation: agent not registered");

        IVaelRegistry.AgentRecord memory agent = registry.getAgent(agentId);

        // ── Activity score (0–300) ────────────────────────────────────────────
        uint256 totalEntries = ledger.getTotalEntries(agentId);
        uint256 activityScore = _scaleLinear(totalEntries, ACTIVITY_CAP, MAX_ACTIVITY_SCORE);

        // ── Age score (0–200) ─────────────────────────────────────────────────
        uint256 agentAge  = block.timestamp > agent.createdAt
            ? block.timestamp - agent.createdAt : 0;
        uint256 ageScore  = _scaleLinear(agentAge, AGE_CAP, MAX_AGE_SCORE);

        // ── Stake score (0–300) ───────────────────────────────────────────────
        uint256 totalStake = _totalStakes[agentId];
        uint256 stakeScore = _scaleLinear(totalStake, STAKE_CAP, MAX_STAKE_SCORE);

        // ── Community score (0–200) ───────────────────────────────────────────
        uint256 endorsements   = _endorsements[agentId];
        uint256 communityScore = _scaleLinear(endorsements, ENDORSEMENT_CAP, MAX_COMMUNITY_SCORE);

        // ── Inactive penalty ─────────────────────────────────────────────────
        // Deactivated agents lose 50% of their score
        if (!agent.active) {
            activityScore  = activityScore  / 2;
            ageScore       = ageScore       / 2;
            stakeScore     = stakeScore     / 2;
            communityScore = communityScore / 2;
        }

        score = activityScore + ageScore + stakeScore + communityScore;
        if (score > MAX_SCORE) score = MAX_SCORE;

        uint256 oldScore = _factors[agentId].total;

        _factors[agentId] = ReputationFactors({
            activityScore:   activityScore,
            ageScore:        ageScore,
            stakeScore:      stakeScore,
            communityScore:  communityScore,
            total:           score,
            lastComputed:    block.timestamp
        });

        // Push to passport
        if (passport.hasPassport(agentId)) {
            passport.updateReputation(agentId, score);
        }

        emit ScoreComputed(agentId, oldScore, score, block.timestamp);
    }

    function getFactors(bytes32 agentId)
        external view returns (ReputationFactors memory)
    {
        return _factors[agentId];
    }

    function getScore(bytes32 agentId) external view returns (uint256) {
        return _factors[agentId].total;
    }

    // ─── Staking ──────────────────────────────────────────────────────────────

    /// @notice Stake native STT tokens against an agent to boost its reputation.
    ///         Staked tokens are locked for UNSTAKE_LOCKUP seconds.
    ///         A protocol fee of `protocolFeeBps` basis points is taken on stake.
    /// @param agentId Agent to stake for
    function stake(bytes32 agentId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        require(registry.isRegistered(agentId),  "VaelReputation: agent not registered");
        require(msg.value >= MIN_STAKE,           "VaelReputation: below minimum stake");

        // Protocol fee
        uint256 fee    = (msg.value * protocolFeeBps) / 10_000;
        uint256 netStake = msg.value - fee;
        accumulatedFees += fee;

        _stakes[agentId][msg.sender]          += netStake;
        _stakeTimestamps[agentId][msg.sender]  = block.timestamp;
        _totalStakes[agentId]                 += netStake;

        emit Staked(agentId, msg.sender, netStake);
    }

    /// @notice Withdraw staked STT from an agent after the lockup period.
    /// @param agentId Agent to unstake from
    function unstake(bytes32 agentId)
        external
        nonReentrant
    {
        uint256 amount = _stakes[agentId][msg.sender];
        require(amount > 0,                                       "VaelReputation: no stake");
        require(
            block.timestamp >= _stakeTimestamps[agentId][msg.sender] + UNSTAKE_LOCKUP,
            "VaelReputation: still in lockup period"
        );

        _stakes[agentId][msg.sender]  = 0;
        _totalStakes[agentId]        -= amount;

        payable(msg.sender).transfer(amount);
        emit Unstaked(agentId, msg.sender, amount);
    }

    function getStake(bytes32 agentId, address staker)
        external view returns (uint256)
    {
        return _stakes[agentId][staker];
    }

    function getTotalStake(bytes32 agentId)
        external view returns (uint256)
    {
        return _totalStakes[agentId];
    }

    // ─── Endorsement ──────────────────────────────────────────────────────────

    /// @notice Endorse an agent using another agent you own.
    ///         Endorser must be verified (passport.verified == true).
    ///         One endorser can endorse each agent only once.
    /// @param agentId         Agent to endorse
    /// @param endorserAgentId Agent you own that is doing the endorsing
    function endorse(bytes32 agentId, bytes32 endorserAgentId)
        external
        whenNotPaused
    {
        require(registry.isRegistered(agentId),         "VaelReputation: target not registered");
        require(registry.isRegistered(endorserAgentId), "VaelReputation: endorser not registered");
        require(agentId != endorserAgentId,             "VaelReputation: cannot self-endorse");
        require(!_endorsed[agentId][endorserAgentId],   "VaelReputation: already endorsed");

        // Endorser must be owned by caller
        IVaelRegistry.AgentRecord memory endorserRecord = registry.getAgent(endorserAgentId);
        require(endorserRecord.owner == msg.sender,     "VaelReputation: not endorser owner");

        // Endorser must have a verified passport
        require(passport.hasPassport(endorserAgentId),  "VaelReputation: endorser has no passport");
        IVaelPassport.Passport memory endorserPassport = passport.getPassport(endorserAgentId);
        require(endorserPassport.verified,              "VaelReputation: endorser not verified");

        _endorsed[agentId][endorserAgentId] = true;
        _endorsements[agentId]++;

        uint256 weight = endorserPassport.reputationScore;
        emit Endorsed(agentId, endorserAgentId, weight);
    }

    function getEndorsements(bytes32 agentId)
        external view returns (uint256)
    {
        return _endorsements[agentId];
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setProtocolFeeBps(uint256 feeBps) external onlyOwner {
        require(feeBps <= 1000, "VaelReputation: fee too high"); // max 10%
        protocolFeeBps = feeBps;
    }

    function withdrawFees() external onlyOwner {
        uint256 amount  = accumulatedFees;
        accumulatedFees = 0;
        payable(owner()).transfer(amount);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @dev Linear interpolation: maps value in [0, cap] → [0, maxScore]
    function _scaleLinear(
        uint256 value,
        uint256 cap,
        uint256 maxScore
    ) internal pure returns (uint256) {
        if (value == 0)    return 0;
        if (value >= cap)  return maxScore;
        return (value * maxScore) / cap;
    }
}
