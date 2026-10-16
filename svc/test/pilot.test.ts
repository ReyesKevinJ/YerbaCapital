import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { createEvidenceServer } from "../src/http/server.js";
import { TESTNET_PASSPHRASE } from "../src/config/environment.js";
import { parseMembers, type State } from "../src/pilot/model.js";
import { backupPilot, verifyPilotBackup } from "../src/pilot/backup.js";
import { EvidenceStore } from "../src/storage/evidence-store.js";
import { checklistTemplates } from "../src/pilot/workflow.js";
import { PilotStore } from "../src/pilot/store.js";

const members = parseMembers(JSON.stringify([
  { id: "editor-demo", role: "editor", token: "e".repeat(43) },
  { id: "reviewer-demo", role: "reviewer", token: "r".repeat(43) },
  { id: "observer-demo", role: "observer", token: "o".repeat(43) },
]));

test("shared dossier enforces membership, private evidence, independent review and revisions across restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yerba-pilot-"));
  const server = createEvidenceServer({ networkPassphrase: TESTNET_PASSPHRASE, rpcUrl: "https://soroban-testnet.stellar.org", port: 3001, storageDirectory: directory, accessToken: "s".repeat(43), maxEvidenceBytes: 5242880, pilotMembers: members });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const send = (path: string, role: string, method = "GET", revision?: number, data?: unknown) => fetch(base + path, { method, headers: { authorization: `Bearer ${role.repeat(43)}`, ...(revision === undefined ? {} : { "if-match": String(revision) }), ...(data ? { "content-type": "application/json" } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  try {
    assert.equal((await fetch(base + "/pilot")).status, 401);
    assert.equal((await send("/pilot", "s")).status, 401);
    assert.equal((await send("/pilot", "o")).status, 200);
    const uploaded = await fetch(base + "/pilot/documents", { method: "POST", headers: { authorization: `Bearer ${"e".repeat(43)}`, "if-match": "0", "content-type": "application/octet-stream" }, body: "synthetic private document" });
    assert.equal(uploaded.status, 201);
    const { sha256 } = await uploaded.json() as { sha256: string };
    assert.equal((await fetch(base + `/evidence/${sha256}`, { headers: { authorization: `Bearer ${"s".repeat(43)}` } })).status, 404);
    assert.equal((await send(`/pilot/documents/${sha256}`, "o")).status, 200);
    assert.equal((await fetch(base + `/pilot/documents/${sha256}`)).status, 401);
    const values = { title: "Synthetic custody", owner: "demo", category: "custody", status: "InReview", pending: "", evidence: [sha256], checklist: checklistTemplates.custody!.map(item => ({ id: item.id, owner: "editor-demo", dueDate: "", done: true })), expiresOn: "" };
    assert.equal((await send("/pilot/agreements", "o", "POST", 1, values)).status, 403);
    assert.equal((await send("/pilot/agreements", "e", "POST", 0, values)).status, 409);
    const created = await send("/pilot/agreements", "e", "POST", 1, values);
    assert.equal(created.status, 201);
    const state = await created.json() as State;
    const id = state.agreements[0]!.id;
    assert.equal((await send(`/pilot/agreements/${id}`, "e", "PUT", 2, { ...values, status: "Reviewed" })).status, 403);
    assert.equal((await send(`/pilot/agreements/${id}`, "r", "PUT", 2, { ...values, title: "changed", status: "Reviewed" })).status, 400);
    const review = await send(`/pilot/agreements/${id}`, "r", "PUT", 2, { ...values, status: "Reviewed" });
    assert.equal(review.status, 200);
    const reviewed = await review.json() as State;
    assert.equal(reviewed.agreements[0]?.editedBy, "editor-demo");
    assert.equal(reviewed.agreements[0]?.reviewedBy, "reviewer-demo");
    assert.equal((await send(`/pilot/agreements/${id}`, "r", "PUT", 3, { ...values, status: "Reviewed" })).status, 403);
    const reopened = await send(`/pilot/agreements/${id}`, "e", "PUT", 3, { ...values, status: "Draft", pending: "Revisar cláusula" });
    assert.equal(reopened.status, 200);
    assert.equal((await reopened.json() as State).agreements[0]?.reviewedBy, undefined);
    const recovered = await new PilotStore(join(directory, "pilot", "revisions")).read();
    assert.equal(recovered.revision, 4);
    assert.equal(recovered.history[2]?.action, "AgreementReviewed");
    assert.equal(recovered.history[2]?.actor, "reviewer-demo");
    assert.equal((await readdir(join(directory, "pilot", "revisions"))).length, 4);
    const own = await send("/pilot/agreements", "r", "POST", 4, values);
    assert.equal(own.status, 201);
    const ownState = await own.json() as State;
    const ownAgreement = ownState.agreements.find(a => a.editedBy === "reviewer-demo");
    assert.ok(ownAgreement);
    assert.equal((await send(`/pilot/agreements/${ownAgreement.id}`, "r", "PUT", 5, { ...values, status: "Reviewed" })).status, 403);
    const snapshot = join(directory, "pilot", "revisions", "0000000005.json");
    const before = await readFile(snapshot, "utf8"); await writeFile(snapshot, before.replace("Revisar", "Alterar"));
    assert.equal((await send("/pilot", "e")).status, 503);
  } finally { server.close(); await once(server, "close"); await rm(directory, { recursive: true, force: true }); }
});

test("member settings reject duplicate tokens and stale writers cannot replace saved state", async () => {
  assert.throws(() => parseMembers(JSON.stringify([{ id: "a-demo", role: "editor", token: "x".repeat(43) }, { id: "b-demo", role: "reviewer", token: "x".repeat(43) }])));
  const directory = await mkdtemp(join(tmpdir(), "yerba-pilot-store-"));
  try {
    const store = new PilotStore(directory);
    await store.update(0, state => state.history.push({ revision: 1, actor: "demo", at: "2026-10-16", action: "DocumentStored" }));
    await assert.rejects(new PilotStore(directory).update(0, () => {}), /cambió/);
    assert.equal((await store.read()).revision, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test("complete pilot backup verifies files and restores into a new workspace", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yerba-backup-"));
  try {
    const source = join(directory, "source"); const destination = join(directory, "copy");
    const document = await new EvidenceStore(join(source, "documents")).put(Buffer.from("private synthetic"));
    await new PilotStore(join(source, "revisions")).update(0, state => { state.documents.push(document.sha256); });
    assert.equal(await backupPilot(source, destination), 1);
    assert.equal(await verifyPilotBackup(destination), 1);
    assert.equal((await new PilotStore(join(destination, "revisions")).read()).documents[0], document.sha256);
    assert.equal((await new EvidenceStore(join(destination, "documents")).get(document.sha256))?.toString(), "private synthetic");
    await assert.rejects(backupPilot(source, destination));
    assert.equal(await verifyPilotBackup(destination), 1);
    await writeFile(join(destination, "documents", document.sha256), "altered");
    await assert.rejects(verifyPilotBackup(destination), /checksum/);
    await assert.rejects(backupPilot(source, join(source, "nested")), /outside/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
