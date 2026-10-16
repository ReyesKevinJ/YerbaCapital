import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeDossier, parseDossier, dateAlert } from "../src/features/pilot/model";
const agreement = { id: "demo", title: "Depósito sintético", owner: "custodian-demo", category: "custody", status: "Draft", pending: "", evidence: [], updatedAt: "2026-10-16T12:00:00Z" };
test("pilot review requires evidence and blocked agreements require a reason", () => {
  assert.throws(() => parseDossier({ version: 1, agreements: [{ ...agreement, status: "Reviewed" }] }));
  assert.throws(() => parseDossier({ version: 1, agreements: [{ ...agreement, status: "Blocked" }] }));
  assert.equal(parseDossier({ version: 1, agreements: [{ ...agreement, status: "Reviewed", evidence: ["a".repeat(64)] }] }).agreements[0]?.status, "Reviewed");
});
test("pilot import rejects duplicates, malformed hashes and unknown categories", () => {
  for (const agreements of [[agreement, agreement], [{ ...agreement, evidence: ["bad"] }], [{ ...agreement, category: "__proto__" }]]) {
    assert.throws(() => parseDossier({ version: 1, agreements }));
  }
  assert.throws(() => decodeDossier("{"), /JSON válido/);
  assert.throws(() => decodeDossier(" ".repeat(1_000_001)), /límite/);
  assert.deepEqual(decodeDossier(JSON.stringify({ version: 1, agreements: [agreement] })).agreements[0], agreement);
});

test("document reminders distinguish overdue, due today and the fourteen-day boundary", () => {
  assert.equal(dateAlert("2026-10-15", "2026-10-16"), "Overdue");
  assert.equal(dateAlert("2026-10-16", "2026-10-16"), "DueSoon");
  assert.equal(dateAlert("2026-10-30", "2026-10-16"), "DueSoon");
  assert.equal(dateAlert("2026-10-31", "2026-10-16"), "Current");
  assert.equal(dateAlert("", "2026-10-16"), "Current");
});
