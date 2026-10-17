import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { test } from "node:test";
import { loadServiceConfig, TESTNET_PASSPHRASE } from "../src/config/environment.js";
import { createEvidenceServer } from "../src/http/server.js";
import { EvidenceStore } from "../src/storage/evidence-store.js";

const TOKEN = "synthetic-test-token-not-a-real-credential";
const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

function environment(): NodeJS.ProcessEnv {
  return {
    NETWORK_PASSPHRASE: TESTNET_PASSPHRASE,
    STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
    EVIDENCE_STORAGE_DIR: "./.evidence",
    EVIDENCE_ACCESS_TOKEN: TOKEN,
  };
}

test("configuration requires Testnet, private access and valid operational limits", () => {
  const baseline = environment();
  assert.equal(loadServiceConfig(baseline).port, 3001);
  for (const override of [
    { NETWORK_PASSPHRASE: "Public Global Stellar Network ; September 2015" },
    { STELLAR_RPC_URL: "http://example.test" },
    { STELLAR_RPC_URL: "https://user:password@example.test" },
    { EVIDENCE_ACCESS_TOKEN: "short" },
    { EVIDENCE_PORT: "3001.5" },
    { EVIDENCE_PORT: "65536" },
    { EVIDENCE_MAX_BYTES: "0" },
    { EVIDENCE_STORAGE_DIR: "" },
  ]) {
    assert.throws(() => loadServiceConfig({ ...baseline, ...override }));
  }
});

test("storage handles concurrent identical uploads and detects modified files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yerba-store-"));
  try {
    const store = new EvidenceStore(directory);
    const references = await Promise.all(Array.from({ length: 8 }, () => store.put(Buffer.from("abc"))));
    assert.ok(references.every((reference) => reference.sha256 === ABC_SHA256));
    assert.deepEqual(await readdir(directory), [ABC_SHA256]);
    assert.equal((await store.get(ABC_SHA256))?.toString(), "abc");
    assert.equal(await store.get("0".repeat(64)), undefined);
    await assert.rejects(store.get("../private"));
    await writeFile(join(directory, ABC_SHA256), "altered");
    await assert.rejects(store.get(ABC_SHA256), /no longer matches/);
    await assert.rejects(store.put(Buffer.from("abc")), /no longer matches/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("HTTP evidence round trip requires authorization, exact bytes and limits", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yerba-http-"));
  const config = { ...loadServiceConfig(environment()), storageDirectory: directory, maxEvidenceBytes: 4 };
  const server = createEvidenceServer(config);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}`;
  const authorization = `Bearer ${TOKEN}`;
  const headers = { authorization, "content-type": "application/octet-stream" };
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json() as { attestsPhysicalFacts: boolean }).attestsPhysicalFacts, false);
    assert.equal((await fetch(`${base}/evidence`, { method: "POST", body: "abc" })).status, 401);
    assert.equal((await fetch(`${base}/evidence`, { method: "POST", headers: { authorization }, body: "abc" })).status, 415);
    assert.equal((await fetch(`${base}/evidence`, { method: "POST", headers, body: "" })).status, 400);
    assert.equal((await fetch(`${base}/evidence`, { method: "POST", headers, body: "abcde" })).status, 413);
    const uploaded = await fetch(`${base}/evidence`, { method: "POST", headers, body: "abc" });
    assert.equal(uploaded.status, 201);
    const reference = await uploaded.json() as { sha256: string; uri: string; ipfsCid?: string; ipfsUri?: string };
    assert.equal(reference.sha256, ABC_SHA256);
    assert.equal(reference.uri, `/evidence/${ABC_SHA256}`);
    assert.ok(reference.ipfsCid?.startsWith("Qm"));
    assert.ok(reference.ipfsUri?.startsWith("ipfs://"));
    assert.equal((await fetch(`${base}${reference.uri}`)).status, 401);
    const downloaded = await fetch(`${base}${reference.uri}`, { headers: { authorization } });
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.headers.get("content-type"), "application/octet-stream");
    assert.equal(await downloaded.text(), "abc");
    assert.equal((await fetch(`${base}/evidence/${"0".repeat(64)}`, { headers: { authorization } })).status, 404);
    assert.equal((await fetch(`${base}/evidence/not-a-hash`, { headers: { authorization } })).status, 404);
    const boundary = await fetch(`${base}/evidence`, { method: "POST", headers, body: "abcd" });
    assert.equal(boundary.status, 201);
    const streamed = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("abcde"));
        controller.close();
      },
    });
    const oversizedStream = await fetch(`${base}/evidence`, {
      method: "POST", headers, body: streamed, duplex: "half",
    } as RequestInit);
    assert.equal(oversizedStream.status, 413);
    await writeFile(join(directory, ABC_SHA256), "tampered");
    assert.equal((await fetch(`${base}${reference.uri}`, { headers: { authorization } })).status, 409);
    assert.equal((await readdir(directory)).length, 2);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
