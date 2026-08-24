import { useEffect, useMemo, useState } from "react";

export function useProjectedYield(principal: bigint, rateBps: bigint, checkpoint: number, halted: boolean) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (halted) return;
    const timer = setInterval(() => tick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [halted]);
  return useMemo(() => {
    if (halted) return principal;
    const elapsed = BigInt(Math.max(0, Math.floor(Date.now() / 1000) - checkpoint));
    return principal + (principal * rateBps * elapsed) / 10_000n / 31_536_000n;
  }, [principal, rateBps, checkpoint, halted]);
}
