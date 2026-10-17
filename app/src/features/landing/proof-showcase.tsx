"use client";

import { useState } from "react";
import { AlertTriangle, ArrowUpRight, BadgeCheck, CircleDollarSign, Eye, FileCheck2, ShieldAlert, Sprout, Warehouse } from "lucide-react";

type CaseKey = "repayment" | "risk";

const cases = {
  repayment: {
    label: "Ciclo completo",
    title: "Un recorrido que se puede revisar paso a paso.",
    description: "El lote 3 de la demo pasó por verificación conjunta, certificado, valuación, solicitud, fondeo y repago. Al finalizar, el certificado volvió a quedar libre de gravamen.",
    lot: "Lote demo 3",
    status: "Repagado",
    tone: "positive",
    href: "/lots/3",
    action: "Ver trazabilidad del lote",
    signals: [
      { icon: BadgeCheck, title: "Historial ordenado", text: "Cada hito de la demo queda registrado en la secuencia pública de eventos." },
      { icon: FileCheck2, title: "Evidencia referenciada", text: "Las atestaciones enlazan un hash; los archivos físicos quedan fuera de cadena." },
      { icon: CircleDollarSign, title: "Garantía liberada", text: "El estado financiero indica repago total en la demo; no es una liquidación comercial real." },
    ],
    steps: ["Ingreso y verificación", "Certificado y valuación", "Fondeo con USDC de prueba", "Repago y liberación"],
  },
  risk: {
    label: "Riesgo a la vista",
    title: "Si hay un problema físico, no se oculta detrás de un saldo.",
    description: "El lote 4 de la demo muestra un deterioro, default y reclamo del certificado. El estado físico permanece deteriorado: el registro financiero no reemplaza la custodia ni la vía legal.",
    lot: "Lote demo 4",
    status: "Deteriorado",
    tone: "risk",
    href: "/lots/4",
    action: "Revisar el caso de riesgo",
    signals: [
      { icon: AlertTriangle, title: "Alerta física", text: "El deterioro se incorpora por una atestación de un rol autorizado con evidencia asociada." },
      { icon: ShieldAlert, title: "Riesgo separado", text: "El estado del lote y el estado del préstamo se muestran por separado para evitar falsas certezas." },
      { icon: Eye, title: "Límites explícitos", text: "Un reclamo del certificado no entrega la yerba: la recuperación física requiere custodio y proceso legal." },
    ],
    steps: ["Lote financiado", "Deterioro atestado", "Default en Testnet", "Reclamo del certificado"],
  },
} as const;

export function ProofShowcase() {
  const [selected, setSelected] = useState<CaseKey>("repayment");
  const current = cases[selected];

  return <section id="casos-demo" className="landing-proof" aria-labelledby="proof-title">
    <div className="landing-proof-heading">
      <div>
        <p className="landing-kicker">Una demo para mirar, no solo contar</p>
        <h2 id="proof-title">Dos casos. Las señales a la vista.</h2>
      </div>
      <p>Elegí un recorrido y seguí sus eventos. Esto muestra cómo la evidencia, el estado físico y el financiero pueden leerse sin necesitar entender blockchain.</p>
    </div>

    <div className="landing-proof-switch" role="tablist" aria-label="Casos demostrativos">
      {(Object.keys(cases) as CaseKey[]).map((key) => <button key={key} type="button" role="tab" aria-selected={selected === key} aria-controls={`case-${key}`} id={`case-tab-${key}`} onClick={() => setSelected(key)}>{cases[key].label}</button>)}
    </div>

    <div id={`case-${selected}`} className={`landing-proof-panel ${current.tone}`} role="tabpanel" aria-labelledby={`case-tab-${selected}`}>
      <div className="landing-proof-summary">
        <span className="landing-proof-lot"><Warehouse size={18} aria-hidden="true" />{current.lot}</span>
        <span className="landing-proof-status">{current.status}</span>
        <h3>{current.title}</h3>
        <p>{current.description}</p>
        <a className="landing-button secondary" href={current.href}>{current.action}<ArrowUpRight size={17} aria-hidden="true" /></a>
      </div>
      <ol className="landing-proof-timeline" aria-label={`Pasos de ${current.lot}`}>
        {current.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}
      </ol>
      <div className="landing-proof-signals" aria-label="Cómo interpretar este caso">
        {current.signals.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={22} aria-hidden="true" /><h4>{title}</h4><p>{text}</p></article>)}
      </div>
    </div>
    <p className="landing-proof-note">Los dos recorridos usan lotes, cuentas y USDC de prueba en Stellar Testnet. Son evidencia de funcionamiento del prototipo, no operaciones ni oportunidades reales.</p>
  </section>;
}

export function MateImpact() {
  return <section className="landing-mate-impact" aria-labelledby="mate-impact-title">
    <div className="landing-mate-impact-mark" aria-hidden="true"><Sprout size={36} /></div>
    <div>
      <p className="landing-kicker">Una cadena que llega a la ronda</p>
      <h2 id="mate-impact-title">La yerba está en más del 90% de los hogares argentinos.</h2>
      <p>Detrás de cada mate hay una cadena que necesita tiempo: la yerba canchada madura durante meses antes de la molienda. Darle a cooperativas y secaderos herramientas para documentar un lote y conversar sobre liquidez puede ayudar a sostener esa etapa clave.</p>
      <p>Para quien toma mate, la propuesta busca una cadena más visible y con mejor información sobre su recorrido. No fija precios, no garantiza stock ni reemplaza controles sanitarios, custodia o regulación.</p>
      <a href="https://www.argentina.gob.ar/pais/mate" target="_blank" rel="noreferrer">Ver la referencia de Argentina.gob.ar e INYM<ArrowUpRight size={16} aria-hidden="true" /></a>
    </div>
  </section>;
}
