// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {DecisionLedger} from "../src/DecisionLedger.sol";
import {AuthorizedWriters} from "../src/access/AuthorizedWriters.sol";

contract DecisionLedgerTest is Test {
    DecisionLedger internal ledger;

    address internal admin = makeAddr("admin");
    address internal backend = makeAddr("backend");
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        ledger = new DecisionLedger(admin);
        vm.prank(admin);
        ledger.setWriter(backend, true);
    }

    function _record() internal returns (uint256 id) {
        vm.prank(backend);
        id = ledger.recordDecision(
            1, 2, keccak256("prompt"), keccak256("output"), keccak256("tools"), 82, 64, "ALPHA_ALERT"
        );
    }

    function test_RecordDecision() public {
        uint256 id = _record();
        assertEq(id, 1);
        DecisionLedger.Decision memory d = ledger.getDecision(id);
        assertEq(d.agentId, 1);
        assertEq(d.taskId, 2);
        assertEq(d.confidence, 82);
        assertEq(d.riskScore, 64);
        assertEq(d.actionType, "ALPHA_ALERT");
        assertEq(d.promptHash, keccak256("prompt"));
    }

    function test_IndexesByAgentAndTask() public {
        _record();
        _record();
        assertEq(ledger.decisionsOfAgent(1).length, 2);
        assertEq(ledger.decisionsOfTask(2).length, 2);
    }

    function test_RevertWhen_NonWriter() public {
        vm.prank(stranger);
        vm.expectRevert(AuthorizedWriters.NotAuthorized.selector);
        ledger.recordDecision(1, 2, bytes32(0), bytes32(0), bytes32(0), 1, 1, "X");
    }

    function test_RevertWhen_ScoreOutOfRange() public {
        vm.prank(backend);
        vm.expectRevert(DecisionLedger.InvalidScore.selector);
        ledger.recordDecision(1, 2, bytes32(0), bytes32(0), bytes32(0), 101, 1, "X");
    }

    function test_OwnerCanWriteWithoutExplicitGrant() public {
        vm.prank(admin);
        uint256 id = ledger.recordDecision(3, 4, bytes32(0), bytes32(0), bytes32(0), 50, 50, "Y");
        assertEq(id, 1);
    }
}
