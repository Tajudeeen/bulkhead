import { network } from "hardhat";

const PRECOMPILE = "0x0000000000000000000000000000000000000FD2";
const { ethers } = await network.create();
const [admin, attacker] = await ethers.getSigners();

const mock = await ethers.deployContract("MockPrecompile");
await ethers.provider.send("hardhat_setCode", [PRECOMPILE, await ethers.provider.getCode(await mock.getAddress())]);
const verifier = await ethers.getContractAt("MockPrecompile", PRECOMPILE);
await verifier.configure(true);

const gateway = await ethers.deployContract("AttestationGateway", [admin.address]);
const overseer = await ethers.deployContract("Overseer", [await gateway.getAddress()]);
const factory = await ethers.deployContract("BulkheadFactory", [await overseer.getAddress()]);
const signal = await ethers.deployContract("MockDistressSignal");
const wrongSignal = await ethers.deployContract("MockDistressSignal");
const encoder = await ethers.deployContract("MockReceiptEncoder");
const signalAddress = await signal.getAddress();

await gateway.configure(await overseer.getAddress(), signalAddress, 1);
await factory.createCluster(7, 2);
await factory.createCluster(8, 1);
const cluster7 = [...await factory.cluster(7)];
const cluster8 = [...await factory.cluster(8)];
await overseer.registerCluster(7, cluster7);
await overseer.registerCluster(8, cluster8);

const makeQuery = async (height, status, emitter, bulkhead, clusterId, distressBps) => ({
  chainKey: 1,
  height,
  encodedTransaction: await encoder.encode(status, emitter, bulkhead, clusterId, distressBps),
  merkleProof: { root: ethers.ZeroHash, siblings: [] },
  continuityProof: { lowerEndpointDigest: ethers.ZeroHash, roots: [] },
});

const expectRevert = async (label, action) => {
  try {
    await action();
    throw new Error(`${label}: expected revert`);
  } catch (error) {
    if (String(error?.message).includes("expected revert")) throw error;
    console.log(`PASS ${label}`);
  }
};

await expectRevert("direct EOA cannot invoke autonomous halt path", () =>
  overseer.connect(attacker).processVerifiedData(ethers.id("attack"), cluster7[0], 7, 9_999));
await expectRevert("failed source transaction status is rejected", async () =>
  gateway.verifyAndProcess(await makeQuery(101, 0, signalAddress, cluster7[0], 7, 9_999)));
await expectRevert("event from an unconfigured source contract is rejected", async () =>
  gateway.verifyAndProcess(await makeQuery(102, 1, await wrongSignal.getAddress(), cluster7[0], 7, 9_999)));

await gateway.verifyAndProcess(await makeQuery(103, 1, signalAddress, cluster7[0], 7, 1_999));
if (await (await ethers.getContractAt("Bulkhead", cluster7[0])).halted()) throw new Error("below threshold halted");
console.log("PASS below-threshold attested value leaves the target active");

await gateway.verifyAndProcess(await makeQuery(104, 1, signalAddress, cluster7[0], 7, 2_000));
const target = await ethers.getContractAt("Bulkhead", cluster7[0]);
const sibling = await ethers.getContractAt("Bulkhead", cluster7[1]);
const unrelated = await ethers.getContractAt("Bulkhead", cluster8[0]);
if (!(await target.halted())) throw new Error("target was not halted");
if (await sibling.halted()) throw new Error("sibling was incorrectly halted");
if (await unrelated.halted()) throw new Error("unrelated cluster was incorrectly halted");
console.log("PASS threshold crossing halts only the attested Bulkhead");

await verifier.configure(false);
await expectRevert("failed precompile verification is rejected", async () =>
  gateway.verifyAndProcess(await makeQuery(105, 1, signalAddress, cluster7[1], 7, 9_999)));
await verifier.configure(true);

await gateway.verifyBatch(await Promise.all(Array.from({ length: 7 }, (_, i) =>
  makeQuery(200 + i, 1, signalAddress, cluster7[1], 7, 500 + i))));
console.log("PASS seven queries verify in one batch call");
console.log("ALL LOCAL CONTRACT VERIFICATIONS PASSED");
