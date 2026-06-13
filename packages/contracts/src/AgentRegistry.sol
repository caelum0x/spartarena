// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title AgentRegistry
/// @notice Registers each AI agent ("Spartan") and issues a permanent on-chain
///         identity record — the "Spartan Passport". Anyone can register an agent
///         they control; only the registering owner can mutate it afterwards.
contract AgentRegistry {
    struct Agent {
        uint256 id;
        address owner;
        address agentWallet;
        string metadataURI;
        bytes32 skillsHash;
        uint256 createdAt;
        bool active;
    }

    uint256 public agentCount;
    mapping(uint256 => Agent) private _agents;
    mapping(address => uint256[]) private _agentsByOwner;

    event AgentRegistered(
        uint256 indexed agentId, address indexed owner, address indexed agentWallet, string metadataURI, bytes32 skillsHash
    );
    event AgentMetadataUpdated(uint256 indexed agentId, string metadataURI, bytes32 skillsHash);
    event AgentActiveSet(uint256 indexed agentId, bool active);

    error ZeroAddress();
    error UnknownAgent();
    error NotAgentOwner();

    modifier onlyAgentOwner(uint256 agentId) {
        if (agentId == 0 || agentId > agentCount) revert UnknownAgent();
        if (_agents[agentId].owner != msg.sender) revert NotAgentOwner();
        _;
    }

    /// @notice Register a new Spartan and mint its passport record.
    function registerAgent(address agentWallet, string calldata metadataURI, bytes32 skillsHash)
        external
        returns (uint256 agentId)
    {
        if (agentWallet == address(0)) revert ZeroAddress();

        agentId = ++agentCount;
        _agents[agentId] = Agent({
            id: agentId,
            owner: msg.sender,
            agentWallet: agentWallet,
            metadataURI: metadataURI,
            skillsHash: skillsHash,
            createdAt: block.timestamp,
            active: true
        });
        _agentsByOwner[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, agentWallet, metadataURI, skillsHash);
    }

    function updateAgentMetadata(uint256 agentId, string calldata metadataURI, bytes32 skillsHash)
        external
        onlyAgentOwner(agentId)
    {
        Agent storage a = _agents[agentId];
        a.metadataURI = metadataURI;
        a.skillsHash = skillsHash;
        emit AgentMetadataUpdated(agentId, metadataURI, skillsHash);
    }

    function setAgentActive(uint256 agentId, bool active) external onlyAgentOwner(agentId) {
        _agents[agentId].active = active;
        emit AgentActiveSet(agentId, active);
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        if (agentId == 0 || agentId > agentCount) revert UnknownAgent();
        return _agents[agentId];
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        if (agentId == 0 || agentId > agentCount) revert UnknownAgent();
        return _agents[agentId].agentWallet;
    }

    function ownerOf(uint256 agentId) external view returns (address) {
        if (agentId == 0 || agentId > agentCount) revert UnknownAgent();
        return _agents[agentId].owner;
    }

    function exists(uint256 agentId) external view returns (bool) {
        return agentId != 0 && agentId <= agentCount;
    }

    function agentsOf(address owner) external view returns (uint256[] memory) {
        return _agentsByOwner[owner];
    }
}
