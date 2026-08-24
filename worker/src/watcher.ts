import { Contract, JsonRpcProvider } from "ethers";

export async function watchDistressSignal(
  rpcUrl: string,
  signalAddress: string,
  signalAbi: readonly string[],
  fromBlock: number,
  onTransaction: (txHash: string) => Promise<void>
) {
  const provider = new JsonRpcProvider(rpcUrl);
  const signal = new Contract(signalAddress, signalAbi, provider);
  let nextBlock = fromBlock;
  for (;;) {
    try {
      const current = await provider.getBlockNumber();
      if (current >= nextBlock) {
        const events = await signal.queryFilter("DistressSignal", nextBlock, current);
        for (const event of events) await onTransaction(event.transactionHash);
        nextBlock = current + 1;
      }
    } catch (error) {
      console.error("watcher RPC failure; retrying", error);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}
