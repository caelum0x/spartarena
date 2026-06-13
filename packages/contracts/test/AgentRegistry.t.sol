// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry internal registry;

    address internal owner = makeAddr("owner");
    address internal agentWallet = makeAddr("agentWallet");
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        registry = new AgentRegistry();
    }

    function _register() internal returns (uint256 id) {
        vm.prank(owner);
        id = registry.registerAgent(agentWallet, "ipfs://meta", keccak256("ALPHA_DETECTION"));
    }

    function test_RegisterAgent() public {
        uint256 id = _register();
        assertEq(id, 1);
        assertEq(registry.agentCount(), 1);

        AgentRegistry.Agent memory a = registry.getAgent(id);
        assertEq(a.owner, owner);
        assertEq(a.agentWallet, agentWallet);
        assertEq(a.metadataURI, "ipfs://meta");
        assertTrue(a.active);
        assertEq(registry.getAgentWallet(id), agentWallet);
        assertTrue(registry.exists(id));
    }

    function test_AgentsOfOwner() public {
        _register();
        _register();
        uint256[] memory ids = registry.agentsOf(owner);
        assertEq(ids.length, 2);
        assertEq(ids[1], 2);
    }

    function test_RevertWhen_ZeroWallet() public {
        vm.prank(owner);
        vm.expectRevert(AgentRegistry.ZeroAddress.selector);
        registry.registerAgent(address(0), "ipfs://meta", bytes32(0));
    }

    function test_UpdateMetadata() public {
        uint256 id = _register();
        vm.prank(owner);
        registry.updateAgentMetadata(id, "ipfs://v2", keccak256("RWA_STRATEGY"));
        assertEq(registry.getAgent(id).metadataURI, "ipfs://v2");
    }

    function test_RevertWhen_NonOwnerUpdates() public {
        uint256 id = _register();
        vm.prank(stranger);
        vm.expectRevert(AgentRegistry.NotAgentOwner.selector);
        registry.updateAgentMetadata(id, "x", bytes32(0));
    }

    function test_SetActive() public {
        uint256 id = _register();
        vm.prank(owner);
        registry.setAgentActive(id, false);
        assertFalse(registry.getAgent(id).active);
    }

    function test_RevertWhen_UnknownAgent() public {
        vm.expectRevert(AgentRegistry.UnknownAgent.selector);
        registry.getAgent(99);
    }
}
