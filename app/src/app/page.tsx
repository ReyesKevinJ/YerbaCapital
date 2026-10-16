import { EvidenceForm } from "../components/evidence-form";

export default function Home() {
  return <>
    <a href="#main" className="skip">Ir al contenido</a>
    <header><span className="brand">YerbaCapital</span><span className="tag">Solo Testnet · Desarrollo local</span></header>
    <main id="main">
      <section className="intro">
        <p className="eyebrow">Infraestructura para canchada en estacionamiento</p>
        <h1>Una base verificable,<br />desde la evidencia.</h1>
        <p>Esta primera conexión une la app con el servicio local de evidencias. Los contratos, el financiamiento y las firmas de Freighter todavía están pendientes.</p>
        <p className="principle"><strong>El token no es la yerba.</strong> Un certificado representa un derecho condicionado; la blockchain no garantiza existencia, calidad ni custodia física.</p>
      </section>
      <EvidenceForm />
      <section className="next" aria-labelledby="next-heading">
        <p className="eyebrow">02 / Próximas conexiones</p>
        <h2 id="next-heading">Responsabilidades separadas</h2>
        <dl>
          <div><dt>registry</dt><dd>Roles, lotes, atestaciones, certificados y gravamen. Pendiente.</dd></div>
          <div><dt>vault</dt><dd>Préstamos y transferencias directas de USDC de prueba. Pendiente.</dd></div>
          <div><dt>Indexador y Freighter</dt><dd>Historial confirmado y firmas explícitas. Pendientes.</dd></div>
        </dl>
        <a href="/api/system">Consultar estado de los servicios</a>
      </section>
    </main>
    <footer>Prototipo de hackathon. Archivos sintéticos, sin fondos reales ni oferta de inversión.</footer>
  </>;
}
