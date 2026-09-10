// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPermissionedRegistry} from "@ensdomains/contracts-v2/registry/interfaces/IPermissionedRegistry.sol";
import {IRegistry} from "@ensdomains/contracts-v2/registry/interfaces/IRegistry.sol";
import {RegistryRolesLib} from "@ensdomains/contracts-v2/registry/libraries/RegistryRolesLib.sol";

/// Anyone claims one free subname under bajigur.eth (ENSv2) with a resolver they control.
/// Needs ROLE_REGISTRAR on the subregistry's root resource.
contract BajigurRegistrar {
    IPermissionedRegistry public immutable REGISTRY;
    uint64 public constant DURATION = 10 * 365 days;
    uint256 public constant OWNER_ROLES = RegistryRolesLib.ROLE_SET_SUBREGISTRY
        | RegistryRolesLib.ROLE_SET_SUBREGISTRY_ADMIN | RegistryRolesLib.ROLE_SET_RESOLVER
        | RegistryRolesLib.ROLE_SET_RESOLVER_ADMIN | RegistryRolesLib.ROLE_CAN_TRANSFER_ADMIN;

    mapping(address owner => uint256 tokenId) public claimed;

    event Claimed(uint256 indexed tokenId, string label, address indexed owner, address resolver);

    error AlreadyClaimed(address owner);
    error InvalidLabel(string label);
    error NotAvailable(string label);

    constructor(IPermissionedRegistry registry) {
        REGISTRY = registry;
    }

    function claim(string calldata label, address resolver) external returns (uint256 tokenId) {
        if (claimed[msg.sender] != 0) revert AlreadyClaimed(msg.sender);
        if (!isValidLabel(label)) revert InvalidLabel(label);
        if (!isAvailable(label)) revert NotAvailable(label);
        tokenId = REGISTRY.register(
            label, msg.sender, IRegistry(address(0)), resolver, OWNER_ROLES, uint64(block.timestamp) + DURATION
        );
        claimed[msg.sender] = tokenId;
        emit Claimed(tokenId, label, msg.sender, resolver);
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
