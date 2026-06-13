// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ReputationEngine} from "../src/ReputationEngine.sol";
import {AuthorizedWriters} from "../src/access/AuthorizedWriters.sol";

contract ReputationEngineTest is Test {
    ReputationEngine internal rep;

    address internal admin = makeAddr("admin");
    address internal verifier = makeAddr("verifier");

    function setUp() public {
        rep = new ReputationEngine(admin);
        vm.prank(admin);
        rep.setWriter(verifier, true);
    }

    function test_SubmitScore() public {
        vm.prank(verifier);
        rep.submitScore(1, 1, 90, 100, 80, 70);

        ReputationEngine.Reputation memory r = rep.getReputation(1);
        assertEq(r.completedTasks, 1);
        // weighted avg: (90*40 + 100*30 + 80*15 + 70*15) / 100 = (3600+3000+1200+1050)/100 = 88.5 -> 88
        assertEq(r.totalScore, 88);
    }

    function test_AveragesAcrossTasks() public {
        vm.startPrank(verifier);
        rep.submitScore(1, 1, 100, 100, 100, 100); // first -> 100
        rep.submitScore(1, 2, 0, 0, 0, 0); // avg with zero -> 50
        vm.stopPrank();

        ReputationEngine.Reputation memory r = rep.getReputation(1);
        assertEq(r.completedTasks, 2);
        assertEq(r.totalScore, 50);
    }

    function test_RecordEarnings() public {
        vm.startPrank(verifier);
        rep.recordEarnings(1, 0.05 ether);
        rep.recordEarnings(1, 0.05 ether);
        vm.stopPrank();
        assertEq(rep.getReputation(1).totalEarned, 0.1 ether);
    }

    function test_RevertWhen_NonWriter() public {
        vm.expectRevert(AuthorizedWriters.NotAuthorized.selector);
        rep.submitScore(1, 1, 10, 10, 10, 10);
    }

    function test_RevertWhen_ScoreOutOfRange() public {
        vm.prank(verifier);
        vm.expectRevert(ReputationEngine.InvalidScore.selector);
        rep.submitScore(1, 1, 101, 10, 10, 10);
    }

    function test_RevertWhen_ScoreTaskTwice() public {
        vm.startPrank(verifier);
        rep.submitScore(1, 7, 90, 90, 90, 90);
        vm.expectRevert(ReputationEngine.AlreadyScored.selector);
        rep.submitScore(1, 7, 90, 90, 90, 90);
        vm.stopPrank();
        assertEq(rep.getReputation(1).completedTasks, 1);
        assertTrue(rep.scored(1, 7));
    }
}
