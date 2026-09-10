// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BajigurRegistrar} from "../src/BajigurRegistrar.sol";

/// Claims <CLAIM_LABEL>.bajigur.eth for the CLAIM_PRIVATE_KEY wallet, pointing at CLAIM_RESOLVER.
contract ClaimName is Script {
    function run() external {
        uint256 key = vm.envUint("CLAIM_PRIVATE_KEY");
        BajigurRegistrar registrar = BajigurRegistrar(vm.envAddress("BAJIGUR_REGISTRAR"));
        string memory label = vm.envString("CLAIM_LABEL");
        address resolver = vm.envOr("CLAIM_RESOLVER", address(0));

        vm.startBroadcast(key);
        uint256 tokenId = registrar.claim(label, resolver);
        vm.stopBroadcast();

        console.log("claimed:", label);
        console.log("owner:", vm.addr(key));
        console.log("tokenId:", tokenId);
    }
}
