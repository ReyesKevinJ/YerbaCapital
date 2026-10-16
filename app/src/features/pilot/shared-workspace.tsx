"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChecklistEditor } from "./checklist-editor";
import { AgreementComments } from "./comments";
import { PilotReport } from "./report";
import { categories, statuses, dateAlert, documentaryReady, type SharedAgreement, type SharedDossier } from "./model";
import { loadShared, pilotRequest, PilotRequestError } from "./client";

const roleLabels = { editor: "Edición", reviewer: "Revisión", observer: "Solo lectura" };
const actionLabels: Record<string, string> = { AgreementCreated: "Acuerdo creado", AgreementUpdated: "Acuerdo actualizado", AgreementReviewed: "Acuerdo revisado", DocumentStored: "Documento guardado", CommentAdded: "Comentario agregado", ChangesRequested: "Corrección solicitada" };

export function SharedPilotWorkspace() {
  const [dossier, setDossier] = useState<SharedDossier>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [category, setCategory] = useState("commercial");
  const [editing, setEditing] = useState<string>();
  const pending = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const credential = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    loadShared().then(data => { if (active) setDossier(data); }).catch(cause => {
      if (active && (!(cause instanceof PilotRequestError) || cause.status !== 401)) setError(cause instanceof Error ? cause.message : "Expediente no disponible.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setMessage("");
    try { await action(); }
    catch (cause) {
      if (cause instanceof PilotRequestError && cause.status === 401) setDossier(undefined);
      setError(cause instanceof Error ? cause.message : "No se pudo completar. Consultá el estado antes de reintentar.");
    } finally { pending.current = false; setBusy(false); }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = credential.current?.value ?? "";
    await run(async () => {
      await pilotRequest("session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      if (credential.current) credential.current.value = "";
      setDossier(await loadShared()); setMessage("Sesión iniciada por una hora.");
    });
  }

  function edit(agreement: SharedAgreement) {
    setEditorGeneration(generation => generation + 1);
    setEditing(agreement.id); setCategory(agreement.category); setError(""); setMessage("");
    const fields = form.current;
    if (!fields) return;
    fields.reset();
    for (const name of ["title", "owner", "status", "pending", "expiresOn"] as const) {
      const input = fields.elements.namedItem(name);
      if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement) input.value = name === "status" && agreement.status === "Reviewed" ? "Draft" : agreement[name] ?? "";
    }
    (fields.elements.namedItem("title") as HTMLInputElement).focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dossier) return;
    const data = new FormData(event.currentTarget);
    await run(async () => {
      let revision = dossier.revision;
      const previous = dossier.agreements.find(a => a.id === editing);
      const evidence = [...(previous?.evidence ?? [])];
      const checklist = (dossier.checklistTemplates[category] ?? []).map(item => ({ id: item.id, owner: String(data.get(`task-${item.id}-owner`) ?? ""), dueDate: String(data.get(`task-${item.id}-due`) ?? ""), done: data.get(`task-${item.id}-done`) === "on" }));
      const values = { checklist, expiresOn: String(data.get("expiresOn") ?? ""), title: String(data.get("title") ?? "").trim(), owner: String(data.get("owner") ?? "").trim(), category: String(data.get("category")), status: String(data.get("status")), pending: String(data.get("pending") ?? "").trim() };
      if (!values.title || !values.owner) throw new Error("Completá título y responsable.");
      if (values.status === "Blocked" && !values.pending) throw new Error("Indicá qué bloquea el acuerdo.");
      const existingDocument = String(data.get("existingDocument") ?? "");
      if (existingDocument && !evidence.includes(existingDocument)) evidence.push(existingDocument);
      const file = data.get("document");
      if (file instanceof File && file.size > 0) {
        if (file.size > 5 * 1024 * 1024 || evidence.length >= 20) throw new Error("Máximo 5 MiB por archivo y 20 adjuntos por acuerdo.");
        const result = await pilotRequest("documents", { method: "POST", headers: { "content-type": "application/octet-stream", "if-match": String(revision) }, body: file });
        if (!result || typeof result !== "object" || !("sha256" in result) || typeof result.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(result.sha256) || !("revision" in result) || !Number.isSafeInteger(result.revision)) throw new Error("Referencia de documento inválida.");
        revision = Number(result.revision);
        if (!evidence.includes(result.sha256)) evidence.push(result.sha256);
      }
      if (values.status === "InReview" && evidence.length === 0) throw new Error("Adjuntá un documento antes de pasar a revisión.");
      await pilotRequest(editing ? `agreements/${editing}` : "agreements", { method: editing ? "PUT" : "POST", headers: { "content-type": "application/json", "if-match": String(revision) }, body: JSON.stringify({ ...values, evidence }) });
      setDossier(await loadShared()); setEditing(undefined); setCategory("commercial"); form.current?.reset(); setMessage("Acuerdo guardado en el expediente compartido.");
    });
  }

  async function review(agreement: SharedAgreement) {
    if (!dossier) return;
    await run(async () => {
      await pilotRequest(`agreements/${agreement.id}`, { method: "PUT", headers: { "content-type": "application/json", "if-match": String(dossier.revision) }, body: JSON.stringify({ ...agreement, status: "Reviewed" }) });
      setDossier(await loadShared()); setMessage("Revisión documental registrada por otro integrante. No es una firma jurídica.");
    });
  }

  async function comment(id: string, text: string, kind: string): Promise<boolean> {
    if (!dossier) return false;
    let saved = false;
    await run(async () => {
      await pilotRequest(`agreements/${id}/comments`, { method: "POST", headers: { "content-type": "application/json", "if-match": String(dossier.revision) }, body: JSON.stringify({ text, kind }) });
      setDossier(await loadShared()); setMessage("Comentario registrado."); saved = true;
    });
    return saved;
  }

  function exportCopy() {
    if (!dossier) return;
    const { actor: _actor, ...backup } = dossier;
    void _actor;
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "yerbacapital-pilot-shared.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const canEdit = dossier && dossier.actor.role !== "observer";
  return <>
    <div className="pilot-interactive">
    {loading && <p role="status">Consultando sesión…</p>}
    {!loading && !dossier && <section className="panel" aria-labelledby="pilot-access"><h2 id="pilot-access">Acceso de integrantes</h2>
      <p>Usá un código privado de demostración entregado por quien configura el entorno. No uses tu clave de Freighter.</p>
      <form onSubmit={login}><label htmlFor="pilot-code">Código de integrante</label><input ref={credential} id="pilot-code" type="password" autoComplete="off" required maxLength={128} />
        <button disabled={busy} type="submit">Ingresar al expediente</button></form></section>}
    {error && <p role="alert" className="error">{error}</p>}
    <p role="status">{message}</p>
    {dossier && <>
      <section className="panel" aria-labelledby="pilot-progress"><h2 id="pilot-progress">Cobertura del expediente</h2>
        <p>Integrante: {dossier.actor.id} · {roleLabels[dossier.actor.role]} · Revisión {dossier.revision}</p>
        <p>Revisado exige otro integrante con permiso de revisión. No implica firma, aprobación jurídica ni habilitación de un piloto real.</p>
        <ul>{Object.entries(categories).map(([key, label]) => <li key={key}>{label}: {dossier.agreements.some(a => a.category === key && documentaryReady(a, dossier.serverDate)) ? "con documentación revisada" : "pendiente de revisión"}</li>)}</ul>
        <button disabled={busy} onClick={() => void run(async () => { setDossier(await loadShared()); setEditing(undefined); form.current?.reset(); setMessage("Expediente actualizado. Volvé a abrir el acuerdo para editar la versión vigente."); })}>Actualizar expediente</button>{" "}
        <button disabled={busy} onClick={() => window.print()}>Imprimir resumen / Guardar PDF</button>{" "}
        <button disabled={busy} onClick={exportCopy}>Exportar metadatos e historial</button>{" "}
        <button disabled={busy} onClick={() => void run(async () => { await pilotRequest("session", { method: "DELETE" }); setDossier(undefined); setEditing(undefined); setMessage("Sesión cerrada."); })}>Cerrar sesión</button>
      </section>
      {canEdit && <section className="panel" aria-labelledby="agreement-heading"><h2 id="agreement-heading">{editing ? "Editar acuerdo" : "Nuevo acuerdo"}</h2>
        <form ref={form} onSubmit={submit} aria-busy={busy}><fieldset disabled={busy}><legend>Datos sintéticos del acuerdo</legend>
          <label htmlFor="agreement-title">Título</label><input id="agreement-title" name="title" required maxLength={200} />
          <label htmlFor="agreement-owner">Responsable (alias de prueba)</label><input id="agreement-owner" name="owner" required maxLength={200} />
          <label htmlFor="agreement-category">Categoría</label><select id="agreement-category" name="category" value={category} onChange={event => setCategory(event.target.value)}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <label htmlFor="agreement-status">Estado documental</label><select id="agreement-status" name="status">{Object.entries(statuses).filter(([key]) => key !== "Reviewed").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <label htmlFor="agreement-expiry">Vigencia del acuerdo hasta</label><input id="agreement-expiry" name="expiresOn" type="date" />
          <ChecklistEditor key={`${editing ?? "new"}-${category}-${editorGeneration}`} template={dossier.checklistTemplates[category] ?? []} items={dossier.agreements.find(a => a.id === editing && a.category === category)?.checklist} owner={dossier.actor.id} />
          <label htmlFor="agreement-pending">Pendientes o motivo del bloqueo</label><textarea id="agreement-pending" name="pending" maxLength={2000} rows={3} />
          <label htmlFor="agreement-document">Documento sintético (hasta 5 MiB)</label><input id="agreement-document" name="document" type="file" aria-describedby="document-help" />
          <p id="document-help" className="muted">Los adjuntos requieren sesión de integrante. No cargues datos personales ni documentos reales. Editar un acuerdo revisado requiere nueva revisión.</p>
          {dossier.documents.some(hash => !dossier.agreements.some(a => a.evidence.includes(hash))) && <><label htmlFor="existing-document">Documento ya subido sin vincular</label><select id="existing-document" name="existingDocument"><option value="">No agregar</option>{dossier.documents.filter(hash => !dossier.agreements.some(a => a.evidence.includes(hash))).map(hash => <option key={hash} value={hash}>{hash}</option>)}</select></>}
          <button type="submit">{busy ? "Guardando…" : "Guardar acuerdo"}</button>
          {editing && <button type="button" onClick={() => { setEditing(undefined); setCategory("commercial"); form.current?.reset(); }}>Cancelar edición</button>}
        </fieldset></form>
      </section>}
      <section className="panel" aria-labelledby="agreements-heading"><h2 id="agreements-heading">Acuerdos registrados ({dossier.agreements.length})</h2>
        {dossier.agreements.length === 0 && <p>Todavía no hay acuerdos. Registrá el primero para organizar la revisión.</p>}
        {dossier.agreements.map(a => <article className="result" aria-label={a.title} key={a.id}>
          <h3>{a.title}</h3><p>{categories[a.category]} · {statuses[a.status]}</p><p>Responsable: {a.owner} · Última edición: {a.editedBy}</p>
          {a.reviewedBy && <p>Revisado por: {a.reviewedBy}</p>}<p className="pilot-notes">Pendientes: {a.pending || "Sin pendientes declarados"}</p>
          <p>Actualizado: <time dateTime={a.updatedAt}>{new Date(a.updatedAt).toLocaleString("es-AR")}</time></p>
          {a.expiresOn && <p className={dateAlert(a.expiresOn, dossier.serverDate) === "Overdue" ? "error" : ""}>{dateAlert(a.expiresOn, dossier.serverDate) === "Overdue" ? "Vencido: requiere actualización y nueva revisión" : dateAlert(a.expiresOn, dossier.serverDate) === "DueSoon" ? "Vence dentro de 14 días: preparar renovación" : "Vigencia hasta"}: {a.expiresOn}</p>}
          {!a.checklist?.length && <p>Acuerdo anterior sin checklist registrado. Completalo para una nueva revisión.</p>}
          <ul>{a.checklist?.map(item => <li key={item.id}>{item.done ? "Completo" : "Pendiente"}: {dossier.checklistTemplates[a.category]?.find(t => t.id === item.id)?.label ?? item.id} · {item.owner}{item.dueDate && <> · {item.dueDate}{!item.done && dateAlert(item.dueDate, dossier.serverDate) !== "Current" ? " · Atención: fecha vencida o próxima" : ""}</>}</li>)}</ul>
          <details><summary>Versiones de la documentación ({a.documentVersions?.length ?? a.evidence.length})</summary><ol>{a.documentVersions?.map(version => <li key={version.version}>Versión {version.version} · {version.phase === "Reviewed" ? "Revisada" : version.phase === "Submitted" ? "Presentada" : "Borrador"} · {version.actor} · <time dateTime={version.at}>{new Date(version.at).toLocaleString("es-AR")}</time></li>)}</ol><p>Se conserva cada entrega anterior. La versión más reciente corresponde a la documentación actual del acuerdo.</p></details>
          <ul>{a.evidence.map(hash => <li className="address" key={hash}><a href={`/api/pilot/documents/${hash}`} download>Descargar documento {hash}</a></li>)}</ul>
          <AgreementComments agreement={a} writable={!!canEdit} reviewer={dossier.actor.role === "reviewer"} busy={busy} onSubmit={comment} />
          {canEdit && <button disabled={busy} onClick={() => edit(a)}>Editar {a.title}</button>}{" "}
          {dossier.actor.role === "reviewer" && a.status === "InReview" && a.editedBy !== dossier.actor.id && <button disabled={busy || !a.checklist?.length || a.checklist.some(item => !item.done) || dateAlert(a.expiresOn, dossier.serverDate) === "Overdue"} onClick={() => void review(a)}>Revisar {a.title}</button>}
        </article>)}
      </section>
      <section className="panel" aria-labelledby="pilot-history"><h2 id="pilot-history">Historial documental</h2>
        <p>Se registra identidad configurada y fecha de servidor; no es una firma jurídica ni un registro on-chain.</p>
        <ol className="timeline">{dossier.history.slice().reverse().map(entry => <li key={entry.revision}>Revisión {entry.revision}: {actionLabels[entry.action] ?? entry.action} · {entry.actor}<br /><time dateTime={entry.at}>{new Date(entry.at).toLocaleString("es-AR")}</time>{entry.agreementId && <span className="address"> · Acuerdo {entry.agreementId}</span>}</li>)}</ol>
      </section>
    </>}
    </div>
    {dossier && <PilotReport dossier={dossier} />}
  </>;
}
