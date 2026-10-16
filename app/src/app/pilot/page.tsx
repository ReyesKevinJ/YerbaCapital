import { SharedPilotWorkspace } from "../../features/pilot/shared-workspace";

export default function PilotPage() {
  return <>
    <a href="#main" className="skip">Ir al contenido</a>
    <header><a href="/" className="brand">YerbaCapital</a><span className="tag">Piloto · Documentación sintética</span></header>
    <main id="main">
      <section className="intro"><p className="eyebrow">Preparación del piloto</p><h1>Acuerdos y documentación</h1>
        <p>Organizá responsables, adjuntos y pendientes para discutir con el equipo.</p>
        <p className="principle">Expediente compartido de demostración: acuerdos, revisiones y archivos se guardan en el servidor local, con acceso por integrante. Solo documentación sintética; no reemplaza contratos jurídicos ni habilita operaciones reales.</p>
      </section>
      <SharedPilotWorkspace />
      <p><a href="/pilot/local">Consultar y exportar el expediente anterior de este navegador</a></p>
    </main>
    <footer>Solo datos sintéticos. La revisión documental no acredita viabilidad legal ni habilita financiación real.</footer>
  </>;
}
