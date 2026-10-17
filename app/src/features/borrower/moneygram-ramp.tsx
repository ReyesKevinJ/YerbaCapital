"use client";

import { useState } from "react";
import {
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  Coins,
  ExternalLink,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";

// Verified MoneyGram locations in NEA yerba mate producing zone (Misiones & Corrientes)
const MONEYGRAM_BRANCHES = [
  {
    id: "posadas-centro",
    city: "Posadas",
    province: "Misiones",
    address: "Colón y San Martín 1540",
    hours: "Lun a Vie 08:00 - 18:00",
    name: "Sucursal Posadas Centro - Banco Macro / Agente Oficial",
  },
  {
    id: "apostoles-centro",
    city: "Apóstoles",
    province: "Misiones",
    address: "Belgrano 410",
    hours: "Lun a Vie 08:00 - 16:00",
    name: "Sucursal Apóstoles - Capital Nacional de la Yerba Mate",
  },
  {
    id: "obera-terminal",
    city: "Oberá",
    province: "Misiones",
    address: "Av. Sarmiento 1045",
    hours: "Lun a Vie 08:00 - 17:00",
    name: "Sucursal Oberá Centro - Zona Secaderos",
  },
  {
    id: "virasoro-corrientes",
    city: "Gdor. Virasoro",
    province: "Corrientes",
    address: "Ruta Nac. 14 y Circunvalación",
    hours: "Lun a Vie 08:00 - 16:30",
    name: "Sucursal Virasoro - Corredor Yerbatero Ruta 14",
  },
  {
    id: "alem-centro",
    city: "Leandro N. Alem",
    province: "Misiones",
    address: "Av. Belgrano 340",
    hours: "Lun a Vie 08:00 - 16:00",
    name: "Sucursal Alem Centro - Agente Autorizado",
  },
  {
    id: "san-vicente",
    city: "San Vicente",
    province: "Misiones",
    address: "Av. Libertador 890",
    hours: "Lun a Vie 08:00 - 16:00",
    name: "Sucursal San Vicente - Alto Uruguay",
  },
];

const FX_RATE_ARS_PER_USDC = 1280; // Reference agricultural settlement rate (CCL/MEP)

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
  const [usdcAmount, setUsdcAmount] = useState(defaultUsdcAmount);
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [selectedBranch, setSelectedBranch] = useState(MONEYGRAM_BRANCHES[1]?.id ?? "apostoles-centro");
  const [beneficiaryName, setBeneficiaryName] = useState("Cooperativa Yerbatera San José Ltda.");
  const [cbuAlias, setCbuAlias] = useState("COOP.YERBA.POSADAS");
  const [cuit, setCuit] = useState("30-71458923-8");
  const [step, setStep] = useState<"form" | "confirming" | "simulating" | "success">("form");
  const [txDetails, setTxDetails] = useState<{
    referenceCode: string;
    stellarTxHash: string;
    arsTotal: number;
    usdcTotal: number;
    pickupLocation: string;
  } | null>(null);

  if (!isOpen) return null;

  const numericUsdc = Math.max(0, parseFloat(usdcAmount) || 0);
  const grossArs = numericUsdc * FX_RATE_ARS_PER_USDC;
  const moneyGramFeeArs = 0; // Stellar MoneyGram 0% promo fee
  const netArs = grossArs - moneyGramFeeArs;

  const branchObj = MONEYGRAM_BRANCHES.find((b) => b.id === selectedBranch) || MONEYGRAM_BRANCHES[0];

  async function handleStartRamp() {
    setStep("simulating");

    // Simulating the standard SEP-24 Anchor flow:
    // 1. GET /info (Stellar Anchor metadata)
    // 2. POST /transactions/withdraw/interactive (session creation)
    // 3. User verification and settlement
    await new Promise((resolve) => setTimeout(resolve, 2200));

    const simulatedHash = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const randomCode = `MG-YERBA-${Math.floor(100000 + Math.random() * 900000)}`;

    setTxDetails({
      referenceCode: randomCode,
      stellarTxHash: simulatedHash,
      arsTotal: netArs,
      usdcTotal: numericUsdc,
      pickupLocation: method === "cash" ? `${branchObj?.name} (${branchObj?.address}, ${branchObj?.city})` : `Transferencia CBU / Alias: ${cbuAlias}`,
    });

    setStep("success");
  }

  function handleReset() {
    setStep("form");
    setTxDetails(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="moneygram-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <div
        className="yc-card"
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          border: "1px solid var(--border-color, #ccc)",
          background: "var(--card-bg, #fff)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "0.5rem",
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <span className="yc-pill green" style={{ fontWeight: 600 }}>Stellar SEP-24</span>
            <span className="yc-pill amber">MoneyGram Access</span>
            {loanId && <span className="yc-pill gray">Préstamo #{loanId}</span>}
          </div>
          <h2 id="moneygram-modal-title" style={{ fontSize: "1.35rem", margin: "0.5rem 0" }}>
            Convertir USDC a Efectivo / Pesos Argentinos (Rampa Local)
          </h2>
          <p className="yc-sub">
            Las cooperativas pueden liquidar de forma inmediata el crédito en USDC recibido por sus recibos de yerba canchada, transformándolo en pesos en efectivo para abonar cosecha a tareferos, fletes y combustible en Misiones y Corrientes.
          </p>
        </div>

        {step === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Amount input */}
            <div>
              <label htmlFor="usdc-input" style={{ fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Importe de crédito a retirar (USDC de prueba)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="usdc-input"
                  type="number"
                  min="1"
                  step="any"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "1.2rem",
                    padding: "0.6rem 0.8rem",
                    paddingRight: "5rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color, #ccc)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontWeight: 700,
                    color: "var(--text-muted, #666)",
                  }}
                >
                  USDC
                </span>
              </div>
            </div>

            {/* Currency conversion box */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor: "var(--card-subtle, rgba(0, 128, 0, 0.05))",
                border: "1px solid rgba(0, 128, 0, 0.15)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted, #666)" }}>Cotización de liquidación (MEP agro):</span>
                <strong>1 USDC = ${new Intl.NumberFormat("es-AR").format(FX_RATE_ARS_PER_USDC)} ARS</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted, #666)" }}>Comisión de Red Stellar MoneyGram:</span>
                <span style={{ color: "#2e7d32", fontWeight: 600 }}>$0.00 ARS (Bonificada)</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "0.5rem",
                  borderTop: "1px dashed var(--border-color, #ccc)",
                  marginTop: "0.5rem",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "1rem" }}>Total a recibir en pesos:</span>
                <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#1b5e20" }}>
                  ${new Intl.NumberFormat("es-AR").format(netArs)} ARS
                </span>
              </div>
            </div>

            {/* Cash-out method selector */}
            <div>
              <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                Canal de percepción de fondos en la región
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <button
                  type="button"
                  className={`yc-btn ${method === "cash" ? "primary" : "secondary"}`}
                  onClick={() => setMethod("cash")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem" }}
                >
                  <Banknote size={18} />
                  Efectivo en Sucursal
                </button>
                <button
                  type="button"
                  className={`yc-btn ${method === "bank" ? "primary" : "secondary"}`}
                  onClick={() => setMethod("bank")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem" }}
                >
                  <Building2 size={18} />
                  Transferencia CBU / CVU
                </button>
              </div>
            </div>

            {method === "cash" ? (
              <div>
                <label htmlFor="branch-select" style={{ fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                  Seleccionar punto de retiro MoneyGram (Misiones / Corrientes)
                </label>
                <select
                  id="branch-select"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border-color, #ccc)" }}
                >
                  {MONEYGRAM_BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.city} ({b.province}) — {b.name} [{b.address}]
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: "6px", background: "#f8f9fa", border: "1px solid #e9ecef" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, fontSize: "0.9rem" }}>
                    <MapPin size={15} color="#e53935" />
                    {branchObj?.name}
                  </div>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#555" }}>
                    Dirección: {branchObj?.address}, {branchObj?.city}, {branchObj?.province} · Horario: {branchObj?.hours}
                  </p>
                </div>

                <div style={{ marginTop: "0.75rem" }}>
                  <label htmlFor="beneficiary-input" style={{ fontWeight: 600, display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                    Razón Social de la Cooperativa / Titular de Cobro
                  </label>
                  <input
                    id="beneficiary-input"
                    type="text"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-color, #ccc)" }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label htmlFor="cbu-input" style={{ fontWeight: 600, display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                    Alias o CBU / CVU de la Cooperativa
                  </label>
                  <input
                    id="cbu-input"
                    type="text"
                    value={cbuAlias}
                    onChange={(e) => setCbuAlias(e.target.value)}
                    placeholder="COOP.YERBATERA.BANCO"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-color, #ccc)" }}
                  />
                </div>
                <div>
                  <label htmlFor="cuit-input" style={{ fontWeight: 600, display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                    CUIT de la Cooperativa
                  </label>
                  <input
                    id="cuit-input"
                    type="text"
                    value={cuit}
                    onChange={(e) => setCuit(e.target.value)}
                    placeholder="30-..."
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-color, #ccc)" }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="yc-actions" style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                className="yc-btn primary"
                disabled={numericUsdc <= 0}
                onClick={handleStartRamp}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.7rem 1.25rem" }}
              >
                Continuar a MoneyGram SEP-24
                <ArrowRight size={16} />
              </button>
              <button type="button" className="yc-btn secondary" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === "simulating" && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <RefreshCw size={40} className="spinning" style={{ margin: "0 auto 1.5rem", color: "#2e7d32" }} />
            <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Iniciando flujo interactivo SEP-24…</h3>
            <p className="yc-sub" style={{ maxWidth: "450px", margin: "0 auto" }}>
              Conectando con el Anchor de Stellar MoneyGram, verificando la sesión interactiva y emitiendo la orden de liquidación en pesos argentinos.
            </p>
          </div>
        )}

        {step === "success" && txDetails && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div
              style={{
                textAlign: "center",
                padding: "1.5rem",
                borderRadius: "8px",
                backgroundColor: "rgba(46, 125, 50, 0.08)",
                border: "1px solid rgba(46, 125, 50, 0.25)",
              }}
            >
              <CheckCircle2 size={48} color="#2e7d32" style={{ margin: "0 auto 0.75rem" }} />
              <h3 style={{ fontSize: "1.25rem", color: "#1b5e20", margin: "0 0 0.5rem" }}>
                ¡Orden de Retiro en Pesos Confirmada!
              </h3>
              <p style={{ margin: 0, fontSize: "0.95rem" }}>
                Los <strong>{new Intl.NumberFormat("es-AR").format(txDetails.usdcTotal)} USDC</strong> fueron bloqueados exitosamente en el Anchor para su cobro.
              </p>
            </div>

            <div className="yc-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#666" }}>Código de Retiro MoneyGram:</span>
                <strong style={{ fontSize: "1.15rem", color: "#000", fontFamily: "monospace" }}>
                  {txDetails.referenceCode}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#666" }}>Monto a Cobrar en Efectivo / Cuenta:</span>
                <strong style={{ fontSize: "1.2rem", color: "#1b5e20" }}>
                  ${new Intl.NumberFormat("es-AR").format(txDetails.arsTotal)} ARS
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#666" }}>Destino de Cobro:</span>
                <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "300px" }}>
                  {txDetails.pickupLocation}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#666" }}>Beneficiario Autorizado:</span>
                <span style={{ fontWeight: 600 }}>{beneficiaryName}</span>
              </div>

              <div>
                <span style={{ color: "#666", display: "block", marginBottom: "0.25rem" }}>
                  Transacción de Liquidación en Stellar:
                </span>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txDetails.stellarTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    fontSize: "0.85rem",
                    wordBreak: "break-all",
                    fontFamily: "monospace",
                  }}
                >
                  {txDetails.stellarTxHash}
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

            <p className="yc-sub" style={{ fontSize: "0.85rem", margin: 0 }}>
              Presentá el código <strong>{txDetails.referenceCode}</strong> junto al DNI/CUIT de la cooperativa en la sucursal seleccionada para retirar el efectivo de inmediato y efectuar el pago de jornales de la zafra.
            </p>

            <div className="yc-actions">
              <button type="button" className="yc-btn primary" onClick={onClose}>
                Finalizar y Cerrar
              </button>
              <button type="button" className="yc-btn secondary" onClick={handleReset}>
                Hacer otra conversión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Standalone dashboard card linking directly to the MoneyGram ARS off-ramp */
export function MoneyGramRampBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <section
      className="yc-card"
      style={{
        borderLeft: "4px solid #2e7d32",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        padding: "1.25rem",
      }}
    >
      <div style={{ maxWidth: "540px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <Banknote size={20} color="#2e7d32" aria-hidden="true" />
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Rampa Local ARS · MoneyGram Access (SEP-24)</h3>
        </div>
        <p className="yc-sub" style={{ margin: 0 }}>
          ¿Necesitás pagar la cosecha a tareferos o fletes en Misiones y Corrientes? Convertí al instante los USDC del préstamo a pesos argentinos en efectivo o transferencia bancaria.
        </p>
      </div>
      <button
        type="button"
        className="yc-btn primary"
        onClick={onOpen}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
      >
        <Coins size={16} />
        Convertir USDC a Efectivo
      </button>
    </section>
  );
}
