# Bulkhead Protocol

This repository is the implementation workspace for the Bulkhead Protocol. Phase 0 dependency and tutorial references are kept in `.reference/usc-testnet-bridge-examples`.

## Current verification status

The local Hardhat toolchain and `@gluwa/usc-sdk` 0.18.0 (ethers 6.17) are installed. Sepolia and Creditcoin deployments are live and independently checked. The remaining gate is a real Sepolia-to-Creditcoin proof submission and resulting halt receipt.

## Phase 1 local contract status

`Bulkhead` and `BulkheadFactory` compile with Solidity 0.8.24. Factory creation is operator-controlled, finalized cluster membership is capped at seven instances, and each instance has an immutable Overseer address with no sibling references.

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

If a worker run dead-letters an event after transient failures, restart once
with `RETRY_DEAD_LETTERS=true` to replay those persisted events after fixing the
underlying cause.

The mock signal is a controlled demo fixture, not a production oracle. Its
operator key is the source-chain trust boundary and must be secured separately.

## Verified Testnet Addresses

- Sepolia signal: `0xc2077302aA49D3a68fE014D805331F3FA995d653`
- Creditcoin Gateway: `0x2B38CC9b84Bd3a568ccc7817B10Dc98C8ABdAB36`
- Creditcoin Overseer: `0x91Ae69F87F5448A0c51c78246282a57CF7e610AE`
- Creditcoin Factory: `0x0Abda4Ef3B93C2D9fC3914925f1FA351c9a0CaE3`

The Factory has three finalized clusters of seven Bulkheads. Every Bulkhead's
`registeredClusterPlusOne` value was independently checked against its cluster.
