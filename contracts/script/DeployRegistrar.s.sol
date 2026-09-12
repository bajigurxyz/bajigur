// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEnhancedAccessControl} from "@ensdomains/contracts-v2/access-control/interfaces/IEnhancedAccessControl.sol";
import {IPermissionedRegistry} from "@ensdomains/contracts-v2/registry/interfaces/IPermissionedRegistry.sol";
import {RegistryRolesLib} from "@ensdomains/contracts-v2/registry/libraries/RegistryRolesLib.sol";
import {PermissionedResolverLib} from "@ensdomains/contracts-v2/resolver/libraries/PermissionedResolverLib.sol";
import {Script, console} from "forge-std/Script.sol";
import {BajigurRegistrar, ITextResolver} from "../src/BajigurRegistrar.sol";

/// Deploys the registrar for bajigur.eth's subregistry, grants it ROLE_REGISTRAR there and ROLE_SET_TEXT on the
/// shared resolver (sender must hold the admin roles), and retires BAJIGUR_REGISTRAR_OLD when set.
contract DeployRegistrar is Script {
    function run() external {
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        IPermissionedRegistry subregistry = IPermissionedRegistry(vm.envAddress("ENS_SUBREGISTRY"));
        address resolver = vm.envAddress("ENS_RESOLVER");
        bytes32 parent = vm.ensNamehash(vm.envString("ENS_NAME"));
        address old = vm.envOr("BAJIGUR_REGISTRAR_OLD", address(0));

        vm.startBroadcast(key);
        BajigurRegistrar registrar = new BajigurRegistrar(subregistry, ITextResolver(resolver), parent, vm.addr(key));
        subregistry.grantRootRoles(RegistryRolesLib.ROLE_REGISTRAR, address(registrar));
        IEnhancedAccessControl(resolver).grantRootRoles(PermissionedResolverLib.ROLE_SET_TEXT, address(registrar));
        if (old != address(0)) subregistry.revokeRootRoles(RegistryRolesLib.ROLE_REGISTRAR, old);
        vm.stopBroadcast();

        console.log("BajigurRegistrar:", address(registrar));
        console.log("subregistry:", address(subregistry));
        console.log("resolver:", resolver);
    }
}
