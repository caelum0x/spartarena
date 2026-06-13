// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TaskEscrow} from "../src/TaskEscrow.sol";
import {DecisionLedger} from "../src/DecisionLedger.sol";
import {ReputationEngine} from "../src/ReputationEngine.sol";
import {SkillRegistry} from "../src/SkillRegistry.sol";
import {AgentStaking} from "../src/AgentStaking.sol";

/// @notice Deploys the full SpartArena contract set, authorizes the backend signer
///         as a writer, seeds the canonical skill catalogue, and writes the resulting
///         addresses to deployments/<chainid>.json.
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        // Backend signer that the API/agent-runner uses for privileged writes.
        // Falls back to the deployer when not provided.
        address backend = vm.envOr("BACKEND_SIGNER_ADDRESS", deployer);

        vm.startBroadcast(deployerKey);

        AgentRegistry agentRegistry = new AgentRegistry();
        TaskEscrow taskEscrow = new TaskEscrow(address(agentRegistry), deployer);
        DecisionLedger decisionLedger = new DecisionLedger(deployer);
        ReputationEngine reputationEngine = new ReputationEngine(deployer);
        SkillRegistry skillRegistry = new SkillRegistry(deployer);
        // Default min bond 0.01 MNT; treasury defaults to the deployer.
        AgentStaking agentStaking = new AgentStaking(address(agentRegistry), deployer, 0.01 ether, deployer);

        // Authorize the backend signer to perform privileged writes.
        taskEscrow.setWriter(backend, true);
        decisionLedger.setWriter(backend, true);
        reputationEngine.setWriter(backend, true);
        agentStaking.setWriter(backend, true);

        // Seed the canonical skill catalogue.
        skillRegistry.addSkill("ALPHA_DETECTION", "Detect unusual wallet/token activity on Mantle");
        skillRegistry.addSkill("RWA_STRATEGY", "Conservative yield/RWA allocation strategy");
        skillRegistry.addSkill("GAS_OPTIMIZATION", "Optimize wallet/contract gas usage");
        skillRegistry.addSkill("CONTRACT_AUDIT", "Pre-deploy smart contract review");
        skillRegistry.addSkill("BYREAL_POOL_ANALYSIS", "Analyze Byreal liquidity pools");
        skillRegistry.addSkill("BYREAL_SWAP_PREVIEW", "Preview a Byreal swap route");
        skillRegistry.addSkill("TELEGRAM_ALERT", "Publish alerts to Telegram/Discord");

        vm.stopBroadcast();

        _writeDeployment(
            Addresses({
                agentRegistry: address(agentRegistry),
                taskEscrow: address(taskEscrow),
                decisionLedger: address(decisionLedger),
                reputationEngine: address(reputationEngine),
                skillRegistry: address(skillRegistry),
                agentStaking: address(agentStaking),
                backend: backend
            })
        );

        console2.log("AgentRegistry   ", address(agentRegistry));
        console2.log("TaskEscrow      ", address(taskEscrow));
        console2.log("DecisionLedger  ", address(decisionLedger));
        console2.log("ReputationEngine", address(reputationEngine));
        console2.log("SkillRegistry   ", address(skillRegistry));
        console2.log("AgentStaking    ", address(agentStaking));
    }

    struct Addresses {
        address agentRegistry;
        address taskEscrow;
        address decisionLedger;
        address reputationEngine;
        address skillRegistry;
        address agentStaking;
        address backend;
    }

    function _writeDeployment(Addresses memory a) internal {
        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "backendSigner", a.backend);
        vm.serializeAddress(obj, "AgentRegistry", a.agentRegistry);
        vm.serializeAddress(obj, "TaskEscrow", a.taskEscrow);
        vm.serializeAddress(obj, "DecisionLedger", a.decisionLedger);
        vm.serializeAddress(obj, "ReputationEngine", a.reputationEngine);
        vm.serializeAddress(obj, "SkillRegistry", a.skillRegistry);
        string memory json = vm.serializeAddress(obj, "AgentStaking", a.agentStaking);

        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(json, path);
    }
}
