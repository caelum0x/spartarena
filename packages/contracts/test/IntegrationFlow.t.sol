// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TaskEscrow} from "../src/TaskEscrow.sol";
import {DecisionLedger} from "../src/DecisionLedger.sol";
import {ReputationEngine} from "../src/ReputationEngine.sol";

/// @notice Exercises the entire SpartArena loop:
///         register -> create battle -> accept -> decide -> submit -> verify ->
///         score -> release payment -> record earnings.
contract IntegrationFlowTest is Test {
    AgentRegistry internal registry;
    TaskEscrow internal escrow;
    DecisionLedger internal ledger;
    ReputationEngine internal rep;

    address internal admin = makeAddr("admin");
    address internal backend = makeAddr("backend");
    address internal creator = makeAddr("creator");
    address internal agentOwner = makeAddr("agentOwner");
    address internal agentWallet = makeAddr("agentWallet");

    function setUp() public {
        registry = new AgentRegistry();
        escrow = new TaskEscrow(address(registry), admin);
        ledger = new DecisionLedger(admin);
        rep = new ReputationEngine(admin);

        vm.startPrank(admin);
        escrow.setWriter(backend, true);
        ledger.setWriter(backend, true);
        rep.setWriter(backend, true);
        vm.stopPrank();

        vm.deal(creator, 1 ether);
    }

    function test_EndToEndArenaLoop() public {
        // 1. Owner registers a Spartan
        vm.prank(agentOwner);
        uint256 agentId = registry.registerAgent(agentWallet, "ipfs://alpha-sentinel", keccak256("ALPHA_DETECTION"));

        // 2. User posts a battle with 0.05 MNT escrow
        vm.prank(creator);
        uint256 taskId = escrow.createTask{value: 0.05 ether}(keccak256("detect whale anomaly"), block.timestamp + 1 hours);

        // 3. Backend assigns the agent
        vm.prank(backend);
        escrow.acceptTask(taskId, agentId);

        // 4. Agent runs; backend writes the decision proof to the chronicle
        vm.prank(backend);
        uint256 decisionId = ledger.recordDecision(
            agentId,
            taskId,
            keccak256("prompt-json"),
            keccak256("output-json"),
            keccak256("tools-json"),
            82,
            64,
            "ALPHA_ALERT"
        );
        assertEq(ledger.getDecision(decisionId).agentId, agentId);

        // 5. Backend submits the result hash on-chain
        vm.prank(backend);
        escrow.submitResult(taskId, agentId, keccak256("output-json"));

        // 6. Verifier marks it verified and scores the agent
        vm.startPrank(backend);
        escrow.verifyTask(taskId);
        rep.submitScore(agentId, taskId, 90, 100, 80, 70);
        vm.stopPrank();

        // 7. Payment is released to the agent and earnings recorded
        uint256 agentBalBefore = agentWallet.balance;
        vm.prank(creator);
        escrow.releasePayment(taskId);
        vm.prank(backend);
        rep.recordEarnings(agentId, 0.05 ether);

        // Assertions: reputation + payment + state
        assertEq(agentWallet.balance, agentBalBefore + 0.05 ether);

        ReputationEngine.Reputation memory r = rep.getReputation(agentId);
        assertEq(r.completedTasks, 1);
        assertEq(r.totalEarned, 0.05 ether);
        assertEq(r.totalScore, 88);

        assertEq(uint8(escrow.getTask(taskId).status), uint8(TaskEscrow.TaskStatus.Paid));
        assertEq(ledger.decisionsOfAgent(agentId).length, 1);
    }
}
