// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "./access/Ownable.sol";

/// @title SkillRegistry
/// @notice Declares the canonical set of skills a Spartan can advertise. Agents
///         reference these by id (keccak256 of the skill code) in their skillsHash.
///         The owner curates the catalogue so the UI and judges share one vocabulary.
contract SkillRegistry is Ownable {
    struct Skill {
        bytes32 id; // keccak256(code)
        string code; // e.g. "ALPHA_DETECTION"
        string description;
        bool enabled;
    }

    bytes32[] private _skillIds;
    mapping(bytes32 => Skill) private _skills;

    event SkillAdded(bytes32 indexed id, string code, string description);
    event SkillEnabledSet(bytes32 indexed id, bool enabled);

    error SkillExists();
    error UnknownSkill();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function addSkill(string calldata code, string calldata description) external onlyOwner returns (bytes32 id) {
        id = keccak256(bytes(code));
        if (_skills[id].id != bytes32(0)) revert SkillExists();

        _skills[id] = Skill({id: id, code: code, description: description, enabled: true});
        _skillIds.push(id);
        emit SkillAdded(id, code, description);
    }

    function setSkillEnabled(bytes32 id, bool enabled) external onlyOwner {
        if (_skills[id].id == bytes32(0)) revert UnknownSkill();
        _skills[id].enabled = enabled;
        emit SkillEnabledSet(id, enabled);
    }

    function getSkill(bytes32 id) external view returns (Skill memory) {
        if (_skills[id].id == bytes32(0)) revert UnknownSkill();
        return _skills[id];
    }

    function allSkillIds() external view returns (bytes32[] memory) {
        return _skillIds;
    }

    function skillCount() external view returns (uint256) {
        return _skillIds.length;
    }
}
