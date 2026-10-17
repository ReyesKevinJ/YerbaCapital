"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AssembledTransaction } from "@stellar/stellar-sdk/contract";
import type { Lot } from "registry-client";
import { connectWallet, walletSigners } from "../lib/wallet/freighter";
import { buildOperation, type Operation } from "../lib/stellar/operations";
import { getCapacity, getDebt, getLatestLedger, getLoan, getLot, getTransaction } from "../lib/stellar/query";
import { assertSimulationSucceeded, ConfirmationPending, invoke, type TxPhase } from "../lib/stellar/invoke";
import { explainError } from "../lib/stellar/errors";
import { formatUnits } from "../lib/stellar/units";

import { ContextHelp } from "./context-help";
import { taskGuidance } from "../features/operations/task-guidance";
import type { WorkspaceRole } from "../features/dashboard/roles";
import { toContractValues, toDisplayValues } from "../features/operations/form-values";
import { businessEventLabel, physicalLabels, receiptLabels, loanLabels } from "../features/dashboard/labels";

const fields: Record<string, string> = { lot: "Número de lote", loan: "Número de préstamo", kg: "Peso en kg enteros",
  moisture: "Humedad (%)", evidence: "Código del comprobante (SHA-256)",
  account: "Cuenta que recibirá el rol", role: "Tarea que podrá realizar",
  custodian: "Cuenta del custodio", warehouse: "Código del depósito entregado por el equipo",
  started: "Inicio del estacionamiento (fecha y hora local)", amount: "Importe en USDC de prueba",
  rate: "Tasa anual (%)", duration: "Plazo del préstamo (días)", expiry: "Vencimiento del permiso de pago (número de bloque)" };
const tasks: Record<Operation, { label: string; fields: string[] }> = {
  grant_role: { label: "Administrador · Habilitar una tarea", fields: ["account", "role"] },
  register_lot: { label: "Cooperativa · Registrar lote", fields: ["custodian", "kg", "warehouse", "started", "evidence"] },
  verify_lot: { label: "Verificador + custodio · Verificar ingreso", fields: ["lot", "kg", "moisture", "evidence"] },
  issue_receipt: { label: "Verificador · Emitir certificado", fields: ["lot"] },
  post_valuation: { label: "Valuador · Publicar el valor del lote", fields: ["lot", "amount", "evidence"] },
  request_loan: { label: "Cooperativa · Solicitar préstamo", fields: ["lot", "amount", "rate", "duration"] },
  fund: { label: "Prestamista · Financiar un préstamo", fields: ["loan"] },
  record_inspection: { label: "Verificador · Registrar inspección aprobada", fields: ["lot", "kg", "moisture", "evidence"] },
  repay: { label: "Pagador · Pagar préstamo", fields: ["loan", "amount"] },
  approve_repayment: { label: "Pagador · Dar permiso para el pago", fields: ["amount", "expiry"] },
  revoke_allowance: { label: "Pagador · Quitar el permiso de pago", fields: [] },
  partial_withdraw: { label: "Cooperativa + custodio · Retirar parte del lote en garantía", fields: ["loan", "kg", "evidence"] },
  impair: { label: "Verificador · Informar deterioro por humedad", fields: ["lot", "evidence"] },
  mark_default: { label: "Cualquier cuenta · Declarar incumplimiento", fields: ["loan"] },
  claim_collateral: { label: "Prestamista · Reclamar certificado", fields: ["loan"] },
  cancel_request: { label: "Cooperativa · Cancelar solicitud sin fondeo", fields: ["loan"] },
};
export const operationLabels = Object.fromEntries(Object.entries(tasks).map(([key, task]) => [key, task.label])) as Record<Operation, string>;
const allOperations = Object.keys(tasks) as Operation[];

