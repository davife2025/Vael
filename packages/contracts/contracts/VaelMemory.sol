// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IVaelMemory.sol";
import "./interfaces/IVaelRegistry.sol";

/// @title VaelMemory
/// @notice Persistent on-chain key-value memory for every Vael agent.
///
///         Agents are stateless by default on any blockchain — they execute,
///         record activity, and forget. VaelMemory changes that. Every agent
///         gets a private namespace of key-value pairs that persists across
///         sessions, transactions, and dApp boundaries.
///
///         Use cases:
///           - Store last known price, position, or portfolio state
///           - Remember which users the agent has interacted with
///           - Track internal counters and flags across calls
///           - Coordinate state between agent instances
///
///         Keys are strings (max 128 bytes).
///         Values are raw bytes — encode strings, uints, bools, or JSON.
///         Every write emits an event with a version number for full history.
///         Only the agent owner or authorised writers can write.
///         Anyone can read — memory is public.
///
/// @dev    Max 256 keys per agent to prevent unbounded gas in getKeys().
///         Max value size is 4096 bytes — larger data should live on IPFS,
///         with the CID stored in memory.

contract VaelMemory is IVaelMemory, Ownable, Pausable {

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MAX_KEYS        = 256;
    uint256 public constant MAX_KEY_LENGTH  = 128;
    uint256 public constant MAX_VALUE_SIZE  = 4096;

    // ─── State ────────────────────────────────────────────────────────────────

    IVaelRegistry public immutable registry;

    /// @notice agentId → key → MemoryEntry
    mapping(bytes32 => mapping(string => MemoryEntry)) private _memory;

    /// @notice agentId → list of all keys ever set (including deleted ones)
    mapping(bytes32 => string[]) private _keys;

    /// @notice agentId → key → whether key has been initialised
    mapping(bytes32 => mapping(string => bool)) private _keyExists;

    /// @notice agentId → whether a key is currently live (not deleted)
    mapping(bytes32 => mapping(string => bool)) private _keyLive;

    /// @notice agentId → count of live keys
    mapping(bytes32 => uint256) private _liveCount;

    /// @notice agentId → authorised writer addresses
    mapping(bytes32 => mapping(address => bool)) private _writers;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _registry) Ownable(msg.sender) {
        require(_registry != address(0), "VaelMemory: zero registry");
        registry = IVaelRegistry(_registry);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier canWrite(bytes32 agentId) {
        require(registry.isRegistered(agentId), "VaelMemory: agent not registered");
        IVaelRegistry.AgentRecord memory rec = registry.getAgent(agentId);
        require(
            rec.owner == msg.sender || _writers[agentId][msg.sender],
            "VaelMemory: not authorised to write"
        );
        _;
    }

    modifier validKey(string calldata key) {
        require(bytes(key).length > 0,                "VaelMemory: key required");
        require(bytes(key).length <= MAX_KEY_LENGTH,  "VaelMemory: key too long");
        _;
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    /// @notice Set a raw bytes value for a key in an agent's memory.
    function set(bytes32 agentId, string calldata key, bytes calldata value)
        external
        whenNotPaused
        canWrite(agentId)
        validKey(key)
    {
        require(value.length <= MAX_VALUE_SIZE, "VaelMemory: value too large");
        _set(agentId, key, value);
    }

    /// @notice Convenience: set a UTF-8 string value.
    function setString(bytes32 agentId, string calldata key, string calldata value)
        external
        whenNotPaused
        canWrite(agentId)
        validKey(key)
    {
        bytes memory encoded = bytes(value);
        require(encoded.length <= MAX_VALUE_SIZE, "VaelMemory: value too large");
        _set(agentId, key, encoded);
    }

    /// @notice Convenience: set a uint256 value (ABI-encoded).
    function setUint(bytes32 agentId, string calldata key, uint256 value)
        external
        whenNotPaused
        canWrite(agentId)
        validKey(key)
    {
        _set(agentId, key, abi.encode(value));
    }

    /// @notice Convenience: set a bool value.
    function setBool(bytes32 agentId, string calldata key, bool value)
        external
        whenNotPaused
        canWrite(agentId)
        validKey(key)
    {
        _set(agentId, key, abi.encode(value));
    }

    /// @notice Delete a key from an agent's memory.
    function del(bytes32 agentId, string calldata key)
        external
        whenNotPaused
        canWrite(agentId)
        validKey(key)
    {
        require(_keyLive[agentId][key], "VaelMemory: key not found");

        delete _memory[agentId][key];
        _keyLive[agentId][key]  = false;
        _liveCount[agentId]    -= 1;

        emit MemoryDeleted(agentId, key);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    function get(bytes32 agentId, string calldata key)
        external view returns (MemoryEntry memory)
    {
        require(_keyLive[agentId][key], "VaelMemory: key not found");
        return _memory[agentId][key];
    }

    function getString(bytes32 agentId, string calldata key)
        external view returns (string memory)
    {
        require(_keyLive[agentId][key], "VaelMemory: key not found");
        return string(_memory[agentId][key].value);
    }

    function getUint(bytes32 agentId, string calldata key)
        external view returns (uint256)
    {
        require(_keyLive[agentId][key], "VaelMemory: key not found");
        return abi.decode(_memory[agentId][key].value, (uint256));
    }

    function getBool(bytes32 agentId, string calldata key)
        external view returns (bool)
    {
        require(_keyLive[agentId][key], "VaelMemory: key not found");
        return abi.decode(_memory[agentId][key].value, (bool));
    }

    function has(bytes32 agentId, string calldata key)
        external view returns (bool)
    {
        return _keyLive[agentId][key];
    }

    /// @notice Returns all currently live keys for an agent.
    function getKeys(bytes32 agentId)
        external view returns (string[] memory)
    {
        string[] storage allKeys = _keys[agentId];
        uint256 live = _liveCount[agentId];
        string[] memory result = new string[](live);
        uint256 idx = 0;
        for (uint256 i = 0; i < allKeys.length && idx < live; i++) {
            if (_keyLive[agentId][allKeys[i]]) {
                result[idx++] = allKeys[i];
            }
        }
        return result;
    }

    function totalEntries(bytes32 agentId) external view returns (uint256) {
        return _liveCount[agentId];
    }

    // ─── Access control ───────────────────────────────────────────────────────

    /// @notice Authorise or revoke a writer for an agent's memory namespace.
    ///         Only the agent owner can manage writers.
    function authoriseWriter(bytes32 agentId, address writer, bool status)
        external
    {
        require(registry.isRegistered(agentId), "VaelMemory: agent not registered");
        IVaelRegistry.AgentRecord memory rec = registry.getAgent(agentId);
        require(rec.owner == msg.sender,        "VaelMemory: not agent owner");
        _writers[agentId][writer] = status;
        emit WriterAuthorised(agentId, writer, status);
    }

    function isAuthorisedWriter(bytes32 agentId, address writer)
        external view returns (bool)
    {
        return _writers[agentId][writer];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _set(bytes32 agentId, string calldata key, bytes memory value) internal {
        // Register key if new
        if (!_keyExists[agentId][key]) {
            require(_liveCount[agentId] < MAX_KEYS, "VaelMemory: max keys reached");
            _keys[agentId].push(key);
            _keyExists[agentId][key] = true;
        }

        // Restore if previously deleted
        if (!_keyLive[agentId][key]) {
            _keyLive[agentId][key]  = true;
            _liveCount[agentId]    += 1;
        }

        uint256 newVersion = _memory[agentId][key].version + 1;

        _memory[agentId][key] = MemoryEntry({
            key:       key,
            value:     value,
            updatedAt: block.timestamp,
            version:   newVersion,
        });

        emit MemorySet(agentId, key, newVersion, block.timestamp);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
