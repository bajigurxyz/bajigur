// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPermissionedRegistry} from "@ensdomains/contracts-v2/registry/interfaces/IPermissionedRegistry.sol";
import {IRegistry} from "@ensdomains/contracts-v2/registry/interfaces/IRegistry.sol";
import {RegistryRolesLib} from "@ensdomains/contracts-v2/registry/libraries/RegistryRolesLib.sol";

interface ITextResolver {
    function setText(bytes32 node, string calldata key, string calldata value) external;
}

/// One free subname under bajigur.eth (ENSv2) per wallet.
/// `claim`: the wallet itself, with a resolver it controls.
/// `claimFor`: the platform operator on a user's behalf, on the shared resolver, with the
/// `bajigur.hedera` payout record written in the same transaction.
/// Needs ROLE_REGISTRAR on the subregistry root and ROLE_SET_TEXT on the shared resolver root.
contract BajigurRegistrar {
    IPermissionedRegistry public immutable REGISTRY;
    ITextResolver public immutable RESOLVER;
    bytes32 public immutable PARENT_NODE;
    address public immutable OPERATOR;
    uint64 public constant DURATION = 10 * 365 days;
    string public constant HEDERA_KEY = "bajigur.hedera";
    uint256 public constant OWNER_ROLES = RegistryRolesLib.ROLE_SET_SUBREGISTRY
        | RegistryRolesLib.ROLE_SET_SUBREGISTRY_ADMIN | RegistryRolesLib.ROLE_SET_RESOLVER
        | RegistryRolesLib.ROLE_SET_RESOLVER_ADMIN | RegistryRolesLib.ROLE_CAN_TRANSFER_ADMIN;

    mapping(address owner => string label) public labelOf;

    event Claimed(uint256 indexed tokenId, string label, address indexed owner, address resolver);

    error AlreadyClaimed(address owner);
    error InvalidLabel(string label);
    error NotAvailable(string label);
    error NotOperator(address sender);

    constructor(IPermissionedRegistry registry, ITextResolver resolver, bytes32 parentNode, address operator) {
        REGISTRY = registry;
        RESOLVER = resolver;
        PARENT_NODE = parentNode;
        OPERATOR = operator;
    }

    function claim(string calldata label, address resolver) external returns (uint256 tokenId) {
        return _claim(label, msg.sender, resolver);
    }

    function claimFor(string calldata label, address owner, string calldata hederaAccount)
        external
        returns (uint256 tokenId)
    {
        if (msg.sender != OPERATOR) revert NotOperator(msg.sender);
        tokenId = _claim(label, owner, address(RESOLVER));
        RESOLVER.setText(node(label), HEDERA_KEY, hederaAccount);
    }

    function _claim(string calldata label, address owner, address resolver) internal returns (uint256 tokenId) {
        if (bytes(labelOf[owner]).length != 0) revert AlreadyClaimed(owner);
        if (!isValidLabel(label)) revert InvalidLabel(label);
        if (!isAvailable(label)) revert NotAvailable(label);
        tokenId = REGISTRY.register(
            label, owner, IRegistry(address(0)), resolver, OWNER_ROLES, uint64(block.timestamp) + DURATION
        );
        labelOf[owner] = label;
        emit Claimed(tokenId, label, owner, resolver);
    }

    function node(string calldata label) public view returns (bytes32) {
        return keccak256(abi.encodePacked(PARENT_NODE, keccak256(bytes(label))));
    }

    function isAvailable(string calldata label) public view returns (bool) {
        return REGISTRY.getStatus(uint256(keccak256(bytes(label)))) == IPermissionedRegistry.Status.AVAILABLE;
    }

    /// 3-32 chars of [a-z0-9-], no leading or trailing hyphen.
    function isValidLabel(string calldata label) public pure returns (bool) {
        bytes calldata b = bytes(label);
        if (b.length < 3 || b.length > 32 || b[0] == "-" || b[b.length - 1] == "-") return false;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c == "-";
            if (!ok) return false;
        }
        return true;
    }
}
