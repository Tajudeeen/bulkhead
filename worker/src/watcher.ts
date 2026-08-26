import { Contract, JsonRpcProvider } from "ethers";
import { readFile, rename, writeFile } from "node:fs/promises";

type WatcherState = { nextBlock: number; processed: string[]; deadLetters: string[] };

async function loadState(path: string, fromBlock: number): Promise<WatcherState> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<WatcherState>;
    return {
      nextBlock: Math.max(fromBlock, Number.isSafeInteger(parsed.nextBlock) ? parsed.nextBlock! : fromBlock),
      processed: Array.isArray(parsed.processed) ? parsed.processed.filter((value): value is string => typeof value === "string") : [],
      deadLetters: Array.isArray(parsed.deadLetters) ? parsed.deadLetters.filter((value): value is string => typeof value === "string") : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("worker state could not be read; starting from configured block", error);
    return { nextBlock: fromBlock, processed: [], deadLetters: [] };
  }
}

async function saveState(path: string, state: WatcherState) {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function watchDistressSignal(
  rpcUrl: string,
  signalAddress: string,
  signalAbi: readonly string[],
  fromBlock: number,
  onTransaction: (txHash: string) => Promise<void>,
  options: { confirmations?: number; pollMs?: number; maxAttempts?: number; statePath?: string; reorgLookback?: number; retryDeadLetters?: boolean } = {},
) {
  if (!rpcUrl) throw new Error("source RPC URL is required");
  if (!signalAddress) throw new Error("distress signal address is required");
  if (!Number.isSafeInteger(fromBlock) || fromBlock < 0) throw new Error("START_BLOCK must be a non-negative integer");
  const confirmations = options.confirmations ?? 3;
  const pollMs = options.pollMs ?? 5_000;
  const maxAttempts = options.maxAttempts ?? 5;
  const statePath = options.statePath ?? ".worker-state.json";
  const reorgLookback = options.reorgLookback ?? confirmations + 2;
  const retryDeadLetters = options.retryDeadLetters ?? false;
  if (!Number.isSafeInteger(confirmations) || confirmations < 0) throw new Error("confirmations must be non-negative");
  const provider = new JsonRpcProvider(rpcUrl);
  const signal = new Contract(signalAddress, signalAbi, provider);
  const state = await loadState(statePath, fromBlock);
  const seen = new Set(state.processed);
  const deadLetters = new Set(state.deadLetters);
  for (;;) {
    try {
      const current = await provider.getBlockNumber();
      const finalized = current - confirmations;
      if (finalized >= state.nextBlock) {
        const scanFrom = Math.max(fromBlock, state.nextBlock - reorgLookback);
        const events = await signal.queryFilter("DistressSignal", scanFrom, finalized);
        for (const event of events) {
          const logIndex = "index" in event && typeof event.index === "number" ? event.index : -1;
          const blockHash = "blockHash" in event ? String(event.blockHash) : "unknown";
          const eventId = `${blockHash}:${event.transactionHash}:${logIndex}`;
          if (seen.has(eventId) || (deadLetters.has(eventId) && !retryDeadLetters)) continue;
          let attempt = 0;
          let delivered = false;
          while (!delivered && attempt < maxAttempts) {
            attempt++;
            try {
              await onTransaction(event.transactionHash);
              delivered = true;
            } catch (error) {
              if (attempt >= maxAttempts) {
                console.error(`dead-lettering distress event ${eventId} after ${attempt} attempts`, error);
                deadLetters.add(eventId);
                break;
              }
              const delay = Math.min(60_000, 2_000 * 2 ** (attempt - 1));
              console.error(`proof submission failed for ${eventId}; retry ${attempt}/${maxAttempts}`, error);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
          if (delivered) {
            seen.add(eventId);
            deadLetters.delete(eventId);
          }
          state.processed = [...seen];
          state.deadLetters = [...deadLetters];
          await saveState(statePath, state);
        }
        state.nextBlock = finalized + 1;
        await saveState(statePath, state);
      }
    } catch (error) {
      console.error("watcher RPC failure; retrying", error);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
