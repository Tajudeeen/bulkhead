# Bulkhead Protocol

This repository is the implementation workspace for the Bulkhead Protocol. Phase 0 dependency and tutorial references are kept in `.reference/usc-testnet-bridge-examples`.

## Current verification status

The local Hardhat toolchain and `@gluwa/usc-sdk` 0.18.0 (ethers 6.17) are installed. A real Sepolia-to-Creditcoin proof requires funded RPC credentials and remains pending until those are provided. No testnet hash or deployment address is recorded without receipt verification.

## Phase 1 local contract status

`Bulkhead` and `BulkheadFactory` compile with Solidity 0.8.24. Factory creation is permissionless, cluster membership is capped at seven instances, and each instance has an immutable Overseer address with no sibling references.

## Deployment and Demo

1. Deploy the source fixture to Sepolia with `npm run deploy:source` using
   `SOURCE_CHAIN_RPC_URL` and `SOURCE_CHAIN_PRIVATE_KEY`. Record its verified
   address as `SOURCE_SIGNAL_ADDRESS`.
2. Deploy the Creditcoin contracts with `npm run deploy:creditcoin`. The script
   configures the Gateway, creates and finalizes three seven-unit clusters, and
   registers those exact addresses with the Overseer.
3. On Sepolia, the authorized operator calls
   `MockDistressSignal.emitDistress(bulkhead, clusterId, distressBps)`. A value
   of `2000` or more is the published halt threshold. The worker waits for
   confirmations, submits the proof, and the Overseer evaluates the attested
   value.

The mock signal is a controlled demo fixture, not a production oracle. Its
operator key is the source-chain trust boundary and must be secured separately.

Deployment addresses and explorer links are intentionally omitted until a real
receipt is checked.
