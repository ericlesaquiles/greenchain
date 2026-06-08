// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title GreenSBT — Soulbound Token for verified recycling actions
/// @notice Tokens are non-transferable (ERC-5192 soulbound)
contract GreenSBT is ERC721, Ownable {

    // ─── State ───────────────────────────────────────────────────────────────

    address public registryContract;
    uint256 public tokenCount;

    // Maps token ID to the discard action ID in GreenRegistry
    mapping(uint256 => uint256) public tokenToDiscard;

    // Maps citizen address to their token IDs
    mapping(address => uint256[]) public tokensByCitizen;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice ERC-5192 locked event — emitted on mint to signal soulbound
    event Locked(uint256 tokenId);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() ERC721("GreenChain Certificate", "GREEN") {}

    // ─── Admin ───────────────────────────────────────────────────────────────

    /// @notice Set the registry contract address allowed to mint
    function setRegistryContract(address _registry) external onlyOwner {
        registryContract = _registry;
    }

    // ─── Soulbound: block all transfers ──────────────────────────────────────

    function transferFrom(address, address, uint256) public pure override {
        revert("GreenSBT: token is soulbound and cannot be transferred");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("GreenSBT: token is soulbound and cannot be transferred");
    }

    function approve(address, uint256) public pure override {
        revert("GreenSBT: token is soulbound and cannot be approved");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("GreenSBT: token is soulbound and cannot be approved");
    }

    // ─── Mint ────────────────────────────────────────────────────────────────

    /// @notice Mint a soulbound certificate to a citizen
    /// @dev Only callable by the linked GreenRegistry contract
    function mint(address _to, uint256 _discardId) external {
        require(msg.sender == registryContract, "GreenSBT: caller is not the registry");
        require(_to != address(0), "GreenSBT: invalid address");

        uint256 tokenId = tokenCount;

        _safeMint(_to, tokenId);

        tokenToDiscard[tokenId] = _discardId;
        tokensByCitizen[_to].push(tokenId);
        tokenCount++;

        // Signal soulbound per ERC-5192
        emit Locked(tokenId);
    }

    // ─── View ────────────────────────────────────────────────────────────────

    /// @notice Returns all token IDs owned by a citizen
    function getTokensByCitizen(address _citizen) external view returns (uint256[] memory) {
        return tokensByCitizen[_citizen];
    }

    /// @notice ERC-5192: all tokens are permanently locked
    function locked(uint256 tokenId) external view returns (bool) {
        require(tokenId < tokenCount, "GreenSBT: token does not exist");
        return true;
    }

    /// @notice Returns token metadata as a simple on-chain URI
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId < tokenCount, "GreenSBT: token does not exist");
        return string(abi.encodePacked(
            "https://greenchain.app/certificate/",
            _toString(tokenId)
        ));
    }

    /// @dev Simple uint to string conversion
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
