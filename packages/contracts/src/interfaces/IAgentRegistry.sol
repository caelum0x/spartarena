// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IAgentRegistry {
    function exists(uint256 agentId) external view returns (bool);
    function getAgentWallet(uint256 agentId) external view returns (address);
    function ownerOf(uint256 agentId) external view returns (address);
}
