import { useEffect, useMemo, useState } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import { MultiverseField } from "./components/MultiverseField";

type Unit = {
  id: string;
  principal: number;
  rateBps: number;
  checkpoint: number;
  halted: boolean;
};

type Cluster = { id: number; source: string; units: Unit[] };

const LIVE_RPC_URL = import.meta.env.VITE_CREDITCOIN_RPC_URL as string | undefined;
const LIVE_OVERSEER = import.meta.env.VITE_OVERSEER_ADDRESS as string | undefined;
const LIVE_FACTORY = import.meta.env.VITE_FACTORY_ADDRESS as string | undefined;
const LIVE_SOURCE = import.meta.env.VITE_SOURCE_LABEL as string | undefined;
const LIVE_CLUSTER_IDS = (import.meta.env.VITE_CLUSTER_IDS as string | undefined ?? "1,2,3")
  .split(",").map((value) => Number(value.trim())).filter((value) => Number.isSafeInteger(value));
const liveEnabled = Boolean(LIVE_RPC_URL && LIVE_OVERSEER && LIVE_FACTORY);
const bulkheadAbi = ["function halted() view returns (bool)", "function clusterId() view returns (uint256)"];
const factoryAbi = ["function cluster(uint256) view returns (address[])"];
const overseerAbi = [
  "event BulkheadHalted(address indexed bulkhead,uint256 indexed clusterId,bytes32 indexed queryId,uint256 distressBps,uint256 thresholdBps)",
];

const now = Math.floor(Date.now() / 1000);
const initialClusters: Cluster[] = [1, 2, 3].map((clusterId) => ({
  id: clusterId,
  source: clusterId === 1 ? "Sepolia / RWA-01" : clusterId === 2 ? "Sepolia / RWA-02" : "Sepolia / RWA-03",
  units: Array.from({ length: 7 }, (_, index) => ({
    id: `BH-${clusterId}-${String(index + 1).padStart(2, "0")}`,
    principal: 10_000 + clusterId * 1_250 + index * 380,
    rateBps: 625 + index * 12,
    checkpoint: now - index * 41,
    halted: false,
  })),
}));

