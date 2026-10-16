"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { categories, statuses, storageKey, parseDossier, decodeDossier, type Dossier, type Agreement } from "./model";

export function PilotWorkspace() {
  const [dossier, setDossier] = useState<Dossier>({ version: 1, agreements: [] });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<string>();
  const form = useRef<HTMLFormElement>(null);
  const pendingRequest = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setDossier(decodeDossier(saved));
      setReady(true);
    } catch { setError("No se pudo leer el expediente local. La copia se conservó; revisá el almacenamiento antes de continuar."); }
  }, []);

  function persist(next: Dossier) {
    const valid = parseDossier(next);
    localStorage.setItem(storageKey, JSON.stringify(valid));
    setDossier(valid);
    setReady(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRequest.current) return;
    pendingRequest.current = true;
    setBusy(true); setError(""); setMessage("");
    try {
      // Prevent a stale tab from silently replacing changes saved by another tab.
      const saved = localStorage.getItem(storageKey);
      if (saved && JSON.stringify(decodeDossier(saved)) !== JSON.stringify(dossier)) {
        throw new Error("El expediente cambió en otra pestaña. Recargá antes de guardar.");
      }
      const data = new FormData(event.currentTarget);
      const previous = dossier.agreements.find(a => a.id === editing);
      const evidence = [...(previous?.evidence ?? [])];
      const file = data.get("document");
      const status = String(data.get("status")) as Agreement["status"];
      const title = String(data.get("title") ?? "").trim();
      const owner = String(data.get("owner") ?? "").trim();
      const notes = String(data.get("pending") ?? "").trim();
      if (!title || !owner) throw new Error("Completá título y responsable.");
      if (status === "Blocked" && !notes) throw new Error("Indicá qué bloquea el acuerdo.");
      if (file instanceof File && file.size > 0) {
        if (file.size > 5 * 1024 * 1024) throw new Error("El documento supera los 5 MiB.");
        if (evidence.length >= 20) throw new Error("Este acuerdo ya tiene 20 documentos.");
        const response = await fetch("/api/evidence", { method: "POST", headers: { "content-type": "application/octet-stream" }, body: file });
        const result: unknown = await response.json();
        if (!response.ok || !result || typeof result !== "object" || !("sha256" in result) ||
            typeof result.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(result.sha256)) throw new Error("No se pudo guardar el documento. Conservamos los campos para reintentar.");
        if (!evidence.includes(result.sha256)) evidence.push(result.sha256);
      }
      if ((status === "InReview" || status === "Reviewed") && evidence.length === 0) throw new Error("Adjuntá un documento antes de pasar a revisión.");
      const agreement: Agreement = { id: editing ?? crypto.randomUUID(), title, owner, status, pending: notes,
        category: String(data.get("category")) as Agreement["category"], evidence, updatedAt: new Date().toISOString() };
      // Recheck after upload, which may have taken time.
      if (localStorage.getItem(storageKey) !== saved) throw new Error("Otra pestaña guardó cambios. Recargá antes de continuar.");
      persist({ version: 1, agreements: [...dossier.agreements.filter(a => a.id !== agreement.id), agreement] });
      setEditing(undefined); form.current?.reset(); setMessage("Acuerdo guardado en este navegador.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar. Revisá el almacenamiento del navegador."); }
    finally { pendingRequest.current = false; setBusy(false); }
  }

  function edit(agreement: Agreement) {
    setEditing(agreement.id); setError(""); setMessage("");
    const fields = form.current;
    if (!fields) return;
    fields.reset();
    for (const name of ["title", "owner", "category", "status", "pending"] as const) {
      const input = fields.elements.namedItem(name);
      if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement) input.value = agreement[name];
    }
    (fields.elements.namedItem("title") as HTMLInputElement).focus();
  }

  async function importFile(file?: File) {
    if (!file) return;
    setError(""); setMessage("");
    try {
      if (file.size > 1_000_000) throw new Error("La copia supera 1 MB.");
      const incoming = decodeDossier(await file.text());
      // Merge new agreements only; conflicting IDs require explicit resolution outside the import.
      const saved = localStorage.getItem(storageKey);
      const current = saved ? decodeDossier(saved) : dossier;
      const byId = new Map(current.agreements.map(a => [a.id, a]));
      for (const agreement of incoming.agreements) {
        const existing = byId.get(agreement.id);
        if (existing && JSON.stringify(existing) !== JSON.stringify(agreement)) throw new Error("Hay versiones distintas de un mismo acuerdo. No se importó nada; compará las copias antes de continuar.");
        byId.set(agreement.id, agreement);
      }
      persist({ version: 1, agreements: [...byId.values()] });
      setMessage("Copia importada. Los archivos adjuntos permanecen en el servicio original.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo importar la copia."); }
  }

  function exportFile() {
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "yerbacapital-pilot.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <>
    <section className="panel" aria-labelledby="pilot-progress">
      <h2 id="pilot-progress">Cobertura del expediente</h2>
      <p>Revisado significa revisión documental declarada, no firma ni aprobación legal. Ningún estado habilita operaciones reales.</p>
      <ul>{Object.entries(categories).map(([key, label]) => <li key={key}>{label}: {dossier.agreements.some(a => a.category === key && a.status === "Reviewed") ? "con documentación revisada" : "pendiente de revisión"}</li>)}</ul>
      <button onClick={exportFile} disabled={!ready || busy}>Exportar expediente</button>
      <label htmlFor="pilot-import">Importar copia JSON (agrega acuerdos; no reemplaza versiones diferentes)</label>
      <input id="pilot-import" type="file" accept="application/json,.json" disabled={busy} onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />
    </section>
    <section className="panel" aria-labelledby="agreement-heading">
      <h2 id="agreement-heading">{editing ? "Editar acuerdo" : "Nuevo acuerdo"}</h2>
      <form ref={form} onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={!ready || busy}>
          <legend>Datos sintéticos del acuerdo</legend>
          <label htmlFor="agreement-title">Título</label><input id="agreement-title" name="title" required maxLength={200} />
          <label htmlFor="agreement-owner">Responsable (alias de prueba)</label><input id="agreement-owner" name="owner" required maxLength={200} />
          <label htmlFor="agreement-category">Categoría</label><select id="agreement-category" name="category">{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <label htmlFor="agreement-status">Estado documental</label><select id="agreement-status" name="status">{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <label htmlFor="agreement-pending">Pendientes o motivo del bloqueo</label><textarea id="agreement-pending" name="pending" maxLength={2000} rows={3} />
          <label htmlFor="agreement-document">Documento sintético (hasta 5 MiB)</label><input id="agreement-document" name="document" type="file" aria-describedby="document-help" />
          <p id="document-help" className="muted">Al editar se conservan los adjuntos anteriores. No cargues datos personales, pólizas ni acuerdos reales.</p>
          <button type="submit">{busy ? "Guardando…" : "Guardar acuerdo"}</button>
          {editing && <button type="button" onClick={() => { setEditing(undefined); form.current?.reset(); }}>Cancelar edición</button>}
        </fieldset>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      <p role="status">{message}</p>
    </section>
    <section className="panel" aria-labelledby="agreements-heading">
      <h2 id="agreements-heading">Acuerdos registrados ({dossier.agreements.length})</h2>
      {ready && dossier.agreements.length === 0 && <p>Todavía no hay acuerdos. Registrá el primero para organizar la revisión del piloto.</p>}
      {dossier.agreements.map(a => <article className="result" key={a.id} aria-label={a.title}>
        <h3>{a.title}</h3><p>{categories[a.category]} · {statuses[a.status]}</p>
        <p>Responsable: {a.owner}</p><p className="pilot-notes">Pendientes: {a.pending || "Sin pendientes declarados"}</p>
        <p>Última actualización: <time dateTime={a.updatedAt}>{new Date(a.updatedAt).toLocaleString("es-AR")}</time></p>
        <ul>{a.evidence.map(hash => <li className="address" key={hash}><a href={`/api/evidence/${hash}`} download>Descargar documento {hash}</a></li>)}</ul>
        <button disabled={busy} onClick={() => edit(a)}>Editar {a.title}</button>
      </article>)}
    </section>
  </>;
}
