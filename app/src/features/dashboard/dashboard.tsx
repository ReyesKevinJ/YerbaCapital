"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Activity, ArrowUpRight, Blocks, Box, ClipboardCheck, Clock3, ExternalLink, FileCheck2, FlaskConical, HandCoins, LayoutDashboard, Leaf, Plus, RefreshCw, ShieldCheck, WalletCards, Warehouse, type LucideIcon } from "lucide-react";
import type { Lot } from "registry-client";
import { ProtocolWorkbench, type OperationRequest } from "../../components/protocol-workbench";
import { EvidenceForm } from "../../components/evidence-form";
import type { Operation } from "../../lib/stellar/operations";
import { formatUnits } from "../../lib/stellar/units";
import { addIdentifier, emptyDashboard, readDashboard, type BusinessEvent, type DashboardData } from "./data";

type Page = "Resumen" | "Lotes" | "Financiamiento" | "Verificaciones" | "Actividad" | "Integraciones" | "Operaciones";
const navigation: { label: Page; icon: LucideIcon }[] = [
  { label: "Resumen", icon: LayoutDashboard }, { label: "Lotes", icon: Box }, { label: "Financiamiento", icon: HandCoins },
  { label: "Verificaciones", icon: ClipboardCheck }, { label: "Actividad", icon: Activity }, { label: "Integraciones", icon: Blocks }, { label: "Operaciones", icon: WalletCards },
];
type Health = { status: string; components: Record<string, string> };
const quantity = (value: bigint) => new Intl.NumberFormat("es-AR").format(value);
const shortAddress = (value: string) => `${value.slice(0, 5)}…${value.slice(-5)}`;
const physicalLabels: Record<string, string> = { Registered: "Registrado", Verified: "Verificado", Rejected: "Rechazado", Impaired: "Deteriorado", Closed: "Cerrado" };
const receiptLabels: Record<string, string> = { Unissued: "Sin emitir", Receipted: "Emitido / libre", Encumbered: "Gravado", Retired: "Retirado" };

