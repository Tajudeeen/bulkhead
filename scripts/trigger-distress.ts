import { Contract, JsonRpcProvider, Wallet } from "ethers";

const rpcUrl = process.env.SOURCE_CHAIN_RPC_URL;
const privateKey = process.env.SOURCE_CHAIN_PRIVATE_KEY;
const signalAddress = process.env.DISTRESS_SIGNAL_ADDRESS ?? process.env.SOURCE_SIGNAL_ADDRESS;
const bulkhead = process.env.TARGET_BULKHEAD;
const clusterId = Number(process.env.TARGET_CLUSTER_ID ?? "1");
const distressBps = Number(process.env.DISTRESS_BPS ?? "2000");
if (!rpcUrl || !privateKey || !signalAddress || !bulkhead) {
  throw new Error("SOURCE_CHAIN_RPC_URL, SOURCE_CHAIN_PRIVATE_KEY, DISTRESS_SIGNAL_ADDRESS, and TARGET_BULKHEAD are required");
}
if (!Number.isSafeInteger(clusterId) || clusterId < 0) throw new Error("TARGET_CLUSTER_ID must be a non-negative integer");
if (!Number.isSafeInteger(distressBps) || distressBps < 0 || distressBps > 10_000) throw new Error("DISTRESS_BPS must be between 0 and 10000");

const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();
if (network.chainId !== 11_155_111n) throw new Error(`expected Sepolia chain 11155111, received ${network.chainId}`);
const signer = new Wallet(privateKey, provider);
const signal = new Contract(signalAddress, ["function emitDistress(address,uint256,uint256)"], signer);
const transaction = await signal.emitDistress(bulkhead, clusterId, distressBps);
const receipt = await transaction.wait();
if (!receipt || receipt.status !== 1) throw new Error(`distress transaction failed: ${transaction.hash}`);
console.log(JSON.stringify({
  chainId: network.chainId.toString(),
  transactionHash: transaction.hash,
  blockNumber: receipt.blockNumber,
  receiptStatus: receipt.status,
  signalAddress,
  bulkhead,
  clusterId,
  distressBps,
}, null, 2));
