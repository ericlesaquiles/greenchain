// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IGreenSBT {
    function mint(address to, uint256 discardId) external;
}

contract GreenRegistry is Ownable {

    // ─── Types ───────────────────────────────────────────────────────────────

    enum WasteCategory {
        Plastic,    // 0
        Paper,      // 1
        Metal,      // 2
        Glass,      // 3
        Organic     // 4
    }

    struct DiscardAction {
        address operator;       // who registered the action
        address citizen;        // who performed the discard
        WasteCategory category; // type of waste
        uint16 weightKg;        // estimated weight in kg
        string ipfsCid;         // CID pointing to evidence on IPFS
        uint256 timestamp;      // block timestamp at registration
    }

    // ─── State ───────────────────────────────────────────────────────────────

    mapping(uint256 => DiscardAction) public discards;
    mapping(address => bool) public operators;
    mapping(address => uint256[]) public discardsByCitizen;

    uint256 public discardCount;
    IGreenSBT public sbtContract;

    // ─── Events ──────────────────────────────────────────────────────────────

    event DiscardRegistered(
        uint256 indexed id,
        address indexed operator,
        address indexed citizen,
        WasteCategory category,
        uint16 weightKg,
        string ipfsCid,
        uint256 timestamp
    );

    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyOperator() {
        require(operators[msg.sender], "GreenRegistry: caller is not an operator");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {}

    // ─── Admin functions ─────────────────────────────────────────────────────

    /// @notice Link the SBT contract after deploy
    function setSBTContract(address _sbtContract) external onlyOwner {
        sbtContract = IGreenSBT(_sbtContract);
    }

    /// @notice Authorize an operator address to register discards
    function addOperator(address _operator) external onlyOwner {
        operators[_operator] = true;
        emit OperatorAdded(_operator);
    }

    /// @notice Remove an operator's authorization
    function removeOperator(address _operator) external onlyOwner {
        operators[_operator] = false;
        emit OperatorRemoved(_operator);
    }

    // ─── Core functions ──────────────────────────────────────────────────────

    /// @notice Register a discard action and mint an SBT to the citizen
    function registerDiscard(
        address _citizen,
        WasteCategory _category,
        uint16 _weightKg,
        string calldata _ipfsCid
    ) external onlyOperator returns (uint256) {
        require(_citizen != address(0), "GreenRegistry: invalid citizen address");
        require(_weightKg > 0, "GreenRegistry: weight must be greater than zero");
        require(bytes(_ipfsCid).length > 0, "GreenRegistry: IPFS CID required");

        uint256 id = discardCount;

        discards[id] = DiscardAction({
            operator: msg.sender,
            citizen: _citizen,
            category: _category,
            weightKg: _weightKg,
            ipfsCid: _ipfsCid,
            timestamp: block.timestamp
        });

        discardsByCitizen[_citizen].push(id);
        discardCount++;

        // Mint SBT if contract is linked
        if (address(sbtContract) != address(0)) {
            sbtContract.mint(_citizen, id);
        }

        emit DiscardRegistered(
            id,
            msg.sender,
            _citizen,
            _category,
            _weightKg,
            _ipfsCid,
            block.timestamp
        );

        return id;
    }

    // ─── View functions ──────────────────────────────────────────────────────

    /// @notice Get a single discard action by ID
    function getDiscard(uint256 _id) external view returns (DiscardAction memory) {
        require(_id < discardCount, "GreenRegistry: discard does not exist");
        return discards[_id];
    }

    /// @notice Get all discard IDs for a given citizen
    function getDiscardsByCitizen(address _citizen) external view returns (uint256[] memory) {
        return discardsByCitizen[_citizen];
    }
}