export function Dashboard({ chainEnabled }: { chainEnabled: boolean }) {
  const [page, setPage] = useState<Page>("Resumen");
  const [lotIds, setLotIds] = useState(["1", "2"]);
  const [loanIds, setLoanIds] = useState(["1", "2"]);
  const [data, setData] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [health, setHealth] = useState<Health>();
  const [error, setError] = useState("");
  const [traceLot, setTraceLot] = useState({ id: 0, lot: "1" });
  const [request, setRequest] = useState<OperationRequest>();
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    fetch("/api/system", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Health unavailable");
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("status" in body) || typeof body.status !== "string" || !("components" in body) || !body.components || typeof body.components !== "object") throw new Error("Invalid health");
      const components = Object.fromEntries(Object.entries(body.components).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
      if (active) setHealth({ status: body.status, components });
    }).catch(() => { if (active) setHealth(undefined); });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!chainEnabled) return;
    setLoading(true);
    readDashboard(lotIds, loanIds).then(value => { if (active) setData(value); }).catch(() => { if (active) setError("No se pudo consultar Testnet. No hay datos de reemplazo simulados."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [chainEnabled, lotIds, loanIds, refresh]);

  function navigate(next: Page) { setPage(next); setError(""); }
  function operate(operation: Operation, values: Record<string, string> = {}) {
    navigate(operation === "register_lot" ? "Lotes" : operation === "fund" || operation === "request_loan" || operation === "repay" ? "Financiamiento" : operation === "verify_lot" || operation === "record_inspection" || operation === "issue_receipt" ? "Verificaciones" : "Operaciones");
    requestId.current += 1; setRequest({ id: requestId.current, operation, values });
  }
  function add(event: FormEvent<HTMLFormElement>, kind: "lot" | "loan") {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const value = String(new FormData(form).get("identifier") ?? "").trim();
      if (kind === "lot") setLotIds(addIdentifier(lotIds, value)); else setLoanIds(addIdentifier(loanIds, value));
      setError(""); form.reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Identificador inválido."); }
  }
  const weight = data.lots.reduce((sum, lot) => sum + lot.net_kg, 0n);
  const operationsVisible = ["Lotes", "Financiamiento", "Verificaciones", "Actividad", "Operaciones"].includes(page);
  return <div className="yc-shell">
    <a href="#main" className="skip">Ir al contenido</a>
    <aside className="yc-sidebar">
      <a className="yc-brand" href="/" aria-label="YerbaCapital, inicio"><span className="yc-brandmark"><Leaf size={20} aria-hidden="true" /></span><span>yerba<span>capital</span></span></a>
      <p className="yc-navlabel">Plataforma</p>
      <nav className="yc-navgroup" aria-label="Navegación principal">{navigation.map(item => <button key={item.label} className={`yc-navitem ${page === item.label ? "active" : ""}`} aria-current={page === item.label ? "page" : undefined} onClick={() => navigate(item.label)}><item.icon size={18} aria-hidden="true" />{item.label}</button>)}</nav>
      <a className="yc-navitem yc-pilot-link" href="/pilot"><FileCheck2 size={18} aria-hidden="true" />Acuerdos del piloto<ArrowUpRight size={14} aria-hidden="true" /></a>
      <div className="yc-sidebarfoot"><p className="yc-navlabel">Entorno</p><div className="yc-card"><span className="yc-pill amber"><FlaskConical size={13} aria-hidden="true" />Stellar Testnet</span><p>Desarrollo local<br />Sin fondos reales</p></div><small>YERBACAPITAL · HACKATHON NEA TECH</small></div>
    </aside>
    <main id="main" className="yc-main" tabIndex={-1}>
      <header className="yc-topbar"><div><p className="yc-eyebrow">Financiamiento agroindustrial</p><h1>{page === "Resumen" ? "Panel de control" : page}</h1><p className="yc-sub">Liquidez para la yerba mate. Registros y evidencia verificables.</p></div>
        <div className="yc-actions"><span className="yc-pill amber"><FlaskConical size={13} aria-hidden="true" />{chainEnabled ? "Testnet · Datos sintéticos" : "Modo off-chain"}</span><button className="yc-btn primary" disabled={!chainEnabled} onClick={() => operate("register_lot")}><Plus size={16} aria-hidden="true" />Registrar lote</button></div>
      </header>
      <div className="yc-principle"><ShieldCheck size={18} aria-hidden="true" /><p><strong>El token no es la yerba.</strong> La blockchain registra autoría e integridad; no garantiza existencia, calidad ni custodia física.</p></div>
      {error && <p role="alert" className="error">{error}</p>}
      {chainEnabled && <div className="yc-toolbar"><p className="yc-sub">{loading ? "Consultando contratos e historial…" : data.fetchedAt ? `Última consulta: ${new Date(data.fetchedAt).toLocaleTimeString("es-AR")}` : "Esperando consulta de Testnet."}</p><button className="yc-btn secondary" disabled={loading} onClick={() => { setError(""); setRefresh(value => value + 1); }}><RefreshCw size={14} aria-hidden="true" />Actualizar datos</button></div>}
      {!chainEnabled && <p className="yc-notice">La integración con contratos está desactivada. Podés guardar evidencia sintética y gestionar acuerdos; los paneles no muestran inventario ni préstamos ficticios.</p>}
      {data.issues.length > 0 && <details className="yc-notice"><summary>Consulta parcial: {data.issues.length} avisos</summary><ul>{data.issues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul><p>Las cifras corresponden únicamente a lecturas exitosas. Una lectura fallida no demuestra que el registro no exista.</p></details>}
      {page === "Resumen" && <>
        <div className="yc-stats"><Stat title="Peso consultado" value={data.lots.length ? `${quantity(weight)} kg` : "—"} note="Suma de lotes leídos, no inventario global" icon={Warehouse} /><Stat title="Lotes consultados" value={data.fetchedAt ? String(data.lots.length) : "—"} note={`Selección inicial de demo: ${lotIds.join(", ")}`} icon={Box} /><Stat title="Ingresos por verificar" value={data.lots.length ? String(data.lots.filter(l => l.physical_status.tag === "Registered").length) : "—"} note="Según estado físico del registry" icon={Clock3} /><Stat title="Certificados gravados" value={data.lots.length ? String(data.lots.filter(l => l.receipt_status.tag === "Encumbered").length) : "—"} note="Según gravamen del registry" icon={ShieldCheck} /></div>
        <div className="yc-twocol"><section className="yc-card" aria-labelledby="recent-lots"><div className="yc-sectionhead"><h2 id="recent-lots">Lotes consultados</h2><button className="yc-btn secondary" onClick={() => navigate("Lotes")}>Ver lotes<ArrowUpRight size={14} aria-hidden="true" /></button></div><LotsTable lots={data.lots.slice(0, 4)} compact loading={loading} onInspect={id => { setTraceLot(current => ({ id: current.id + 1, lot: id })); navigate("Actividad"); }} /></section>
          <section className="yc-card" aria-labelledby="recent-events"><div className="yc-sectionhead"><h2 id="recent-events">Actividad confirmada</h2><Activity size={18} aria-hidden="true" /></div><Events events={data.events.slice(0, 4)} loading={loading} /></section></div>
      </>}
      {page === "Lotes" && <><div className="yc-sectionhead"><h2>Inventario consultado</h2><span className="yc-pill gray">Estado leído del contrato</span></div><IdentifierForm kind="lot" onSubmit={event => add(event, "lot")} disabled={!chainEnabled || loading} /><section className="yc-card"><LotsTable lots={data.lots} loading={loading} onInspect={id => { setTraceLot(current => ({ id: current.id + 1, lot: id })); navigate("Actividad"); }} /></section><p className="yc-sub">Se consultan identificadores explícitos; esta vista no asegura haber enumerado todos los lotes. La valuación publicada conserva su fecha y peso de referencia; la capacidad admisible la decide el vault.</p></>}
      {page === "Financiamiento" && <>
        <div className="yc-sectionhead"><h2>Préstamos consultados</h2><button className="yc-btn primary" disabled={!chainEnabled} onClick={() => operate("request_loan")}><Plus size={15} aria-hidden="true" />Solicitar financiamiento</button></div>
        <IdentifierForm kind="loan" onSubmit={event => add(event, "loan")} disabled={!chainEnabled || loading} />
        <section className="yc-card"><div className="yc-tablewrap"><table><caption>Consultas de préstamos de Testnet; identificadores iniciales 1 y 2</caption><thead><tr><th>Préstamo / lote</th><th>Principal</th><th>Estado financiero</th><th>Consulta de deuda</th><th>Acción</th></tr></thead><tbody>{data.loans.map(({ loan, debt }) => <tr key={loan.id.toString()}><td>#{loan.id.toString()} · Lote #{loan.lot_id.toString()}</td><td>{formatUnits(loan.principal)} USDC de prueba</td><td><span className={`yc-pill ${loan.status.tag === "Repaid" ? "green" : "amber"}`}>{loan.status.tag}</span></td><td>{formatUnits(debt)} USDC de prueba<br /><small>{loan.status.tag === "Liquidated" ? "Exposición congelada; no cobrable nuevamente" : "Consultada al vault"}</small></td><td>{loan.status.tag === "Requested" ? <button className="yc-btn secondary" onClick={() => operate("fund", { loan: loan.id.toString() })}>Preparar fondeo</button> : ["Funded", "PartiallyRepaid", "Defaulted"].includes(loan.status.tag) ? <button className="yc-btn secondary" onClick={() => operate("repay", { loan: loan.id.toString() })}>Preparar repago</button> : "Sin acción de pago"}</td></tr>)}</tbody></table></div>{!data.loans.length && <p className="yc-empty">{loading ? "Consultando préstamos…" : "No hay préstamos cargados en esta consulta."}</p>}</section>
        <p className="yc-notice">El vault transfiere USDC de prueba entre las partes, sin pool ni escrow. Una solicitud o un botón no concede permisos: cada operación se simula y requiere autorización del contrato.</p>
      </>}
      {page === "Verificaciones" && <><div className="yc-sectionhead"><h2>Inspección y evidencia</h2><span className="yc-pill amber">Firma explícita</span></div><div className="yc-pagegrid">{data.lots.map(lot => <article className="yc-card" key={lot.id.toString()}><div className="yc-cardline"><span className="yc-pill gray">Lote #{lot.id.toString()}</span><span className={`yc-pill ${lot.physical_status.tag === "Verified" ? "green" : "amber"}`}>{physicalLabels[lot.physical_status.tag]}</span></div><h3>Yerba canchada</h3><p className="yc-sub">Certificado: {receiptLabels[lot.receipt_status.tag]}</p><dl className="yc-lotmeta"><div><dt>Peso actual</dt><dd>{quantity(lot.net_kg)} kg</dd></div><div><dt>Humedad registrada</dt><dd>{lot.moisture_bps / 100} %</dd></div><div><dt>Estacionamiento</dt><dd>{lot.aging_method.tag}</dd></div><div><dt>Custodio</dt><dd title={lot.custodian}>{shortAddress(lot.custodian)}</dd></div></dl><button className="yc-btn secondary" onClick={() => operate(lot.physical_status.tag === "Registered" ? "verify_lot" : "record_inspection", { lot: lot.id.toString(), kg: lot.net_kg.toString(), moisture: lot.moisture_bps.toString() })}><ClipboardCheck size={15} aria-hidden="true" />Preparar {lot.physical_status.tag === "Registered" ? "verificación" : "inspección"}</button></article>)}</div>{!data.lots.length && <p className="yc-empty">Consultá un lote desde Lotes para preparar su inspección.</p>}<p className="yc-notice">El ingreso requiere verificador y cofirma del custodio. Guardar un archivo no certifica un hecho físico; la atestación necesita la firma del rol autorizado.</p></>}
      {page === "Actividad" && <section className="yc-card" aria-labelledby="activity-heading"><div className="yc-sectionhead"><h2 id="activity-heading">Eventos de los lotes consultados</h2><span className="yc-pill gray">Índice derivado</span></div><Events events={data.events} loading={loading} /><p className="yc-sub">La consulta detallada de abajo informa el intervalo de ledgers y las discontinuidades. El contrato conserva la autoridad sobre estado financiero y permisos.</p></section>}
      {page === "Integraciones" && <><div className="yc-pagegrid"><Integration title="Registry" subtitle="Roles, lotes y certificados" value={health?.components.registry} /><Integration title="Vault" subtitle="Préstamos y transferencias pass-through" value={health?.components.vault} /><Integration title="Evidencia" subtitle="Archivos sintéticos y SHA-256" value={health?.components.evidence} /></div><section className="yc-card yc-integration"><h2>Estado técnico</h2><dl><div><dt>Clientes TypeScript</dt><dd>{health?.components.generatedClients === "generated" ? "Generados desde los contratos" : "Sin comprobación disponible"}</dd></div><div><dt>Indexador</dt><dd>Proceso separado; revisá cobertura y transacciones en Actividad.</dd></div><div><dt>Freighter</dt><dd>Las firmas se solicitan en tu navegador. Usá cuentas distintas para cada rol.</dd></div><div><dt>Expediente del piloto</dt><dd>Gestión off-chain local con códigos de integrante. No otorga roles de los contratos.</dd></div></dl><div className="yc-actions"><a className="yc-btn secondary" href="/api/system">Consultar estado completo<ExternalLink size={14} aria-hidden="true" /></a><a className="yc-btn secondary" href="/pilot">Abrir acuerdos del piloto<ArrowUpRight size={14} aria-hidden="true" /></a></div></section></>}
      <div hidden={page !== "Resumen" && page !== "Verificaciones"} className="yc-workbench"><EvidenceForm /></div>
      <div hidden={!operationsVisible} className="yc-workbench" id="protocol-operations">{chainEnabled ? <ProtocolWorkbench request={request} view={page === "Actividad" ? "trace" : "all"} selectedLot={traceLot} onConfirmed={() => setRefresh(value => value + 1)} /> : <p className="yc-notice">Activá la configuración de Testnet para operar con Freighter. El expediente documental sigue disponible.</p>}</div>
      {page === "Operaciones" && <p className="yc-sub">Esta consola conserva la operación preparada al cambiar de sección. Cambiar una selección no cambia tus permisos on-chain.</p>}
      <footer className="yc-footer"><span>© 2026 YerbaCapital · Hackathon NEA Tech</span><span>Solo Testnet · Datos sintéticos · Sin oferta de inversión</span></footer>
    </main>
  </div>;
}

function Stat({ title, value, note, icon: Icon }: { title: string; value: string; note: string; icon: LucideIcon }) { return <div className="yc-card"><div className="yc-stathead"><span>{title}</span><span className="yc-staticon"><Icon size={18} aria-hidden="true" /></span></div><div className="yc-statnum">{value}</div><p className="yc-statfoot">{note}</p></div>; }
function LotsTable({ lots, loading, onInspect, compact = false }: { lots: Lot[]; loading: boolean; compact?: boolean; onInspect: (id: string) => void }) { return <><div className="yc-tablewrap" tabIndex={0} role="region" aria-label="Tabla desplazable de lotes"><table><caption>Lotes leídos del registry de Testnet</caption><thead><tr><th>Lote / titular</th><th>Peso actual</th><th>Estado físico</th><th>Certificado</th>{!compact && <th>Detalle</th>}</tr></thead><tbody>{lots.map(lot => <tr key={lot.id.toString()}><td><div className="yc-product"><span className="yc-producticon"><Leaf size={18} aria-hidden="true" /></span><div><strong>Lote #{lot.id.toString()}</strong><br /><small title={lot.owner}>{shortAddress(lot.owner)}</small></div></div></td><td>{quantity(lot.net_kg)} kg</td><td><span className={`yc-pill ${lot.physical_status.tag === "Verified" ? "green" : "amber"}`}>{physicalLabels[lot.physical_status.tag]}</span></td><td><span className={`yc-pill ${lot.receipt_status.tag === "Encumbered" ? "blue" : "gray"}`}>{receiptLabels[lot.receipt_status.tag]}</span></td>{!compact && <td><button className="yc-btn secondary" onClick={() => onInspect(lot.id.toString())}>Consultar historial</button></td>}</tr>)}</tbody></table></div><p className="yc-tablehint">Deslizá la tabla para ver todas las columnas.</p>{!lots.length && <p className="yc-empty">{loading ? "Consultando lotes…" : "No hay lotes cargados en esta consulta."}</p>}</>; }
function Events({ events, loading }: { events: BusinessEvent[]; loading: boolean }) { return <>{events.map(event => <div className="yc-event" key={event.id}><span className="yc-dot" aria-hidden="true" /><div><strong>{event.name}</strong><p>Lote #{event.lotId} · Ledger {event.ledger}</p><a href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`} target="_blank" rel="noreferrer">Ver transacción<ExternalLink size={12} aria-hidden="true" /></a></div></div>)}{!events.length && <p className="yc-empty">{loading ? "Consultando eventos…" : "No hay eventos confirmados disponibles en esta consulta."}</p>}</>; }
function IdentifierForm({ kind, onSubmit, disabled }: { kind: "lot" | "loan"; onSubmit: (event: FormEvent<HTMLFormElement>) => void; disabled: boolean }) { return <form className="yc-query" onSubmit={onSubmit}><label htmlFor={`dashboard-${kind}`}>{kind === "lot" ? "Agregar lote a la consulta" : "Agregar préstamo a la consulta"}</label><div><input id={`dashboard-${kind}`} name="identifier" inputMode="numeric" required disabled={disabled} placeholder="Identificador numérico" /><button className="yc-btn secondary" type="submit" disabled={disabled}>Consultar</button></div></form>; }
function Integration({ title, subtitle, value }: { title: string; subtitle: string; value?: string }) { return <article className="yc-card"><div className="yc-cardline"><span className="yc-staticon"><Blocks size={19} aria-hidden="true" /></span><span className={`yc-pill ${value === "available" ? "green" : "amber"}`}>{value === "available" ? "Disponible" : value === "disabled" ? "Desactivado" : "Sin confirmar"}</span></div><h3>{title}</h3><p className="yc-sub">{subtitle}</p></article>; }
