"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Activity, ArrowUpRight, Blocks, Box, ClipboardCheck, Clock3, ExternalLink, FileCheck2, FlaskConical, HandCoins, LayoutDashboard, Leaf, Plus, RefreshCw, ShieldCheck, WalletCards, Warehouse, type LucideIcon } from "lucide-react";
import type { Lot } from "registry-client";
import { ProtocolWorkbench, operationLabels, type OperationRequest } from "../../components/protocol-workbench";
import { ContextHelp } from "../../components/context-help";
import { parseCatalog, type Catalog } from "./catalog";
import { LotDocuments } from "../operations/lot-documents";
import { InvestorMap } from "../investor/investor-map";
import { LoanCatalog } from "./loan-catalog";
import { roleGuidance } from "./role-guidance";
import { EvidenceForm } from "../../components/evidence-form";
import { VerifierInspectionUpload } from "../../components/verifier-inspection-upload";
import { MoneyGramRampBanner, MoneyGramRampModal } from "../borrower/moneygram-ramp";
import type { Operation } from "../../lib/stellar/operations";
import { formatUnits } from "../../lib/stellar/units";
import { addIdentifier, emptyDashboard, readDashboard, type BusinessEvent, type DashboardData } from "./data";

import { roleWorkspaces, type WorkspaceRole, type DashboardPage as Page } from "./roles";
const navigation: { label: Page; icon: LucideIcon }[] = [
  { label: "Resumen", icon: LayoutDashboard }, { label: "Lotes", icon: Box }, { label: "Financiamiento", icon: HandCoins },
  { label: "Verificaciones", icon: ClipboardCheck }, { label: "Actividad", icon: Activity }, { label: "Integraciones", icon: Blocks }, { label: "Operaciones", icon: WalletCards },
];
const primaryNavigation = new Set<Page>(["Resumen", "Lotes", "Financiamiento", "Verificaciones", "Actividad"]);
type Health = { status: string; components: Record<string, string> };
const quantity = (value: bigint) => new Intl.NumberFormat("es-AR").format(value);
const ledgerDate = (value: bigint) => value === 0n ? "Se define al financiar" : value * 1000n > 8640000000000000n ? "Fecha fuera de rango" : new Date(Number(value * 1000n)).toLocaleString("es-AR");
const shortAddress = (value: string) => `${value.slice(0, 5)}…${value.slice(-5)}`;
import { physicalLabels, receiptLabels, loanLabels, eventLabels } from "./labels";

