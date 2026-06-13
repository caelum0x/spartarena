// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AuthorizedWriters} from "./access/AuthorizedWriters.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title AgentStaking
/// @notice Skin-in-the-game for Spartans. An agent's owner posts an MNT bond that
///         signals commitment and can be slashed by the Oracle Judge (an authorized
///         writer) when the agent misbehaves. Staked weight surfaces on the
///         leaderboard and gates participation above a configurable minimum.
///
///         Only the agent's owner can stake/unstake its bond (self-bond model), so
///         no proportional multi-staker accounting is needed. Slashed funds are
///         sent to the treasury.
contract AgentStaking is AuthorizedWriters {
    IAgentRegistry public immutable agentRegistry;

    /// @notice Bonded MNT per agent.
    mapping(uint256 => uint256) public bondOf;
    /// @notice Total MNT bonded across all agents.
    uint256 public totalBonded;
    /// @notice Minimum bond required to be considered "staked/active" by the UI.
    uint256 public minBond;
    /// @notice Destination for slashed funds.
    address public treasury;

    event Staked(uint256 indexed agentId, address indexed owner, uint256 amount, uint256 newBond);
    event Unstaked(uint256 indexed agentId, address indexed owner, uint256 amount, uint256 newBond);
    event Slashed(uint256 indexed agentId, uint256 amount, uint256 newBond, string reason);
    event MinBondUpdated(uint256 minBond);
    event TreasuryUpdated(address treasury);

    error UnknownAgent();
    error NotAgentOwner();
    error InvalidAmount();
    error InsufficientBond();
    error TransferFailed();

    constructor(address registry, address initialOwner, uint256 initialMinBond, address initialTreasury)
        AuthorizedWriters(initialOwner)
    {
        if (registry == address(0) || initialTreasury == address(0)) revert ZeroAddress();
        agentRegistry = IAgentRegistry(registry);
        minBond = initialMinBond;
        treasury = initialTreasury;
    }

    modifier onlyAgentOwner(uint256 agentId) {
        if (!agentRegistry.exists(agentId)) revert UnknownAgent();
        if (agentRegistry.ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        _;
    }

    /// @notice Post (or top up) an agent's bond.
    function stake(uint256 agentId) external payable onlyAgentOwner(agentId) {
        if (msg.value == 0) revert InvalidAmount();
        bondOf[agentId] += msg.value;
        totalBonded += msg.value;
        emit Staked(agentId, msg.sender, msg.value, bondOf[agentId]);
    }

    /// @notice Withdraw part or all of an agent's bond back to its owner.
    function unstake(uint256 agentId, uint256 amount) external onlyAgentOwner(agentId) {
        if (amount == 0) revert InvalidAmount();
        uint256 bond = bondOf[agentId];
        if (amount > bond) revert InsufficientBond();

        bondOf[agentId] = bond - amount;
        totalBonded -= amount;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Unstaked(agentId, msg.sender, amount, bondOf[agentId]);
    }

    /// @notice Slash an agent's bond. Restricted to authorized writers (Oracle Judge).
    ///         Slashed funds move to the treasury.
    function slash(uint256 agentId, uint256 amount, string calldata reason) external onlyWriter {
        uint256 bond = bondOf[agentId];
        if (amount == 0) revert InvalidAmount();
        if (amount > bond) revert InsufficientBond();

        bondOf[agentId] = bond - amount;
        totalBonded -= amount;

        (bool ok,) = payable(treasury).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Slashed(agentId, amount, bondOf[agentId], reason);
    }

    /// @notice Whether an agent meets the minimum bond to be considered active.
    function isActive(uint256 agentId) external view returns (bool) {
        return bondOf[agentId] >= minBond;
    }

    function setMinBond(uint256 newMinBond) external onlyOwner {
        minBond = newMinBond;
        emit MinBondUpdated(newMinBond);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }
}
