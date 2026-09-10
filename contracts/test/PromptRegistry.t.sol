// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {Test} from "forge-std/Test.sol";
import {PromptRegistry} from "../src/PromptRegistry.sol";

contract PromptRegistryTest is Test {
    PromptRegistry registry;
    address admin = makeAddr("admin");
    address minter = makeAddr("minter");
    address creator = makeAddr("creator");
    address buyer = makeAddr("buyer");
    bytes32 hash = keccak256("Build a pinned hero section.");

    function setUp() public {
        registry = new PromptRegistry(admin, minter);
    }

    function _register() internal returns (uint256) {
        vm.prank(creator);
        return registry.register(hash, "0.0.7275085", 100_000, 100_000_000, "ipfs://hero");
    }

    function test_register_assigns_ownership_and_prices() public {
        uint256 id = _register();
        PromptRegistry.Prompt memory p = registry.prompt(id);
        assertEq(id, 1);
        assertEq(p.creator, creator);
        assertEq(p.contentHash, hash);
        assertEq(p.priceUsdc, 100_000);
        assertEq(p.priceTinybar, 100_000_000);
        assertEq(p.payTo, "0.0.7275085");
        assertEq(registry.uri(id), "ipfs://hero");
        assertEq(registry.nextId(), 2);
    }

    function test_update_only_by_creator() public {
        uint256 id = _register();
        vm.prank(creator);
        registry.update(id, "0.0.42", 50_000, 50_000_000);
        assertEq(registry.prompt(id).payTo, "0.0.42");
        assertEq(registry.prompt(id).priceUsdc, 50_000);

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(PromptRegistry.NotCreator.selector, id, buyer));
        registry.update(id, "0.0.1", 1, 1);
    }

    function test_issue_mints_one_licence_per_buyer() public {
        uint256 id = _register();
        vm.prank(minter);
        vm.expectEmit(true, true, false, true);
        emit PromptRegistry.LicenseIssued(id, buyer, "0.0.9185802@1789055565.700887673");
        registry.issue(id, buyer, "0.0.9185802@1789055565.700887673");
        assertEq(registry.balanceOf(buyer, id), 1);

        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(PromptRegistry.AlreadyLicensed.selector, id, buyer));
        registry.issue(id, buyer, "again");
    }

    function test_issue_requires_minter_role() public {
        uint256 id = _register();
        bytes32 role = registry.MINTER_ROLE();
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, buyer, role));
        registry.issue(id, buyer, "tx");
    }

    function test_unknown_prompt_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(PromptRegistry.UnknownPrompt.selector, 7));
        registry.prompt(7);
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(PromptRegistry.UnknownPrompt.selector, 7));
        registry.issue(7, buyer, "tx");
    }

    function test_licence_is_transferable() public {
        uint256 id = _register();
        vm.prank(minter);
        registry.issue(id, buyer, "tx");
        address friend = makeAddr("friend");
        vm.prank(buyer);
        registry.safeTransferFrom(buyer, friend, id, 1, "");
        assertEq(registry.balanceOf(friend, id), 1);
        assertEq(registry.balanceOf(buyer, id), 0);
    }

    function test_supports_erc1155_and_access_control() public view {
        assertTrue(registry.supportsInterface(type(IERC1155).interfaceId));
        assertTrue(registry.supportsInterface(type(IAccessControl).interfaceId));
    }
}
