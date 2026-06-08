export const REGISTRY_ADDRESS = "0x7832Eee24EB47af4347825231FE6135d9fe29815";
export const SBT_ADDRESS = "0xA55Dbd05D330018E2B600236031Fb5b46758c27c";
export const DEPLOY_BLOCK = 10957681

export const REGISTRY_ABI = [
  "function registerDiscard(address citizen, uint8 category, uint16 weightKg, string calldata ipfsCid) external returns (uint256)",
  "function operators(address) external view returns (bool)",
  "function getDiscard(uint256 id) external view returns (tuple(address operator, address citizen, uint8 category, uint16 weightKg, string ipfsCid, uint256 timestamp))",
  "function getDiscardsByCitizen(address citizen) external view returns (uint256[])",
  "function discardCount() external view returns (uint256)",
  "event DiscardRegistered(uint256 indexed id, address indexed operator, address indexed citizen, uint8 category, uint16 weightKg, string ipfsCid, uint256 timestamp)",
];

export const SBT_ABI = [
  "function getTokensByCitizen(address citizen) external view returns (uint256[])",
  "function tokenToDiscard(uint256 tokenId) external view returns (uint256)",
  "function locked(uint256 tokenId) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
];

export const WASTE_CATEGORIES = [
  { value: 0, label: "Plastic" },
  { value: 1, label: "Paper" },
  { value: 2, label: "Metal" },
  { value: 3, label: "Glass" },
  { value: 4, label: "Organic" },
];