const projectedValue = (unit: Unit, at: number) => {
  if (unit.halted) return unit.principal;
  const elapsed = Math.max(0, at - unit.checkpoint);
  return unit.principal + (unit.principal * unit.rateBps * elapsed) / 10_000 / 31_536_000;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default function App() {
  const [clusters, setClusters] = useState(initialClusters);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(1);
  const [clock, setClock] = useState(now);
  const [lastHalt, setLastHalt] = useState<{ clusterId: number; at: number; unitId: string } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!liveEnabled) return;
    let disposed = false;
    const provider = new JsonRpcProvider(LIVE_RPC_URL!);
    const factory = new Contract(LIVE_FACTORY!, factoryAbi, provider);
    const overseer = new Contract(LIVE_OVERSEER!, overseerAbi, provider);
    const refresh = async () => {
      try {
        const liveClusters: Cluster[] = [];
        for (const id of LIVE_CLUSTER_IDS) {
          const addresses = await factory.cluster(id) as string[];
          const units = await Promise.all(addresses.map(async (address, index) => {
            const unit = new Contract(address, bulkheadAbi, provider);
            return { id: address.slice(0, 10), principal: 0, rateBps: 0, checkpoint: Math.floor(Date.now() / 1000), halted: Boolean(await unit.halted()) } satisfies Unit;
          }));
          liveClusters.push({ id, source: LIVE_SOURCE ?? "Creditcoin / live", units });
        }
        if (!disposed) setClusters(liveClusters);
      } catch (error) {
        if (!disposed) setLiveError(error instanceof Error ? error.message : String(error));
      }
    };
    const onHalt = (...args: unknown[]) => {
      const bulkhead = String(args[0]);
      const clusterId = Number(args[1]);
      const payload = args[args.length - 1] as { blockNumber?: number; log?: { blockNumber?: number } } | undefined;
      setClusters((current) => current.map((cluster) => cluster.id === Number(clusterId)
        ? { ...cluster, units: cluster.units.map((unit) => unit.id.toLowerCase() === bulkhead.slice(0, 10).toLowerCase() ? { ...unit, halted: true } : unit) }
        : cluster));
      setLastHalt({ clusterId, at: payload?.blockNumber ?? payload?.log?.blockNumber ?? 0, unitId: bulkhead.slice(0, 10) });
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    overseer.on("BulkheadHalted", onHalt);
    return () => { disposed = true; window.clearInterval(timer); overseer.off("BulkheadHalted", onHalt); void provider.destroy(); };
  }, []);

  const selected = clusters.find((cluster) => cluster.id === selectedId) ?? clusters[0];
  const allUnits = clusters.flatMap((cluster) => cluster.units);
  const totalPrincipal = allUnits.reduce((sum, unit) => sum + unit.principal, 0);
  const activeUnits = allUnits.filter((unit) => !unit.halted).length;
  const haltedUnits = allUnits.length - activeUnits;
  const selectedProjected = selected.units.reduce((sum, unit) => sum + projectedValue(unit, clock), 0);

  const triggerDistress = () => {
    const targetIndex = selected.units.findIndex((unit) => !unit.halted);
    if (targetIndex < 0) return;
    setClusters((current) => current.map((cluster) => cluster.id === selectedId
      ? { ...cluster, units: cluster.units.map((unit, index) => index === targetIndex ? { ...unit, halted: true } : unit) }
      : cluster));
    setLastHalt({ clusterId: selectedId, at: Math.floor(Date.now() / 1000), unitId: selected.units[targetIndex].id });
  };

  const resetDemo = () => {
    setClusters(initialClusters.map((cluster) => ({ ...cluster, units: cluster.units.map((unit) => ({ ...unit, halted: false })) })));
    setLastHalt(null);
  };

  const statusLabel = useMemo(() => selected.units.every((unit) => unit.halted) ? "Halted by Overseer" : "Operating normally", [selected]);

  return (
    <div className="app-shell">
      <MultiverseField />
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark">B</div><div><p className="eyebrow">ATTESTCOIN / CREDITCOIN</p><h1>Bulkhead control room</h1></div></div>
        <div className="network-state"><span className="pulse-dot" /> <span>{liveEnabled ? "Live read-only" : "Preview mode"}</span><span className="network-divider" /> <span className="mono">{liveEnabled ? "CC3" : "LOCAL"}</span></div>
      </header>

      <main className="content">
        <section className="intro-row"><div><p className="eyebrow">AUTONOMOUS RISK CONTAINMENT</p><h2>Watch the silos. See the halt.</h2><p className="intro-copy">{liveEnabled ? "Live halt state is read from Creditcoin. Yield remains unavailable until an attested checkpoint feed is configured." : "Preview only: projected values use fixture checkpoints. A simulated halt freezes one fixture unit; no wallet or chain transaction is sent."}</p>{liveError && <p className="error-copy">Live read failed: {liveError}</p>}</div><div className="intro-actions">{!liveEnabled && <><button className="secondary-button" onClick={resetDemo}>Reset demo</button><button className="primary-button" onClick={triggerDistress}>Simulate preview halt</button></>}</div></section>

        <section className="metric-grid"><Metric label="Total principal" value={liveEnabled ? "N/A" : money.format(totalPrincipal)} detail={liveEnabled ? "Not stored by current vault" : `${activeUnits} fixture vaults`} /><Metric label="Active bulkheads" value={String(activeUnits).padStart(2, "0")} detail={liveEnabled ? "Read from chain" : "Across 3 fixture clusters"} /><Metric label="Halted units" value={String(haltedUnits).padStart(2, "0")} detail={haltedUnits ? "Containment engaged" : "No halt events"} tone={haltedUnits ? "danger" : "normal"} /><Metric label="Published threshold" value="20.00%" detail="2,000 bps distress" tone="amber" /></section>

        <section className="workspace-grid"><aside className="cluster-rail"><div className="section-heading"><div><p className="eyebrow">FLEET VIEW</p><h3>Clusters</h3></div><span className="count-badge">3</span></div>{clusters.map((cluster) => { const halted = cluster.units.every((unit) => unit.halted); return <button key={cluster.id} className={`cluster-tab ${selectedId === cluster.id ? "selected" : ""}`} onClick={() => setSelectedId(cluster.id)}><span className={`cluster-icon ${halted ? "halted" : ""}`}>{String(cluster.id).padStart(2, "0")}</span><span className="cluster-meta"><strong>Cluster {cluster.id}</strong><small>{cluster.source}</small></span><span className={`status-dot ${halted ? "red" : "green"}`} /></button>; })}<div className="rail-note"><span className="lock-icon">◎</span><p><strong>Overseer is isolated</strong><br />Bulkheads never query siblings.</p></div></aside>

          <div className="detail-pane"><div className="detail-header"><div><div className="title-line"><h3>Cluster {selected.id}</h3><span className={`status-chip ${selected.units.every((unit) => unit.halted) ? "halted" : "active"}`}>{statusLabel}</span></div><p>{selected.source} <span className="dot-separator">·</span> 7 compartments <span className="dot-separator">·</span> last checkpoint {Math.max(1, Math.floor((clock - Math.min(...selected.units.map((unit) => unit.checkpoint))) / 60))}m ago</p></div><div className="cluster-total"><span>Projected cluster value</span><strong>{money.format(selectedProjected)}</strong></div></div>
            <div className="unit-grid">{selected.units.map((unit, index) => <UnitCard key={unit.id} unit={unit} index={index} clock={clock} live={liveEnabled} />)}</div>
            {lastHalt?.clusterId === selected.id && <div className="event-banner"><span className="event-icon">!</span><div><strong>{liveEnabled ? "Overseer halt event received" : "Preview halt simulated"}</strong><p>{lastHalt.unitId} {liveEnabled ? `halted on-chain · block ${lastHalt.at}` : "fixture projection frozen locally"}</p></div><span className="event-time">just now</span></div>}
          </div></section>
      </main>
      <footer><span>Bulkhead Protocol</span><span>Projected accrual · checkpoint anchored</span><span className="mono">{new Date(clock * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} UTC</span></footer>
    </div>
  );
}

