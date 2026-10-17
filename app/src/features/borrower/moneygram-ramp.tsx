"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Banknote, Building2, CheckCircle2, Coins, X } from "lucide-react";
import { formatUnits, parseUnits } from "../../lib/stellar/units";

// Illustrative assumption only: no exchange-rate feed or MoneyGram connection.
const ILLUSTRATIVE_ARS_RATE = 1280n;
const MAX_DEMO_USDC = 1_000_000n * 10_000_000n;
const DEMO_REGIONS = ["Posadas · Misiones", "Apóstoles · Misiones", "Oberá · Misiones", "Gdor. Virasoro · Corrientes"];

type DemoQuote = { usdc: string; ars: string; destination: string };

function quoteAmount(input: string): { units?: bigint; error?: string } {
  if (input.length > 32) return { error: "Usá un importe de hasta 1.000.000 USDC de ejemplo." };
  try {
    const units = parseUnits(input);
    if (units <= 0n || units > MAX_DEMO_USDC) return { error: "Ingresá un importe mayor a cero y de hasta 1.000.000 USDC de ejemplo." };
    return { units };
  } catch {
    return { error: "Ingresá un importe con punto decimal y hasta 7 decimales, sin separador de miles." };
  }
}

export function MoneyGramRampModal({
  isOpen,
  onClose,
  defaultUsdcAmount = "50000",
  loanId,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultUsdcAmount?: string;
  loanId?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [usdcAmount, setUsdcAmount] = useState(defaultUsdcAmount);
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [region, setRegion] = useState(DEMO_REGIONS[0]);
  const [quote, setQuote] = useState<DemoQuote | null>(null);
  const amount = quoteAmount(usdcAmount);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  function close() {
    setQuote(null);
    onClose();
  }

  function simulate() {
    if (amount.units === undefined) return;
    setQuote({
      usdc: formatUnits(amount.units),
      ars: formatUnits(amount.units * ILLUSTRATIVE_ARS_RATE),
      destination: method === "cash" ? `Zona ilustrativa: ${region}` : "Cuenta bancaria ficticia de demostración",
    });
  }

  return <dialog
    ref={dialog}
    aria-labelledby="moneygram-modal-title"
    aria-describedby="moneygram-demo-notice"
    onCancel={event => { event.preventDefault(); close(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled)"));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }}
    className="yc-card"
    style={{ width: "min(680px, calc(100% - 2rem))", maxHeight: "90dvh", overflowY: "auto", margin: "auto", color: "var(--ink)", background: "var(--surface)", padding: "1.5rem", border: "1px solid var(--line)" }}
  >
    <div className="yc-sectionhead" style={{ alignItems: "flex-start", gap: "1rem" }}>
      <div>
        <span className="yc-pill amber">Simulación local · Sin fondos reales</span>
        <h2 id="moneygram-modal-title" style={{ marginTop: ".75rem" }}>Simular conversión a pesos</h2>
      </div>
      <button type="button" className="yc-btn secondary" onClick={close} aria-label="Cerrar simulación"><X size={18} aria-hidden="true" /></button>
    </div>
    <p id="moneygram-demo-notice" className="yc-notice">Demo conceptual de una futura rampa como MoneyGram. No está conectada a MoneyGram, a un banco ni a un Anchor SEP-24. No mueve ni bloquea USDC, no emite órdenes y no permite cobrar pesos.</p>
    {loanId && <p className="yc-sub">Préstamo #{loanId} como contexto. El importe de ejemplo no representa un saldo disponible.</p>}
    {!quote ? <form onSubmit={event => { event.preventDefault(); simulate(); }} style={{ display: "grid", gap: "1rem" }} noValidate>
      <div className="yc-field">
        <label htmlFor="demo-usdc">Importe ilustrativo en USDC</label>
        <input id="demo-usdc" inputMode="decimal" value={usdcAmount} maxLength={32} onChange={event => setUsdcAmount(event.target.value)} aria-invalid={Boolean(amount.error)} aria-describedby="demo-amount-help demo-amount-error" />
        <p id="demo-amount-help" className="yc-sub">Hasta 1.000.000, con punto decimal y hasta 7 decimales. No se consulta tu billetera.</p>
        <p id="demo-amount-error" className="yc-sub" role={amount.error ? "alert" : undefined}>{amount.error}</p>
      </div>
      <div className="yc-notice">
        <strong>Supuesto fijo del ejemplo: 1 USDC = 1.280 ARS.</strong>
        <p>No es una cotización actual, MEP ni una oferta. Las comisiones, impuestos, disponibilidad y condiciones de un proveedor real no están incluidos.</p>
        <p>Equivalente ilustrativo, antes de costos: <strong>{amount.units === undefined ? "—" : `${formatUnits(amount.units * ILLUSTRATIVE_ARS_RATE)} ARS`}</strong></p>
      </div>
      <fieldset style={{ border: "1px solid var(--line)", borderRadius: ".75rem", padding: "1rem" }}>
        <legend>Canal hipotético del ejemplo</legend>
        <div className="yc-actions">
          <label><input style={{ width: "auto", display: "inline-block", marginRight: ".5rem" }} type="radio" name="demo-method" value="cash" checked={method === "cash"} onChange={() => setMethod("cash")} /> Efectivo (simulación)</label>
          <label><input style={{ width: "auto", display: "inline-block", marginRight: ".5rem" }} type="radio" name="demo-method" value="bank" checked={method === "bank"} onChange={() => setMethod("bank")} /> Cuenta bancaria (simulación)</label>
        </div>
      </fieldset>
      {method === "cash" ? <div className="yc-field">
        <label htmlFor="demo-region">Zona del ejemplo · No es una sucursal</label>
        <select id="demo-region" value={region} onChange={event => setRegion(event.target.value)}>{DEMO_REGIONS.map(value => <option key={value}>{value}</option>)}</select>
        <p className="yc-sub">Las ciudades solo ilustran el contexto del NEA. No se verificaron puntos de atención, horarios ni servicios.</p>
      </div> : <p className="yc-notice"><Building2 size={18} aria-hidden="true" /> Usamos una cuenta ficticia fija. No ingreses nombre, CUIT, CBU, alias ni datos reales.</p>}
      <div className="yc-actions">
        <button type="submit" className="yc-btn primary" disabled={amount.units === undefined}>Ver resultado de ejemplo<ArrowRight size={16} aria-hidden="true" /></button>
        <button type="button" className="yc-btn secondary" onClick={close}>Cancelar simulación</button>
      </div>
    </form> : <section aria-labelledby="demo-result-title" aria-live="polite" style={{ display: "grid", gap: "1rem" }}>
      <h3 id="demo-result-title"><CheckCircle2 size={20} aria-hidden="true" /> Resultado ilustrativo · Sin operación real</h3>
      <dl>
        <dt>Importe del ejemplo</dt><dd>{quote.usdc} USDC</dd>
        <dt>Equivalente antes de costos</dt><dd>{quote.ars} ARS</dd>
        <dt>Destino hipotético</dt><dd>{quote.destination}</dd>
      </dl>
      <p className="yc-notice">No se creó una transacción Stellar ni una orden de MoneyGram. No hay código de retiro ni comprobante de cobro. Tus fondos y el préstamo no cambiaron.</p>
      <div className="yc-actions">
        <button type="button" className="yc-btn primary" onClick={close}>Cerrar simulación</button>
        <button type="button" className="yc-btn secondary" onClick={() => setQuote(null)}>Probar otro ejemplo</button>
      </div>
    </section>}
  </dialog>;
}

export function MoneyGramRampBanner({ onOpen }: { onOpen: () => void }) {
  return <section className="yc-card" style={{ borderLeft: "4px solid var(--accent)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
    <div style={{ maxWidth: "540px" }}>
      <h3><Banknote size={20} aria-hidden="true" /> De USDC a pesos · Simulación</h3>
      <p className="yc-sub">Explorá un ejemplo de conversión para la cosecha. Una rampa como MoneyGram requiere una integración futura; este prototipo no ofrece retiros ni transferencias bancarias.</p>
    </div>
    <button type="button" className="yc-btn primary" onClick={onOpen}><Coins size={16} aria-hidden="true" />Explorar simulación</button>
  </section>;
}
