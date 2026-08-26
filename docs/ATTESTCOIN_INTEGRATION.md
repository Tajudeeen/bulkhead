# Attestcoin Integration

The official USC examples were cloned under `.reference/usc-testnet-bridge-examples` and inspected. Their proof flow uses `ProofBuilder`, `PrecompileChainInfoProvider`, and `PrecompileBlockProver`-compatible proof data, then submits to a contract that calls the native verifier at `0x0FD2`.

## Phase 0 evidence

The Sepolia demo signal was deployed successfully in transaction
`0x8e9d2734bfd3b148bb8363ca8f6161f89e12dfea98d3a4c6e97bd5a65cb7bff6`
at block `11564264`. Receipt status, runtime bytecode, contract address, and
operator state were independently checked. The real Attestcoin proof and
Creditcoin halt transaction remain pending until the end-to-end demo below is run.

## Current implementation boundary

The local verifier harness installs a mock at `0x0FD2`; it proves receipt-status,
source-log, target-registration, threshold, and batch-control paths, but it is
not evidence of a real Attestcoin transaction. The production worker requires
funded RPC credentials and waits for source confirmations before submitting.
