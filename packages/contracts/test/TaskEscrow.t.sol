// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TaskEscrow} from "../src/TaskEscrow.sol";
import {AuthorizedWriters} from "../src/access/AuthorizedWriters.sol";

contract TaskEscrowTest is Test {
    AgentRegistry internal registry;
    TaskEscrow internal escrow;

    address internal admin = makeAddr("admin");
    address internal backend = makeAddr("backend");
    address internal creator = makeAddr("creator");
    address internal agentOwner = makeAddr("agentOwner");
    address internal agentWallet = makeAddr("agentWallet");

    uint256 internal agentId;
    uint256 internal constant REWARD = 0.05 ether;

    function setUp() public {
        registry = new AgentRegistry();
        escrow = new TaskEscrow(address(registry), admin);

        vm.prank(admin);
        escrow.setWriter(backend, true);

        vm.prank(agentOwner);
        agentId = registry.registerAgent(agentWallet, "ipfs://meta", bytes32(0));

        vm.deal(creator, 1 ether);
    }

    function _createTask() internal returns (uint256 taskId) {
        vm.prank(creator);
        taskId = escrow.createTask{value: REWARD}(keccak256("desc"), block.timestamp + 1 hours);
    }

    function test_CreateTaskLocksReward() public {
        uint256 taskId = _createTask();
        assertEq(address(escrow).balance, REWARD);
        TaskEscrow.Task memory t = escrow.getTask(taskId);
        assertEq(t.reward, REWARD);
        assertEq(uint8(t.status), uint8(TaskEscrow.TaskStatus.Open));
    }

    function test_RevertWhen_ZeroReward() public {
        vm.prank(creator);
        vm.expectRevert(TaskEscrow.InvalidReward.selector);
        escrow.createTask{value: 0}(keccak256("desc"), block.timestamp + 1 hours);
    }

    function test_RevertWhen_DeadlineInPast() public {
        vm.prank(creator);
        vm.expectRevert(TaskEscrow.InvalidDeadline.selector);
        escrow.createTask{value: REWARD}(keccak256("desc"), block.timestamp);
    }

    function test_FullHappyPath() public {
        uint256 taskId = _createTask();

        // backend assigns agent
        vm.prank(backend);
        escrow.acceptTask(taskId, agentId);
        assertEq(uint8(escrow.getTask(taskId).status), uint8(TaskEscrow.TaskStatus.Accepted));

        // backend submits result
        vm.prank(backend);
        escrow.submitResult(taskId, agentId, keccak256("result"));
        assertEq(uint8(escrow.getTask(taskId).status), uint8(TaskEscrow.TaskStatus.Submitted));

        // backend verifies
        vm.prank(backend);
        escrow.verifyTask(taskId);

        // payment released to agent wallet
        uint256 before = agentWallet.balance;
        vm.prank(creator);
        escrow.releasePayment(taskId);
        assertEq(agentWallet.balance, before + REWARD);
        assertEq(uint8(escrow.getTask(taskId).status), uint8(TaskEscrow.TaskStatus.Paid));
        assertEq(address(escrow).balance, 0);
    }

    function test_RevertWhen_SubmitByNonWriter() public {
        uint256 taskId = _createTask();
        vm.prank(backend);
        escrow.acceptTask(taskId, agentId);

        vm.prank(creator);
        vm.expectRevert(AuthorizedWriters.NotAuthorized.selector);
        escrow.submitResult(taskId, agentId, keccak256("result"));
    }

    function test_RevertWhen_ReleaseBeforeVerified() public {
        uint256 taskId = _createTask();
        vm.prank(backend);
        escrow.acceptTask(taskId, agentId);

        vm.prank(creator);
        vm.expectRevert(TaskEscrow.InvalidStatus.selector);
        escrow.releasePayment(taskId);
    }

    function test_RefundExpiredTask() public {
        uint256 taskId = _createTask();
        vm.warp(block.timestamp + 2 hours);

        uint256 before = creator.balance;
        vm.prank(creator);
        escrow.refundExpiredTask(taskId);
        assertEq(creator.balance, before + REWARD);
        assertEq(uint8(escrow.getTask(taskId).status), uint8(TaskEscrow.TaskStatus.Cancelled));
    }

    function test_RevertWhen_RefundBeforeDeadline() public {
        uint256 taskId = _createTask();
        vm.prank(creator);
        vm.expectRevert(TaskEscrow.DeadlineNotPassed.selector);
        escrow.refundExpiredTask(taskId);
    }

    function test_RevertWhen_RefundSubmittedTask() public {
        // A creator must NOT be able to claw back the reward once a Spartan has
        // delivered (Submitted) or it has been Verified, even after the deadline.
        uint256 taskId = _createTask();
        vm.startPrank(backend);
        escrow.acceptTask(taskId, agentId);
        escrow.submitResult(taskId, agentId, keccak256("result"));
        vm.stopPrank();

        vm.warp(block.timestamp + 2 hours);
        vm.prank(creator);
        vm.expectRevert(TaskEscrow.InvalidStatus.selector);
        escrow.refundExpiredTask(taskId);
    }

    function test_RefundAcceptedButUndeliveredTask() public {
        // Open/Accepted tasks that expire without delivery remain refundable.
        uint256 taskId = _createTask();
        vm.prank(backend);
        escrow.acceptTask(taskId, agentId);

        vm.warp(block.timestamp + 2 hours);
        uint256 before = creator.balance;
        vm.prank(creator);
        escrow.refundExpiredTask(taskId);
        assertEq(creator.balance, before + REWARD);
        assertEq(uint8(escrow.getTask(taskId).status), uint8(TaskEscrow.TaskStatus.Cancelled));
    }

    function test_RevertWhen_AcceptUnknownAgent() public {
        uint256 taskId = _createTask();
        vm.prank(backend);
        vm.expectRevert(TaskEscrow.UnknownAgent.selector);
        escrow.acceptTask(taskId, 999);
    }
}
