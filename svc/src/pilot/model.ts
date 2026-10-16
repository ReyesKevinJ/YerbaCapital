import { PilotError } from "./error.js";
export { PilotError } from "./error.js";
import { dateOnly, parseChecklist, type ChecklistItem, type Comment, type DocumentVersion } from "./workflow.js";
import { createHash, timingSafeEqual } from "node:crypto";

export type Member = { id: string; role: "editor" | "reviewer" | "observer"; token: string };
export type Actor = Pick<Member, "id" | "role">;
export type Agreement = {
  id: string; category: string; title: string; owner: string;
  status: "Draft" | "InReview" | "Reviewed" | "Blocked";
  pending: string; evidence: string[]; checklist?: ChecklistItem[]; expiresOn?: string; comments?: Comment[]; documentVersions?: DocumentVersion[]; updatedAt: string; editedBy: string; reviewedBy?: string;
};
export type AuditEntry = { revision: number; actor: string; at: string; action: "AgreementCreated" | "AgreementUpdated" | "AgreementReviewed" | "DocumentStored" | "CommentAdded" | "ChangesRequested"; agreementId?: string; document?: string };
export type State = { version: 1; revision: number; agreements: Agreement[]; documents: string[]; history: AuditEntry[] };
export const emptyState = (): State => ({ version: 1, revision: 0, agreements: [], documents: [], history: [] });

export function parseMembers(raw?: string): Member[] {
  if (!raw?.trim()) return [];
  const input: unknown = JSON.parse(raw);
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) throw new Error("PILOT_MEMBERS_JSON must define 1–50 synthetic members.");
  const ids = new Set<string>(); const tokens = new Set<string>();
  return input.map((value: unknown) => {
    const member = record(value);
    if (typeof member.id !== "string" || !/^[a-z0-9_-]{3,40}$/.test(member.id) ||
        !["editor", "reviewer", "observer"].includes(String(member.role)) ||
        typeof member.token !== "string" || !/^[A-Za-z0-9_-]{43,128}$/.test(member.token) ||
        ids.has(member.id) || tokens.has(member.token)) throw new Error("Invalid or duplicated pilot member configuration.");
    ids.add(member.id); tokens.add(member.token);
    return { id: member.id, role: member.role as Member["role"], token: member.token };
  });
}

export function authenticate(members: Member[], authorization?: string): Actor {
  if (members.length === 0) throw new PilotError(503, "El expediente compartido no tiene integrantes configurados.");
  const provided = createHash("sha256").update(authorization ?? "").digest();
  const member = members.find(candidate => timingSafeEqual(provided, createHash("sha256").update(`Bearer ${candidate.token}`).digest()));
  if (!member) throw new PilotError(401, "Acceso al expediente no autorizado.");
  return { id: member.id, role: member.role };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PilotError(400, "Datos de acuerdo inválidos.");
  return value as Record<string, unknown>;
}

export function parseAgreement(value: unknown): Pick<Agreement, "title" | "owner" | "category" | "status" | "pending" | "evidence" | "checklist" | "expiresOn"> {
  const input = record(value);
  const title = text(input.title, 200); const owner = text(input.owner, 200);
  const pending = text(input.pending, 2000, true);
  if (!["commercial", "legal", "custody", "insurance", "settlement", "pricing"].includes(String(input.category)) ||
      !["Draft", "InReview", "Reviewed", "Blocked"].includes(String(input.status)) ||
      !Array.isArray(input.evidence) || input.evidence.length > 20 ||
      input.evidence.some(hash => typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) ||
      new Set(input.evidence).size !== input.evidence.length) throw new PilotError(400, "Categoría, estado o adjuntos inválidos.");
  if (input.status === "Blocked" && !pending) throw new PilotError(400, "Indicá el motivo del bloqueo.");
  if (["InReview", "Reviewed"].includes(String(input.status)) && input.evidence.length === 0) throw new PilotError(400, "La revisión requiere evidencia.");
  return { title, owner, pending, checklist: parseChecklist(input.checklist, String(input.category), owner), expiresOn: dateOnly(input.expiresOn), category: String(input.category), status: input.status as Agreement["status"], evidence: [...input.evidence] as string[] };
}

function text(value: unknown, max: number, optional = false): string {
  if (typeof value !== "string" || value.length > max || (!optional && !value.trim())) throw new PilotError(400, "Completá título y responsable dentro de los límites permitidos.");
  return value.trim();
}
