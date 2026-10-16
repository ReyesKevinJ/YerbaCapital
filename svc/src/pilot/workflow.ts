import { PilotError } from "./error.js";

/** Documentary preparation checklist; it is not a statement of legal compliance. */
export const checklistTemplates: Record<string, { id: string; label: string }[]> = {
  commercial: [{ id: "cashflow", label: "Necesidad de caja y calendario de repago" }, { id: "alternatives", label: "Comparación con alternativas y disposición a pagar" }],
  legal: [{ id: "instrument", label: "Instrumento y facultades de representación a revisar" }, { id: "enforcement", label: "Procedimiento de ejecución y perímetro regulatorio" }],
  custody: [{ id: "segregation", label: "Identificación, segregación y control de inventario" }, { id: "withdrawal", label: "Responsabilidades, salidas y gravámenes externos" }],
  insurance: [{ id: "coverage", label: "Bienes, riesgos cubiertos, exclusiones y franquicia" }, { id: "validity", label: "Vigencia, beneficiarios y constancia de pago" }],
  settlement: [{ id: "corridor", label: "Proveedor, corredor y participantes admitidos" }, { id: "costs", label: "Cotización, costos, plazos y cumplimiento a revisar" }],
  pricing: [{ id: "acceptance", label: "Aceptación del fee y modalidad de cobro" }, { id: "margin", label: "Costos, impuestos y margen por operación" }],
};
export type ChecklistItem = { id: string; owner: string; dueDate: string; done: boolean };
export type Comment = { id: string; actor: string; at: string; kind: "Note" | "ChangesRequested"; text: string };
export type DocumentVersion = { version: number; hash: string; label: string; actor: string; at: string; phase?: "Draft" | "Submitted" | "Reviewed" };

export function dateOnly(value: unknown): string {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new PilotError(400, "Fecha inválida; usá una fecha de calendario.");
  return value;
}

export function parseChecklist(value: unknown, category: string, owner: string): ChecklistItem[] {
  const template = checklistTemplates[category];
  if (!template) throw new PilotError(400, "Categoría de checklist inválida.");
  if (value === undefined) return template.map(item => ({ id: item.id, owner, dueDate: "", done: false }));
  if (!Array.isArray(value) || value.length !== template.length) throw new PilotError(400, "Completá el checklist de la categoría elegida.");
  const ids = new Set<string>();
  return template.map(expected => {
    const item = value.find(item => item && typeof item === "object" && item.id === expected.id) as Record<string, unknown> | undefined;
    if (!item || ids.has(expected.id) || typeof item.owner !== "string" || !item.owner.trim() || item.owner.length > 200 || typeof item.done !== "boolean") throw new PilotError(400, "Cada pendiente requiere responsable y estado.");
    ids.add(expected.id);
    return { id: expected.id, owner: item.owner.trim(), done: item.done, dueDate: dateOnly(item.dueDate) };
  });
}

export function assertReviewable(checklist: ChecklistItem[] | undefined, expiresOn: string | undefined, now = new Date()): void {
  if (!checklist?.length || checklist.some(item => !item.done)) throw new PilotError(400, "Completá el checklist antes de registrar la revisión.");
  if (expiresOn && expiresOn < now.toISOString().slice(0, 10)) throw new PilotError(400, "El acuerdo está vencido. Actualizá su vigencia y solicitá otra revisión.");
}
