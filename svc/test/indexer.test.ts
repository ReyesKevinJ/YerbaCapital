import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mergeEvents, publicEventData, readHistory, writeHistory, type TimelineEvent } from "../src/indexer/store.js";

test("event projection deduplicates replay, sorts positions and rejects conflicting history", () => {
  const event: TimelineEvent = { id: "0001", contractId: "synthetic", name: "LotRegistered", lotId: "1",
    ledger: 100, closedAt: "synthetic", txHash: "synthetic", data: { kg: "12000" } };
  const later = { ...event, id: "0002", ledger: 101 };
  assert.deepEqual(mergeEvents([later], [event, later, event]), [event, later]);
  assert.throws(() => mergeEvents([event], [{ ...event, name: "LotImpaired" }]), /Conflicting/);
  assert.deepEqual(publicEventData({ debt: 90071992547409930000001n, evidence: Buffer.alloc(32, 2) }),
    { debt: "90071992547409930000001", evidence: "02".repeat(32) });
});

test("read model persists coverage/error without replacing contract authority", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yerba-index-"));
  const path = join(directory, "history.json");
  try {
    assert.equal(await readHistory(path), undefined);
    const history = { network: "testnet" as const, contracts: ["synthetic"], fromLedger: 100, nextLedger: 105,
      events: [], error: "History gap" };
    await writeHistory(path, history);
    assert.deepEqual(await readHistory(path), history);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
