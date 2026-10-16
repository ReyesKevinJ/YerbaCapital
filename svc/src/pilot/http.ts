import { checklistTemplates, assertReviewable, type DocumentVersion } from "./workflow.js";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { EvidenceStore } from "../storage/evidence-store.js";
import { PilotStore } from "./store.js";
import { authenticate, parseAgreement, PilotError, type Member, type State } from "./model.js";

export function pilotHandler(directory: string, members: Member[]) {
  const store = new PilotStore(join(directory, "pilot", "revisions"));
  const documents = new EvidenceStore(join(directory, "pilot", "documents"));
  return async (request: IncomingMessage, response: ServerResponse, pathname: string) => {
    const actor = authenticate(members, request.headers.authorization);
    if (request.method === "GET" && pathname === "/pilot/session") { json(response, 200, actor); return; }
    if (request.method === "GET" && pathname === "/pilot") { json(response, 200, { ...await store.read(), actor, checklistTemplates, serverDate: new Date().toISOString().slice(0, 10) }); return; }
    const documentMatch = /^\/pilot\/documents\/([a-f0-9]{64})$/.exec(pathname);
    if (request.method === "GET" && documentMatch?.[1]) {
      if (!(await store.read()).documents.includes(documentMatch[1])) throw new PilotError(404, "Documento no disponible en este expediente.");
      const bytes = await documents.get(documentMatch[1]);
      if (!bytes) throw new PilotError(404, "Documento no disponible.");
      response.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${documentMatch[1]}.bin"` }); response.end(bytes); return;
    }
    if (actor.role === "observer") throw new PilotError(403, "Tu acceso es de solo lectura.");
    const header = request.headers["if-match"];
    if (typeof header !== "string" || !/^\d{1,4}$/.test(header)) throw new PilotError(428, "Indicá la revisión vigente del expediente.");
    const expected = Number(header);
    if (request.method === "POST" && pathname === "/pilot/documents") {
      if (request.headers["content-type"] !== "application/octet-stream") throw new PilotError(415, "Se requieren bytes originales.");
      const reference = await documents.put(await body(request, 5 * 1024 * 1024));
      const state = await store.update(expected, state => {
        if (!state.documents.includes(reference.sha256)) state.documents.push(reference.sha256);
        if (state.documents.length > 500) throw new PilotError(409, "Límite de documentos alcanzado.");
        state.history.push({ revision: state.revision, actor: actor.id, at: new Date().toISOString(), action: "DocumentStored", document: reference.sha256 });
      });
      json(response, 201, { sha256: reference.sha256, revision: state.revision }); return;
    }
    const commentMatch = /^\/pilot\/agreements\/([a-zA-Z0-9_-]{1,100})\/comments$/.exec(pathname);
    if (request.method === "POST" && commentMatch?.[1]) {
      if (request.headers["content-type"] !== "application/json") throw new PilotError(415, "Se requiere JSON.");
      let input: unknown;
      try { input = JSON.parse((await body(request, 6000)).toString("utf8")); } catch (error) {
        if (error instanceof PilotError) throw error;
        throw new PilotError(400, "JSON inválido.");
      }
      if (!input || typeof input !== "object" || !("text" in input) || typeof input.text !== "string" || !input.text.trim() || input.text.length > 2000 || !("kind" in input) || !["Note", "ChangesRequested"].includes(String(input.kind))) throw new PilotError(400, "Comentario inválido (máximo 2000 caracteres).");
      const kind = input.kind as "Note" | "ChangesRequested";
      const text = input.text.trim();
      if (kind === "ChangesRequested" && actor.role !== "reviewer") throw new PilotError(403, "Solo reviewer puede solicitar correcciones.");
      const state = await store.update(expected, state => {
        const agreement = state.agreements.find(a => a.id === commentMatch[1]);
        if (!agreement) throw new PilotError(404, "Acuerdo no encontrado.");
        if ((agreement.comments?.length ?? 0) >= 100) throw new PilotError(409, "Máximo 100 comentarios por acuerdo.");
        const at = new Date().toISOString();
        agreement.comments = [...(agreement.comments ?? []), { id: randomUUID(), actor: actor.id, at, kind, text }];
        if (kind === "ChangesRequested") { agreement.status = "Draft"; delete agreement.reviewedBy;
          const currentVersion = agreement.documentVersions?.at(-1); if (currentVersion) currentVersion.phase = "Draft"; }
        agreement.updatedAt = at;
        state.history.push({ revision: state.revision, actor: actor.id, at, action: kind === "ChangesRequested" ? "ChangesRequested" : "CommentAdded", agreementId: agreement.id });
      });
      json(response, 201, { ...state, actor, checklistTemplates, serverDate: new Date().toISOString().slice(0, 10) }); return;
    }
    const match = /^\/pilot\/agreements(?:\/([a-zA-Z0-9_-]{1,100}))?$/.exec(pathname);
    if (match && ((request.method === "POST" && !match[1]) || (request.method === "PUT" && match[1]))) {
      if (request.headers["content-type"] !== "application/json") throw new PilotError(415, "Se requiere JSON.");
      let input: unknown;
      try { input = JSON.parse((await body(request, 16000)).toString("utf8")); } catch (error) {
        if (error instanceof PilotError) throw error;
        throw new PilotError(400, "JSON inválido.");
      }
      const values = parseAgreement(input);
      const id = match[1] ?? randomUUID();
      const state = await store.update(expected, state => {
        const previous = state.agreements.find(a => a.id === id);
        if (match[1] && !previous) throw new PilotError(404, "Acuerdo no encontrado.");
        if (!previous && state.agreements.length >= 100) throw new PilotError(409, "Máximo 100 acuerdos.");
        if (values.evidence.some(hash => !state.documents.includes(hash))) throw new PilotError(400, "Los adjuntos deben pertenecer al expediente privado.");
        const reviewing = values.status === "Reviewed";
        if (reviewing) {
          if (actor.role !== "reviewer" || !previous || previous.status !== "InReview" || previous.editedBy === actor.id) throw new PilotError(403, "La revisión requiere un reviewer distinto de quien editó y un acuerdo En revisión.");
          assertReviewable(previous.checklist, previous.expiresOn);
          const comparable = (a: typeof values) => JSON.stringify([a.title, a.owner, a.category, a.pending, a.evidence, a.checklist ?? [], a.expiresOn ?? ""]);
          if (comparable(previous) !== comparable(values)) throw new PilotError(400, "Revisá la versión existente sin modificar su contenido.");
        }
        const at = new Date().toISOString();
        const oldVersions: DocumentVersion[] = previous?.documentVersions ?? previous?.evidence.map((hash, index) => ({ version: index + 1, hash, label: `Documento ${index + 1}`, actor: previous.editedBy, at: previous.updatedAt })) ?? [];
        if (previous?.evidence.some(hash => !values.evidence.includes(hash))) throw new PilotError(400, "Conservá las versiones anteriores de los documentos.");
        const added = values.evidence.filter(hash => !oldVersions.some(version => version.hash === hash));
        const documentVersions: DocumentVersion[] = [...oldVersions, ...added.map((hash, index) => ({ version: oldVersions.length + index + 1, hash, label: `Documento ${oldVersions.length + index + 1}`, actor: actor.id, at }))];
        const currentVersion = documentVersions.at(-1);
        if (currentVersion) currentVersion.phase = reviewing ? "Reviewed" : values.status === "InReview" ? "Submitted" : "Draft";
        state.agreements = state.agreements.filter(a => a.id !== id);
        state.agreements.push({ ...values, id, documentVersions, comments: previous?.comments ?? [], updatedAt: at, editedBy: reviewing ? previous?.editedBy ?? actor.id : actor.id, ...(reviewing ? { reviewedBy: actor.id } : {}) });
        state.history.push({ revision: state.revision, actor: actor.id, at, action: reviewing ? "AgreementReviewed" : previous ? "AgreementUpdated" : "AgreementCreated", agreementId: id });
      });
      json(response, match[1] ? 200 : 201, { ...state, actor, checklistTemplates, serverDate: new Date().toISOString().slice(0, 10) }); return;
    }
    throw new PilotError(404, "Ruta de expediente no encontrada.");
  };
}

async function body(request: IncomingMessage, max: number): Promise<Buffer> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += buffer.length;
    if (size > max) throw new PilotError(413, "La solicitud supera el límite permitido.");
    chunks.push(buffer);
  }
  if (!size) throw new PilotError(400, "La solicitud está vacía.");
  return Buffer.concat(chunks);
}
function json(response: ServerResponse, status: number, value: State | unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); response.end(JSON.stringify(value));
}
