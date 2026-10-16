"use client";
import { useEffect, useState } from "react";
import { readDashboard, emptyDashboard, type DashboardData } from "../dashboard/data";
import { physicalLabels, receiptLabels, loanLabels, eventLabels } from "../dashboard/labels";
import { getLoan, getDebt } from "../../lib/stellar/query";
import { formatUnits } from "../../lib/stellar/units";
import { LotShare } from "./share";

export function PublicLot({ id, enabled, mismatch, registry, vault }: { id: string; enabled: boolean; mismatch: boolean; registry?: string; vault?: string }) {
  const [data, setData] = useState<DashboardData>(emptyDashboard); const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0); const [financial, setFinancial] = useState("");
  useEffect(() => {
    let active = true; if (!enabled || mismatch) return;
    setLoading(true); setData(emptyDashboard()); setFinancial("");
    readDashboard([id], []).then(async result => {
      if (!active) return; setData(result);
      const lot = result.lots[0];
      if (lot?.loan_id != null) {
        try {
          const [loan, debt] = await Promise.all([getLoan(lot.loan_id), getDebt(lot.loan_id)]);
          if (active) setFinancial(`${loanLabels[loan.status.tag] ?? loan.status.tag} · ${formatUnits(debt)} USDC de prueba${loan.status.tag === "Liquidated" ? " (saldo histórico, no cobrable nuevamente)" : " de deuda consultada"}`);
        } catch { if (active) setFinancial("No se pudo consultar el préstamo vinculado. Volvé a actualizar."); }
      } else if (active && lot) setFinancial("Sin préstamo vinculado actualmente. Esto no borra los préstamos anteriores del historial.");
    }).catch(() => { if (active) setFinancial("No se pudo completar la consulta de Testnet."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, enabled, mismatch, refresh]);
  const lot = data.lots[0];
  return <>
    <a href="#public-main" className="skip">Ir al contenido</a>
    <header><a href="/" className="brand">YerbaCapital</a><span className="tag">Consulta pública · Testnet</span></header>
    <main id="public-main"><section className="intro"><p className="eyebrow">Yerba canchada · Registro de demostración</p><h1>Lote #{id}</h1><p className="principle"><strong>El token no es la yerba.</strong> El registro permite comprobar autoría e integridad de los datos; no garantiza existencia, calidad, ubicación ni recuperación física de la mercadería.</p></section>
      {mismatch ? <p role="alert" className="error">Este enlace corresponde a otros contratos de Testnet. No se muestran datos de un despliegue distinto como si fueran el mismo lote. Pedí un enlace actualizado al equipo.</p> : !enabled ? <p className="muted">La consulta a Testnet está desactivada en este entorno. No se muestran estados de reemplazo.</p> : <>
        <button disabled={loading} onClick={() => setRefresh(value => value + 1)}>{loading ? "Consultando lote…" : "Actualizar lote"}</button>
        {data.issues.length > 0 && <div role="alert"><p>La consulta está incompleta:</p><ul>{data.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
        {lot ? <section className="panel" aria-labelledby="public-state"><h2 id="public-state">Estado actual consultado</h2><dl><div><dt>Estado físico de la mercadería</dt><dd>{physicalLabels[lot.physical_status.tag]} · {new Intl.NumberFormat("es-AR").format(lot.net_kg)} kg · Humedad {lot.moisture_bps / 100} %</dd></div><div><dt>Estado del certificado</dt><dd>{receiptLabels[lot.receipt_status.tag]}</dd></div><div><dt>Estado financiero</dt><dd>{financial || "Consultando préstamo…"}</dd></div><div><dt>Titular del certificado</dt><dd className="address">{lot.owner}</dd></div></dl><p className="muted">Un certificado libre no rehabilita una mercadería deteriorada. Un incumplimiento o reclamo digital no ejecuta la entrega física de yerba.</p></section> : !loading && <p>No se pudo obtener el lote. Eso no demuestra que no exista; revisá el número o volvé a consultar.</p>}
        <section className="panel" aria-labelledby="public-history"><h2 id="public-history">Historia del lote</h2>{data.coverage[id] && <p className="muted">Cobertura disponible: bloques {data.coverage[id].fromLedger} a {data.coverage[id].nextLedger - 1}. Actualizado: {data.coverage[id].updatedAt ? new Date(data.coverage[id].updatedAt).toLocaleString("es-AR") : "sin fecha informada"}.</p>}<p>Se muestran los registros disponibles del indexador, que pueden demorar o tener faltantes. El estado actual se consulta al contrato.</p>{data.events.length ? <ol className="timeline">{data.events.slice().reverse().map(event => <li key={event.id}><strong>{event.label ?? eventLabels[event.name] ?? "Registro del lote"}</strong><p>{new Date(event.closedAt).toLocaleString("es-AR")}</p><a target="_blank" rel="noreferrer" href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}>Ver transacción confirmada</a>{event.evidence && <p className="address">Código de comprobante: {event.evidence}<br /><a href={`/api/evidence/${event.evidence}`}>Descargar comprobante por código</a></p>}<details><summary>Datos técnicos del registro</summary>{event.name} · Bloque {event.ledger}</details></li>)}</ol> : <p>{loading ? "Consultando historial…" : "No hay registros disponibles para esta consulta."}</p>}</section>
      </>}
      {!mismatch && <LotShare id={id} registry={registry} vault={vault} />}
    </main><footer>Solo datos y activo sintéticos de Testnet. No es una oferta de inversión.</footer>
  </>;
}
