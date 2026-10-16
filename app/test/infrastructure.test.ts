import assert from "node:assert/strict";
import { StrKey } from "@stellar/stellar-sdk";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadNetworkConfig, TESTNET_PASSPHRASE } from "../src/lib/stellar/network";
import { evidenceServiceConfig, localAppOrigin } from "../src/lib/evidence/service";
import { POST } from "../src/app/api/evidence/route";
import { GET as downloadEvidence } from "../src/app/api/evidence/[sha256]/route";
import { GET as catalogStatus } from "../src/app/api/catalog/route";
import { GET as systemStatus } from "../src/app/api/system/route";
import { createEvidenceServer } from "../../svc/src/http/server.js";

const TOKEN = "synthetic-app-test-token-not-a-real-credential";
const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

test("network refuses mainnet and incomplete contract configuration", () => {
  const env = {
    NEXT_PUBLIC_NETWORK_PASSPHRASE: TESTNET_PASSPHRASE,
    NEXT_PUBLIC_STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
    NEXT_PUBLIC_CHAIN_ENABLED: "false",
  };
  assert.equal(loadNetworkConfig(env).chainEnabled, false);
  // Valid synthetic addresses prove configuration only, never a real deployment.
  const configured = { ...env, NEXT_PUBLIC_CHAIN_ENABLED: "true",
    NEXT_PUBLIC_REGISTRY_ID: StrKey.encodeContract(Buffer.alloc(32, 1)),
    NEXT_PUBLIC_VAULT_ID: StrKey.encodeContract(Buffer.alloc(32, 2)),
    NEXT_PUBLIC_USDC_ID: StrKey.encodeContract(Buffer.alloc(32, 3)) };
  assert.equal(loadNetworkConfig(configured).chainEnabled, true);
  assert.throws(() => loadNetworkConfig({ ...configured, NEXT_PUBLIC_USDC_ID: configured.NEXT_PUBLIC_VAULT_ID }));
  assert.throws(() => loadNetworkConfig({ ...configured, NEXT_PUBLIC_STELLAR_RPC_URL: "https://other.test" }));

  assert.throws(() => loadNetworkConfig({ ...env, NEXT_PUBLIC_NETWORK_PASSPHRASE: "mainnet" }));
  assert.throws(() => loadNetworkConfig({ ...env, NEXT_PUBLIC_CHAIN_ENABLED: "true" }));
  assert.throws(() => loadNetworkConfig({ ...env, NEXT_PUBLIC_STELLAR_RPC_URL: "http://example.test" }));
  assert.throws(() => loadNetworkConfig({ ...env, NEXT_PUBLIC_STELLAR_RPC_URL: "https://secret@example.test" }));
});

test("service transport restricts evidence requests to the local service", () => {
  assert.equal(evidenceServiceConfig({ EVIDENCE_SERVICE_URL: "http://127.0.0.1:3001", EVIDENCE_ACCESS_TOKEN: TOKEN }).baseUrl.port, "3001");
  assert.equal(localAppOrigin({ APP_ORIGIN: "http://127.0.0.1:3000" }), "http://127.0.0.1:3000");
  assert.throws(() => localAppOrigin({ APP_ORIGIN: "https://other.test" }));
  for (const url of ["https://example.test", "http://127.0.0.1:3001/private", "http://user:secret@127.0.0.1", "http://127.0.0.1/?token=secret"]) {
    assert.throws(() => evidenceServiceConfig({ EVIDENCE_SERVICE_URL: url, EVIDENCE_ACCESS_TOKEN: TOKEN }));
  }
});

test("app gateway persists and downloads exact bytes through the real evidence service", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yerba-app-"));
  const historyPath = join(directory, "history.json");
  await writeFile(historyPath, JSON.stringify({ network: "testnet", contracts: ["registry", "vault"], fromLedger: 10, nextLedger: 20, events: [{ id: "synthetic", contractId: "registry", name: "LotRegistered", lotId: "7", loanId: "2", ledger: 10, closedAt: "synthetic", txHash: "synthetic", data: {} }] }));
  const server = createEvidenceServer({
    networkPassphrase: TESTNET_PASSPHRASE,
    rpcUrl: "https://soroban-testnet.stellar.org",
    port: 3001, historyPath, storageDirectory: directory, accessToken: TOKEN, maxEvidenceBytes: 5 * 1024 * 1024,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  const overrides = {
    APP_ORIGIN: "http://127.0.0.1:3000",
    EVIDENCE_SERVICE_URL: `http://127.0.0.1:${address.port}`,
    EVIDENCE_ACCESS_TOKEN: TOKEN,
    NEXT_PUBLIC_NETWORK_PASSPHRASE: TESTNET_PASSPHRASE,
    NEXT_PUBLIC_STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
    NEXT_PUBLIC_CHAIN_ENABLED: "false",
  };
  const previous = Object.fromEntries(Object.keys(overrides).map((key) => [key, process.env[key]]));
  Object.assign(process.env, overrides);
  const upload = (body: string, origin = "http://127.0.0.1:3000") => new Request("http://127.0.0.1:3000/api/evidence", {
    method: "POST", body, headers: { origin, "content-type": "application/octet-stream" },
  });
  try {
    assert.equal((await POST(upload("abc", "https://other.test"))).status, 403);
    assert.equal((await POST(upload(""))).status, 400);
    assert.equal((await POST(upload("x".repeat(5 * 1024 * 1024 + 1)))).status, 413);
    const response = await POST(upload("abc"));
    assert.equal(response.status, 201);
    const reference = await response.json() as { sha256: string; uri: string };
    assert.deepEqual(reference, { sha256: ABC_SHA256, uri: `/api/evidence/${ABC_SHA256}` });
    const downloaded = await downloadEvidence(new Request("http://127.0.0.1"), { params: Promise.resolve({ sha256: ABC_SHA256 }) });
    assert.equal(downloaded.status, 200);
    assert.equal(await downloaded.text(), "abc");
    const unauthorized = await fetch(`http://127.0.0.1:${address.port}/catalog?offset=0`);
    assert.equal(unauthorized.status, 401);
    const catalog = await catalogStatus(new Request("http://127.0.0.1:3000/api/catalog?offset=0"));
    assert.equal(catalog.status, 200);
    const catalogText = await catalog.text(); assert.ok(!catalogText.includes(TOKEN));
    assert.deepEqual(JSON.parse(catalogText).lotIds, ["7"]);
    assert.equal((await catalogStatus(new Request("http://127.0.0.1:3000/api/catalog?offset=-1"))).status, 400);
    const ready = await systemStatus();
    assert.equal(ready.status, 200);
    const status = await ready.text();
    assert.ok(status.includes("offchain_ready"));
    assert.ok(status.includes("disabled"));
    assert.ok(!status.includes(TOKEN));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("unconfigured status reports unavailable, without exposing credentials", async () => {
  const previous = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE;
  delete process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE;
  try {
    const response = await systemStatus();
    assert.equal(response.status, 503);
    assert.equal((await response.json() as { status: string }).status, "configuration_required");
  } finally {
    if (previous !== undefined) process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = previous;
  }
});
