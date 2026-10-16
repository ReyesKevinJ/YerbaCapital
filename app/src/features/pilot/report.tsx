import { categories, statuses, documentaryReady, type SharedDossier } from "./model";

/** A printable snapshot; browser print dialog can save it as PDF. */
export function PilotReport({ dossier }: { dossier: SharedDossier }) {
  return <section className="pilot-report" aria-label="Resumen imprimible del piloto">
    <h1>YerbaCapital · Preparación del piloto</h1>
    <p>Revisión {dossier.revision} · Fecha de consulta: {dossier.serverDate}</p>
    <p>Documentación sintética. No es un dictamen, firma jurídica ni habilitación para operar con fondos reales. El token no es la yerba.</p>
    <h2>Cobertura documental</h2><ul>{Object.entries(categories).map(([key, label]) => <li key={key}>{label}: {dossier.agreements.some(a => a.category === key && documentaryReady(a, dossier.serverDate)) ? "con documentación revisada" : "pendiente"}</li>)}</ul>
    {dossier.agreements.map(a => <article key={a.id}>
      <h2>{a.title}</h2><p>{categories[a.category]} · {statuses[a.status]} · Responsable: {a.owner}</p>
      <p>Vigencia: {a.expiresOn || "sin fecha declarada"} · Última edición: {a.editedBy} · Revisión: {a.reviewedBy || "pendiente"}</p>
      <p className="pilot-notes">Pendientes: {a.pending || "sin pendientes declarados"}</p>
      <ul>{a.checklist?.map(item => <li key={item.id}>{item.done ? "Completo" : "Pendiente"}: {dossier.checklistTemplates[a.category]?.find(t => t.id === item.id)?.label ?? item.id} · {item.owner} · {item.dueDate || "sin fecha"}</li>)}</ul>
      <h3>Versiones de documentación</h3><ul>{(a.documentVersions ?? a.evidence.map((hash, index) => ({ version: index + 1, hash, actor: a.editedBy, phase: undefined }))).map(version => <li key={version.version}>Versión {version.version} · {version.phase ?? "histórica"} · {version.actor}<br /><span className="address">SHA-256: {version.hash}</span></li>)}</ul>
      {a.comments?.length ? <><h3>Comentarios y correcciones</h3><ul>{a.comments.map(c => <li key={c.id}><strong>{c.actor}</strong> · {c.at}<p className="pilot-notes">{c.text}</p></li>)}</ul></> : null}
    </article>)}
    <p>Los archivos y códigos de acceso no se incluyen. Los hashes permiten contrastar integridad cuando se dispone de los bytes originales.</p>
  </section>;
}
