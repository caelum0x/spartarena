// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AuthorizedWriters} from "./access/AuthorizedWriters.sol";

/// @title ReputationEngine
/// @notice Converts verified task results into permanent agent reputation ("Honor").
///         For the hackathon MVP the scorer is a trusted verifier wallet controlled
///         by the backend; this can be decentralized later. Scores accumulate as
///         running totals plus a derived `totalScore` weighted average.
contract ReputationEngine is AuthorizedWriters {
    struct Reputation {
        uint256 completedTasks;
        uint256 totalEarned;
        uint256 accuracyScore; // running sum
        uint256 safetyScore; // running sum
        uint256 speedScore; // running sum
        uint256 userRatingScore; // running sum
        uint256 totalScore; // weighted average across all completed tasks, 0-100
    }

    // Weights (sum to 100) used to derive the headline score.
    uint256 public constant W_ACCURACY = 40;
    uint256 public constant W_SAFETY = 30;
    uint256 public constant W_SPEED = 15;
    uint256 public constant W_USER = 15;

    mapping(uint256 => Reputation) private _reputation;

    event ScoreSubmitted(
        uint256 indexed agentId,
        uint256 indexed taskId,
        uint256 accuracy,
        uint256 safety,
        uint256 speed,
        uint256 userRating,
        uint256 newTotalScore
    );
    event EarningsRecorded(uint256 indexed agentId, uint256 amount, uint256 totalEarned);

    /// @notice Tracks which (agentId, taskId) pairs have already been scored, so a
    ///         task can only contribute to reputation once.
    mapping(uint256 => mapping(uint256 => bool)) public scored;

    error InvalidScore();
    error AlreadyScored();

    constructor(address initialOwner) AuthorizedWriters(initialOwner) {}

    /// @notice Submit a per-task score. Each dimension is 0-100. Backend-only.
    ///         Idempotent per (agentId, taskId): a task cannot be scored twice.
    function submitScore(uint256 agentId, uint256 taskId, uint256 accuracy, uint256 safety, uint256 speed, uint256 userRating)
        external
        onlyWriter
    {
        if (accuracy > 100 || safety > 100 || speed > 100 || userRating > 100) revert InvalidScore();
        if (scored[agentId][taskId]) revert AlreadyScored();
        scored[agentId][taskId] = true;

        Reputation storage r = _reputation[agentId];
        r.completedTasks += 1;
        r.accuracyScore += accuracy;
        r.safetyScore += safety;
        r.speedScore += speed;
        r.userRatingScore += userRating;

        // Weighted average of the running per-dimension averages.
        uint256 n = r.completedTasks;
        uint256 weighted = (r.accuracyScore * W_ACCURACY) + (r.safetyScore * W_SAFETY) + (r.speedScore * W_SPEED)
            + (r.userRatingScore * W_USER);
        r.totalScore = weighted / (n * 100);

        emit ScoreSubmitted(agentId, taskId, accuracy, safety, speed, userRating, r.totalScore);
    }

    /// @notice Record reward earned by an agent (called when escrow pays out). Backend-only.
    function recordEarnings(uint256 agentId, uint256 amount) external onlyWriter {
        Reputation storage r = _reputation[agentId];
        r.totalEarned += amount;
        emit EarningsRecorded(agentId, amount, r.totalEarned);
    }

    function getReputation(uint256 agentId) external view returns (Reputation memory) {
        return _reputation[agentId];
    }
}
