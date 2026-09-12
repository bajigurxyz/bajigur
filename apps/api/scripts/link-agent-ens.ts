/// One-off: make the service's own ERC-8004 agent and its ENS name point at each other,
/// the way a creator's do after their first rating. Safe to re-run.
import { privySigner } from "../src/agent";
import { registrarClient } from "../src/ens";
import { agentRef, reputation } from "../src/reputation";

const agentId = Number(process.env.ERC8004_AGENT_ID);
const name = process.env.ENS_AGENT_NAME ?? `agent.${process.env.ENS_NAME}`;
const uri = `https://api.bajigur.xyz/.well-known/agent.json`;
const rep = reputation(privySigner());
const registrar = registrarClient();
if (!agentId || !rep || !registrar) {
  console.error("set ERC8004_AGENT_ID, ENS_NAME, PRIVY_*, BAJIGUR_REGISTRAR, DEPLOYER_PRIVATE_KEY");
  process.exit(1);
}

console.log(`agent ${agentId} <-> ${name}`);
await rep.describeAgent(agentId, name, uri);
console.log("  onchain: agentURI and ens metadata set");
console.log("  ens:", await registrar.setText(name, "erc8004", agentRef(agentId)));
