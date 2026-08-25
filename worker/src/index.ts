import "dotenv/config";
import { buildProof, submitProof, type ProofSubmitterConfig } from "./proofSubmitter.js";
import { watchDistressSignal } from "./watcher.js";

const config: ProofSubmitterConfig = {
  sourceChainKey: Number(process.env.SOURCE_CHAIN_KEY),
  proofBuilderUrl: process.env.PROOF_BUILDER_URL ?? "",
  sourceRpcUrl: process.env.SOURCE_CHAIN_RPC_URL ?? "",
  creditcoinRpcUrl: process.env.CREDITCOIN_RPC_URL ?? "",
  gatewayAddress: process.env.GATEWAY_ADDRESS ?? "",
  gatewayAbi: ["function verifyAndProcess((uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[]))) returns (bytes32)"],
  privateKey: process.env.CREDITCOIN_WALLET_PRIVATE_KEY ?? "",
};

if (!Number.isSafeInteger(config.sourceChainKey) || config.sourceChainKey <= 0) {
  throw new Error("SOURCE_CHAIN_KEY must be a positive integer");
}
for (const [name, value] of Object.entries(config)) {
  if (typeof value === "string" && !value) throw new Error(`${name} is required`);
}
const signalAddress = process.env.DISTRESS_SIGNAL_ADDRESS ?? "";
const startBlock = Number(process.env.START_BLOCK ?? 0);
if (!signalAddress) throw new Error("DISTRESS_SIGNAL_ADDRESS is required");
if (!Number.isSafeInteger(startBlock) || startBlock < 0) throw new Error("START_BLOCK must be a non-negative integer");

await watchDistressSignal(
  config.sourceRpcUrl,
  signalAddress,
  ["event DistressSignal(address,uint256,uint256)"],
  startBlock,
  async (txHash) => {
    const proof = await buildProof(config, txHash);
    const result = await submitProof(config, proof);
    console.log(`submitted proof tx ${result.hash}`);
  },
  {
    confirmations: Number(process.env.SOURCE_CONFIRMATIONS ?? 3),
    statePath: process.env.WORKER_STATE_PATH ?? ".worker-state.json",
  },
);
