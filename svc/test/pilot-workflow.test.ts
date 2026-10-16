import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { createEvidenceServer } from "../src/http/server.js";
import { TESTNET_PASSPHRASE } from "../src/config/environment.js";
import { parseMembers, parseAgreement, type State } from "../src/pilot/model.js";
import { assertReviewable, checklistTemplates, dateOnly } from "../src/pilot/workflow.js";

test("checklist rejects missing responsibilities and dates; review rejects incomplete or expired documents", () => {
  assert.throws(() => dateOnly("2026-02-30"));
  assert.equal(dateOnly("2028-02-29"), "2028-02-29");
  assert.throws(() => assertReviewable([], "", new Date("2026-10-16")), /checklist/);
  const checklist = checklistTemplates.insurance!.map(item => ({ id: item.id, owner: "demo", dueDate: "", done: true }));
  assert.throws(() => assertReviewable(checklist, "2026-10-15", new Date("2026-10-16")), /vencido/);
  assert.doesNotThrow(() => assertReviewable(checklist, "2026-10-16", new Date("2026-10-16")));
  assert.throws(() => parseAgreement({ title: "Demo", owner: "demo", category: "insurance", status: "Draft", pending: "", evidence: [], checklist: checklist.map(item => ({ ...item, owner: "" })) }));
});

test("comments retain authors, corrections invalidate review and document versions cannot be removed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yerba-workflow-"));
  const members = parseMembers(JSON.stringify(["editor", "reviewer", "observer"].map(role => ({ id: `${role}-demo`, role, token: role[0]!.repeat(43) }))));
  const server = createEvidenceServer({ networkPassphrase: TESTNET_PASSPHRASE, rpcUrl: "https://soroban-testnet.stellar.org", port: 3001, storageDirectory: directory, accessToken: "s".repeat(43), maxEvidenceBytes: 5242880, pilotMembers: members });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (path: string, role: string, method: string, revision: number, value: unknown) => fetch(base + path, { method, headers: { authorization: `Bearer ${role.repeat(43)}`, "content-type": "application/json", "if-match": String(revision) }, body: JSON.stringify(value) });
  async function upload(text: string, revision: number): Promise<string> {
    const response = await fetch(base + "/pilot/documents", { method: "POST", headers: { authorization: `Bearer ${"e".repeat(43)}`, "content-type": "application/octet-stream", "if-match": String(revision) }, body: text });
    assert.equal(response.status, 201); return (await response.json() as { sha256: string }).sha256;
  }
  try {
    const first = await upload("synthetic version one", 0);
    const checklist = checklistTemplates.insurance!.map(item => ({ id: item.id, owner: "demo", dueDate: "", done: true }));
    const values = { title: "Insurance demo", owner: "demo", category: "insurance", status: "InReview", pending: "", evidence: [first], checklist, expiresOn: "" };
    const response = await call("/pilot/agreements", "e", "POST", 1, values);
    assert.equal(response.status, 201); const created = await response.json() as State; const id = created.agreements[0]!.id;
    const path = `/pilot/agreements/${id}`;
    assert.equal((await call(path, "r", "PUT", 2, { ...values, status: "Reviewed" })).status, 200);
    assert.equal((await call(path + "/comments", "o", "POST", 3, { text: "Forbidden", kind: "Note" })).status, 403);
    assert.equal((await call(path + "/comments", "e", "POST", 3, { text: "Change this", kind: "ChangesRequested" })).status, 403);
    const correction = await call(path + "/comments", "r", "POST", 3, { text: "Revisar exclusiones", kind: "ChangesRequested", actor: "spoof" });
    assert.equal(correction.status, 201); const corrected = await correction.json() as State;
    assert.equal(corrected.agreements[0]?.status, "Draft");
    assert.equal(corrected.agreements[0]?.reviewedBy, undefined);
    assert.equal(corrected.agreements[0]?.comments?.[0]?.actor, "reviewer-demo");
    const second = await upload("synthetic version two", 4);
    const updated = await call(path, "e", "PUT", 5, { ...values, evidence: [first, second] });
    assert.equal(updated.status, 200); const state = await updated.json() as State;
    assert.deepEqual(state.agreements[0]?.documentVersions?.map(v => [v.version, v.hash]), [[1, first], [2, second]]);
    assert.equal(state.agreements[0]?.comments?.[0]?.text, "Revisar exclusiones");
    assert.equal(state.agreements[0]?.documentVersions?.[1]?.phase, "Submitted");
    assert.equal((await call(path, "e", "PUT", 6, { ...values, evidence: [second] })).status, 400);
    assert.equal((await call(path + "/comments", "e", "POST", 6, { text: "Resuelto", kind: "Note" })).status, 201);
    assert.equal((await call(path + "/comments", "e", "POST", 6, { text: "Old write", kind: "Note" })).status, 409);
  } finally { server.close(); await once(server, "close"); await rm(directory, { recursive: true, force: true }); }
});
