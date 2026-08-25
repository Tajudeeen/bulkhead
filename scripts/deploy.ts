import { network } from "hardhat";

const { ethers } = (await network.create()) as any;
const [deployer] = await ethers.getSigners();
const sourceSignal = process.env.SOURCE_SIGNAL_ADDRESS;
if (!sourceSignal) throw new Error("SOURCE_SIGNAL_ADDRESS must be a deployed Sepolia MockDistressSignal address");
const gateway = await ethers.deployContract("AttestationGateway", [deployer.address]);
const overseer = await ethers.deployContract("Overseer", [await gateway.getAddress()]);
const factory = await ethers.deployContract("BulkheadFactory", [await overseer.getAddress()]);
await gateway.configure(await overseer.getAddress(), sourceSignal, 1);

const clusters = [];
for (const [clusterId, count] of [[1, 7], [2, 7], [3, 7]]) {
  await factory.createCluster(clusterId, count);
  await factory.finalizeCluster(clusterId);
  const bulkheads = await factory.cluster(clusterId);
  await overseer.registerCluster(clusterId, bulkheads);
  clusters.push({ clusterId, bulkheads });
}

console.log(JSON.stringify({
  deployer: deployer.address,
  gateway: await gateway.getAddress(),
  overseer: await overseer.getAddress(),
  factory: await factory.getAddress(),
  sourceSignal,
  sourceChainKey: 1,
  clusters,
}, null, 2));
