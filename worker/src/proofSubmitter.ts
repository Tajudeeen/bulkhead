import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { proofProvider, chainInfo } from "@gluwa/usc-sdk";

export type ProofSubmitterConfig = {
  sourceChainKey: number;
  proofBuilderUrl: string;
  sourceRpcUrl: string;
  creditcoinRpcUrl: string;
  gatewayAddress: string;
  gatewayAbi: readonly string[];
  privateKey: string;
};

export async function buildProof(config: ProofSubmitterConfig, sourceTxHash: string) {
  const sourceRpc = new JsonRpcProvider(config.sourceRpcUrl);
  const creditcoinRpc = new JsonRpcProvider(config.creditcoinRpcUrl);
  const tx = await sourceRpc.getTransaction(sourceTxHash);
  if (!tx) throw new Error(`source transaction not found: ${sourceTxHash}`);
  if (tx.blockNumber === null) throw new Error(`source transaction is not mined: ${sourceTxHash}`);

  const info = new chainInfo.PrecompileChainInfoProvider(creditcoinRpc as any);
  await info.getLatestAttestedHeightAndHash(config.sourceChainKey);
  const builder = new proofProvider.service.ProofBuilder(config.sourceChainKey, config.proofBuilderUrl);
  await builder.waitUntilHeightAttested(config.sourceChainKey, tx.blockNumber, 15_000, 1_200_000);
  const result = await builder.getProof(sourceTxHash);
  if (!result.success || !result.data) throw new Error(`proof builder failed: ${result.error ?? "unknown error"}`);
  return result.data;
}

export async function submitProof(config: ProofSubmitterConfig, proof: any) {
  const provider = new JsonRpcProvider(config.creditcoinRpcUrl);
  const signer = new Wallet(config.privateKey, provider);
  const gateway = new Contract(config.gatewayAddress, config.gatewayAbi, signer);
  const tx = await gateway.verifyAndProcess({
    chainKey: proof.chainKey,
    height: proof.headerNumber,
    encodedTransaction: proof.txBytes,
    merkleProof: { root: proof.merkleProof.root, siblings: proof.merkleProof.siblings },
    continuityProof: {
      lowerEndpointDigest: proof.continuityProof.lowerEndpointDigest,
      roots: proof.continuityProof.roots,
    },
  });
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`gateway submission failed: ${tx.hash}`);
  return { hash: tx.hash, receipt };
}
