import "dotenv/config";
import { buildProof, submitProof, type ProofSubmitterConfig } from "./proofSubmitter.js";
import { watchDistressSignal } from "./watcher.js";

const sourceChainKey = Number(process.env.SOURCE_CHAIN_KEY ?? "");
const config: ProofSubmitterConfig = {
  sourceChainKey,
  proofBuilderUrl: process.env.PROOF_BUILDER_URL ?? "",
  sourceRpcUrl: process.env.SOURCE_CHAIN_RPC_URL ?? "",
  creditcoinRpcUrl: process.env.CREDITCOIN_RPC_URL ?? "",
  gatewayAddress: process.env.GATEWAY_ADDRESS ?? "",
  gatewayAbi: [
    "function verifyAndProcess((uint64 chainKey,uint64 height,bytes encodedTransaction,(bytes32 root,(bytes32 hash,bool isLeft)[] siblings) merkleProof,(bytes32 lowerEndpointDigest,bytes32[] roots) continuityProof) query) returns (bytes32 queryId)",
  ],
  privateKey: process.env.CREDITCOIN_WALLET_PRIVATE_KEY ?? "",
};

const signalAddress = process.env.DISTRESS_SIGNAL_ADDRESS ?? "";
const startBlock = Number(process.env.START_BLOCK ?? 0);
const missing = [
  !Number.isSafeInteger(config.sourceChainKey) || config.sourceChainKey <= 0 ? "SOURCE_CHAIN_KEY" : "",
  !config.proofBuilderUrl ? "PROOF_BUILDER_URL" : "",
  !config.sourceRpcUrl ? "SOURCE_CHAIN_RPC_URL" : "",
  !config.creditcoinRpcUrl ? "CREDITCOIN_RPC_URL" : "",
  !config.gatewayAddress ? "GATEWAY_ADDRESS" : "",
  !config.privateKey ? "CREDITCOIN_WALLET_PRIVATE_KEY" : "",
  !signalAddress ? "DISTRESS_SIGNAL_ADDRESS" : "",
  !Number.isSafeInteger(startBlock) || startBlock < 0 ? "START_BLOCK" : "",
].filter(Boolean);
if (missing.length > 0) throw new Error(`Missing or invalid worker configuration: ${missing.join(", ")}`);

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
    retryDeadLetters: process.env.RETRY_DEAD_LETTERS === "true",
  },
);
