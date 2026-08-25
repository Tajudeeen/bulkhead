import { expect } from "chai";
import { network } from "hardhat";

describe("Bulkhead and factory", function () {
  async function setup() {
    const { ethers } = await network.create();
    const [owner, other] = await ethers.getSigners();
    const factory = await ethers.deployContract("BulkheadFactory", [owner.address]);
    await factory.createCluster(11, 2);
    const addresses = await factory.cluster(11);
    const a = await ethers.getContractAt("Bulkhead", addresses[0]);
    const b = await ethers.getContractAt("Bulkhead", addresses[1]);
    return { ethers, owner, other, factory, a, b };
  }

  it("allows only the Overseer to halt", async function () {
    const { other, a } = await setup();
    await expect(a.connect(other).halt()).to.be.revertedWithCustomError(a, "Unauthorized");
    await expect(a.halt()).to.emit(a, "Halted");
    expect(await a.halted()).to.equal(true);
  });

  it("rejects deposits and withdrawals after halt", async function () {
    const { a } = await setup();
    await a.deposit({ value: 1000n });
    await a.halt();
    await expect(a.deposit({ value: 1n })).to.be.revertedWithCustomError(a, "BulkheadHalted");
    await expect(a.withdraw(1n)).to.be.revertedWithCustomError(a, "BulkheadHalted");
  });

  it("keeps different clusters isolated with no sibling references", async function () {
    const { ethers, owner, a } = await setup();
    const secondFactory = await ethers.deployContract("BulkheadFactory", [owner.address]);
    await secondFactory.createCluster(12, 1);
    expect(await a.clusterId()).to.equal(11n);
    expect(await a.overseer()).to.equal(owner.address);
  });

  it("prevents unauthorized factory mutation and requires finalization", async function () {
    const { owner, other, factory } = await setup();
    await expect(factory.connect(other).createBulkhead(11)).to.be.revertedWithCustomError(factory, "Unauthorized");
    await factory.finalizeCluster(11);
    await expect(factory.createBulkhead(11)).to.be.revertedWithCustomError(factory, "ClusterFinalized");
  });

  it("restricts the demo distress source and bounds basis points", async function () {
    const { ethers, owner, other } = await setup();
    const signal = await ethers.deployContract("MockDistressSignal", [owner.address]);
    await expect(signal.connect(other).emitDistress(owner.address, 11, 2_000))
      .to.be.revertedWithCustomError(signal, "Unauthorized");
    await expect(signal.emitDistress(owner.address, 11, 10_001)).to.be.revertedWith("bps out of range");
  });
});
