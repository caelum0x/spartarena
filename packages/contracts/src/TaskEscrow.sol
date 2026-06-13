// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AuthorizedWriters} from "./access/AuthorizedWriters.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title TaskEscrow
/// @notice Users post paid "battles" and lock an MNT reward. An agent accepts and
///         submits a result hash; an authorized verifier (the backend) marks it
///         verified, which releases the reward to the agent's wallet.
contract TaskEscrow is AuthorizedWriters {
    enum TaskStatus {
        Open,
        Accepted,
        Submitted,
        Verified,
        Paid,
        Cancelled
    }

    struct Task {
        uint256 id;
        address creator;
        uint256 assignedAgentId;
        uint256 reward;
        bytes32 descriptionHash;
        bytes32 resultHash;
        TaskStatus status;
        uint256 createdAt;
        uint256 deadline;
    }

    IAgentRegistry public immutable agentRegistry;

    uint256 public taskCount;
    mapping(uint256 => Task) private _tasks;

    event TaskCreated(
        uint256 indexed taskId, address indexed creator, uint256 reward, bytes32 descriptionHash, uint256 deadline
    );
    event TaskAccepted(uint256 indexed taskId, uint256 indexed agentId);
    event ResultSubmitted(uint256 indexed taskId, uint256 indexed agentId, bytes32 resultHash);
    event TaskVerified(uint256 indexed taskId, uint256 indexed agentId);
    event PaymentReleased(uint256 indexed taskId, uint256 indexed agentId, address to, uint256 amount);
    event TaskCancelled(uint256 indexed taskId);

    error UnknownTask();
    error UnknownAgent();
    error InvalidReward();
    error InvalidDeadline();
    error InvalidStatus();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error NotCreator();
    error TransferFailed();

    constructor(address registry, address initialOwner) AuthorizedWriters(initialOwner) {
        if (registry == address(0)) revert ZeroAddress();
        agentRegistry = IAgentRegistry(registry);
    }

    modifier taskExists(uint256 taskId) {
        if (taskId == 0 || taskId > taskCount) revert UnknownTask();
        _;
    }

    /// @notice Create a battle and lock the MNT reward in escrow.
    function createTask(bytes32 descriptionHash, uint256 deadline) external payable returns (uint256 taskId) {
        if (msg.value == 0) revert InvalidReward();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        taskId = ++taskCount;
        _tasks[taskId] = Task({
            id: taskId,
            creator: msg.sender,
            assignedAgentId: 0,
            reward: msg.value,
            descriptionHash: descriptionHash,
            resultHash: bytes32(0),
            status: TaskStatus.Open,
            createdAt: block.timestamp,
            deadline: deadline
        });

        emit TaskCreated(taskId, msg.sender, msg.value, descriptionHash, deadline);
    }

    /// @notice Assign an agent to an open task. Callable by the task creator or an
    ///         authorized backend writer (which orchestrates agent assignment).
    function acceptTask(uint256 taskId, uint256 agentId) external taskExists(taskId) {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Open) revert InvalidStatus();
        if (block.timestamp > t.deadline) revert DeadlinePassed();
        if (msg.sender != t.creator && msg.sender != owner && !isWriter[msg.sender]) revert NotAuthorized();
        if (!agentRegistry.exists(agentId)) revert UnknownAgent();

        t.assignedAgentId = agentId;
        t.status = TaskStatus.Accepted;
        emit TaskAccepted(taskId, agentId);
    }

    /// @notice Submit the result hash for an accepted task. Callable by the backend
    ///         writer on behalf of the agent.
    function submitResult(uint256 taskId, uint256 agentId, bytes32 resultHash)
        external
        onlyWriter
        taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Accepted) revert InvalidStatus();
        if (t.assignedAgentId != agentId) revert UnknownAgent();

        t.resultHash = resultHash;
        t.status = TaskStatus.Submitted;
        emit ResultSubmitted(taskId, agentId, resultHash);
    }

    /// @notice Mark a submitted task as verified (passed scoring). Backend-only.
    function verifyTask(uint256 taskId) external onlyWriter taskExists(taskId) {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Submitted) revert InvalidStatus();
        t.status = TaskStatus.Verified;
        emit TaskVerified(taskId, t.assignedAgentId);
    }

    /// @notice Release the escrowed reward to the assigned agent's wallet.
    ///         Callable by the task creator or an authorized backend writer.
    function releasePayment(uint256 taskId) external taskExists(taskId) {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Verified) revert InvalidStatus();
        if (msg.sender != t.creator && msg.sender != owner && !isWriter[msg.sender]) revert NotAuthorized();

        uint256 amount = t.reward;
        address payable to = payable(agentRegistry.getAgentWallet(t.assignedAgentId));
        t.status = TaskStatus.Paid;

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit PaymentReleased(taskId, t.assignedAgentId, to, amount);
    }

    /// @notice Refund the creator if the task expired before any result was delivered.
    ///         Once a Spartan has submitted (Submitted) or the result has been verified
    ///         (Verified), the work is done and the creator can no longer claw back the
    ///         reward — only Open/Accepted tasks are refundable on expiry.
    function refundExpiredTask(uint256 taskId) external taskExists(taskId) {
        Task storage t = _tasks[taskId];
        if (block.timestamp <= t.deadline) revert DeadlineNotPassed();
        if (
            t.status == TaskStatus.Submitted || t.status == TaskStatus.Verified
                || t.status == TaskStatus.Paid || t.status == TaskStatus.Cancelled
        ) revert InvalidStatus();
        if (msg.sender != t.creator && msg.sender != owner) revert NotCreator();

        uint256 amount = t.reward;
        t.status = TaskStatus.Cancelled;

        (bool ok,) = payable(t.creator).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit TaskCancelled(taskId);
    }

    function getTask(uint256 taskId) external view taskExists(taskId) returns (Task memory) {
        return _tasks[taskId];
    }
}
