"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AssembledTransaction } from "@stellar/stellar-sdk/contract";
import type { Lot } from "registry-client";
import { connectWallet, walletSigners } from "../lib/wallet/freighter";
import { buildOperation, type Operation } from "../lib/stellar/operations";
import { getCapacity, getDebt, getLatestLedger, getLoan, getLot, getTransaction } from "../lib/stellar/query";
import { ConfirmationPending, invoke, type TxPhase } from "../lib/stellar/invoke";
import { explainError } from "../lib/stellar/errors";
import { formatUnits } from "../lib/stellar/units";

const fields: Record<string, string> = { lot: "Número de lote", loan: "Número de préstamo", kg: "Peso en kg enteros",
  moisture: "Humedad en basis points (500 = 5 %)", evidence: "SHA-256 de evidencia sintética",
  account: "Cuenta que recibirá el rol", role: "Rol: Custodian, Verifier o PriceOracle",
  custodian: "Cuenta del custodio", warehouse: "Hash opaco de identificación del depósito",
  started: "Comienzo del estacionamiento (segundos Unix)", amount: "Importe en USDC de prueba",
  rate: "Tasa anual en basis points (1200 = 12 %)", duration: "Plazo en segundos (15552000 = 180 días)", expiry: "Ledger de vencimiento de la autorización de USDC" };
