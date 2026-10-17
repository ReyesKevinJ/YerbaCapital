import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EvidenceStore } from "../src/storage/evidence-store.js";
test("local evidence is retrievable with persistent metadata and never invents an IPFS reference", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yc-evidence-metadata-"));
  try {
    const store = new EvidenceStore(directory);
    const bytes = Buffer.from([137,80,78,71,13,10,26,10]);
    const reference = await store.put(bytes);
    assert.equal(reference.ipfsCid, undefined);
    assert.deepEqual(await store.get(reference.sha256), bytes);
    assert.deepEqual(await store.getMetadata(reference.sha256), { sha256: reference.sha256, mediaType: "image/png", storage: { kind: "local" } });
    const metadata = { sha256: reference.sha256, mediaType: "image/png", storage: { kind: "local" as const } };
    await store.putMetadata(reference.sha256, metadata);
    assert.deepEqual(await new EvidenceStore(directory).getMetadata(reference.sha256), metadata);
    assert.equal(await store.getMetadata("0".repeat(64)), undefined);
    const pinned = { ...metadata, storage: { kind: "ipfs" as const, cid: "synthetic-previous-confirmed-pin", gatewayUrl: "https://example.invalid/synthetic-test-only" } };
    await store.putMetadata(reference.sha256, pinned);
    await store.putMetadata(reference.sha256, metadata);
    assert.deepEqual(await new EvidenceStore(directory).getMetadata(reference.sha256), pinned);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("HTTP metadata requires bearer access, existing verified bytes and matching media signatures", async () => {
  const { createEvidenceServer } = await import("../src/http/server.js");
  const directory = await mkdtemp(join(tmpdir(), "yc-evidence-metadata-http-"));
  const token = "synthetic-test-token-for-metadata-1234567890";
  const server = createEvidenceServer({ networkPassphrase: "Test SDF Network ; September 2015", rpcUrl: "https://soroban-testnet.stellar.org", port: 3001, storageDirectory: directory, accessToken: token, maxEvidenceBytes: 1000 });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const headers = { authorization: `Bearer ${token}` };
  try {
    const response = await fetch(`${base}/evidence`, { method: "POST", headers: { ...headers, "content-type": "application/octet-stream" }, body: new Uint8Array([137,80,78,71,13,10,26,10]) });
    const reference = await response.json() as { sha256: string };
    const endpoint = `${base}/evidence/${reference.sha256}/metadata`;
    assert.equal((await fetch(endpoint)).status, 401);
    assert.equal((await fetch(`${base}/evidence/${"0".repeat(64)}/metadata`, { headers })).status, 404);
    const metadata = { sha256: reference.sha256, mediaType: "image/png", storage: { kind: "local" } };
    assert.equal((await fetch(endpoint, { method: "PUT", headers, body: "{" })).status, 400);
    assert.equal((await fetch(endpoint, { method: "PUT", headers, body: JSON.stringify({ ...metadata, mediaType: "image/jpeg" }) })).status, 400);
    assert.equal((await fetch(endpoint, { method: "PUT", headers, body: JSON.stringify({ ...metadata, privateName: "must-not-persist" }) })).status, 200);
    assert.deepEqual(await (await fetch(endpoint, { headers })).json(), metadata);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await rm(directory, { recursive: true, force: true }); }
});
