# Attestcoin Integration

The official USC examples were cloned under `.reference/usc-testnet-bridge-examples` and inspected. Their proof flow uses `ProofBuilder`, `PrecompileChainInfoProvider`, and `PrecompileBlockProver`-compatible proof data, then submits to a contract that calls the native verifier at `0x0FD2`.

## Phase 0 evidence

Pending: a funded Sepolia and Creditcoin testnet wallet, RPC URLs, and a real verified transaction receipt. This file intentionally contains no invented hash or explorer link.

## Current implementation boundary

The local verifier harness installs a mock at `0x0FD2`; it proves receipt-status,
source-log, target-registration, threshold, and batch-control paths, but it is
not evidence of a real Attestcoin transaction. The production worker requires
funded RPC credentials and waits for source confirmations before submitting.
