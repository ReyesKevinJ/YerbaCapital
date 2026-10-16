import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** A read model of public confirmed events; never an authority for balances or permissions. */
export type TimelineEvent = {
  id: string; contractId: string; name: string; lotId?: string; loanId?: string;
  ledger: number; closedAt: string; txHash: string; data: unknown;
};
export type History = {
  network: "testnet"; contracts: string[]; fromLedger: number; nextLedger: number;
  events: TimelineEvent[]; updatedAt?: string; error?: string;
};

/** Lossless JSON representation for public event quantities and evidence bytes. */
export function publicEventData(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex");
  if (Array.isArray(value)) return value.map(publicEventData);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, publicEventData(item)]));
  return value;
}

export function mergeEvents(existing: TimelineEvent[], incoming: TimelineEvent[]): TimelineEvent[] {
  const byId = new Map(existing.map(event => [event.id, event]));
  for (const event of incoming) {
    const prior = byId.get(event.id);
    if (prior && JSON.stringify(prior) !== JSON.stringify(event)) throw new Error("Conflicting event at an indexed position.");
    byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) => a.ledger - b.ledger || a.id.localeCompare(b.id));
}

export async function readHistory(path: string): Promise<History | undefined> {
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!value || typeof value !== "object" || !("network" in value) || value.network !== "testnet" ||
        !("events" in value) || !Array.isArray(value.events) || !("nextLedger" in value)) {
      throw new Error("Invalid local read model.");
    }
    return value as History;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function writeHistory(path: string, history: History): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(history), { mode: 0o600 });
  await rename(temporary, path);
}
