import "dotenv/config";
import { buildProof, submitProof, type ProofSubmitterConfig } from "./proofSubmitter.js";
import { watchDistressSignal } from "./watcher.js";

const config: ProofSubmitterConfig = {
  sourceChainKey: Number(process.env.SOURCE_CHAIN_KEY),
  proofBuilderUrl: process.env.PROOF_BUILDER_URL ?? "",
  sourceRpcUrl: process.env.SOURCE_CHAIN_RPC_URL ?? "",
  creditcoinRpcUrl: process.env.CREDITCOIN_RPC_URL ?? "",
  gatewayAddress: process.env.GATEWAY_ADDRESS ?? "",
  gatewayAbi: ["function verify((uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[]))) returns (bytes32)"],
  privateKey: process.env.CREDITCOIN_WALLET_PRIVATE_KEY ?? "",
};

for (const [name, value] of Object.entries(config)) {
  if (typeof value === "string" && !value) throw new Error(`${name} is required`);
}

await watchDistressSignal(
  config.sourceRpcUrl,
  process.env.DISTRESS_SIGNAL_ADDRESS ?? "",
  ["event DistressSignal(uint256,uint256)"],
  Number(process.env.START_BLOCK ?? 0),
  async (txHash) => {
    const proof = await buildProof(config, txHash);
    const result = await submitProof(config, proof);
    console.log(`submitted proof tx ${result.hash}`);
  },
);
