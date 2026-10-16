import { validIdentifier } from "../public-lot/identifier";
export type Catalog = { lotIds: string[]; loanIds: string[]; totalLots: number; totalLoans: number; offset: number; nextOffset: number | null; fromLedger: number; nextLedger: number; updatedAt?: string; error?: string };
export function parseCatalog(value: unknown, registry: string, vault: string): Catalog {
  if (!value || typeof value !== "object") throw new Error("Catálogo inválido.");
  const item = value as Record<string, unknown>;
  const list = (input: unknown): input is string[] => Array.isArray(input) && input.length <= 12 && input.every(id => typeof id === "string" && validIdentifier(id)) && new Set(input).size === input.length;
  const integer = (input: unknown): input is number => typeof input === "number" && Number.isSafeInteger(input) && input >= 0;
  if (item.network !== "testnet" || !Array.isArray(item.contracts) || item.contracts.length !== 2 || item.contracts[0] !== registry || item.contracts[1] !== vault ||
      !list(item.lotIds) || !list(item.loanIds) || !integer(item.totalLots) || !integer(item.totalLoans) || !integer(item.offset) || item.offset > 1_000_000 ||
      !(item.nextOffset === null || integer(item.nextOffset) && item.nextOffset > item.offset && item.nextOffset <= 1_000_000) ||
      !integer(item.fromLedger) || !integer(item.nextLedger) || item.nextLedger < item.fromLedger ||
      !(item.updatedAt === undefined || typeof item.updatedAt === "string") || !(item.error === undefined || typeof item.error === "string")) throw new Error("El catálogo no corresponde a este despliegue o tiene datos inválidos.");
  return { lotIds: item.lotIds, loanIds: item.loanIds, totalLots: item.totalLots, totalLoans: item.totalLoans, offset: item.offset, nextOffset: item.nextOffset, fromLedger: item.fromLedger, nextLedger: item.nextLedger, ...(typeof item.updatedAt === "string" ? { updatedAt: item.updatedAt } : {}), ...(typeof item.error === "string" ? { error: item.error } : {}) };
}
