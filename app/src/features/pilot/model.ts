export const categories = {
  commercial: "Validación comercial",
  legal: "Encuadre jurídico",
  custody: "Acuerdo de custodia",
  insurance: "Seguro de stock",
  settlement: "Proveedor USDC/ARS",
  pricing: "Validación del fee",
} as const;
export const statuses = { Draft: "Borrador", InReview: "En revisión", Reviewed: "Revisado", Blocked: "Bloqueado" } as const;
export type Agreement = {
  id: string;
  category: keyof typeof categories;
  title: string;
  owner: string;
  status: keyof typeof statuses;
  pending: string;
  evidence: string[];
  updatedAt: string;
};
export type Dossier = { version: 1; agreements: Agreement[] };
export const storageKey = "yerbacapital.pilot.v1";

export function parseDossier(value: unknown): Dossier {
  const fail = () => { throw new Error("Expediente inválido. Usá una exportación de esta herramienta (máximo 100 acuerdos)."); };
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 ||
      !("agreements" in value) || !Array.isArray(value.agreements) || value.agreements.length > 100) return fail();
  const ids = new Set<string>();
  const agreements = value.agreements.map((item: unknown): Agreement => {
    if (!item || typeof item !== "object") return fail();
    const a = item as Record<string, unknown>;
    for (const key of ["id", "title", "owner", "pending", "updatedAt"]) {
      if (typeof a[key] !== "string" || (a[key] as string).length > (key === "pending" ? 2000 : 200)) return fail();
    }
    if (typeof a.category !== "string" || !Object.hasOwn(categories, a.category) ||
        typeof a.status !== "string" || !Object.hasOwn(statuses, a.status) ||
        !Array.isArray(a.evidence) || a.evidence.length > 20 ||
        a.evidence.some(hash => typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash))) return fail();
    const { id, title, owner, pending, updatedAt } = a as Record<string, string>;
    if (!id || !title?.trim() || !owner?.trim() || !updatedAt || !Number.isFinite(Date.parse(updatedAt)) || ids.has(id)) return fail();
    if ((a.status === "InReview" || a.status === "Reviewed") && a.evidence.length === 0) return fail();
    if (a.status === "Blocked" && !pending?.trim()) return fail();
    ids.add(id);
    return { id, title, owner, pending: pending ?? "", updatedAt, category: a.category as Agreement["category"], status: a.status as Agreement["status"], evidence: [...a.evidence] as string[] };
  });
  return { version: 1, agreements };
}

export function decodeDossier(text: string): Dossier {
  if (text.length > 1_000_000) throw new Error("El expediente supera el límite permitido.");
  try { return parseDossier(JSON.parse(text)); }
  catch (error) {
    if (error instanceof SyntaxError) throw new Error("El archivo no contiene JSON válido.");
    throw error;
  }
}

export type Actor = { id: string; role: "editor" | "reviewer" | "observer" };
export type SharedAgreement = Agreement & { editedBy: string; reviewedBy?: string; checklist?: ChecklistItem[]; expiresOn?: string; comments?: PilotComment[]; documentVersions?: DocumentVersion[] };
export type SharedDossier = { version: 1; revision: number; actor: Actor; serverDate: string; checklistTemplates: Record<string, { id: string; label: string }[]>; agreements: SharedAgreement[]; history: { revision: number; actor: string; at: string; action: string; agreementId?: string; document?: string }[]; documents: string[] };

export function parseSharedDossier(value: unknown): SharedDossier {
  parseDossier(value);
  const data = value as Record<string, unknown>;
  if (!Number.isSafeInteger(data.revision) || Number(data.revision) < 0 || !data.actor || typeof data.actor !== "object" ||
      !("id" in data.actor) || typeof data.actor.id !== "string" || !("role" in data.actor) ||
      !["editor", "reviewer", "observer"].includes(String(data.actor.role)) || !Array.isArray(data.history) || !Array.isArray(data.documents) || typeof data.serverDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.serverDate) || !data.checklistTemplates || typeof data.checklistTemplates !== "object") throw new Error("Respuesta de expediente inválida.");
  for (const agreement of data.agreements as Record<string, unknown>[]) {
    if (typeof agreement.editedBy !== "string" || (agreement.reviewedBy !== undefined && typeof agreement.reviewedBy !== "string")) throw new Error("Autoría de acuerdo inválida.");
  }
  for (const entry of data.history) {
    if (!entry || typeof entry !== "object" || typeof entry.actor !== "string" || typeof entry.action !== "string" || typeof entry.at !== "string" || !Number.isSafeInteger(entry.revision)) throw new Error("Historial inválido.");
  }
  for (const [category, template] of Object.entries(data.checklistTemplates)) {
    if (!Object.hasOwn(categories, category) || !Array.isArray(template) || template.some(item => !item || typeof item.id !== "string" || typeof item.label !== "string")) throw new Error("Checklist de respuesta inválido.");
  }
  return data as unknown as SharedDossier;
}

export type ChecklistItem = { id: string; owner: string; dueDate: string; done: boolean };
export type PilotComment = { id: string; actor: string; at: string; kind: "Note" | "ChangesRequested"; text: string };
export type DocumentVersion = { version: number; hash: string; label: string; actor: string; at: string; phase?: "Draft" | "Submitted" | "Reviewed" };
export function dateAlert(date: string | undefined, today: string): "Overdue" | "DueSoon" | "Current" {
  if (!date) return "Current";
  const days = (Date.parse(date) - Date.parse(today)) / 86400000;
  return days < 0 ? "Overdue" : days <= 14 ? "DueSoon" : "Current";
}
export function documentaryReady(agreement: SharedAgreement, today: string): boolean {
  return agreement.status === "Reviewed" && !!agreement.checklist?.length && agreement.checklist.every(item => item.done) && dateAlert(agreement.expiresOn, today) !== "Overdue";
}
