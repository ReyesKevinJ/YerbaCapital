import { test } from "node:test";
import assert from "node:assert/strict";
import { evidenceLocation, matchesEvidenceHash, rasterMediaType } from "../src/features/public-lot/evidence-integrity";

const abcHash = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

test("evidence integrity compares actual bytes with the on-chain digest", async () => {
  assert.equal(await matchesEvidenceHash(new TextEncoder().encode("abc").buffer, abcHash), true);
  assert.equal(await matchesEvidenceHash(new TextEncoder().encode("tampered").buffer, abcHash), false);
  assert.equal(await matchesEvidenceHash(new TextEncoder().encode("abc").buffer, "not-a-hash"), false);
});

test("evidence previews recognize raster signatures, never arbitrary documents or SVG", () => {
  assert.equal(rasterMediaType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
  assert.equal(rasterMediaType(Uint8Array.from([255, 216, 255, 224])), "image/jpeg");
  assert.equal(rasterMediaType(new TextEncoder().encode("GIF89a")), "image/gif");
  assert.equal(rasterMediaType(new TextEncoder().encode("RIFF1234WEBP")), "image/webp");
  for (const value of ["<svg onload='alert(1)'/>", "%PDF-1.4", "synthetic inspection", "", "RIFF1234WAV "]) assert.equal(rasterMediaType(new TextEncoder().encode(value)), undefined);
});

test("IPFS links require matching stored metadata and a safe explicit URL", () => {
  const cid = "bafkreigh2akiscaildc6w453z7w2n6a3mdfcle5phk3fzslpoej3tqt3we";
  assert.equal(evidenceLocation(undefined, abcHash), undefined);
  assert.deepEqual(evidenceLocation({ sha256: abcHash, storage: { kind: "local" } }, abcHash), { kind: "local" });
  assert.equal(evidenceLocation({ sha256: "a".repeat(64), storage: { kind: "ipfs", cid } }, abcHash), undefined);
  assert.deepEqual(evidenceLocation({ sha256: abcHash, storage: { kind: "ipfs", cid, gatewayUrl: `https://ipfs.io/ipfs/${cid}` } }, abcHash), { kind: "ipfs", cid, gatewayUrl: `https://ipfs.io/ipfs/${cid}` });
  for (const url of ["javascript:alert(1)", `http://ipfs.io/ipfs/${cid}`, `https://ipfs.io/ipfs/other`, `https://user:pass@ipfs.io/ipfs/${cid}`]) assert.deepEqual(evidenceLocation({ sha256: abcHash, storage: { kind: "ipfs", cid, gatewayUrl: url } }, abcHash), { kind: "ipfs", cid, gatewayUrl: undefined });
});
