# bulkhead

Bulkhead Protocol is a Creditcoin / Attestcoin cross-chain risk-silo prototype.

It applies the established financial pattern of ring-fencing: each collateral
pool is isolated so a distress event cannot cascade across unrelated pools. The
contribution here is making that pattern cross-chain, attestation-driven, and
autonomous. RWA collateral supplies the lending pools, DeFi mechanics manage
deposits, and the deterministic Overseer evaluates verified source-chain data.

## Attestcoin integration

The off-chain worker watches Sepolia, uses the USC SDK `ProofBuilder` and
`PrecompileChainInfoProvider`, then submits proofs to the thin Gateway. The
Gateway calls the native verifier at `0x0FD2`, checks the source receipt status,
and emits verified data. The Overseer applies the published 2,000 bps distress
threshold and halts only the affected cluster. Seven Bulkheads fit in one USC
batch of up to ten queries.

## Repository

- `contracts/`: isolated Bulkheads, factory, Gateway, Overseer, and demo signal.
- `worker/`: dumb proof relayer with retry/error propagation.
- `frontend/`: cluster view and projected checkpoint yield hook; halt events
  freeze the displayed value.
- `docs/`: architecture, integration notes, and verification status.

Real testnet evidence is never inferred from local compilation. The current
workspace records the missing funded RPC/proof-builder prerequisite instead of
inventing transaction hashes or deployment addresses.

## Preview the dashboard

Install frontend dependencies once, then start Vite:

```powershell
npm install --prefix frontend
npm run frontend:dev -- --host 127.0.0.1
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/). The dashboard includes
three clusters, projected checkpoint-based accrual, and a local distress
simulation that freezes the selected cluster and displays the Overseer event.

For a production bundle, run `npm run frontend:build`; to serve that bundle,
run `npm run frontend:preview`.

The repository is being built in gated phases. Real testnet transaction hashes,
receipts, deployment addresses, and explorer links are recorded only after they
are independently verified.
