import type { History } from "./store.js";

const validId = (value: string) => /^[1-9]\d{0,19}$/.test(value) && BigInt(value) <= 18446744073709551615n;
const compareIds = (a: string, b: string) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
/** Discovery from confirmed events only. This is not a projection of current financial state. */
export function catalogPage(history: History, offset: number) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) throw new Error("Invalid catalog offset.");
  const lots = new Set<string>(); const loans = new Set<string>();
  for (const event of history.events) {
    if (!history.contracts.includes(event.contractId)) continue;
    if (event.lotId && validId(event.lotId)) lots.add(event.lotId);
    if (event.loanId && validId(event.loanId)) loans.add(event.loanId);
  }
  const lotIds = [...lots].sort(compareIds); const loanIds = [...loans].sort(compareIds);
  const pageSize = 12;
  return {
    network: "testnet", contracts: history.contracts, fromLedger: history.fromLedger,
    nextLedger: history.nextLedger, updatedAt: history.updatedAt, error: history.error,
    lotIds: lotIds.slice(offset, offset + pageSize), loanIds: loanIds.slice(offset, offset + pageSize),
    totalLots: lotIds.length, totalLoans: loanIds.length, offset, pageSize,
    nextOffset: offset + pageSize < Math.max(lotIds.length, loanIds.length) ? offset + pageSize : null,
  };
}
