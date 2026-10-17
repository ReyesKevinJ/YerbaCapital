import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { hashEvidence, verifyEvidence } from "../src/evidence.js";

const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

test("evidence integrity: known vector, altered bytes, invalid hash and missing file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yerbacapital-"));
  const path = join(directory, "synthetic.txt");
  try {
    await writeFile(path, "abc");
    assert.equal(await hashEvidence(path), ABC_SHA256);
    assert.equal(await verifyEvidence(path, ABC_SHA256.toUpperCase()), true);
    await writeFile(path, "abc\n");
    assert.equal(await verifyEvidence(path, ABC_SHA256), false);
    await assert.rejects(verifyEvidence(path, "invalid"), /64 hexadecimal/);
    await assert.rejects(hashEvidence(join(directory, "missing.txt")), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("CLI reports success, mismatch, usage and read failures via exit status", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yerbacapital-cli-"));
  const path = join(directory, "synthetic.txt");
  const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
  try {
    await writeFile(path, "abc");
    const hashed = run("hash", path);
    assert.equal(hashed.status, 0);
    assert.equal(hashed.stdout.trim(), ABC_SHA256);
    assert.equal(run("verify", path, ABC_SHA256).status, 0);
    assert.equal(run("verify", path, "0".repeat(64)).status, 1);
    assert.equal(run("verify", path, "invalid").status, 1);
    assert.equal(run("hash", join(directory, "missing.txt")).status, 1);
    assert.equal(run("hash").status, 1);
    assert.equal(run("hash", path, "extra").status, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
