import type { Lot } from "registry-client";
import type { Loan } from "vault-client";
import { getLot, getLoan, getDebt } from "../../lib/stellar/query";
import { businessEventLabel } from "./labels";
import { explainError } from "../../lib/stellar/errors";

export type BusinessEvent = { id: string; name: string; txHash: string; ledger: number; closedAt: string; lotId: string; label?: string; evidence?: string };
export type DashboardData = { lots: Lot[]; loans: { loan: Loan; debt: bigint }[]; events: BusinessEvent[]; issues: string[]; coverage: Record<string, { fromLedger: number; nextLedger: number; updatedAt?: string }>; fetchedAt: string };
export const emptyDashboard = (): DashboardData => ({ lots: [], loans: [], events: [], issues: [], coverage: {}, fetchedAt: "" });

/** IDs identify a bounded read selection, not a global inventory or a financial decision. */
export function addIdentifier(existing: string[], value: string): string[] {
  if (!/^[1-9]\d{0,19}$/.test(value) || BigInt(value) > 18446744073709551615n) throw new Error("Ingresá un identificador entero positivo válido.");
  const canonical = BigInt(value).toString();
  if (existing.includes(canonical)) return existing;
  if (existing.length >= 12) throw new Error("Consultá hasta 12 identificadores por vista.");
  return [...existing, canonical];
}

export async function readDashboard(lotIds: string[], loanIds: string[]): Promise<DashboardData> {
  const result = emptyDashboard();
  const [lots, loans, histories] = await Promise.all([
    Promise.allSettled(lotIds.map(id => getLot(BigInt(id)))),
    Promise.allSettled(loanIds.map(async id => {
      const [loan, debt] = await Promise.all([getLoan(BigInt(id)), getDebt(BigInt(id))]);
      return { loan, debt };
    })),
    Promise.allSettled(lotIds.map(readTimeline)),
  ]);
  lots.forEach((item, index) => { if (item.status === "fulfilled") result.lots.push(item.value); else result.issues.push(`Lote ${lotIds[index]}: ${explainError(item.reason)}`); });
  loans.forEach((item, index) => { if (item.status === "fulfilled") result.loans.push(item.value); else result.issues.push(`Préstamo ${loanIds[index]}: ${explainError(item.reason)}`); });
  const events = new Map<string, BusinessEvent>();
  histories.forEach((item, index) => {
    if (item.status === "rejected") result.issues.push(`Historial del lote ${lotIds[index]}: no disponible; no se inventaron eventos.`);
    else {
      result.coverage[lotIds[index] ?? ""] = { fromLedger: item.value.fromLedger, nextLedger: item.value.nextLedger, updatedAt: item.value.updatedAt };
      if (item.value.error) result.issues.push(`Historial del lote ${lotIds[index]}: cobertura incompleta o desactualizada.`);
      item.value.events.forEach(event => {
        const existing = events.get(event.id);
        if (existing && (existing.txHash !== event.txHash || existing.name !== event.name || existing.ledger !== event.ledger)) result.issues.push("Hay eventos incompatibles en el índice. Contrastá sus transacciones.");
        else events.set(event.id, { ...event, lotId: lotIds[index] ?? "" });
      });
    }
  });
  result.events = [...events.values()].sort((a, b) => b.ledger - a.ledger || b.id.localeCompare(a.id));
  result.fetchedAt = new Date().toISOString();
  return result;
}

async function readTimeline(id: string): Promise<{ events: Omit<BusinessEvent, "lotId">[]; fromLedger: number; nextLedger: number; updatedAt?: string; error?: string }> {
  const response = await fetch(`/api/lots/${id}/history`, { cache: "no-store" });
  if (!response.ok) throw new Error("No history.");
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || !("events" in value) || !Array.isArray(value.events)) throw new Error("Invalid timeline.");
  const events = value.events.map((event: unknown) => {
    if (!event || typeof event !== "object") throw new Error("Invalid event.");
    const item = event as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.name !== "string" || typeof item.txHash !== "string" || !/^[a-f0-9]{64}$/.test(item.txHash) || typeof item.ledger !== "number" || !Number.isSafeInteger(item.ledger) || typeof item.closedAt !== "string") throw new Error("Invalid event provenance.");
    const data = item.data && typeof item.data === "object" ? item.data as Record<string, unknown> : {};
    const lot = data.lot && typeof data.lot === "object" ? data.lot as Record<string, unknown> : {};
    const attestation = lot.last_attestation && typeof lot.last_attestation === "object" ? lot.last_attestation as Record<string, unknown> : {};
    const evidence = typeof attestation.evidence === "string" && /^[a-f0-9]{64}$/.test(attestation.evidence) ? attestation.evidence : undefined;
    return { id: item.id, name: item.name, txHash: item.txHash, ledger: item.ledger, closedAt: item.closedAt, evidence, label: businessEventLabel(item.name, item.data) };
  });
  if (!("fromLedger" in value) || typeof value.fromLedger !== "number" || !Number.isSafeInteger(value.fromLedger) || !("nextLedger" in value) || typeof value.nextLedger !== "number" || !Number.isSafeInteger(value.nextLedger) || value.nextLedger < value.fromLedger) throw new Error("Invalid coverage.");
  return { events, fromLedger: value.fromLedger, nextLedger: value.nextLedger, updatedAt: "updatedAt" in value && typeof value.updatedAt === "string" ? value.updatedAt : undefined, error: "error" in value && typeof value.error === "string" ? value.error : undefined };
}