const fieldHelp: Record<string, string> = {
  kg: "Ingresá kilos enteros, sin puntos ni comas. Por ejemplo: 12000.",
  moisture: "Usá el porcentaje del informe. Por ejemplo: 5 o 5,25. No hace falta convertirlo.",
  rate: "Por ejemplo: 12 significa 12 % anual. El contrato revisa la tasa permitida.",
  duration: "Ingresá días enteros. Por ejemplo: 180. El contrato revisa el plazo permitido.",
  amount: "Importe en USDC de prueba, no en pesos. Usá punto decimal, por ejemplo: 1500.50.",
  evidence: "Primero guardá el archivo de prueba en la sección de comprobantes. Copiá el código completo y pegalo acá. Guardar el archivo todavía no firma la inspección.",
  warehouse: "Pedí este código al equipo que prepara la demo. No escribas una dirección ni inventes un código.",
  custodian: "Pegá la dirección pública de la cuenta del depósito. Nunca una contraseña ni una clave secreta.",
  account: "Pegá la dirección pública de Freighter de quien hará esa tarea. Nunca una clave secreta.",
  expiry: "Usá el botón para completar este dato técnico. El permiso vence por bloques de la red, no por una fecha de calendario.",
  started: "Elegí la fecha y hora en que comenzó el estacionamiento. Se usa la hora local de este dispositivo.",
};
const phaseText: Record<TxPhase, string> = { simulating: "Simulando en Testnet…", awaiting_signature: "Esperando firma en Freighter…",
  submitting: "Enviada; esperando confirmación…", confirmed: "Confirmada en Testnet." };

type Timeline = { events: { id: string; name: string; txHash: string; ledger: number; closedAt: string; data: unknown }[];
  error?: string; fromLedger: number; nextLedger: number; updatedAt?: string };

function eventEvidence(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("lot" in data)) return;
  const lot = data.lot;
  if (!lot || typeof lot !== "object" || !("last_attestation" in lot)) return;
  const attestation = lot.last_attestation;
  if (!attestation || typeof attestation !== "object" || !("evidence" in attestation)) return;
  return typeof attestation.evidence === "string" && /^[a-f0-9]{64}$/.test(attestation.evidence) ? attestation.evidence : undefined;
}

export type OperationRequest = { id: number; operation: Operation; values: Record<string, string> };

