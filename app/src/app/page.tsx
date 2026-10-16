import { ProtocolWorkbench } from "../components/protocol-workbench";
import { EvidenceForm } from "../components/evidence-form";

export default function Home() {
  const chainEnabled = process.env.NEXT_PUBLIC_CHAIN_ENABLED === "true";
  return <>
    <a href="#main" className="skip">Ir al contenido</a>
    <header><span className="brand">YerbaCapital</span><span className="tag">Solo Testnet · Desarrollo local</span></header>
    <main id="main">
      <section className="intro">
        <p className="eyebrow">Infraestructura para canchada en estacionamiento</p>
        <h1>Una base verificable,<br />desde la evidencia.</h1>
        <p>{chainEnabled ? "Registrá evidencia sintética, operá los contratos de Testnet con Freighter y consultá el historial público de cada lote." : "La app está en modo off-chain: podés verificar evidencia local. Activá la configuración de Testnet para usar los contratos desplegados."}</p>
        <p className="principle"><strong>El token no es la yerba.</strong> Un certificado representa un derecho condicionado; la blockchain no garantiza existencia, calidad ni custodia física.</p>
      </section>
      <EvidenceForm />
      {chainEnabled && <ProtocolWorkbench />}
      <section className="next" aria-labelledby="next-heading">
        <p className="eyebrow">04 / Componentes del protocolo</p>
        <h2 id="next-heading">Responsabilidades separadas</h2>
        <dl>
          <div><dt>registry</dt><dd>Roles, lotes, atestaciones, certificados y gravamen. Desplegado en Testnet.</dd></div>
          <div><dt>vault</dt><dd>Préstamos y transferencias directas de USDC de prueba. Desplegado en Testnet.</dd></div>
          <div><dt>Indexador y Freighter</dt><dd>Historial confirmado y firmas explícitas, disponibles al activar la integración de Testnet.</dd></div>
        </dl>
        <a href="/api/system">Consultar estado de los servicios</a>
      </section>
    </main>
    <footer>Prototipo de hackathon. Archivos sintéticos, sin fondos reales ni oferta de inversión.</footer>
  </>;
}