export function Dashboard({ chainEnabled, initialRole = "borrower" }: { chainEnabled: boolean; initialRole?: WorkspaceRole }) {
  const [role, setRole] = useState<WorkspaceRole>(initialRole);
  const [roleLocked, setRoleLocked] = useState(false);
  const workspace = roleWorkspaces[role];
  const guide = role === "admin" ? undefined : roleGuidance[role];
  const canPresent = (operation: Operation) => workspace.operations.includes(operation);
  const [page, setPage] = useState<Page>("Resumen");
  const [catalog, setCatalog] = useState<Catalog>();
  const [catalogError, setCatalogError] = useState("");
  const [catalogOffset, setCatalogOffset] = useState(0);
  const [lotIds, setLotIds] = useState(["1", "2"]);
  const [loanIds, setLoanIds] = useState(["1", "2"]);
  const [data, setData] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [health, setHealth] = useState<Health>();
  const [error, setError] = useState("");
  const [traceLot, setTraceLot] = useState({ id: 0, lot: "1" });
  const [evidenceSelection, setEvidenceSelection] = useState<{ id: number; sha256: string }>();
  const [request, setRequest] = useState<OperationRequest>();
  const [rampModalOpen, setRampModalOpen] = useState(false);
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

  useEffect(() => {
    let active = true; if (!chainEnabled) return;
    setCatalogError("");
    fetch(`/api/catalog?offset=${catalogOffset}`, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("El catálogo no está disponible. Usá la consulta por número; la selección inicial es de demo.");
      const value = parseCatalog(await response.json(), process.env.NEXT_PUBLIC_REGISTRY_ID ?? "", process.env.NEXT_PUBLIC_VAULT_ID ?? "");
      if (!active) return; setCatalog(value);
      setLotIds(current => JSON.stringify(current) === JSON.stringify(value.lotIds) ? current : value.lotIds);
      setLoanIds(current => JSON.stringify(current) === JSON.stringify(value.loanIds) ? current : value.loanIds);
    }).catch(cause => { if (active) { setCatalog(undefined); setCatalogError(cause instanceof Error ? cause.message : "Catálogo no disponible."); } });
    return () => { active = false; };
  }, [chainEnabled, refresh, catalogOffset]);

  function navigate(next: Page) { setPage(next); setRequest(undefined); setError(""); }
  function operate(operation: Operation, values: Record<string, string> = {}) {
    if (!canPresent(operation)) return;
    navigate(operation === "register_lot" ? "Lotes" : operation === "fund" || operation === "request_loan" || operation === "repay" ? "Financiamiento" : operation === "verify_lot" || operation === "record_inspection" || operation === "issue_receipt" ? "Verificaciones" : "Operaciones");
    requestId.current += 1; setRequest({ id: requestId.current, operation, values });
  }
  function useEvidence(sha256: string) {
    if (!chainEnabled || roleLocked) { setError("Para usar el comprobante, activá Testnet y terminá o descartá la operación preparada."); return; }
    requestId.current += 1; setEvidenceSelection({ id: requestId.current, sha256 }); navigate("Operaciones");
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
  const suggestedOperation = guide?.primary[0] ?? workspace.operations[0];
  const taskInProgress = Boolean(request);
  const summaryAction = suggestedOperation ? () => operate(suggestedOperation) : () => navigate(role === "observer" ? "Actividad" : "Lotes");
  const summaryActionLabel = suggestedOperation ? operationLabels[suggestedOperation] : role === "observer" ? "Consultar historial" : "Ver lotes";
  return <div className="yc-shell">
    <a href="#main" className="skip">Ir al contenido</a>
    <aside className="yc-sidebar">
      <a className="yc-brand" href="/" aria-label="YerbaCapital, inicio"><span className="yc-brandmark"><Leaf size={20} aria-hidden="true" /></span><span>yerba<span>capital</span></span></a>
      <div className="yc-role-picker"><label htmlFor="workspace-role">Recorrido de la demo</label><select id="workspace-role" value={role} disabled={roleLocked} aria-describedby="role-help" onChange={event => { setRole(event.target.value as WorkspaceRole); setPage("Resumen"); setRequest(undefined); setError(""); }}>{Object.entries(roleWorkspaces).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}</select><small id="role-help">{roleLocked ? "Terminá o descartá la operación preparada antes de cambiar de recorrido." : "Esto ordena la pantalla. Los permisos se comprueban recién al firmar con la cuenta autorizada."}</small></div>
      <p className="yc-navlabel">Para trabajar</p>
      <nav className="yc-navgroup" aria-label="Navegación principal">{navigation.filter(item => workspace.pages.includes(item.label) && primaryNavigation.has(item.label)).map(item => <button key={item.label} className={`yc-navitem ${page === item.label ? "active" : ""}`} aria-current={page === item.label ? "page" : undefined} onClick={() => navigate(item.label)}><item.icon size={18} aria-hidden="true" />{item.label}</button>)}</nav>
      {navigation.some(item => workspace.pages.includes(item.label) && !primaryNavigation.has(item.label)) && <details className="yc-more-tools"><summary>Más detalles de la demo</summary><div>{navigation.filter(item => workspace.pages.includes(item.label) && !primaryNavigation.has(item.label)).map(item => <button key={item.label} className={`yc-navitem ${page === item.label ? "active" : ""}`} aria-current={page === item.label ? "page" : undefined} onClick={() => navigate(item.label)}><item.icon size={18} aria-hidden="true" />{item.label}</button>)}</div></details>}
      <a className="yc-navitem yc-pilot-link" href="/pilot"><FileCheck2 size={18} aria-hidden="true" />Acuerdos del piloto<ArrowUpRight size={14} aria-hidden="true" /></a>
      <div className="yc-sidebarfoot"><p className="yc-navlabel">Entorno</p><div className="yc-card"><span className="yc-pill amber"><FlaskConical size={13} aria-hidden="true" />Stellar Testnet</span><p>Desarrollo local<br />Sin fondos reales</p></div><small>YERBACAPITAL · HACKATHON NEA TECH</small></div>
    </aside>
    <main id="main" className="yc-main" tabIndex={-1}>
      <header className="yc-topbar"><div><p className="yc-eyebrow">Financiamiento agroindustrial</p><h1>{page === "Resumen" ? "¿Qué necesitás hacer hoy?" : page}</h1><p className="yc-sub">Empezá por la mercadería y seguí un paso por vez. Los datos y firmas se validan en la red de prueba.</p></div>
        <span className="yc-pill amber"><FlaskConical size={13} aria-hidden="true" />{chainEnabled ? "Testnet · Datos sintéticos" : "Modo off-chain"}</span>
      </header>
      <div className="yc-principle"><ShieldCheck size={18} aria-hidden="true" /><p><strong>El token no es la yerba.</strong> La blockchain registra autoría e integridad; no garantiza existencia, calidad ni custodia física.</p></div>
      {role === "lender" && page === "Resumen" && <InvestorMap onFinancing={() => navigate("Financiamiento")} />}
      {page === "Resumen" && <section className="yc-card yc-role-summary" aria-labelledby="workspace-heading"><p className="yc-eyebrow">Recorrido: {workspace.label}</p><h2 id="workspace-heading">{role === "borrower" ? "Empezá por un lote, no por la billetera." : workspace.label}</h2><p>{workspace.description}</p><p className="yc-sub">{role === "observer" ? "Esta vista solo consulta registros públicos. No necesitás conectar una billetera ni firmar para leerlos." : "Estás viendo ejemplos públicos de la demo, no tu inventario. La autorización real se comprueba cuando firmás con Freighter."}</p><div className="yc-next-action"><div><strong>Próximo paso</strong><span>{suggestedOperation ? "La demo te guía y revisa los datos antes de pedir una firma." : "Elegí un lote para consultar sus estados e historial."}</span></div><button className="yc-btn primary" disabled={Boolean(suggestedOperation) && !chainEnabled} onClick={summaryAction}>{summaryActionLabel}<ArrowUpRight size={16} aria-hidden="true" /></button></div>{guide && page === "Resumen" && <details className="role-guidance"><summary>Ver el recorrido completo</summary><ol>{guide.steps.map(step => <li key={step}>{step}</li>)}</ol><button className="yc-btn secondary" onClick={() => navigate(guide.startPage)}>Abrir {guide.startPage.toLocaleLowerCase("es-AR")}</button><ContextHelp key={role} title={guide.helpTitle}><p>{guide.explanation}</p></ContextHelp></details>}</section>}
      {error && <p role="alert" className="error">{error}</p>}
      {chainEnabled && page !== "Resumen" && !taskInProgress && <div className="yc-toolbar"><p className="yc-sub">{loading ? "Consultando contratos e historial…" : data.fetchedAt ? `Última consulta: ${new Date(data.fetchedAt).toLocaleTimeString("es-AR")}` : "Esperando consulta de Testnet."}</p><button className="yc-btn secondary" disabled={loading} onClick={() => { setError(""); setRefresh(value => value + 1); }}><RefreshCw size={14} aria-hidden="true" />Actualizar datos</button></div>}
      {!chainEnabled && <p className="yc-notice">Las operaciones de la red de prueba están desactivadas. Podés guardar archivos de prueba y gestionar acuerdos. Para firmar, el equipo tiene que activar la conexión con Testnet.</p>}
      {chainEnabled && !taskInProgress && ["Lotes", "Financiamiento"].includes(page) && <section className="yc-card catalog-coverage" aria-label="Cobertura del catálogo">{catalog ? <><p>Catálogo indexado: {catalog.totalLots} lotes y {catalog.totalLoans} préstamos descubiertos. Página {Math.floor(catalog.offset / 12) + 1}.</p><p className="yc-sub">Cobertura de bloques {catalog.fromLedger} a {catalog.nextLedger - 1}. {catalog.updatedAt ? `Última actualización: ${new Date(catalog.updatedAt).toLocaleString("es-AR")}.` : "Sin fecha de actualización."} No asegura inventario global ni reemplaza el estado del contrato.</p>{catalog.error && <p role="alert">El indexador informa faltantes o demora: {catalog.error}</p>}<div className="yc-actions"><button className="yc-btn secondary" disabled={catalog.offset === 0 || loading} onClick={() => setCatalogOffset(offset => Math.max(0, offset - 12))}>Página anterior</button><button className="yc-btn secondary" disabled={catalog.nextOffset === null || loading} onClick={() => { if (catalog.nextOffset !== null) setCatalogOffset(catalog.nextOffset); }}>Página siguiente</button></div></> : <p>{catalogError || "Consultando catálogo…"}</p>}</section>}
      {!taskInProgress && data.issues.length > 0 && <details className="yc-notice"><summary>Consulta parcial: {data.issues.length} avisos</summary><ul>{data.issues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul><p>Las cifras corresponden únicamente a lecturas exitosas. Una lectura fallida no demuestra que el registro no exista.</p></details>}
      {page === "Resumen" && <section className="yc-demo-glance" aria-labelledby="demo-glance-heading"><div><p className="yc-eyebrow">Después, si querés explorar</p><h2 id="demo-glance-heading">Ejemplos de la demo</h2><p className="yc-sub">Podés mirar lotes, certificados e historial confirmados en Testnet. No representan tu depósito ni una oferta comercial.</p></div><div className="yc-actions"><button className="yc-btn secondary" onClick={() => navigate("Lotes")}>Ver lotes de ejemplo</button><button className="yc-btn secondary" onClick={() => navigate("Actividad")}>Ver historial</button></div></section>}
      {page === "Lotes" && <>{taskInProgress ? <section className="yc-task-focus" aria-label="Tarea guiada"><p className="yc-eyebrow">Tarea en curso</p><h2>{operationLabels[request?.operation ?? "register_lot"]}</h2><p>Prepará primero los comprobantes del lote. Después completá los datos y pedí una revisión: todavía no se enviará nada hasta que lo confirmes en Freighter.</p><div><span>1. Comprobantes</span><span>2. Datos del lote</span><span>3. Revisión y firma</span></div></section> : <><div className="yc-sectionhead"><div><h2>Lotes que estás consultando</h2><p className="yc-sub">Son registros elegidos para esta vista; no representan todo el depósito ni necesariamente te pertenecen.</p></div><span className="yc-pill gray">Datos confirmados en la red de prueba</span></div>{role === "borrower" && <div className="yc-stats"><Stat title="Peso de ejemplos" value={data.lots.length ? `${quantity(weight)} kg` : "—"} note="Suma de lotes leídos, no inventario global" icon={Warehouse} /><Stat title="Lotes cargados" value={data.fetchedAt ? String(data.lots.length) : "—"} note={`${catalog ? "Página del catálogo" : "Selección de demo"}: ${lotIds.join(", ") || "sin números"}`} icon={Box} /><Stat title="Ingresos por verificar" value={data.lots.length ? String(data.lots.filter(l => l.physical_status.tag === "Registered").length) : "—"} note="Ingresos registrados que esperan verificación" icon={Clock3} /><Stat title="Lotes en garantía" value={data.lots.length ? String(data.lots.filter(l => l.receipt_status.tag === "Encumbered").length) : "—"} note="Certificados comprometidos con un préstamo" icon={ShieldCheck} /></div>}<IdentifierForm kind="lot" onSubmit={event => add(event, "lot")} disabled={!chainEnabled || loading} /><section className="yc-card"><LotsTable lots={data.lots} loading={loading} onInspect={id => { setTraceLot(current => ({ id: current.id + 1, lot: id })); navigate("Actividad"); }} /></section><ContextHelp title="¿Cómo leo los estados de un lote?"><p>Estado físico describe la mercadería según informes firmados. Certificado describe el derecho sobre ella: «Sin emitir» todavía no tiene certificado; «Emitido / libre» no está comprometido en un préstamo; «En garantía» está vinculado a uno. Que el certificado esté libre no corrige un deterioro físico.</p></ContextHelp><p className="yc-sub">Se muestran solo los números de lote consultados, no todo el depósito. El valor publicado tiene una fecha y un peso de referencia; el contrato revisa cuánto se puede prestar.</p></>}</>}
      {page === "Financiamiento" && <>
        {taskInProgress ? <section className="yc-task-focus" aria-label="Tarea guiada"><p className="yc-eyebrow">Tarea en curso</p><h2>{operationLabels[request?.operation ?? "request_loan"]}</h2><p>Revisá el lote, las condiciones y el importe. La app consulta la red de prueba; el contrato decide permisos, deuda y monto admisible.</p><div><span>1. Revisar lote</span><span>2. Preparar datos</span><span>3. Revisar y firmar</span></div></section> : <>{role === "borrower" && <div style={{ marginBottom: "1.25rem" }}><MoneyGramRampBanner onOpen={() => setRampModalOpen(true)} /></div>}
        <LoanCatalog loans={data.loans} loading={loading} canFund={canPresent("fund")} locked={roleLocked} onFund={id => operate("fund", { loan: id })} />
        <div className="yc-sectionhead"><h2>Préstamos consultados</h2>{canPresent("request_loan") && <button className="yc-btn primary" disabled={!chainEnabled} onClick={() => operate("request_loan")}><Plus size={15} aria-hidden="true" />Solicitar financiamiento</button>}</div>
        <IdentifierForm kind="loan" onSubmit={event => add(event, "loan")} disabled={!chainEnabled || loading} />
        <section className="yc-card"><div className="yc-tablewrap"><table><caption>Préstamos leídos del contrato en esta selección de Testnet</caption><thead><tr><th>Préstamo / lote</th><th>Importe solicitado</th><th>Estado financiero</th><th>Saldo consultado</th><th>Acción</th></tr></thead><tbody>{data.loans.map(({ loan, debt }) => <tr key={loan.id.toString()}><td>#{loan.id.toString()} · Lote #{loan.lot_id.toString()}<details className="loan-terms"><summary>Ver condiciones del préstamo #{loan.id.toString()}</summary><dl><div><dt>Importe solicitado</dt><dd>{formatUnits(loan.principal)} USDC de prueba</dd></div><div><dt>Tasa anual</dt><dd>{loan.rate_bps / 100} %</dd></div><div><dt>Plazo acordado</dt><dd>{loan.duration_secs % 86400n === 0n ? `${loan.duration_secs / 86400n} días` : `${loan.duration_secs} segundos`}</dd></div><div><dt>Vencimiento</dt><dd>{ledgerDate(loan.maturity)}</dd></div><div><dt>Cuenta solicitante</dt><dd className="address">{loan.borrower}</dd></div><div><dt>Cuenta prestamista</dt><dd className="address">{loan.lender ?? "Todavía no asignada"}</dd></div></dl></details></td><td>{formatUnits(loan.principal)} USDC de prueba</td><td><span className={`yc-pill ${loan.status.tag === "Repaid" ? "green" : "amber"}`}>{loanLabels[loan.status.tag] ?? "Estado sin traducir"}</span></td><td>{formatUnits(debt)} USDC de prueba<br /><small>{loan.status.tag === "Liquidated" ? "Saldo histórico al reclamar; no se cobra de nuevo" : "Saldo informado por el contrato"}</small></td><td>{loan.status.tag === "Requested" && canPresent("fund") ? <button className="yc-btn secondary" onClick={() => operate("fund", { loan: loan.id.toString() })}>Revisar financiamiento</button> : ["Funded", "PartiallyRepaid", "Defaulted"].includes(loan.status.tag) && canPresent("repay") ? <button className="yc-btn secondary" onClick={() => operate("repay", { loan: loan.id.toString() })}>Preparar pago</button> : "Solo consulta"}</td></tr>)}</tbody></table></div>{!data.loans.length && <p className="yc-empty">{loading ? "Consultando préstamos…" : "No hay préstamos cargados en esta consulta."}</p>}</section>
        <div className="role-concepts"><ContextHelp title="¿Qué es el saldo consultado?"><p>Es la deuda que informa el contrato al consultar. Puede cambiar por el interés hasta que se confirme un pago. Después de reclamar el certificado se muestra un saldo histórico que no se puede cobrar otra vez desde esta operación.</p></ContextHelp><ContextHelp title="¿En qué moneda se muestran los importes?"><p>En USDC de prueba de Stellar Testnet, no en pesos. Esta demo usa un activo propio sin dinero real ni conversión bancaria.</p></ContextHelp></div>
        <p className="yc-notice">Los pagos de prueba van directamente de una cuenta a otra. Revisá las condiciones antes de firmar; tocar un botón todavía no envía dinero.</p>
      </>}</>}
      {page === "Verificaciones" && <><div className="yc-sectionhead"><h2>Inspección y evidencia</h2><span className="yc-pill amber">Firma explícita</span></div>{role === "verifier" && <div style={{ marginBottom: "1.25rem" }}><VerifierInspectionUpload onUse={useEvidence} useDisabled={!chainEnabled || roleLocked} /></div>}<div className="yc-pagegrid">{data.lots.map(lot => <article className="yc-card" key={lot.id.toString()}><div className="yc-cardline"><span className="yc-pill gray">Lote #{lot.id.toString()}</span><span className={`yc-pill ${lot.physical_status.tag === "Verified" ? "green" : "amber"}`}>{physicalLabels[lot.physical_status.tag]}</span></div><h3>Yerba canchada</h3><p className="yc-sub">Certificado: {receiptLabels[lot.receipt_status.tag]}</p><ContextHelp title={`¿Qué me informa el lote #${lot.id.toString()}?`}><p>El estado físico describe la mercadería según las atestaciones firmadas. El certificado indica si el derecho sobre el lote está emitido o comprometido como garantía; son estados distintos.</p></ContextHelp><dl className="yc-lotmeta"><div><dt>Peso actual</dt><dd>{quantity(lot.net_kg)} kg</dd></div><div><dt>Humedad registrada</dt><dd>{lot.moisture_bps / 100} %</dd></div><div><dt>Estacionamiento</dt><dd>{lot.aging_method.tag === "Natural" ? "Natural" : "En cámara"}</dd></div><div><dt>Custodio</dt><dd title={lot.custodian}>{shortAddress(lot.custodian)}</dd></div></dl>{canPresent(lot.physical_status.tag === "Registered" ? "verify_lot" : "record_inspection") && <button className="yc-btn secondary" onClick={() => operate(lot.physical_status.tag === "Registered" ? "verify_lot" : "record_inspection", { lot: lot.id.toString(), kg: lot.net_kg.toString(), moisture: lot.moisture_bps.toString() })}><ClipboardCheck size={15} aria-hidden="true" />Preparar {lot.physical_status.tag === "Registered" ? "verificación" : "inspección"}</button>}</article>)}</div>{!data.lots.length && <p className="yc-empty">Consultá un lote desde Lotes para preparar su inspección.</p>}<p className="yc-notice">El ingreso requiere verificador y cofirma del custodio. Guardar un archivo no certifica un hecho físico; la atestación necesita la firma del rol autorizado.</p></>}
      {page === "Actividad" && <section className="yc-card" aria-labelledby="activity-heading"><div className="yc-sectionhead"><h2 id="activity-heading">Eventos de los lotes consultados</h2><span className="yc-pill gray">Índice derivado</span></div><Events events={data.events} loading={loading} /><p className="yc-sub">Podés consultar abajo la historia de un lote. Si faltan registros, se informa el intervalo disponible. Los permisos y el estado del préstamo se comprueban en la red de prueba.</p></section>}
      {page === "Integraciones" && <><div className="yc-pagegrid"><Integration title={role === "admin" ? "Registry" : "Registro de lotes"} subtitle="Permisos, mercadería y certificados" value={health?.components.registry} /><Integration title={role === "admin" ? "Vault" : "Préstamos y pagos"} subtitle="Envíos directos entre las partes" value={health?.components.vault} /><Integration title="Evidencia" subtitle="Archivos sintéticos y SHA-256" value={health?.components.evidence} /></div><section className="yc-card yc-integration"><h2>Estado técnico</h2><dl><div><dt>Clientes TypeScript</dt><dd>{health?.components.generatedClients === "generated" ? "Generados desde los contratos" : "Sin comprobación disponible"}</dd></div><div><dt>Indexador</dt><dd>Proceso separado; revisá cobertura y transacciones en Actividad.</dd></div><div><dt>Freighter</dt><dd>Las firmas se solicitan en tu navegador. Usá cuentas distintas para cada rol.</dd></div><div><dt>Expediente del piloto</dt><dd>Gestión off-chain local con códigos de integrante. No otorga roles de los contratos.</dd></div></dl><div className="yc-actions"><a className="yc-btn secondary" href="/api/system">Consultar estado completo<ExternalLink size={14} aria-hidden="true" /></a><a className="yc-btn secondary" href="/pilot">Abrir acuerdos del piloto<ArrowUpRight size={14} aria-hidden="true" /></a></div></section></>}
      <div hidden={role === "observer" || page !== "Operaciones"} className="yc-workbench"><EvidenceForm onUse={useEvidence} useDisabled={!chainEnabled || roleLocked} /></div>
      <div hidden={role !== "borrower" || page !== "Lotes" || (taskInProgress && request?.operation !== "register_lot")}><LotDocuments onUse={useEvidence} disabled={!chainEnabled || roleLocked} /></div>
      <div hidden={!operationsVisible} className="yc-workbench" id="protocol-operations">{chainEnabled ? <ProtocolWorkbench referenceLots={data.lots} evidenceSelection={evidenceSelection} workspaceRole={role} allowedOperations={workspace.operations} onLockChange={setRoleLocked} request={request} view={page === "Actividad" || role === "observer" ? "trace" : "operation"} selectedLot={traceLot} onConfirmed={() => { setRefresh(value => value + 1); setRequest(undefined); }} /> : <p className="yc-notice">Activá la configuración de Testnet para operar con Freighter. El expediente documental sigue disponible.</p>}</div>
      {page === "Operaciones" && <p className="yc-sub">Esta consola conserva la operación preparada al cambiar de sección. Cambiar una selección no cambia tus permisos on-chain.</p>}
      <MoneyGramRampModal
        isOpen={rampModalOpen}
        onClose={() => setRampModalOpen(false)}
        defaultUsdcAmount={
          data.loans[0]
            ? formatUnits(data.loans[0].loan.principal)
            : "50000"
        }
        loanId={data.loans[0]?.loan.id.toString()}
      />
      <footer className="yc-footer"><span>© 2026 YerbaCapital · Hackathon NEA Tech</span><span>Solo Testnet · Datos sintéticos · Sin oferta de inversión</span></footer>
    </main>
  </div>;
}

function Stat({ title, value, note, icon: Icon }: { title: string; value: string; note: string; icon: LucideIcon }) { return <div className="yc-card"><div className="yc-stathead"><span>{title}</span><span className="yc-staticon"><Icon size={18} aria-hidden="true" /></span></div><div className="yc-statnum">{value}</div><p className="yc-statfoot">{note}</p></div>; }
function LotsTable({ lots, loading, onInspect, compact = false }: { lots: Lot[]; loading: boolean; compact?: boolean; onInspect: (id: string) => void }) { return <><div className="yc-tablewrap" tabIndex={0} role="region" aria-label="Tabla desplazable de lotes"><table><caption>Lotes leídos del registry de Testnet</caption><thead><tr><th>Lote / titular</th><th>Peso actual</th><th>Estado físico</th><th>Certificado</th>{!compact && <th>Detalle</th>}</tr></thead><tbody>{lots.map(lot => <tr key={lot.id.toString()}><td><div className="yc-product"><span className="yc-producticon"><Leaf size={18} aria-hidden="true" /></span><div><strong>Lote #{lot.id.toString()}</strong><br /><small title={lot.owner}>{shortAddress(lot.owner)}</small></div></div></td><td>{quantity(lot.net_kg)} kg</td><td><span className={`yc-pill ${lot.physical_status.tag === "Verified" ? "green" : "amber"}`}>{physicalLabels[lot.physical_status.tag]}</span></td><td><span className={`yc-pill ${lot.receipt_status.tag === "Encumbered" ? "blue" : "gray"}`}>{receiptLabels[lot.receipt_status.tag]}</span></td>{!compact && <td><button className="yc-btn secondary" onClick={() => onInspect(lot.id.toString())}>Consultar historial</button><br /><a href={`/lots/${lot.id.toString()}`}>Abrir enlace público y QR</a></td>}</tr>)}</tbody></table></div><p className="yc-tablehint">Deslizá la tabla para ver todas las columnas.</p>{!lots.length && <p className="yc-empty">{loading ? "Consultando lotes…" : "No hay lotes cargados en esta consulta."}</p>}</>; }
function Events({ events, loading }: { events: BusinessEvent[]; loading: boolean }) { return <>{events.map(event => <div className="yc-event" key={event.id}><span className="yc-dot" aria-hidden="true" /><div><strong>{event.label ?? eventLabels[event.name] ?? "Registro del lote"}</strong><details><summary>Datos técnicos</summary>{event.name}</details><p>Lote #{event.lotId} · {new Date(event.closedAt).toLocaleString("es-AR")}</p><a href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`} target="_blank" rel="noreferrer">Ver transacción<ExternalLink size={12} aria-hidden="true" /></a></div></div>)}{!events.length && <p className="yc-empty">{loading ? "Consultando eventos…" : "No hay eventos confirmados disponibles en esta consulta."}</p>}</>; }
function IdentifierForm({ kind, onSubmit, disabled }: { kind: "lot" | "loan"; onSubmit: (event: FormEvent<HTMLFormElement>) => void; disabled: boolean }) { return <form className="yc-query" onSubmit={onSubmit}><label htmlFor={`dashboard-${kind}`}>{kind === "lot" ? "Agregar lote a la consulta" : "Agregar préstamo a la consulta"}</label><div><input id={`dashboard-${kind}`} name="identifier" inputMode="numeric" required disabled={disabled} placeholder="Por ejemplo: 1" /><button className="yc-btn secondary" type="submit" disabled={disabled}>Consultar</button></div></form>; }
function Integration({ title, subtitle, value }: { title: string; subtitle: string; value?: string }) { return <article className="yc-card"><div className="yc-cardline"><span className="yc-staticon"><Blocks size={19} aria-hidden="true" /></span><span className={`yc-pill ${value === "available" ? "green" : "amber"}`}>{value === "available" ? "Disponible" : value === "disabled" ? "Desactivado" : "Sin confirmar"}</span></div><h3>{title}</h3><p className="yc-sub">{subtitle}</p></article>; }
