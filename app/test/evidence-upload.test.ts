import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { challengeMessage, consumeUploadChallenge, imageMediaType, issueUploadChallenge, readLimitedBody, verifyUploadChallenge } from "../src/lib/evidence/upload-auth";
import { POST as uploadEvidence } from "../src/app/api/evidence/upload/route";
import { pinToIpfs } from "../src/lib/evidence/ipfs";

test("upload permission requires SEP-53 key proof bound to origin, registry, digest and time, and is single-use", async () => {
  const previous = process.env.EVIDENCE_ACCESS_TOKEN;
  process.env.EVIDENCE_ACCESS_TOKEN = "synthetic_test_access_token_1234567890";
  const directory = await mkdtemp(join(tmpdir(), "yc-upload-auth-"));
  try {
    const key = Keypair.random();
    const now = 1000000;
    const challenge = issueUploadChallenge(key.publicKey(), "a".repeat(64), "http://127.0.0.1:3000", "registry-one", now);
    const signature = key.sign(createHash("sha256").update("Stellar Signed Message:\n").update(challenge.message).digest()).toString("base64");
    const data = verifyUploadChallenge(challenge.token, signature, "http://127.0.0.1:3000", "registry-one", now);
    assert.equal(data.sha256, "a".repeat(64));
    assert.equal(challengeMessage(data), challenge.message);
    assert.throws(() => verifyUploadChallenge(challenge.token, signature, "http://127.0.0.1:3001", "registry-one", now));
    assert.throws(() => verifyUploadChallenge(challenge.token, signature, data.origin, "registry-two", now));
    assert.throws(() => verifyUploadChallenge(challenge.token, signature, data.origin, data.registry, now + 300001));
    assert.throws(() => verifyUploadChallenge(challenge.token, Keypair.random().sign(Buffer.alloc(32)).toString("base64"), data.origin, data.registry, now));
    assert.throws(() => verifyUploadChallenge(challenge.token.slice(0,-1) + "x", signature, data.origin, data.registry, now));
    const results = await Promise.allSettled([consumeUploadChallenge(data, directory), consumeUploadChallenge(data, directory)]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  } finally { await rm(directory, { recursive: true, force: true }); if (previous === undefined) delete process.env.EVIDENCE_ACCESS_TOKEN; else process.env.EVIDENCE_ACCESS_TOKEN = previous; }
});
test("upload body rejects chunked overflow before buffering and raster formats are checked from bytes", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array<ArrayBuffer>>({ start(controller) { controller.enqueue(new Uint8Array(8)); controller.enqueue(new Uint8Array(8)); }, cancel() { cancelled = true; } });
  await assert.rejects(readLimitedBody({ body }, 10), RangeError);
  assert.equal(cancelled, true);
  assert.equal(imageMediaType(Buffer.from('<svg onload="alert(1)"/>')), undefined);
  assert.equal(imageMediaType(Uint8Array.from([137,80,78,71,13,10,26,10])), "image/png");
});
test("unconfigured IPFS cannot manufacture a successful pin or CID", async () => {
  const previous = process.env.PINATA_JWT;
  delete process.env.PINATA_JWT;
  try { await assert.rejects(pinToIpfs(Buffer.from("synthetic")), /not configured/); }
  finally { if (previous !== undefined) process.env.PINATA_JWT = previous; }
});

test("known SEP-53 public vector verifies, never raw unprefixed signing", () => {
  const key = Keypair.fromPublicKey("GBXFXNDLV4LSWA4VB7YIL5GBD7BVNR22SGBTDKMO2SBZZHDXSKZYCP7L");
  const signature = Buffer.from("fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA==", "base64");
  assert.equal(key.verify(createHash("sha256").update("Stellar Signed Message:\nHello, World!").digest(), signature), true);
  assert.equal(key.verify(createHash("sha256").update("Hello, World!").digest(), signature), false);
});

test("upload rejects a claimed verifier address without proof and refuses chain-disabled authorization", async () => {
  const overrides = {
    APP_ORIGIN: "http://127.0.0.1:3000",
    NEXT_PUBLIC_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    NEXT_PUBLIC_STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
    NEXT_PUBLIC_CHAIN_ENABLED: "true",
    NEXT_PUBLIC_REGISTRY_ID: StrKey.encodeContract(Buffer.alloc(32, 1)),
    NEXT_PUBLIC_VAULT_ID: StrKey.encodeContract(Buffer.alloc(32, 2)),
    NEXT_PUBLIC_USDC_ID: StrKey.encodeContract(Buffer.alloc(32, 3)),
  };
  const previous = Object.fromEntries(Object.keys(overrides).map(key => [key, process.env[key]]));
  Object.assign(process.env, overrides);
  const request = () => new Request("http://127.0.0.1:3000/api/evidence/upload", { method: "POST", headers: { origin: overrides.APP_ORIGIN, "x-verifier-address": Keypair.random().publicKey(), "content-type": "image/png" }, body: new Uint8Array([1]) });
  try {
    assert.equal((await uploadEvidence(request())).status, 401);
    process.env.NEXT_PUBLIC_CHAIN_ENABLED = "false";
    assert.equal((await uploadEvidence(request())).status, 503);
  } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test("IPFS success requires accepted pin and gateway bytes with the original SHA-256", async () => {
  const previous = process.env.PINATA_JWT;
  const originalFetch = globalThis.fetch;
  process.env.PINATA_JWT = "synthetic-unit-test-token";
  const bytes = Buffer.from("synthetic image bytes");
  const cid = "Qm" + "1".repeat(44); // Fixture only, never published or presented as an actual pin.
  try {
    globalThis.fetch = async input => String(input).includes("api.pinata.cloud")
      ? Response.json({ IpfsHash: cid }) : new Response(bytes);
    const pinned = await pinToIpfs(bytes);
    assert.equal(pinned.sha256, createHash("sha256").update(bytes).digest("hex"));
    assert.equal(pinned.pinnedService, "pinata");
    globalThis.fetch = async input => String(input).includes("api.pinata.cloud")
      ? Response.json({ IpfsHash: cid }) : new Response("different bytes");
    await assert.rejects(pinToIpfs(bytes), /integrity/);
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await assert.rejects(pinToIpfs(bytes), /rejected/);
  } finally { globalThis.fetch = originalFetch; if (previous === undefined) delete process.env.PINATA_JWT; else process.env.PINATA_JWT = previous; }
});
