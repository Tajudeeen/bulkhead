import { network } from "hardhat";

const { ethers } = (await network.create()) as any;
const [deployer] = await ethers.getSigners();
const targetNetwork = await ethers.provider.getNetwork();
const expectedChainId = BigInt(process.env.CREDITCOIN_CHAIN_ID ?? "102031");
if (targetNetwork.chainId !== expectedChainId) {
  throw new Error(`CREDITCOIN_RPC_URL must use chain ${expectedChainId}, received chain ${targetNetwork.chainId}`);
}
const sourceSignal = process.env.SOURCE_SIGNAL_ADDRESS;
if (!sourceSignal) throw new Error("SOURCE_SIGNAL_ADDRESS must be a deployed Sepolia MockDistressSignal address");

const checked = async (label: string, transaction: any) => {
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${label} failed: ${transaction.hash}`);
  return { transactionHash: transaction.hash, blockNumber: receipt.blockNumber, receiptStatus: receipt.status };
};

const gateway = await ethers.deployContract("AttestationGateway", [deployer.address]);
await gateway.waitForDeployment();
const overseer = await ethers.deployContract("Overseer", [await gateway.getAddress()]);
await overseer.waitForDeployment();
const factory = await ethers.deployContract("BulkheadFactory", [await overseer.getAddress()]);
await factory.waitForDeployment();
const gatewayDeployment = await checked("Gateway deployment", gateway.deploymentTransaction());
const overseerDeployment = await checked("Overseer deployment", overseer.deploymentTransaction());
const factoryDeployment = await checked("Factory deployment", factory.deploymentTransaction());
const configuration = await checked(
  "Gateway configuration",
  await gateway.configure(await overseer.getAddress(), sourceSignal, 1),
);

const clusters = [];
for (const [clusterId, count] of [[1, 7], [2, 7], [3, 7]]) {
  const creation = await checked(`Cluster ${clusterId} creation`, await factory.createCluster(clusterId, count));
  const finalization = await checked(`Cluster ${clusterId} finalization`, await factory.finalizeCluster(clusterId));
  // Ethers v6 returns a read-only Result for dynamic arrays. Convert it before
  // passing the addresses back into a contract call; the ABI encoder mutates
  // arrays while resolving nested arguments.
  const bulkheads = Array.from(await factory.cluster(clusterId)) as string[];
  const registration = await checked(`Cluster ${clusterId} registration`, await overseer.registerCluster(clusterId, bulkheads));
  for (const bulkhead of bulkheads) {
    if (await ethers.provider.getCode(bulkhead) === "0x") throw new Error(`no bytecode at Bulkhead ${bulkhead}`);
  }
  clusters.push({ clusterId, bulkheads, creation, finalization, registration });
}

for (const [label, address] of [["gateway", await gateway.getAddress()], ["overseer", await overseer.getAddress()], ["factory", await factory.getAddress()]]) {
  if (await ethers.provider.getCode(address) === "0x") throw new Error(`no bytecode at ${label} ${address}`);
}

console.log(JSON.stringify({
  chainId: targetNetwork.chainId.toString(),
  deployer: deployer.address,
  gateway: await gateway.getAddress(),
  overseer: await overseer.getAddress(),
  factory: await factory.getAddress(),
  deployments: { gateway: gatewayDeployment, overseer: overseerDeployment, factory: factoryDeployment, configuration },
  sourceSignal,
  sourceChainKey: 1,
  clusters,
}, null, 2));
