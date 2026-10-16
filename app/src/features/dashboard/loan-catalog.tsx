"use client";
import { useState } from "react";
import type { DashboardData } from "./data";
import { formatUnits } from "../../lib/stellar/units";
import { loanLabels } from "./labels";

export function LoanCatalog({ loans, loading, canFund, locked, onFund }: { loans: DashboardData["loans"]; loading: boolean; canFund: boolean; locked: boolean; onFund: (id: string) => void }) {
  const [status, setStatus] = useState("Requested"); const [search, setSearch] = useState("");
  const visible = loans.filter(({ loan }) => (status === "all" || loan.status.tag === status) && (!search || loan.id.toString().includes(search.trim()) || loan.lot_id.toString().includes(search.trim())));
  return <section className="panel" aria-labelledby="loan-catalog-heading"><h2 id="loan-catalog-heading">Catálogo de financiamiento</h2><p>Los números vienen del indexador; las condiciones y estados se vuelven a consultar al contrato. Esta página no garantiza que una solicitud siga disponible ni recomienda financiarla.</p>
    <div className="catalog-filters"><div><label htmlFor="catalog-state">Mostrar préstamos</label><select id="catalog-state" value={status} onChange={event => setStatus(event.target.value)}><option value="Requested">Solicitudes sin financiar</option><option value="all">Todos los estados consultados</option>{Object.entries(loanLabels).filter(([key]) => key !== "Requested").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div><label htmlFor="catalog-search">Buscar por número de lote o préstamo</label><input id="catalog-search" inputMode="numeric" value={search} onChange={event => setSearch(event.target.value)} placeholder="Por ejemplo: 1" /></div></div>
    <div className="yc-pagegrid">{visible.map(({ loan }) => <article className="yc-card" key={loan.id.toString()}><h3>Solicitud #{loan.id.toString()}</h3><p>Lote #{loan.lot_id.toString()} · {loanLabels[loan.status.tag]}</p><dl><div><dt>Importe solicitado</dt><dd>{formatUnits(loan.principal)} USDC de prueba</dd></div><div><dt>Tasa anual informada</dt><dd>{loan.rate_bps / 100} %</dd></div><div><dt>Plazo</dt><dd>{loan.duration_secs % 86400n === 0n ? `${loan.duration_secs / 86400n} días` : `${loan.duration_secs} segundos`}</dd></div><div><dt>Cuenta solicitante</dt><dd className="address">{loan.borrower}</dd></div></dl><a href={`/lots/${loan.lot_id.toString()}`}>Revisar lote e historial</a>{canFund && loan.status.tag === "Requested" && <button className="yc-btn primary" disabled={locked || loading} onClick={() => onFund(loan.id.toString())}>Financiar con USDC de prueba</button>}</article>)}</div>
    {!visible.length && <p role="status">{loading ? "Consultando solicitudes…" : status === "Requested" ? "No hay solicitudes sin financiar en esta página consultada. Podés ver otros estados o cambiar de página." : "No hay préstamos que coincidan con esta búsqueda en la página consultada."}</p>}
  </section>;
}
