# Architecture

Bulkheads hold isolated collateral and never query or call sibling Bulkheads. The Gateway verifies source-chain proofs through the USC precompile at `0x0FD2`, checks decoded receipt status equals `1`, and emits verified data. The Overseer is the only halt authority.

Risk formula: `halt(cluster) iff distressBps >= 2,000` (20%). The value is supplied by verified source-chain data; no EOA-callable force halt exists. The worker only fetches and submits proofs.

Trust boundaries: source-chain event -> proof builder -> Gateway/precompile -> Overseer -> Bulkhead. Gateway verification does not by itself imply source transaction success; receipt status is checked independently.
