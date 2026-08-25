import { useEffect, useMemo, useState } from "react";

type Unit = {
  id: string;
  principal: number;
  rateBps: number;
  checkpoint: number;
  halted: boolean;
};

type Cluster = { id: number; source: string; units: Unit[] };

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
  const [selectedId, setSelectedId] = useState(1);
  const [clock, setClock] = useState(now);
  const [lastHalt, setLastHalt] = useState<{ clusterId: number; at: number } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = clusters.find((cluster) => cluster.id === selectedId)!;
  const allUnits = clusters.flatMap((cluster) => cluster.units);
  const totalPrincipal = allUnits.reduce((sum, unit) => sum + unit.principal, 0);
  const activeUnits = allUnits.filter((unit) => !unit.halted).length;
  const haltedUnits = allUnits.length - activeUnits;
  const selectedProjected = selected.units.reduce((sum, unit) => sum + projectedValue(unit, clock), 0);

  const triggerDistress = () => {
    setClusters((current) => current.map((cluster) => cluster.id === selectedId
      ? { ...cluster, units: cluster.units.map((unit) => ({ ...unit, halted: true })) }
      : cluster));
    setLastHalt({ clusterId: selectedId, at: Math.floor(Date.now() / 1000) });
  };

  const resetDemo = () => {
    setClusters(initialClusters.map((cluster) => ({ ...cluster, units: cluster.units.map((unit) => ({ ...unit, halted: false })) })));
    setLastHalt(null);
  };

  const statusLabel = useMemo(() => selected.units.every((unit) => unit.halted) ? "Halted by Overseer" : "Operating normally", [selected]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark">B</div><div><p className="eyebrow">ATTESTCOIN / CREDITCOIN</p><h1>Bulkhead control room</h1></div></div>
        <div className="network-state"><span className="pulse-dot" /> <span>Testnet connected</span><span className="network-divider" /> <span className="mono">CC3</span></div>
      </header>

      <main className="content">
        <section className="intro-row"><div><p className="eyebrow">AUTONOMOUS RISK CONTAINMENT</p><h2>Watch the silos. See the halt.</h2><p className="intro-copy">Projected accrual is anchored to each unit's last attested checkpoint. The counter stops only when the Overseer's on-chain halt event arrives.</p></div><div className="intro-actions"><button className="secondary-button" onClick={resetDemo}>Reset demo</button><button className="primary-button" onClick={triggerDistress}>Simulate attested distress</button></div></section>

        <section className="metric-grid"><Metric label="Total principal" value={money.format(totalPrincipal)} detail="30 active vaults" /><Metric label="Active bulkheads" value={String(activeUnits).padStart(2, "0")} detail="Across 3 clusters" /><Metric label="Halted units" value={String(haltedUnits).padStart(2, "0")} detail={haltedUnits ? "Containment engaged" : "No halt events"} tone={haltedUnits ? "danger" : "normal"} /><Metric label="Published threshold" value="20.00%" detail="2,000 bps distress" tone="amber" /></section>

        <section className="workspace-grid"><aside className="cluster-rail"><div className="section-heading"><div><p className="eyebrow">FLEET VIEW</p><h3>Clusters</h3></div><span className="count-badge">3</span></div>{clusters.map((cluster) => { const halted = cluster.units.every((unit) => unit.halted); return <button key={cluster.id} className={`cluster-tab ${selectedId === cluster.id ? "selected" : ""}`} onClick={() => setSelectedId(cluster.id)}><span className={`cluster-icon ${halted ? "halted" : ""}`}>{String(cluster.id).padStart(2, "0")}</span><span className="cluster-meta"><strong>Cluster {cluster.id}</strong><small>{cluster.source}</small></span><span className={`status-dot ${halted ? "red" : "green"}`} /></button>; })}<div className="rail-note"><span className="lock-icon">◎</span><p><strong>Overseer is isolated</strong><br />Bulkheads never query siblings.</p></div></aside>

          <div className="detail-pane"><div className="detail-header"><div><div className="title-line"><h3>Cluster {selected.id}</h3><span className={`status-chip ${selected.units.every((unit) => unit.halted) ? "halted" : "active"}`}>{statusLabel}</span></div><p>{selected.source} <span className="dot-separator">·</span> 7 compartments <span className="dot-separator">·</span> last checkpoint {Math.max(1, Math.floor((clock - Math.min(...selected.units.map((unit) => unit.checkpoint))) / 60))}m ago</p></div><div className="cluster-total"><span>Projected cluster value</span><strong>{money.format(selectedProjected)}</strong></div></div>
            <div className="unit-grid">{selected.units.map((unit, index) => <UnitCard key={unit.id} unit={unit} index={index} clock={clock} />)}</div>
            {lastHalt?.clusterId === selected.id && <div className="event-banner"><span className="event-icon">!</span><div><strong>Overseer halt event received</strong><p>Cluster {selected.id} counters frozen at attested checkpoint · block {lastHalt.at.toString().slice(-6)}</p></div><span className="event-time">just now</span></div>}
          </div></section>
      </main>
      <footer><span>Bulkhead Protocol</span><span>Projected accrual · checkpoint anchored</span><span className="mono">{new Date(clock * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} UTC</span></footer>
    </div>
  );
}

function Metric({ label, value, detail, tone = "normal" }: { label: string; value: string; detail: string; tone?: string }) { return <div className="metric"><span className="metric-label">{label}</span><strong className={`metric-value ${tone}`}>{value}</strong><span className="metric-detail">{detail}</span></div>; }

function UnitCard({ unit, index, clock }: { unit: Unit; index: number; clock: number }) {
  const value = projectedValue(unit, clock);
  const elapsed = Math.max(0, clock - unit.checkpoint);
  return <article className={`unit-card ${unit.halted ? "halted" : ""}`}><div className="unit-card-head"><span className="unit-number">{String(index + 1).padStart(2, "0")}</span><span className={`unit-state ${unit.halted ? "halted" : "active"}`}>{unit.halted ? "Frozen" : "Live"}</span></div><div className="unit-id">{unit.id}</div><strong className="unit-value">{money.format(value)}</strong><div className="unit-meta"><span>Rate <b>{(unit.rateBps / 100).toFixed(2)}%</b></span><span>+{Math.floor(elapsed / 60)}m</span></div><div className="progress-track"><div className={`progress-fill ${unit.halted ? "halted" : ""}`} style={{ width: `${Math.min(96, 48 + index * 6)}%` }} /></div></article>;
}
