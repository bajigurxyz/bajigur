// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPermissionedRegistry} from "@ensdomains/contracts-v2/registry/interfaces/IPermissionedRegistry.sol";
import {IRegistry} from "@ensdomains/contracts-v2/registry/interfaces/IRegistry.sol";
import {RegistryRolesLib} from "@ensdomains/contracts-v2/registry/libraries/RegistryRolesLib.sol";
import {IEnhancedAccessControl} from "@ensdomains/contracts-v2/access-control/interfaces/IEnhancedAccessControl.sol";
import {PermissionedResolverLib} from "@ensdomains/contracts-v2/resolver/libraries/PermissionedResolverLib.sol";
import {Test} from "forge-std/Test.sol";

interface ITextRecord {
    function text(bytes32 node, string calldata key) external view returns (string memory);
}
import {BajigurRegistrar, ITextResolver} from "../src/BajigurRegistrar.sol";

contract MockRegistry {
    mapping(uint256 => IPermissionedRegistry.Status) public status;
    address public lastOwner;
    address public lastResolver;
    uint256 public lastRoles;
    uint64 public lastExpiry;
    uint256 public nextToken = 1;

    function getStatus(uint256 anyId) external view returns (IPermissionedRegistry.Status) {
        return status[anyId];
    }

    function register(string calldata label, address owner, IRegistry, address resolver, uint256 roles, uint64 expiry)
        external
        returns (uint256 tokenId)
    {
        uint256 id = uint256(keccak256(bytes(label)));
        require(status[id] == IPermissionedRegistry.Status.AVAILABLE, "taken");
        status[id] = IPermissionedRegistry.Status.REGISTERED;
        (lastOwner, lastResolver, lastRoles, lastExpiry) = (owner, resolver, roles, expiry);
        return nextToken++;
    }
}

contract MockResolver is ITextResolver {
    mapping(bytes32 => mapping(string => string)) public texts;

    function setText(bytes32 node, string calldata key, string calldata value) external {
        texts[node][key] = value;
    }
}

contract BajigurRegistrarTest is Test {
    MockRegistry registry;
    MockResolver shared;
    BajigurRegistrar registrar;
    address alice = makeAddr("alice");
    address resolver = makeAddr("resolver");
    bytes32 parent = vm.ensNamehash("bajigur.eth");

    function setUp() public {
        registry = new MockRegistry();
        shared = new MockResolver();
        registrar = new BajigurRegistrar(IPermissionedRegistry(address(registry)), shared, parent, address(this));
    }

    function test_claimFor_registers_to_owner_and_writes_record() public {
        uint256 id = registrar.claimFor("alice", alice, "0.0.1234");
        assertEq(id, 1);
        assertEq(registry.lastOwner(), alice);
        assertEq(registry.lastResolver(), address(shared));
        assertEq(registrar.labelOf(alice), "alice");
        assertEq(shared.texts(vm.ensNamehash("alice.bajigur.eth"), "bajigur.hedera"), "0.0.1234");
        vm.expectRevert(abi.encodeWithSelector(BajigurRegistrar.AlreadyClaimed.selector, alice));
        registrar.claimFor("alice2", alice, "0.0.1234");
    }

    function test_claimFor_only_operator() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(BajigurRegistrar.NotOperator.selector, alice));
        registrar.claimFor("alice", alice, "0.0.1234");
    }

    function test_claim_registers_with_owner_roles_and_ten_years() public {
        vm.prank(alice);
        uint256 id = registrar.claim("alice", resolver);
        assertEq(id, 1);
        assertEq(registry.lastOwner(), alice);
        assertEq(registry.lastResolver(), resolver);
        assertEq(registry.lastExpiry(), uint64(block.timestamp) + 10 * 365 days);
        assertTrue(registry.lastRoles() & RegistryRolesLib.ROLE_SET_RESOLVER != 0);
        assertTrue(registry.lastRoles() & RegistryRolesLib.ROLE_REGISTRAR == 0);
        assertEq(registrar.labelOf(alice), "alice");
    }

    function test_one_name_per_wallet() public {
        vm.startPrank(alice);
        registrar.claim("alice", resolver);
        vm.expectRevert(abi.encodeWithSelector(BajigurRegistrar.AlreadyClaimed.selector, alice));
        registrar.claim("alice2", resolver);
        vm.stopPrank();
    }

    function test_taken_label_reverts() public {
        vm.prank(alice);
        registrar.claim("kiel", resolver);
        vm.prank(makeAddr("bob"));
        vm.expectRevert(abi.encodeWithSelector(BajigurRegistrar.NotAvailable.selector, "kiel"));
        registrar.claim("kiel", resolver);
    }

    function test_label_rules() public view {
        assertTrue(registrar.isValidLabel("kiel"));
        assertTrue(registrar.isValidLabel("agent-42"));
        assertFalse(registrar.isValidLabel("ab"));
        assertFalse(registrar.isValidLabel("Kiel"));
        assertFalse(registrar.isValidLabel("-kiel"));
        assertFalse(registrar.isValidLabel("kiel-"));
        assertFalse(registrar.isValidLabel("kiel.eth"));
        assertFalse(registrar.isValidLabel("abcdefghijklmnopqrstuvwxyz0123456"));
    }

    function test_invalid_label_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(BajigurRegistrar.InvalidLabel.selector, "Kiel"));
        registrar.claim("Kiel", resolver);
    }
}

/// Runs only with SEPOLIA_RPC_URL set: claims a name on the real bajigur.eth subregistry in a fork.
contract BajigurRegistrarForkTest is Test {
    IPermissionedRegistry constant SUBREGISTRY = IPermissionedRegistry(0x9673702a3C850fa1c41d94C908083Fc85F59461c);
    address constant RESOLVER = 0x7f381419050525025bBB6811CF5821E0615487f6;
    address constant ROOT_ACCOUNT = 0xE610b819dd190Fc8154d0190BB3F3e9758d42bAa;

    function test_claim_on_sepolia_fork() public {
        string memory rpc = vm.envOr("SEPOLIA_RPC_URL", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);

        BajigurRegistrar registrar =
            new BajigurRegistrar(SUBREGISTRY, ITextResolver(RESOLVER), vm.ensNamehash("bajigur.eth"), address(this));
        vm.startPrank(ROOT_ACCOUNT);
        SUBREGISTRY.grantRootRoles(RegistryRolesLib.ROLE_REGISTRAR, address(registrar));
        IEnhancedAccessControl(RESOLVER).grantRootRoles(PermissionedResolverLib.ROLE_SET_TEXT, address(registrar));
        vm.stopPrank();

        // makeAddr keys are public and may carry code on Sepolia, so use an address nobody can have touched
        address alice = vm.addr(uint256(keccak256(abi.encode(block.timestamp, address(this)))));
        assertTrue(registrar.isAvailable("forktest"));
        assertFalse(registrar.isAvailable("kiel"));
        vm.prank(alice);
        uint256 tokenId = registrar.claim("forktest", address(0));
        assertEq(SUBREGISTRY.getOwner(uint256(keccak256("forktest"))), alice);
        assertEq(SUBREGISTRY.getTokenId(uint256(keccak256("forktest"))), tokenId);

        address bob = vm.addr(uint256(keccak256(abi.encode(block.timestamp, alice))));
        registrar.claimFor("forktest2", bob, "0.0.4242");
        assertEq(SUBREGISTRY.getOwner(uint256(keccak256("forktest2"))), bob);
        assertEq(ITextRecord(RESOLVER).text(vm.ensNamehash("forktest2.bajigur.eth"), "bajigur.hedera"), "0.0.4242");
    }
}
