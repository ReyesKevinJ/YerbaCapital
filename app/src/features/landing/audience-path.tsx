"use client";

import { useId, useState } from "react";
import { ArrowUpRight, BadgeCheck, FileSearch, HandCoins, MapPinned, ShieldCheck, Sprout, Warehouse } from "lucide-react";

type Audience = "producer" | "investor";

const journeys = {
  producer: {
    label: "Tengo yerba estacionándose",
    eyebrow: "Para cooperativas, secaderos y depósitos",
    title: "Tu lote ya tiene una historia. Ordenala para mostrar su respaldo.",
    description: "No necesitás saber de blockchain para recorrer la demo. Empezás por la mercadería, las personas que la revisan y la información que ya tenés.",
    question: "¿Qué cambia para mí?",
    answer: "En vez de explicar el mismo lote por separado a cada persona, podés reunir registro, custodia, evidencia y seguimiento en un recorrido consultable.",
    action: "Recorrer como entidad yerbera",
    href: "/dashboard",
    note: "La demo usa cuentas y USDC de prueba. No ofrece crédito ni fondos reales.",
    steps: [
      { icon: Warehouse, title: "Ubicá tu lote", text: "Partí de kilos, estacionamiento y depósito; no de tecnicismos." },
      { icon: BadgeCheck, title: "Respaldalo entre partes", text: "Custodio y verificador dejan constancia de lo que observan." },
      { icon: HandCoins, title: "Mostrá una solicitud", text: "La demo permite recorrer cómo se consulta y financia una garantía." },
    ],
  },
  investor: {
    label: "Quiero explorar oportunidades",
    eyebrow: "Para inversores y fondos de la demo",
    title: "Antes de aportar, revisá qué hay detrás de cada lote.",
    description: "La propuesta no pide confianza ciega: permite seguir una historia de evidencia, custodia, valuación y eventos del préstamo antes de preparar una operación de prueba.",
    question: "¿Qué puedo revisar?",
    answer: "Quién verificó el lote, qué evidencia lo respalda, cuándo fue valuado y qué ocurre si aparece un deterioro. Eso no elimina el riesgo físico ni promete un resultado.",
    action: "Ver mapa y oportunidades",
    href: "/investors",
    note: "El mapa y las oportunidades son ilustrativos. No son una oferta pública ni una recomendación de inversión.",
    steps: [
      { icon: MapPinned, title: "Explorá el territorio", text: "Empezá por localidades y tipos de lote, sin exponer depósitos privados." },
      { icon: FileSearch, title: "Revisá las señales", text: "Buscá evidencia, roles separados, valuación y estado de la garantía." },
      { icon: ShieldCheck, title: "Entendé el riesgo", text: "El lote 4 muestra deterioro, default y reclamo sin fingir recupero físico." },
    ],
  },
} as const;

export function AudiencePath() {
  const [audience, setAudience] = useState<Audience>("producer");
  const tabId = useId();
  const path = journeys[audience];

  return <section id="recorrido" className="landing-path" aria-labelledby="path-title">
    <div className="landing-path-heading">
      <p className="landing-kicker"><Sprout size={15} aria-hidden="true" />Empezá por tu pregunta</p>
      <h2 id="path-title">No necesitás entender blockchain<br />para entender la propuesta.</h2>
      <p>Elegí una mirada y la demo te muestra por dónde empezar. Las reglas financieras y permisos siguen estando en los contratos; acá los traducimos a un recorrido claro.</p>
    </div>

    <div className="landing-path-switch" role="tablist" aria-label="Elegí tu recorrido en YerbaCapital">
      {(Object.keys(journeys) as Audience[]).map(option => <button key={option} type="button" role="tab" id={`${tabId}-${option}-tab`} aria-selected={audience === option} aria-controls={`${tabId}-${option}-panel`} onClick={() => setAudience(option)}>
        {journeys[option].label}
      </button>)}
    </div>

    <div className="landing-path-panel" role="tabpanel" id={`${tabId}-${audience}-panel`} aria-labelledby={`${tabId}-${audience}-tab`}>
      <div className="landing-path-intro">
        <p className="landing-kicker">{path.eyebrow}</p>
        <h3>{path.title}</h3>
        <p>{path.description}</p>
        <a className="landing-button primary" href={path.href}>{path.action}<ArrowUpRight size={18} aria-hidden="true" /></a>
        <small>{path.note}</small>
      </div>
      <ol className="landing-path-steps">
        {path.steps.map(({ icon: Icon, title, text }, index) => <li key={title}>
          <span className="landing-path-number">0{index + 1}</span>
          <Icon size={24} aria-hidden="true" />
          <h4>{title}</h4>
          <p>{text}</p>
        </li>)}
      </ol>
      <aside className="landing-path-answer" aria-live="polite">
        <span>LO QUE QUERÉS SABER</span>
        <h4>{path.question}</h4>
        <p>{path.answer}</p>
        {audience === "investor" && <a href="/lots/4">Ver un caso de riesgo en trazabilidad pública <ArrowUpRight size={15} aria-hidden="true" /></a>}
      </aside>
    </div>
  </section>;
}
