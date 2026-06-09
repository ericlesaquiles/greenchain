export const REGISTRY_ADDRESS = "0x23ADABf4F0474F81fFfd111A432BEc7244bc11df";
export const SBT_ADDRESS = "0x1c60499FE6531642e4d363423faE51594F447180";
export const GOVERNANCE_ADDRESS = "0xc9c1987DaaF70C63845413AC095dF8f7D2326308";

export const DEPLOY_BLOCK = 0; // replace with the block number from Etherscan

export const REGISTRY_ABI = [
  "function registerDiscard(address citizen, uint8 category, uint16 weightKg, string calldata ipfsCid) external returns (uint256)",
  "function operators(address) external view returns (bool)",
  "function owner() external view returns (address)",
  "function getDiscard(uint256 id) external view returns (tuple(address operator, address citizen, uint8 category, uint16 weightKg, string ipfsCid, uint256 timestamp))",
  "function getDiscardsByCitizen(address citizen) external view returns (uint256[])",
  "function discardCount() external view returns (uint256)",
  "function addOperator(address operator) external",
  "function removeOperator(address operator) external",
  "event DiscardRegistered(uint256 indexed id, address indexed operator, address indexed citizen, uint8 category, uint16 weightKg, string ipfsCid, uint256 timestamp)",
  "event OperatorAdded(address indexed operator)",
  "event OperatorRemoved(address indexed operator)",
];

export const SBT_ABI = [
  "function getTokensByCitizen(address citizen) external view returns (uint256[])",
  "function tokenToDiscard(uint256 tokenId) external view returns (uint256)",
  "function locked(uint256 tokenId) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
];

export const GOVERNANCE_ABI = [
  "function submitMembershipProposal(address target, bool isAddition, string calldata ipfsCid) external returns (uint256)",
  "function submitManagementProposal(string calldata ipfsCid) external returns (uint256)",
  "function castVote(uint256 proposalId, bool support) external",
  "function executeProposal(uint256 proposalId) external",
  "function acknowledgeManagementProposal(uint256 proposalId) external",
  "function optInToGovernance() external",
  "function optOutOfGovernance() external",
  "function isVoter(address) external view returns (bool)",
  "function activeVoterCount() external view returns (uint256)",
  "function getProposal(uint256 id) external view returns (tuple(uint256 id, uint8 proposalType, address proposer, address target, bool isAddition, string ipfsCid, uint256 yesVotes, uint256 noVotes, uint256 deadline, uint256 executionTime, uint8 state, bool executed))",
  "function getActiveProposals() external view returns (uint256[])",
  "function proposalCount() external view returns (uint256)",
  "function hasVoted(uint256 proposalId, address voter) external view returns (bool)",
  "function voterList(uint256 index) external view returns (address)",
  "function votingDuration() external view returns (uint256)",
  "function timelockDuration() external view returns (uint256)",
  "event ProposalSubmitted(uint256 indexed id, uint8 proposalType, address indexed proposer, address indexed target, bool isAddition, string ipfsCid, uint256 deadline)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support)",
  "event ProposalExecuted(uint256 indexed proposalId)",
  "event ProposalAcknowledged(uint256 indexed proposalId)",
  "event VoterOptedIn(address indexed voter)",
  "event VoterOptedOut(address indexed voter)",
];

export const WASTE_CATEGORIES = [
  { value: 0, label: "Plastic" },
  { value: 1, label: "Paper" },
  { value: 2, label: "Metal" },
  { value: 3, label: "Glass" },
  { value: 4, label: "Organic" },
];

export const PROPOSAL_STATES = [
  "Active",
  "Passed",
  "Rejected",
  "Executed",
  "Acknowledged",
];

export const PROPOSAL_TYPES = [
  "Membership",
  "Management",
];