const tasks: Record<Operation, { label: string; fields: string[] }> = {
  grant_role: { label: "Admin · Otorgar rol", fields: ["account", "role"] },
  register_lot: { label: "Cooperativa · Registrar lote", fields: ["custodian", "kg", "warehouse", "started", "evidence"] },
  verify_lot: { label: "Verificador + custodio · Verificar ingreso", fields: ["lot", "kg", "moisture", "evidence"] },
  issue_receipt: { label: "Verificador · Emitir certificado", fields: ["lot"] },
  post_valuation: { label: "Oráculo · Publicar valuación", fields: ["lot", "amount", "evidence"] },
  request_loan: { label: "Cooperativa · Solicitar préstamo", fields: ["lot", "amount", "rate", "duration"] },
  fund: { label: "Prestamista · Fondear", fields: ["loan"] },
  record_inspection: { label: "Verificador · Registrar inspección aprobada", fields: ["lot", "kg", "moisture", "evidence"] },
  repay: { label: "Pagador · Repagar", fields: ["loan", "amount"] },
  approve_repayment: { label: "Pagador · Autorizar monto máximo de USDC para repago", fields: ["amount", "expiry"] },
  revoke_allowance: { label: "Pagador · Revocar autorización de USDC", fields: [] },
  partial_withdraw: { label: "Cooperativa + custodio · Retirar parte del lote gravado", fields: ["loan", "kg", "evidence"] },
  impair: { label: "Verificador · Atestar deterioro por humedad", fields: ["lot", "evidence"] },
  mark_default: { label: "Cualquier cuenta · Declarar default", fields: ["loan"] },
  claim_collateral: { label: "Prestamista · Reclamar certificado", fields: ["loan"] },
  cancel_request: { label: "Cooperativa · Cancelar solicitud sin fondeo", fields: ["loan"] },
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

export function ProtocolWorkbench({ request, view = "all", selectedLot, onConfirmed }: { request?: OperationRequest; view?: "all" | "trace"; selectedLot?: { id: number; lot: string }; onConfirmed?: () => void } = {}) {
  const [account, setAccount] = useState("");
  const [operation, setOperation] = useState<Operation>("register_lot");
  const [values, setValues] = useState<Record<string, string>>({ kg: "12000", moisture: "500", rate: "1200", duration: "15552000" });
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
  const [loanNumber, setLoanNumber] = useState("");
  const [lot, setLot] = useState<Lot>();
  const [financial, setFinancial] = useState("");
  const [history, setHistory] = useState<Timeline>();
  const [queryError, setQueryError] = useState("");
  const [queryBusy, setQueryBusy] = useState(false);
  const queryActive = useRef(false);

  useEffect(() => {
    if (!request) return;
    if (active.current || pending) { setError("Terminá o consultá la operación en curso antes de cambiar de acción."); return; }
    setOperation(request.operation);
    setValues({ kg: "12000", moisture: "500", rate: "1200", duration: "15552000", ...request.values });
    setPrepared(undefined); setRequired([]); setStatus(""); setError("");
    if (request.values.lot) setLotNumber(request.values.lot);
    if (request.values.loan) setLoanNumber(request.values.loan);
    document.getElementById("protocol-heading")?.scrollIntoView({ block: "start" });
  }, [request]);

  useEffect(() => {
    if (selectedLot) { setLotNumber(selectedLot.lot); setLot(undefined); setHistory(undefined); setFinancial(""); setQueryError(""); }
  }, [selectedLot]);

  async function action(work: () => Promise<void>) {
    if (active.current) return;
    active.current = true; setBusy(true); setError("");
    try { await work(); } catch (error) { setError(explainError(error)); }
    finally { active.current = false; setBusy(false); }
  }
  function invalidate() { setPrepared(undefined); setRequired([]); setStatus(""); }
  async function prepare(event: FormEvent) {
    event.preventDefault();
    await action(async () => {
      invalidate(); setTxHash(""); setStatus(phaseText.simulating);
      const address = await connectWallet(); setAccount(address); setSource(address);
      const tx = await buildOperation(operation, values, address);
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
        setFinancial(`${loan.status.tag} · deuda consultada: ${formatUnits(debt)} USDC de prueba`);
      } else if (value.physical_status.tag === "Verified" && value.receipt_status.tag === "Receipted") {
        try { setFinancial(`Sin gravamen · capacidad actual: ${formatUnits(await getCapacity(value.id))} USDC de prueba`); }
        catch (error) { setFinancial(`Sin gravamen · ${explainError(error)}`); }
      } else setFinancial("Sin préstamo vinculado. El estado físico se conserva.");
      const response = await fetch(`/api/lots/${lotNumber}/history`, { cache: "no-store" });
      if (!response.ok) throw new Error("El estado on-chain fue consultado; el indexador todavía no tiene historial disponible.");
      const timeline = await response.json() as Timeline;
      setHistory(timeline);
    } catch (error) { setQueryError(explainError(error)); }
    finally { queryActive.current = false; setQueryBusy(false); }
  }

  return <>
    <section className="panel" aria-labelledby="protocol-heading" hidden={view === "trace"}>
      <p className="eyebrow">02 / Operaciones reales en Testnet</p>
      <h2 id="protocol-heading">Protocolo y firmas por rol</h2>
      <p>Usá cuentas de prueba distintas para cooperativa, custodio y verificador. El contrato decide los permisos y los importes admisibles.</p>
      <button disabled={busy} onClick={() => action(async () => { setAccount(await connectWallet()); invalidate(); })}>Conectar Freighter</button>
      {account && <p className="address">Cuenta conectada: <code>{account}</code></p>}
      <form onSubmit={prepare}>
        <fieldset disabled={busy || pending}>
          <legend>Acción del rol</legend>
          <label htmlFor="operation">Operación</label>
          <select id="operation" value={operation} onChange={e => { setOperation(e.target.value as Operation); invalidate(); }}>
            {Object.entries(tasks).map(([value, task]) => <option key={value} value={value}>{task.label}</option>)}
          </select>
          {tasks[operation].fields.map(key => <div className="field" key={key}>
            <label htmlFor={`field-${key}`}>{fields[key]}</label>
            <input id={`field-${key}`} required value={values[key] ?? ""} onChange={e => { setValues({ ...values, [key]: e.target.value }); invalidate(); }} autoComplete="off" />
            {key === "expiry" && <button type="button" disabled={busy} onClick={() => action(async () => {
              const expiry = String(await getLatestLedger() + 100);
              setValues(current => ({ ...current, expiry })); invalidate();
            })}>Sugerir vigencia de 100 ledgers</button>}
          </div>)}
          <button type="submit">Preparar y simular operación</button>
        </fieldset>
      </form>
      {prepared && <div className="result">
        <h3>Revisión de la operación</h3>
        <p>{tasks[operation].label}</p>
        <p className="address">Firma final: <code>{source}</code></p>
        <dl>{tasks[operation].fields.map(key => <div key={key}><dt>{fields[key]}</dt><dd className="address">{values[key]}</dd></div>)}</dl>
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
      <p className="muted">Antes de repagar, autorizá un monto máximo de USDC con vencimiento. Después firmá el repago: solo se cobra hasta la deuda vigente. Si cancelás ese segundo paso, la autorización permanece hasta su vencimiento o revocación; podés revocarla desde el selector de operaciones.</p>
    </section>
    <section className="panel" aria-labelledby="trace-heading">
      <p className="eyebrow">03 / Consulta pública sin billetera</p>
      <h2 id="trace-heading">Estado e historial del lote</h2>
      <form onSubmit={query} aria-busy={queryBusy}>
        <label htmlFor="query-lot">Lote a consultar</label>
        <input id="query-lot" inputMode="numeric" value={lotNumber} onChange={e => setLotNumber(e.target.value)} required disabled={queryBusy || busy} />
        <button type="submit" disabled={queryBusy || busy}>{queryBusy ? "Consultando lote…" : "Consultar lote e historial"}</button>
      </form>
      {queryError && <p role="alert" className="error">{queryError}</p>}
      {lot && <dl>
        <div><dt>Estado físico</dt><dd>{lot.physical_status.tag} · {lot.net_kg.toString()} kg · humedad {lot.moisture_bps / 100} %</dd></div>
        <div><dt>Estado del certificado</dt><dd>{lot.receipt_status.tag}</dd></div>
        <div><dt>Estado financiero consultado al contrato</dt><dd>{financial}</dd></div>
        <div><dt>Titular actual</dt><dd className="address">{lot.owner}</dd></div>
      </dl>}
      {history && <>
        <p className="muted">Historial indexado desde ledger {history.fromLedger} hasta {history.nextLedger - 1}. Última actualización: {history.updatedAt ?? "sin actualización"}. El historial puede demorar; los contratos conservan la autoridad del estado actual.</p>
        {history.error && <p role="alert" className="error">Historial incompleto o desactualizado: {history.error}</p>}
        {history.events.length ? <ol className="timeline" aria-label="Eventos confirmados del lote">{history.events.map(event => <li key={event.id}>
          <strong>{event.name}</strong> · ledger {event.ledger}<br />
          <a href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`} target="_blank" rel="noreferrer">Ver registro confirmado</a>
          {eventEvidence(event.data) && <> · <a href={`/api/evidence/${eventEvidence(event.data)}`}>Descargar evidencia por hash</a></>}
          <details><summary>Datos públicos del evento</summary><pre>{JSON.stringify(event.data, null, 2)}</pre></details>
        </li>)}</ol> : <p>No hay eventos indexados para este lote en el intervalo indicado.</p>}
      </>}
      <form onSubmit={event => { event.preventDefault(); action(async () => {
        if (!/^[1-9]\d*$/.test(loanNumber)) throw new Error("Ingresá un préstamo positivo.");
        const [loan, debt] = await Promise.all([getLoan(BigInt(loanNumber)), getDebt(BigInt(loanNumber))]);
        setStatus(`Préstamo ${loanNumber}: ${loan.status.tag}; ${loan.status.tag === "Liquidated" ? "exposición congelada al reclamo, no cobrable nuevamente" : "deuda actual"}: ${formatUnits(debt)} USDC de prueba.`);
      }); }}>
        <label htmlFor="query-loan">Consultar un préstamo, incluso después de liberar el lote</label>
        <input id="query-loan" inputMode="numeric" value={loanNumber} onChange={e => setLoanNumber(e.target.value)} required disabled={busy} />
        <button disabled={busy} type="submit">Consultar préstamo</button>
      </form>
    </section>
  </>;
}
