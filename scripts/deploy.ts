import { network } from "hardhat";

const { ethers } = (await network.create()) as any;
const [deployer] = await ethers.getSigners();
const gateway = await ethers.deployContract("AttestationGateway", [deployer.address]);
const overseer = await ethers.deployContract("Overseer", [await gateway.getAddress()]);
const factory = await ethers.deployContract("BulkheadFactory", [await overseer.getAddress()]);
const signal = await ethers.deployContract("MockDistressSignal");
await gateway.configure(await overseer.getAddress(), await signal.getAddress(), 1);

console.log(JSON.stringify({
  deployer: deployer.address,
  gateway: await gateway.getAddress(),
  overseer: await overseer.getAddress(),
  factory: await factory.getAddress(),
  mockDistressSignal: await signal.getAddress(),
  sourceChainKey: 1,
}, null, 2));
