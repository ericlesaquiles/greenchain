// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IGreenRegistry {
    function addOperator(address operator) external;
    function removeOperator(address operator) external;
    function operators(address) external view returns (bool);
}

contract GreenGovernance is Ownable {

    // ─── Types ───────────────────────────────────────────────────────────────

    enum ProposalType { Membership, Management }
    enum ProposalState { Active, Passed, Rejected, Executed, Acknowledged }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        address target;        // for membership proposals: the address to add/remove
        bool isAddition;       // for membership proposals: true = add, false = remove
        string ipfsCid;        // IPFS CID of full proposal description
        uint256 yesVotes;
        uint256 noVotes;
        uint256 deadline;      // timestamp when voting closes
        uint256 executionTime; // timestamp after which execution is allowed (timelock)
        ProposalState state;
        bool executed;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    IGreenRegistry public registry;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => bool) public isVoter;

    address[] public voterList;
    uint256 public proposalCount;

    uint256 public votingDuration;  // seconds
    uint256 public timelockDuration; // seconds

    uint256 public constant MIN_YES_VOTES = 2;

    // ─── Events ──────────────────────────────────────────────────────────────

    event ProposalSubmitted(
        uint256 indexed id,
        ProposalType proposalType,
        address indexed proposer,
        address indexed target,
        bool isAddition,
        string ipfsCid,
        uint256 deadline
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support
    );

    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalAcknowledged(uint256 indexed proposalId);
    event VoterOptedIn(address indexed voter);
    event VoterOptedOut(address indexed voter);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(
        address _registry,
        uint256 _votingDuration,
        uint256 _timelockDuration
    ) {
        registry = IGreenRegistry(_registry);
        votingDuration = _votingDuration;
        timelockDuration = _timelockDuration;
    }

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyOperator() {
        require(registry.operators(msg.sender), "GreenGovernance: caller is not an operator");
        _;
    }

    modifier onlyVoter() {
        require(isVoter[msg.sender], "GreenGovernance: caller is not a registered voter");
        _;
    }

    // ─── Voter management ────────────────────────────────────────────────────

    /// @notice Opt in to governance voting — must be an operator
    function optInToGovernance() external onlyOperator {
        require(!isVoter[msg.sender], "GreenGovernance: already a voter");
        isVoter[msg.sender] = true;
        voterList.push(msg.sender);
        emit VoterOptedIn(msg.sender);
    }

    /// @notice Opt out of governance voting
    function optOutOfGovernance() external onlyVoter {
        isVoter[msg.sender] = false;
        emit VoterOptedOut(msg.sender);
    }

    /// @notice Get the number of active voters
    function activeVoterCount() public view returns (uint256 count) {
        for (uint256 i = 0; i < voterList.length; i++) {
            if (isVoter[voterList[i]]) count++;
        }
    }

    // ─── Proposal submission ─────────────────────────────────────────────────

    /// @notice Submit a membership proposal (add or remove an operator)
    function submitMembershipProposal(
        address _target,
        bool _isAddition,
        string calldata _ipfsCid
    ) external onlyOperator returns (uint256) {
        require(_target != address(0), "GreenGovernance: invalid target");
        require(bytes(_ipfsCid).length > 0, "GreenGovernance: IPFS CID required");

        // Can't propose adding someone who is already an operator
        if (_isAddition) {
            require(!registry.operators(_target), "GreenGovernance: already an operator");
        } else {
            require(registry.operators(_target), "GreenGovernance: not an operator");
        }

        uint256 id = proposalCount++;
        uint256 deadline = block.timestamp + votingDuration;

        proposals[id] = Proposal({
            id: id,
            proposalType: ProposalType.Membership,
            proposer: msg.sender,
            target: _target,
            isAddition: _isAddition,
            ipfsCid: _ipfsCid,
            yesVotes: 0,
            noVotes: 0,
            deadline: deadline,
            executionTime: deadline + timelockDuration,
            state: ProposalState.Active,
            executed: false
        });

        emit ProposalSubmitted(
            id,
            ProposalType.Membership,
            msg.sender,
            _target,
            _isAddition,
            _ipfsCid,
            deadline
        );

        return id;
    }

    /// @notice Submit a management proposal (rule or process change)
    function submitManagementProposal(
        string calldata _ipfsCid
    ) external onlyOperator returns (uint256) {
        require(bytes(_ipfsCid).length > 0, "GreenGovernance: IPFS CID required");

        uint256 id = proposalCount++;
        uint256 deadline = block.timestamp + votingDuration;

        proposals[id] = Proposal({
            id: id,
            proposalType: ProposalType.Management,
            proposer: msg.sender,
            target: address(0),
            isAddition: false,
            ipfsCid: _ipfsCid,
            yesVotes: 0,
            noVotes: 0,
            deadline: deadline,
            executionTime: deadline + timelockDuration,
            state: ProposalState.Active,
            executed: false
        });

        emit ProposalSubmitted(
            id,
            ProposalType.Management,
            msg.sender,
            address(0),
            false,
            _ipfsCid,
            deadline
        );

        return id;
    }

    // ─── Voting ──────────────────────────────────────────────────────────────

    /// @notice Cast a vote on an active proposal
    function castVote(uint256 _proposalId, bool _support) external onlyVoter {
        Proposal storage p = proposals[_proposalId];

        require(p.state == ProposalState.Active, "GreenGovernance: proposal not active");
        require(block.timestamp < p.deadline, "GreenGovernance: voting period ended");
        require(!hasVoted[_proposalId][msg.sender], "GreenGovernance: already voted");

        // Aspirant cannot vote on their own membership proposal
        if (p.proposalType == ProposalType.Membership) {
            require(msg.sender != p.target, "GreenGovernance: cannot vote on own proposal");
        }

        hasVoted[_proposalId][msg.sender] = true;

        if (_support) {
            p.yesVotes++;
        } else {
            p.noVotes++;
        }

        emit VoteCast(_proposalId, msg.sender, _support);

        // Auto-update state if voting period has effectively ended
        _updateState(_proposalId);
    }

    // ─── Execution ───────────────────────────────────────────────────────────

    /// @notice Execute a passed membership proposal after the timelock
    function executeProposal(uint256 _proposalId) external {
        Proposal storage p = proposals[_proposalId];

        require(
            p.state == ProposalState.Active || p.state == ProposalState.Passed,
            "GreenGovernance: proposal cannot be executed"
        );
        require(block.timestamp >= p.deadline, "GreenGovernance: voting still active");
        require(block.timestamp >= p.executionTime, "GreenGovernance: timelock not expired");
        require(!p.executed, "GreenGovernance: already executed");
        require(
            p.proposalType == ProposalType.Membership,
            "GreenGovernance: use acknowledgeManagementProposal for management proposals"
        );

        _updateState(_proposalId);

        require(p.state == ProposalState.Passed, "GreenGovernance: proposal did not pass");

        p.executed = true;
        p.state = ProposalState.Executed;

        if (p.isAddition) {
            registry.addOperator(p.target);
        } else {
            registry.removeOperator(p.target);
        }

        emit ProposalExecuted(_proposalId);
    }

    /// @notice Owner acknowledges a passed management proposal
    function acknowledgeManagementProposal(uint256 _proposalId) external onlyOwner {
        Proposal storage p = proposals[_proposalId];

        require(
            p.proposalType == ProposalType.Management,
            "GreenGovernance: not a management proposal"
        );
        require(block.timestamp >= p.deadline, "GreenGovernance: voting still active");

        _updateState(_proposalId);

        require(
            p.state == ProposalState.Passed,
            "GreenGovernance: proposal did not pass"
        );

        p.executed = true;
        p.state = ProposalState.Acknowledged;

        emit ProposalAcknowledged(_proposalId);
    }

    // ─── View functions ──────────────────────────────────────────────────────

    function getProposal(uint256 _id) external view returns (Proposal memory) {
        require(_id < proposalCount, "GreenGovernance: proposal does not exist");
        return proposals[_id];
    }

    function getVoterList() external view returns (address[] memory) {
        return voterList;
    }

    function getActiveProposals() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < proposalCount; i++) {
            if (proposals[i].state == ProposalState.Active) count++;
        }
        uint256[] memory ids = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < proposalCount; i++) {
            if (proposals[i].state == ProposalState.Active) ids[idx++] = i;
        }
        return ids;
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    function _updateState(uint256 _proposalId) internal {
        Proposal storage p = proposals[_proposalId];
        if (p.state != ProposalState.Active) return;
        if (block.timestamp < p.deadline) return;

        uint256 voters = activeVoterCount();
        uint256 quorum = voters < MIN_YES_VOTES ? voters : MIN_YES_VOTES;

        if (p.yesVotes >= quorum && p.yesVotes > p.noVotes) {
            p.state = ProposalState.Passed;
        } else {
            p.state = ProposalState.Rejected;
        }
    }
}
