// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PromptRegistry} from "../src/PromptRegistry.sol";

contract Deploy is Script {
    function run() external {
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(key);
        address minter = vm.envOr("PROMPT_MINTER", deployer);

        vm.startBroadcast(key);
        PromptRegistry registry = new PromptRegistry(deployer, minter);
        vm.stopBroadcast();

        console.log("PromptRegistry:", address(registry));
        console.log("admin:", deployer);
        console.log("minter:", minter);
    }
}
