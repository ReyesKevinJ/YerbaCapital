import test from "node:test";
import assert from "node:assert/strict";
import { catalogPage } from "../src/indexer/catalog.js";
import type { History, TimelineEvent } from "../src/indexer/store.js";

test("catalog discovers bounded unique identifiers, preserves coverage and never invents status", () => {
  const events: TimelineEvent[] = Array.from({ length: 14 }, (_, index) => ({ id: String(index), contractId: "registry", name: "LotRegistered", lotId: String(index + 1), loanId: String(index + 1), ledger: 10, closedAt: "synthetic", txHash: "synthetic", data: {} }));
  const history: History = { network: "testnet", contracts: ["registry", "vault"], fromLedger: 10, nextLedger: 30, error: "History gap", events: [...events, events[0] as TimelineEvent, { ...events[0] as TimelineEvent, contractId: "other", lotId: "999" }, { ...events[0] as TimelineEvent, lotId: "18446744073709551616", loanId: "0" }] };
  const first = catalogPage(history, 0);
  assert.equal(first.totalLots, 14); assert.equal(first.lotIds.length, 12); assert.equal(first.nextOffset, 12);
  assert.equal(first.error, "History gap"); assert.equal(first.fromLedger, 10);
  const second = catalogPage(history, 12);
  assert.deepEqual(second.lotIds, ["13", "14"]); assert.equal(second.nextOffset, null);
  assert.equal("status" in first, false);
  assert.throws(() => catalogPage(history, -1));
});
