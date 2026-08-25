import { expect } from "chai";
import { network } from "hardhat";

describe("Overseer security invariants", function () {
  async function setup() {
    const { ethers } = await network.create();
    const [admin, attacker] = await ethers.getSigners();
    const gateway = await ethers.deployContract("AttestationGateway", [admin.address]);
    const overseer = await ethers.deployContract("Overseer", [await gateway.getAddress()]);
    const factory = await ethers.deployContract("BulkheadFactory", [await overseer.getAddress()]);
    await factory.createCluster(7, 2);
    await factory.finalizeCluster(7);
    const bulkheads = [...await factory.cluster(7)];
    await overseer.registerCluster(7, bulkheads);
    return { ethers, admin, attacker, gateway, overseer, bulkheads };
  }

  it("rejects direct EOA calls to the autonomous halt path", async function () {
    const { ethers, attacker, overseer, bulkheads } = await setup();
    await expect(overseer.connect(attacker).processVerifiedData(ethers.id("attack"), bulkheads[0], 7, 9_999))
      .to.be.revertedWith("only gateway");
  });

  it("rejects an unregistered Bulkhead even if it claims the same cluster", async function () {
    const { ethers, admin, gateway, overseer } = await setup();
    const outsider = await ethers.deployContract("Bulkhead", [7, await overseer.getAddress()]);
    await expect(overseer.connect(admin).processVerifiedData(ethers.id("outsider"), await outsider.getAddress(), 7, 9_999))
      .to.be.revertedWith("only gateway");
    expect(await outsider.halted()).to.equal(false);
    expect(await gateway.overseer()).to.equal(ethers.ZeroAddress);
  });

  it("allows Gateway configuration only once by its admin", async function () {
    const { ethers, admin, attacker, gateway, overseer } = await setup();
    const signal = await ethers.deployContract("MockDistressSignal", [await admin.getAddress()]);
    await expect(gateway.connect(attacker).configure(await overseer.getAddress(), await signal.getAddress(), 1))
      .to.be.revertedWithCustomError(gateway, "Unauthorized");
    await gateway.configure(await overseer.getAddress(), await signal.getAddress(), 1);
    await expect(gateway.configure(await overseer.getAddress(), await signal.getAddress(), 1))
      .to.be.revertedWithCustomError(gateway, "AlreadyConfigured");
  });
});
