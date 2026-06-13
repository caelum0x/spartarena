// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AuthorizedWriters} from "./access/AuthorizedWriters.sol";

/// @title DecisionLedger
/// @notice The "War Chronicle". Permanently records the proof of every agent
///         decision: hashes of the prompt, output and tool calls, plus confidence,
///         risk and action type. This is the heart of SpartArena's verifiability —
///         heavy AI payloads stay off-chain, but their fingerprints live on Mantle.
contract DecisionLedger is AuthorizedWriters {
    struct Decision {
        uint256 id;
        uint256 agentId;
        uint256 taskId;
        bytes32 promptHash;
        bytes32 outputHash;
        bytes32 toolsHash;
        uint256 confidence; // 0-100
        uint256 riskScore; // 0-100
        string actionType;
        uint256 timestamp;
    }

    uint256 public decisionCount;
    mapping(uint256 => Decision) private _decisions;
    mapping(uint256 => uint256[]) private _decisionsByAgent;
    mapping(uint256 => uint256[]) private _decisionsByTask;

    event DecisionRecorded(
        uint256 indexed decisionId,
        uint256 indexed agentId,
        uint256 indexed taskId,
        bytes32 promptHash,
        bytes32 outputHash,
        bytes32 toolsHash,
        uint256 confidence,
        uint256 riskScore,
        string actionType
    );

    error InvalidScore();
    error UnknownDecision();

    constructor(address initialOwner) AuthorizedWriters(initialOwner) {}

    /// @notice Record a decision proof. Restricted to authorized backend writers so
    ///         the chronicle reflects vetted agent runs.
    function recordDecision(
        uint256 agentId,
        uint256 taskId,
        bytes32 promptHash,
        bytes32 outputHash,
        bytes32 toolsHash,
        uint256 confidence,
        uint256 riskScore,
        string calldata actionType
    ) external onlyWriter returns (uint256 decisionId) {
        if (confidence > 100 || riskScore > 100) revert InvalidScore();

        decisionId = ++decisionCount;
        _decisions[decisionId] = Decision({
            id: decisionId,
            agentId: agentId,
            taskId: taskId,
            promptHash: promptHash,
            outputHash: outputHash,
            toolsHash: toolsHash,
            confidence: confidence,
            riskScore: riskScore,
            actionType: actionType,
            timestamp: block.timestamp
        });
        _decisionsByAgent[agentId].push(decisionId);
        _decisionsByTask[taskId].push(decisionId);

        emit DecisionRecorded(
            decisionId, agentId, taskId, promptHash, outputHash, toolsHash, confidence, riskScore, actionType
        );
    }

    function getDecision(uint256 decisionId) external view returns (Decision memory) {
        if (decisionId == 0 || decisionId > decisionCount) revert UnknownDecision();
        return _decisions[decisionId];
    }

    function decisionsOfAgent(uint256 agentId) external view returns (uint256[] memory) {
        return _decisionsByAgent[agentId];
    }

    function decisionsOfTask(uint256 taskId) external view returns (uint256[] memory) {
        return _decisionsByTask[taskId];
    }
}
