// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentStaking} from "../src/AgentStaking.sol";
import {AuthorizedWriters} from "../src/access/AuthorizedWriters.sol";
import {Ownable} from "../src/access/Ownable.sol";

contract AgentStakingTest is Test {
    AgentRegistry internal registry;
    AgentStaking internal staking;

    address internal admin = makeAddr("admin");
    address internal judge = makeAddr("judge");
    address internal treasury = makeAddr("treasury");
    address internal agentOwner = makeAddr("agentOwner");
    address internal stranger = makeAddr("stranger");
    address internal agentWallet = makeAddr("agentWallet");

    uint256 internal agentId;
    uint256 internal constant MIN_BOND = 0.01 ether;

    function setUp() public {
        registry = new AgentRegistry();
        staking = new AgentStaking(address(registry), admin, MIN_BOND, treasury);

        vm.prank(admin);
        staking.setWriter(judge, true);

        vm.prank(agentOwner);
        agentId = registry.registerAgent(agentWallet, "ipfs://meta", bytes32(0));

        vm.deal(agentOwner, 10 ether);
    }

    function test_Stake() public {
        vm.prank(agentOwner);
        staking.stake{value: 1 ether}(agentId);
        assertEq(staking.bondOf(agentId), 1 ether);
        assertEq(staking.totalBonded(), 1 ether);
        assertTrue(staking.isActive(agentId));
        assertEq(address(staking).balance, 1 ether);
    }

    function test_TopUpStake() public {
        vm.startPrank(agentOwner);
        staking.stake{value: 0.5 ether}(agentId);
        staking.stake{value: 0.25 ether}(agentId);
        vm.stopPrank();
        assertEq(staking.bondOf(agentId), 0.75 ether);
    }

    function test_RevertWhen_NonOwnerStakes() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        vm.expectRevert(AgentStaking.NotAgentOwner.selector);
        staking.stake{value: 1 ether}(agentId);
    }

    function test_RevertWhen_StakeUnknownAgent() public {
        vm.prank(agentOwner);
        vm.expectRevert(AgentStaking.UnknownAgent.selector);
        staking.stake{value: 1 ether}(999);
    }

    function test_RevertWhen_ZeroStake() public {
        vm.prank(agentOwner);
        vm.expectRevert(AgentStaking.InvalidAmount.selector);
        staking.stake{value: 0}(agentId);
    }

    function test_Unstake() public {
        vm.startPrank(agentOwner);
        staking.stake{value: 1 ether}(agentId);
        uint256 balBefore = agentOwner.balance;
        staking.unstake(agentId, 0.4 ether);
        vm.stopPrank();
        assertEq(staking.bondOf(agentId), 0.6 ether);
        assertEq(agentOwner.balance, balBefore + 0.4 ether);
        assertEq(staking.totalBonded(), 0.6 ether);
    }

    function test_RevertWhen_UnstakeTooMuch() public {
        vm.startPrank(agentOwner);
        staking.stake{value: 1 ether}(agentId);
        vm.expectRevert(AgentStaking.InsufficientBond.selector);
        staking.unstake(agentId, 2 ether);
        vm.stopPrank();
    }

    function test_Slash() public {
        vm.prank(agentOwner);
        staking.stake{value: 1 ether}(agentId);

        uint256 treasuryBefore = treasury.balance;
        vm.prank(judge);
        staking.slash(agentId, 0.3 ether, "submitted a fabricated decision");

        assertEq(staking.bondOf(agentId), 0.7 ether);
        assertEq(treasury.balance, treasuryBefore + 0.3 ether);
        assertEq(staking.totalBonded(), 0.7 ether);
    }

    function test_RevertWhen_NonWriterSlashes() public {
        vm.prank(agentOwner);
        staking.stake{value: 1 ether}(agentId);
        vm.prank(stranger);
        vm.expectRevert(AuthorizedWriters.NotAuthorized.selector);
        staking.slash(agentId, 0.1 ether, "x");
    }

    function test_IsActiveBelowMin() public {
        vm.prank(agentOwner);
        staking.stake{value: 0.005 ether}(agentId);
        assertFalse(staking.isActive(agentId));
    }

    function test_SetMinBondAndTreasury() public {
        vm.startPrank(admin);
        staking.setMinBond(0.02 ether);
        staking.setTreasury(stranger);
        vm.stopPrank();
        assertEq(staking.minBond(), 0.02 ether);
        assertEq(staking.treasury(), stranger);
    }

    function test_RevertWhen_NonOwnerSetsConfig() public {
        vm.prank(stranger);
        vm.expectRevert(Ownable.NotOwner.selector);
        staking.setMinBond(1);
    }
}
