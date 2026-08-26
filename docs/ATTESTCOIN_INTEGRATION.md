# Attestcoin Integration

The official USC examples were cloned under `.reference/usc-testnet-bridge-examples` and inspected. Their proof flow uses `ProofBuilder`, `PrecompileChainInfoProvider`, and `PrecompileBlockProver`-compatible proof data, then submits to a contract that calls the native verifier at `0x0FD2`.

## Phase 0 evidence

The Sepolia demo signal was deployed successfully in transaction
`0x8e9d2734bfd3b148bb8363ca8f6161f89e12dfea98d3a4c6e97bd5a65cb7bff6`
at block `11564264`. Receipt status, runtime bytecode, contract address, and
operator state were independently checked.

## Phase 5 end-to-end evidence

The authorized Sepolia distress event was submitted in transaction
`0x5c7584225f917d2f0c22a05ab06e8b28887fa9374321f7ca5bcc7f43fdf400b1` at block
`11568054`, targeting `0x449aAc7131F6e31aa8FBFbc5a5C1F07EC14Baf80` in Cluster 1
with `2000` bps distress. The worker waited for Attestcoin finality, built the
proof, and submitted it to Creditcoin in transaction
`0x75695ce325d0ee9ad23ecf5b4d89518973a951274b2c0ddf053b4a642f513e31` at block
`5375042`. The Creditcoin receipt status was `1`, Gateway emitted `VerifiedData`,
and Overseer emitted `BulkheadHalted` with distress and threshold both `2000`.

The target Bulkhead is halted; its Cluster 1 sibling and a Cluster 2 Bulkhead
were independently checked and remain active.

## Current implementation boundary

The local verifier harness installs a mock at `0x0FD2`; it proves receipt-status,
source-log, target-registration, threshold, and batch-control paths, but it is
not evidence of a real Attestcoin transaction. The production worker requires
funded RPC credentials and waits for source confirmations before submitting;
the live demo above is evidence of the real precompile path.
