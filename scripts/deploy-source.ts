import { readFileSync } from "node:fs";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";

const rpcUrl = process.env.SOURCE_CHAIN_RPC_URL;
const privateKey = process.env.SOURCE_CHAIN_PRIVATE_KEY;
if (!rpcUrl || !privateKey) throw new Error("SOURCE_CHAIN_RPC_URL and SOURCE_CHAIN_PRIVATE_KEY are required");

const provider = new JsonRpcProvider(rpcUrl);
const signer = new Wallet(privateKey, provider);
const network = await provider.getNetwork();
if (network.chainId !== 11_155_111n) {
  throw new Error(`SOURCE_CHAIN_RPC_URL must be Sepolia (chain 11155111), received chain ${network.chainId}`);
}
const artifact = JSON.parse(readFileSync("artifacts/contracts/mocks/MockDistressSignal.sol/MockDistressSignal.json", "utf8"));
const signal = await new ContractFactory(artifact.abi, artifact.bytecode, signer).deploy(await signer.getAddress());
const deployment = signal.deploymentTransaction();
if (!deployment) throw new Error("deployment transaction was not created");
const receipt = await deployment.wait();
if (!receipt || receipt.status !== 1) throw new Error(`Sepolia deployment failed: ${deployment.hash}`);
const address = await signal.getAddress();
const code = await provider.getCode(address);
if (code === "0x") throw new Error(`no bytecode found at deployed address ${address}`);
console.log(JSON.stringify({
  chain: "sepolia",
  chainId: network.chainId.toString(),
  deployer: await signer.getAddress(),
  transactionHash: deployment.hash,
  blockNumber: receipt.blockNumber,
  receiptStatus: receipt.status,
  mockDistressSignal: address,
  bytecodeBytes: (code.length - 2) / 2,
}, null, 2));
