// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPermissionedRegistry} from "@ensdomains/contracts-v2/registry/interfaces/IPermissionedRegistry.sol";
import {RegistryRolesLib} from "@ensdomains/contracts-v2/registry/libraries/RegistryRolesLib.sol";
import {Script, console} from "forge-std/Script.sol";
import {BajigurRegistrar} from "../src/BajigurRegistrar.sol";

/// Deploys the registrar for bajigur.eth's subregistry and grants it ROLE_REGISTRAR (sender must hold the admin role).
contract DeployRegistrar is Script {
    function run() external {
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        IPermissionedRegistry subregistry = IPermissionedRegistry(vm.envAddress("ENS_SUBREGISTRY"));

        vm.startBroadcast(key);
        BajigurRegistrar registrar = new BajigurRegistrar(subregistry);
        subregistry.grantRootRoles(RegistryRolesLib.ROLE_REGISTRAR, address(registrar));
        vm.stopBroadcast();

        console.log("BajigurRegistrar:", address(registrar));
        console.log("subregistry:", address(subregistry));
    }
}
