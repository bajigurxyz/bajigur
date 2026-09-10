// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

/// ERC-8004 IdentityRegistry, deployed on Hedera testnet at 0x8004A818BFB912233c491871b3d84c89A494BD9e.
interface IIdentityRegistry {
    function register(string calldata agentURI) external returns (uint256 agentId);
}

contract RegisterAgent is Script {
    function run() external {
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address registry = vm.envOr("ERC8004_IDENTITY_REGISTRY", 0x8004A818BFB912233c491871b3d84c89A494BD9e);
        string memory agentURI = vm.envString("ERC8004_AGENT_URI");

        vm.startBroadcast(key);
        uint256 agentId = IIdentityRegistry(registry).register(agentURI);
        vm.stopBroadcast();

        console.log("agentId:", agentId);
        console.log("agentURI:", agentURI);
    }
}
