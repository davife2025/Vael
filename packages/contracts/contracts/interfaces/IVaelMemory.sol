// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IVaelMemory
/// @notice Persistent on-chain key-value memory store for registered Vael agents.
///         Every agent gets its own isolated namespace. Keys are strings, values
///         are bytes — encode whatever you need (JSON, ABI, raw bytes).
///
///         This is what makes agents stateful across sessions and dApps.
///         An agent's memory is readable by anyone, writable only by its owner
///         or authorised writers (other agents or contracts).
interface IVaelMemory {

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct MemoryEntry {
        string  key;
        bytes   value;
        uint256 updatedAt;
        uint256 version;    // increments on every write — full history via events
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event MemorySet(
        bytes32 indexed agentId,
        string  indexed key,
        uint256         version,
        uint256         updatedAt
    );

    event MemoryDeleted(
        bytes32 indexed agentId,
        string  indexed key
    );

    event WriterAuthorised(
        bytes32 indexed agentId,
        address indexed writer,
        bool            status
    );

    // ─── Write ────────────────────────────────────────────────────────────────

    function set(bytes32 agentId, string calldata key, bytes calldata value) external;
    function setString(bytes32 agentId, string calldata key, string calldata value) external;
    function setUint(bytes32 agentId, string calldata key, uint256 value) external;
    function setBool(bytes32 agentId, string calldata key, bool value) external;
    function del(bytes32 agentId, string calldata key) external;

    // ─── Read ─────────────────────────────────────────────────────────────────

    function get(bytes32 agentId, string calldata key) external view returns (MemoryEntry memory);
    function getString(bytes32 agentId, string calldata key) external view returns (string memory);
    function getUint(bytes32 agentId, string calldata key) external view returns (uint256);
    function getBool(bytes32 agentId, string calldata key) external view returns (bool);
    function has(bytes32 agentId, string calldata key) external view returns (bool);
    function getKeys(bytes32 agentId) external view returns (string[] memory);
    function totalEntries(bytes32 agentId) external view returns (uint256);

    // ─── Access control ───────────────────────────────────────────────────────

    function authoriseWriter(bytes32 agentId, address writer, bool status) external;
    function isAuthorisedWriter(bytes32 agentId, address writer) external view returns (bool);
}
