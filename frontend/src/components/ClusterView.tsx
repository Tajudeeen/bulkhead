import React from "react";

export function ClusterView({ clusters }: { clusters: Array<{ id: bigint; bulkheads: Array<{ address: string; halted: boolean }> }> }) {
  return <main>{clusters.map((cluster) => <section key={cluster.id.toString()}><h2>Cluster {cluster.id.toString()}</h2><div>{cluster.bulkheads.map((unit) => <article key={unit.address}><code>{unit.address}</code><span>{unit.halted ? "Halted" : "Active"}</span></article>)}</div></section>)}</main>;
}