function Metric({ label, value, detail, tone = "normal" }: { label: string; value: string; detail: string; tone?: string }) { return <div className="metric"><span className="metric-label">{label}</span><strong className={`metric-value ${tone}`}>{value}</strong><span className="metric-detail">{detail}</span></div>; }

function UnitCard({ unit, index, clock, live }: { unit: Unit; index: number; clock: number; live: boolean }) {
  const value = projectedValue(unit, clock);
  const elapsed = Math.max(0, clock - unit.checkpoint);
  return <article className={`unit-card ${unit.halted ? "halted" : ""}`}><div className="unit-card-head"><span className="unit-number">{String(index + 1).padStart(2, "0")}</span><span className={`unit-state ${unit.halted ? "halted" : "active"}`}>{unit.halted ? "Halted" : "Active"}</span></div><div className="unit-id">{unit.id}</div><strong className="unit-value">{live ? (unit.halted ? "Halted" : "On-chain") : money.format(value)}</strong><div className="unit-meta">{live ? <span>Read-only state</span> : <><span>Rate <b>{(unit.rateBps / 100).toFixed(2)}%</b></span><span>+{Math.floor(elapsed / 60)}m</span></>}</div><div className="progress-track"><div className={`progress-fill ${unit.halted ? "halted" : ""}`} style={{ width: `${Math.min(96, 48 + index * 6)}%` }} /></div></article>;
}
