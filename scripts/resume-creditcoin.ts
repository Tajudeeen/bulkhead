import { network } from "hardhat";

const { ethers } = (await network.create()) as any;
const [deployer] = await ethers.getSigners();
const expectedChainId = BigInt(process.env.CREDITCOIN_CHAIN_ID ?? "102031");
const targetNetwork = await ethers.provider.getNetwork();
if (targetNetwork.chainId !== expectedChainId) {
  throw new Error(`expected Creditcoin chain ${expectedChainId}, received ${targetNetwork.chainId}`);
}

const gatewayAddress = process.env.GATEWAY_ADDRESS;
const overseerAddress = process.env.OVERSEER_ADDRESS;
const factoryAddress = process.env.FACTORY_ADDRESS;
const sourceSignal = process.env.SOURCE_SIGNAL_ADDRESS;
if (!gatewayAddress || !overseerAddress || !factoryAddress || !sourceSignal) {
  throw new Error("GATEWAY_ADDRESS, OVERSEER_ADDRESS, FACTORY_ADDRESS, and SOURCE_SIGNAL_ADDRESS are required");
}

const gateway = await ethers.getContractAt("AttestationGateway", gatewayAddress);
const overseer = await ethers.getContractAt("Overseer", overseerAddress);
const factory = await ethers.getContractAt("BulkheadFactory", factoryAddress);
const checked = async (label: string, transaction: any) => {
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${label} failed: ${transaction.hash}`);
  return { transactionHash: transaction.hash, blockNumber: receipt.blockNumber, receiptStatus: receipt.status };
};

if ((await gateway.overseer()).toLowerCase() !== overseerAddress.toLowerCase()) throw new Error("Gateway points to a different Overseer");
if ((await gateway.sourceSignal()).toLowerCase() !== sourceSignal.toLowerCase()) throw new Error("Gateway points to a different source signal");
if ((await factory.overseer()).toLowerCase() !== overseerAddress.toLowerCase()) throw new Error("Factory points to a different Overseer");
if ((await factory.operator()).toLowerCase() !== (await deployer.getAddress()).toLowerCase()) throw new Error("current signer is not the Factory operator");

const clusters: Array<Record<string, unknown>> = [];
for (const [clusterId, count] of [[1, 7], [2, 7], [3, 7]]) {
  let bulkheads = Array.from(await factory.cluster(clusterId)) as string[];
  const actions: Record<string, unknown> = {};
  if (bulkheads.length === 0) {
    actions.creation = await checked(`Cluster ${clusterId} creation`, await factory.createCluster(clusterId, count));
    bulkheads = Array.from(await factory.cluster(clusterId)) as string[];
  }
  if (!(await factory.clusterFinalized(clusterId))) {
    actions.finalization = await checked(`Cluster ${clusterId} finalization`, await factory.finalizeCluster(clusterId));
  }
  const registered = bulkheads.length > 0 && (await overseer.registeredClusterPlusOne(bulkheads[0])) !== 0n;
  if (!registered) actions.registration = await checked(`Cluster ${clusterId} registration`, await overseer.registerCluster(clusterId, [...bulkheads]));
  for (const bulkhead of bulkheads) {
    if ((await ethers.provider.getCode(bulkhead)) === "0x") throw new Error(`no bytecode at Bulkhead ${bulkhead}`);
    if ((await overseer.registeredClusterPlusOne(bulkhead)) !== BigInt(clusterId) + 1n) throw new Error(`Bulkhead ${bulkhead} is not registered in cluster ${clusterId}`);
  }
  clusters.push({ clusterId, bulkheads, actions });
}

console.log(JSON.stringify({
  chainId: targetNetwork.chainId.toString(),
  deployer: await deployer.getAddress(),
  gateway: gatewayAddress,
  overseer: overseerAddress,
  factory: factoryAddress,
  sourceSignal,
  clusters,
}, null, 2));
