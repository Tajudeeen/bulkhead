# Bulkhead Protocol

This repository is the implementation workspace for the Bulkhead Protocol. Phase 0 dependency and tutorial references are kept in `.reference/usc-testnet-bridge-examples`.

## Current verification status

The local Hardhat toolchain and `@gluwa/usc-sdk` 0.18.0 (ethers 6.17) are installed. A real Sepolia-to-Creditcoin proof requires funded RPC credentials and remains pending until those are provided. No testnet hash or deployment address is recorded without receipt verification.

## Phase 1 local contract status

`Bulkhead` and `BulkheadFactory` compile with Solidity 0.8.24. Factory creation is permissionless, cluster membership is capped at seven instances, and each instance has an immutable Overseer address with no sibling references.

## Demo

On Sepolia, call `MockDistressSignal.emitDistress(clusterId, distressBps)`. A
value of `2000` or more is the published halt threshold. The worker watches the
event, submits the proof, and the Overseer evaluates the attested value.

Deployment addresses and explorer links are intentionally omitted until a real
receipt is checked.