export function ProtocolWorkbench({ request, view = "all", selectedLot, onConfirmed, allowedOperations = allOperations, onLockChange, workspaceRole, evidenceSelection, referenceLots = [] }: { referenceLots?: Lot[]; evidenceSelection?: { id: number; sha256: string }; workspaceRole?: WorkspaceRole; allowedOperations?: Operation[]; onLockChange?: (locked: boolean) => void; request?: OperationRequest; view?: "all" | "trace" | "operation"; selectedLot?: { id: number; lot: string }; onConfirmed?: () => void } = {}) {
  const [capacity, setCapacity] = useState<{ lot: string; amount: bigint }>();
  const [account, setAccount] = useState("");
  const [operation, setOperation] = useState<Operation>("register_lot");
  const [values, setValues] = useState<Record<string, string>>({ kg: "12000", moisture: "5", rate: "12", duration: "180" });
  const [prepared, setPrepared] = useState<AssembledTransaction<unknown>>();
  const [source, setSource] = useState("");
  const [required, setRequired] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [pending, setPending] = useState(false);
  const [lotNumber, setLotNumber] = useState("1");
  const [loanStatus, setLoanStatus] = useState("");
  const [loanNumber, setLoanNumber] = useState("");
  const [lot, setLot] = useState<Lot>();
  const [financial, setFinancial] = useState("");
  const [history, setHistory] = useState<Timeline>();
  const [queryError, setQueryError] = useState("");
  const [queryBusy, setQueryBusy] = useState(false);
  const queryActive = useRef(false);

  useEffect(() => { onLockChange?.(busy || pending || Boolean(prepared)); }, [busy, pending, prepared, onLockChange]);
  useEffect(() => {
    if (!allowedOperations.includes(operation) && !active.current && !pending && !prepared) {
      setOperation(allowedOperations[0] ?? "register_lot"); setValues({}); setError(""); setStatus("");
    }
  }, [allowedOperations, operation, pending, prepared]);

  useEffect(() => {
    if (!request || !allowedOperations.includes(request.operation)) return;
    if (active.current || pending) { setError("Terminá o consultá la operación en curso antes de cambiar de acción."); return; }
    setOperation(request.operation);
    setValues({ kg: "12000", moisture: "5", rate: "12", duration: "180", ...toDisplayValues(request.values) });
    setPrepared(undefined); setRequired([]); setStatus(""); setError("");
    if (request.values.lot) setLotNumber(request.values.lot);
    if (request.values.loan) setLoanNumber(request.values.loan);
    document.getElementById("protocol-heading")?.scrollIntoView({ block: "start" });
  }, [request]);

  useEffect(() => {
    if (selectedLot) { setLotNumber(selectedLot.lot); setLot(undefined); setHistory(undefined); setFinancial(""); setQueryError(""); }
  }, [selectedLot]);

  useEffect(() => {
    if (!evidenceSelection) return;
    if (active.current || pending || prepared) { setError("Terminá o descartá la operación preparada antes de cambiar el comprobante."); return; }
    if (!tasks[operation].fields.includes("evidence")) { setError("Elegí primero una tarea que use un comprobante y volvé a seleccionarlo."); return; }
    if (!/^[a-f0-9]{64}$/.test(evidenceSelection.sha256)) return;
    setValues(current => ({ ...current, evidence: evidenceSelection.sha256 })); setStatus("Código del comprobante incorporado. Revisá la operación antes de firmar."); setError("");
  }, [evidenceSelection]);

  async function action(work: () => Promise<void>) {
    if (active.current) return;
    active.current = true; setBusy(true); setError("");
    try { await work(); } catch (error) { setStatus(""); setError(explainError(error)); }
    finally { active.current = false; setBusy(false); }
  }
  function invalidate() { setCapacity(undefined); setPrepared(undefined); setRequired([]); setStatus(""); }
  async function prepare(event: FormEvent) {
    event.preventDefault();
    await action(async () => {
      if (!allowedOperations.includes(operation)) throw new Error("Elegí una operación de esta vista.");
      invalidate(); setTxHash(""); setStatus(phaseText.simulating);
      const contractValues = toContractValues(values);
      const address = await connectWallet(); setAccount(address); setSource(address);
      const tx = await buildOperation(operation, contractValues, address);
      assertSimulationSucceeded(tx);
      setPrepared(tx); setRequired(tx.needsNonInvokerSigningBy());
      setStatus("Operación simulada. Revisá los datos antes de firmar.");
    });
  }
  async function query(event: FormEvent) {
    event.preventDefault();
    if (queryActive.current || busy) return;
    setQueryError(""); setLot(undefined); setHistory(undefined); setFinancial("");
    if (!/^[1-9]\d*$/.test(lotNumber)) { setQueryError("Ingresá un número de lote positivo."); return; }
    queryActive.current = true; setQueryBusy(true);
    try {
      const value = await getLot(BigInt(lotNumber)); setLot(value);
      // SDK 16 decodes absent on-chain Option values as null at runtime.
      if (value.loan_id != null) {
        const [loan, debt] = await Promise.all([getLoan(value.loan_id), getDebt(value.loan_id)]);
        setFinancial(`${loanLabels[loan.status.tag] ?? loan.status.tag} · deuda consultada: ${formatUnits(debt)} USDC de prueba`);
      } else if (value.physical_status.tag === "Verified" && value.receipt_status.tag === "Receipted") {
        try { setFinancial(`Sin garantía comprometida · monto disponible según el contrato: ${formatUnits(await getCapacity(value.id))} USDC de prueba`); }
        catch (error) { setFinancial(`Sin garantía comprometida · ${explainError(error)}`); }
      } else setFinancial("Sin préstamo vinculado. El estado físico se conserva.");
      const response = await fetch(`/api/lots/${lotNumber}/history`, { cache: "no-store" });
      if (!response.ok) throw new Error("El estado on-chain fue consultado; el indexador todavía no tiene historial disponible.");
      const timeline = await response.json() as Timeline;
      setHistory(timeline);
    } catch (error) { setQueryError(explainError(error)); }
    finally { queryActive.current = false; setQueryBusy(false); }
  }

  const guide = operation === "grant_role" || workspaceRole === "admin" ? undefined : taskGuidance[operation];
  const amountLabel = operation === "post_valuation" ? "Valor total del lote (USDC de prueba)" : operation === "approve_repayment" ? "Máximo autorizado para el pago (USDC de prueba)" : operation === "repay" ? "Monto máximo de este pago (USDC de prueba)" : fields.amount;
  const fieldLabel = (key: string) => key === "amount" ? amountLabel : fields[key];

  return <>
    <section className="panel" aria-labelledby="protocol-heading" hidden={view === "trace" || allowedOperations.length === 0}>
      <p className="eyebrow">{request ? "Paso 3 / Confirmación" : "02 / Operaciones reales en Testnet"}</p>
      <h2 id="protocol-heading">{request ? "Revisá los datos antes de firmar" : "Protocolo y firmas por rol"}</h2>
      {request ? <details className="signing-help"><summary>Cómo funciona la firma</summary><ol aria-label="Pasos para confirmar una operación"><li>Completá los datos y pedí la revisión automática. Todavía no se envía nada.</li><li>Revisá el resumen. Si hace falta, el custodio agrega su firma.</li><li>Confirmá en Freighter, la billetera de prueba, y esperá el comprobante.</li></ol><p>Usá cuentas de prueba distintas para cooperativa, custodio y verificador. El contrato decide los permisos y los importes admisibles.</p></details> : <><ol aria-label="Pasos para confirmar una operación"><li>Completá los datos y pedí la revisión automática. Todavía no se envía nada.</li><li>Revisá el resumen. Si hace falta, el custodio agrega su firma.</li><li>Confirmá en Freighter, la billetera de prueba, y esperá el comprobante.</li></ol><p>Usá cuentas de prueba distintas para cooperativa, custodio y verificador. El contrato decide los permisos y los importes admisibles.</p></>}
      <button disabled={busy} onClick={() => action(async () => { setAccount(await connectWallet()); invalidate(); })}>Conectar Freighter</button>
      {account && <p className="address">Cuenta conectada: <code>{account}</code></p>}
      {guide && <section className="task-guidance" aria-labelledby="task-guidance-heading"><h3 id="task-guidance-heading">{guide.title}</h3><p><strong>Antes de empezar:</strong> {guide.before}</p><p><strong>Si se confirma:</strong> {guide.result}</p>{workspaceRole === "custodian" && <p className="muted">Estás en la vista del depósito. Tu participación es la cofirma: la preparación se hace con la cuenta del inspector para un ingreso o del titular para un retiro. Cambiar de vista no cambia la cuenta de Freighter.</p>}<ContextHelp key={`${workspaceRole}-${operation}`} title={guide.helpTitle}><p>{guide.explanation}</p></ContextHelp></section>}
      <form onSubmit={prepare}>
        <fieldset disabled={busy || pending}>
          <legend>Acción del rol</legend>
          {request ? <p className="prepared-task"><strong>Tarea preparada:</strong> {tasks[operation].label}. Para hacer otra tarea, volvé al resumen o elegí otra sección.</p> : <details className="operation-picker">
            <summary>Tarea preparada: <strong>{tasks[operation].label}</strong></summary>
            <label htmlFor="operation">Elegir otra tarea</label>
            <select id="operation" value={operation} onChange={e => { setOperation(e.target.value as Operation); invalidate(); }}>
              {allowedOperations.map(value => <option key={value} value={value}>{tasks[value].label}</option>)}
            </select>
          </details>}
          {operation === "register_lot" && referenceLots.length > 0 && <div className="field"><label htmlFor="demo-warehouse-reference">Usar la referencia de un depósito ya consultado (opcional)</label><select id="demo-warehouse-reference" value="" onChange={event => {
            const lot = referenceLots.find(item => item.id.toString() === event.target.value); if (!lot) return;
            setValues(current => ({ ...current, custodian: lot.custodian, warehouse: Array.from(lot.warehouse_id).map(byte => byte.toString(16).padStart(2, "0")).join("") })); invalidate();
          }}><option value="">Elegí un lote de referencia</option>{referenceLots.map(lot => <option key={lot.id.toString()} value={lot.id.toString()}>Depósito del lote #{lot.id.toString()}</option>)}</select><p className="muted">Copia la cuenta y el código del depósito de ese registro. Usalo solo si corresponde al nuevo lote de prueba. El contrato vuelve a comprobar los permisos; no se inventa un depósito.</p></div>}
          {tasks[operation].fields.map(key => <div className="field" key={key}>
            <label htmlFor={`field-${key}`}>{fieldLabel(key)}</label>
            {key === "role" ? <select id={`field-${key}`} required value={values[key] ?? ""} onChange={e => { setValues({ ...values, [key]: e.target.value }); invalidate(); }}><option value="">Elegí una tarea</option><option value="Custodian">Custodiar mercadería</option><option value="Verifier">Verificar e inspeccionar lotes</option><option value="PriceOracle">Publicar el valor de los lotes</option></select> : <input id={`field-${key}`} required type={key === "started" ? "datetime-local" : "text"} inputMode={["moisture", "rate", "amount"].includes(key) ? "decimal" : ["lot", "loan", "kg", "duration", "expiry"].includes(key) ? "numeric" : undefined} aria-describedby={fieldHelp[key] ? `help-${key}` : undefined} value={values[key] ?? ""} onChange={e => { setValues({ ...values, [key]: e.target.value }); invalidate(); }} autoComplete="off" />}
            {fieldHelp[key] && <p id={`help-${key}`} className="muted">{fieldHelp[key]}</p>}
            {key === "lot" && operation === "request_loan" && <><button type="button" onClick={() => action(async () => {
              const id = values.lot ?? ""; if (!/^[1-9]\d*$/.test(id)) throw new Error("Ingresá primero el número de lote.");
              const amount = await getCapacity(BigInt(id)); setCapacity({ lot: id, amount });
            })}>Consultar monto máximo del contrato</button>{capacity && capacity.lot === values.lot && <p role="status">Monto máximo consultado: {formatUnits(capacity.amount)} USDC de prueba. Es una consulta, no una aprobación; el contrato revisa de nuevo al preparar y ejecutar.</p>}</>}
            {key === "amount" && <ContextHelp title="¿Qué es USDC de prueba?"><p>Es el activo propio de esta demostración en Stellar Testnet. No son pesos, no es dinero real ni USDC emitido por Circle. El importe se expresa en esa unidad; la app no convierte automáticamente desde pesos.</p></ContextHelp>}
            {key === "evidence" && <ContextHelp title="¿Qué es el código SHA-256?"><p>Es una huella del contenido del archivo. Copiá el código completo que recibiste al guardarlo, sin cambiar caracteres. Permite comprobar si el archivo cambió; no prueba que lo que dice el informe sea cierto. No es una contraseña.</p></ContextHelp>}
            {(key === "account" || key === "custodian") && workspaceRole !== "admin" && <ContextHelp title="¿Dónde consigo la cuenta pública?"><p>Pedile a la otra persona que copie su dirección pública desde Freighter. Verificá con ella que sea la cuenta correcta de Testnet. No compartan palabras de recuperación ni claves secretas; esas nunca se pegan en este formulario.</p></ContextHelp>}
            {key === "expiry" && <button type="button" disabled={busy} onClick={() => action(async () => {
              const expiry = String(await getLatestLedger() + 100);
              setValues(current => ({ ...current, expiry })); invalidate();
            })}>Completar vencimiento automáticamente</button>}
          </div>)}
          <button type="submit">Revisar datos antes de firmar</button>
        </fieldset>
      </form>
      {prepared && <button disabled={busy || pending} onClick={() => { invalidate(); setError(""); }}>Descartar operación preparada</button>}
      {prepared && <div className="result">
        <h3>Revisión de la operación</h3>
        <p>{tasks[operation].label}</p>
        <p className="address">Firma final: <code>{source}</code></p>
        <dl>{tasks[operation].fields.map(key => <div key={key}><dt>{fieldLabel(key)}</dt><dd className="address">{values[key]}</dd></div>)}</dl>
        {required.length > 0 && <>
          <p className="address">Falta co-firma: {required.join(", ")}</p>
          <p>En esta demo, cambiá la cuenta activa en Freighter al custodio. Co-firmá y volvé a la cuenta de firma final antes de enviar. Ambas firmas autorizan la misma operación.</p>
          <button disabled={busy || pending} onClick={() => action(async () => {
            const address = await connectWallet();
            if (!required.includes(address)) throw new Error("La cuenta activa no es una de las co-firmantes requeridas.");
            setAccount(address);
            await prepared.signAuthEntries({ address, signAuthEntry: walletSigners(address).signAuthEntry });
            setRequired(prepared.needsNonInvokerSigningBy()); setStatus("Co-firma agregada. Volvé a la cuenta de firma final.");
          })}>Co-firmar con la cuenta activa</button>
        </>}
        <button disabled={busy || pending || required.length > 0} onClick={() => action(async () => {
          try {
            const current = await connectWallet();
            if (current !== source) throw new Error("Volvé a la cuenta de firma final en Freighter.");
            setAccount(current);
            const outcome = await invoke(async () => prepared, phase => setStatus(phaseText[phase]));
            setTxHash(outcome.hash); setPrepared(undefined); onConfirmed?.();
          } catch (error) {
            if (error instanceof ConfirmationPending) { setTxHash(error.hash); setPending(true); setPrepared(undefined); }
            throw error;
          }
        })}>Firmar y enviar a Testnet</button>
      </div>}
      <p role="status" aria-live="polite">{busy && !status ? "Procesando…" : status}</p>
      {error && <p role="alert" className="error">{error}</p>}
      {txHash && <div className="result">
        <a className="address" href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noreferrer">Ver transacción {txHash}</a>
        {pending && <button disabled={busy} onClick={() => action(async () => {
          const result = await getTransaction(txHash);
          if (result.status === "SUCCESS" || result.status === "FAILED") {
            setStatus(result.status === "SUCCESS" ? phaseText.confirmed : "La transacción falló en Testnet."); setPending(false);
          } else setStatus("Todavía no hay confirmación. No vuelvas a enviar la misma operación.");
        })}>Consultar confirmación pendiente</button>}
      </div>}
      <p className="muted">El fondeo y el repago transfieren USDC de prueba directamente entre las partes. Reclamar el certificado no recupera físicamente la yerba: requiere al custodio y un proceso legal.</p>
      {allowedOperations.includes("repay") && <><ContextHelp title="¿Cómo funcionan el permiso de pago y su vencimiento?"><p>El permiso y el pago son dos firmas distintas. El permiso pone un máximo y vence en un número de bloque de la red. Usá el botón para completar ese vencimiento; no hace falta calcular bloques. Si no continuás con el pago, podés quitar el permiso desde las tareas.</p></ContextHelp>
      <p className="muted">Antes de repagar, autorizá un monto máximo de USDC con vencimiento. Después firmá el repago: solo se cobra hasta la deuda vigente. Si cancelás ese segundo paso, la autorización permanece hasta su vencimiento o revocación; podés revocarla desde el selector de operaciones.</p></>}
    </section>
    {view !== "operation" && <section className="panel" aria-labelledby="trace-heading">
      <p className="eyebrow">03 / Consulta pública sin billetera</p>
      <h2 id="trace-heading">Estado e historial del lote</h2>
      <p className="muted">Un incumplimiento o reclamo del certificado no recupera físicamente la yerba: requiere al custodio y un proceso legal.</p>
      <form onSubmit={query} aria-busy={queryBusy}>
        <label htmlFor="query-lot">Lote a consultar</label>
        <input id="query-lot" inputMode="numeric" value={lotNumber} onChange={e => setLotNumber(e.target.value)} required disabled={queryBusy || busy} />
        <button type="submit" disabled={queryBusy || busy}>{queryBusy ? "Consultando lote…" : "Consultar lote e historial"}</button>
      </form>
      {queryError && <p role="alert" className="error">{queryError}</p>}
      {lot && <dl>
        <div><dt>Estado físico</dt><dd>{physicalLabels[lot.physical_status.tag] ?? lot.physical_status.tag} · {lot.net_kg.toString()} kg · humedad {lot.moisture_bps / 100} %</dd></div>
        <div><dt>Estado del certificado</dt><dd>{receiptLabels[lot.receipt_status.tag] ?? lot.receipt_status.tag}</dd></div>
        <div><dt>Estado del préstamo</dt><dd>{financial}</dd></div>
        <div><dt>Titular actual</dt><dd className="address">{lot.owner}</dd></div>
      </dl>}
      {history && <>
        <p className="muted">Historial disponible desde el bloque {history.fromLedger} hasta el bloque {history.nextLedger - 1}. Última actualización: {history.updatedAt ?? "sin actualización"}. Puede haber demora en la historia; el estado actual se consulta al contrato.</p>
        {history.error && <p role="alert" className="error">Historial incompleto o desactualizado: {history.error}</p>}
        {history.events.length ? <ol className="timeline" aria-label="Eventos confirmados del lote">{history.events.map(event => <li key={event.id}>
          <strong>{businessEventLabel(event.name, event.data)}</strong><details><summary>Identificador técnico</summary>{event.name}</details> · {new Date(event.closedAt).toLocaleString("es-AR")}<br />
          <a href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`} target="_blank" rel="noreferrer">Ver registro confirmado</a>
          {eventEvidence(event.data) && <> · <a href={`/api/evidence/${eventEvidence(event.data)}`}>Descargar evidencia por hash</a></>}
          <details><summary>Datos públicos del evento</summary><pre>{JSON.stringify(event.data, null, 2)}</pre></details>
        </li>)}</ol> : <p>No hay eventos indexados para este lote en el intervalo indicado.</p>}
      </>}
      <form onSubmit={event => { event.preventDefault(); action(async () => {
        if (!/^[1-9]\d*$/.test(loanNumber)) throw new Error("Ingresá un préstamo positivo.");
        const [loan, debt] = await Promise.all([getLoan(BigInt(loanNumber)), getDebt(BigInt(loanNumber))]);
        setLoanStatus(`Préstamo ${loanNumber}: ${loanLabels[loan.status.tag] ?? loan.status.tag}; ${loan.status.tag === "Liquidated" ? "exposición congelada al reclamo, no cobrable nuevamente" : "deuda actual"}: ${formatUnits(debt)} USDC de prueba.`);
      }); }}>
        <label htmlFor="query-loan">Consultar un préstamo, incluso después de liberar el lote</label>
        <input id="query-loan" inputMode="numeric" value={loanNumber} onChange={e => setLoanNumber(e.target.value)} required disabled={busy} />
        <button disabled={busy} type="submit">Consultar préstamo</button>
      </form>
      <p role="status" aria-live="polite">{loanStatus}</p>
      {view === "trace" && error && <p role="alert" className="error">{error}</p>}
    </section>}
  </>;
}
