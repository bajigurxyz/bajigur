// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// Creator-owned prompt catalogue plus one ERC-1155 licence per purchase.
/// Payment happens off-contract over x402 on Hedera; MINTER_ROLE (the API) issues the licence after settlement.
contract PromptRegistry is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct Prompt {
        address creator;
        bytes32 contentHash;
        uint64 priceUsdc;
        uint64 priceTinybar;
        string payTo;
        string uri;
    }

    uint256 public nextId = 1;
    mapping(uint256 id => Prompt) private _prompts;

    event PromptRegistered(uint256 indexed id, address indexed creator, bytes32 contentHash);
    event PromptUpdated(uint256 indexed id, string payTo, uint64 priceUsdc, uint64 priceTinybar);
    event LicenseIssued(uint256 indexed id, address indexed to, string transactionId);

    error UnknownPrompt(uint256 id);
    error NotCreator(uint256 id, address caller);
    error AlreadyLicensed(uint256 id, address to);

    constructor(address admin, address minter) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
    }

    function register(
        bytes32 contentHash,
        string calldata payTo,
        uint64 priceUsdc,
        uint64 priceTinybar,
        string calldata uri_
    ) external returns (uint256 id) {
        id = nextId++;
        _prompts[id] = Prompt(msg.sender, contentHash, priceUsdc, priceTinybar, payTo, uri_);
        emit PromptRegistered(id, msg.sender, contentHash);
        emit PromptUpdated(id, payTo, priceUsdc, priceTinybar);
    }

    function update(uint256 id, string calldata payTo, uint64 priceUsdc, uint64 priceTinybar) external {
        Prompt storage p = _existing(id);
        if (p.creator != msg.sender) revert NotCreator(id, msg.sender);
        p.payTo = payTo;
        p.priceUsdc = priceUsdc;
        p.priceTinybar = priceTinybar;
        emit PromptUpdated(id, payTo, priceUsdc, priceTinybar);
    }

    function issue(uint256 id, address to, string calldata transactionId) external onlyRole(MINTER_ROLE) {
        _existing(id);
        if (balanceOf(to, id) != 0) revert AlreadyLicensed(id, to);
        _mint(to, id, 1, "");
        emit LicenseIssued(id, to, transactionId);
    }

    function prompt(uint256 id) external view returns (Prompt memory) {
        return _existing(id);
    }

    function uri(uint256 id) public view override returns (string memory) {
        return _existing(id).uri;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _existing(uint256 id) private view returns (Prompt storage p) {
        p = _prompts[id];
        if (p.creator == address(0)) revert UnknownPrompt(id);
    }
}
