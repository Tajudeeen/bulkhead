# Architecture

Bulkheads hold isolated collateral and never query or call sibling Bulkheads. The Gateway verifies source-chain proofs through the USC precompile at `0x0FD2`, checks decoded receipt status equals `1`, and emits verified data. The Overseer is the only halt authority.

Risk formula: `halt(bulkhead) iff distressBps >= 2,000` (20%). The target Bulkhead, its cluster id, and the distress value are decoded from the single verified `DistressSignal(address,uint256,uint256)` receipt log emitted by the configured Sepolia signal contract. No caller can supply or override those risk inputs, and no EOA-callable force halt exists. The worker only fetches and submits proofs.

Trust boundaries: source-chain event -> proof builder -> Gateway/precompile -> Overseer -> Bulkhead. Gateway verification does not by itself imply source transaction success; receipt status is checked independently.

## Invariants reviewed

- Bulkhead: only immutable `overseer` can halt; halted units reject deposit and withdraw; withdrawals update accounting before the external call.
- Factory: each cluster is capped at seven; every deployment gets a fresh address and immutable cluster id.
- Gateway: at most ten queries per batch; failed precompile verification reverts; decoded receipt status must equal one; no risk decision is stored.
- Overseer: only the configured Gateway can process verified data; each query is processed once; values below 2,000 bps cannot halt; only the registered Bulkhead encoded in the attested event can halt.
- Worker: no threshold, cluster halt, or conditional submission rule exists; it only watches, builds, and submits proofs.
