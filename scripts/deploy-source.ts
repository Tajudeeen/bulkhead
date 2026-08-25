import { readFileSync } from "node:fs";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";

const rpcUrl = process.env.SOURCE_CHAIN_RPC_URL;
const privateKey = process.env.SOURCE_CHAIN_PRIVATE_KEY;
if (!rpcUrl || !privateKey) throw new Error("SOURCE_CHAIN_RPC_URL and SOURCE_CHAIN_PRIVATE_KEY are required");

const provider = new JsonRpcProvider(rpcUrl);
const signer = new Wallet(privateKey, provider);
const artifact = JSON.parse(readFileSync("artifacts/contracts/mocks/MockDistressSignal.sol/MockDistressSignal.json", "utf8"));
const signal = await new ContractFactory(artifact.abi, artifact.bytecode, signer).deploy(await signer.getAddress());
await signal.waitForDeployment();
console.log(JSON.stringify({ chain: "sepolia", deployer: await signer.getAddress(), mockDistressSignal: await signal.getAddress() }, null, 2));
