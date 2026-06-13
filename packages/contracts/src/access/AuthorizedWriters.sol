// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "./Ownable.sol";

/// @title AuthorizedWriters
/// @notice Owner-managed allowlist of addresses permitted to perform privileged
///         writes (e.g. the SpartArena backend signer and verifier wallets).
abstract contract AuthorizedWriters is Ownable {
    mapping(address => bool) public isWriter;

    event WriterUpdated(address indexed writer, bool allowed);

    error NotAuthorized();

    constructor(address initialOwner) Ownable(initialOwner) {
        // Owner is implicitly authorized via the onlyWriter modifier below.
    }

    modifier onlyWriter() {
        if (msg.sender != owner && !isWriter[msg.sender]) revert NotAuthorized();
        _;
    }

    function setWriter(address writer, bool allowed) external onlyOwner {
        if (writer == address(0)) revert ZeroAddress();
        isWriter[writer] = allowed;
        emit WriterUpdated(writer, allowed);
    }
}
