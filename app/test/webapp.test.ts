import { test } from "node:test";
import assert from "node:assert/strict";
import { businessEventLabel } from "../src/features/dashboard/labels";
import { validIdentifier, lotLink } from "../src/features/public-lot/identifier";
import { parseCatalog } from "../src/features/dashboard/catalog";
import { buildDocumentManifest } from "../src/features/operations/lot-documents";

test("public lot links preserve large identifiers and bind the configured deployment", () => {
  assert.equal(validIdentifier("18446744073709551615"), true);
  for (const value of ["0", "01", "1.5", "../1", "18446744073709551616"]) assert.equal(validIdentifier(value), false);
  const link = new URL(lotLink("https://demo.example.test", "18446744073709551615", "registry", "vault"));
  assert.equal(link.pathname, "/lots/18446744073709551615");
  assert.equal(link.searchParams.get("registry"), "registry"); assert.equal(link.searchParams.get("vault"), "vault");
  assert.throws(() => lotLink("javascript:alert(1)", "1"));
});
test("catalog rejects another deployment and oversized or invalid discovery pages", () => {
  const value = { network: "testnet", contracts: ["registry", "vault"], fromLedger: 10, nextLedger: 20, lotIds: ["1"], loanIds: ["2"], totalLots: 1, totalLoans: 1, offset: 0, nextOffset: null, error: "gap" };
  assert.deepEqual(parseCatalog(value, "registry", "vault").lotIds, ["1"]);
  assert.equal(parseCatalog(value, "registry", "vault").error, "gap");
  assert.throws(() => parseCatalog(value, "different", "vault"));
  assert.throws(() => parseCatalog({ ...value, lotIds: ["0"] }, "registry", "vault"));
  assert.throws(() => parseCatalog({ ...value, nextLedger: 0 }, "registry", "vault"));
  assert.throws(() => parseCatalog({ ...value, lotIds: Array.from({ length: 13 }, (_, index) => String(index + 1)) }, "registry", "vault"));
});
test("lot document manifest is deterministic, synthetic and preserves exact file digests", () => {
  const documents = [{ category: "inspection" as const, sha256: "a".repeat(64) }, { category: "insurance" as const, sha256: "b".repeat(64) }];
  const manifest = buildDocumentManifest("Secadero de prueba", documents);
  assert.equal(manifest, buildDocumentManifest("Secadero de prueba", documents.slice().reverse()));
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.synthetic, true); assert.equal(parsed.evidence[0].sha256, "a".repeat(64));
  assert.throws(() => buildDocumentManifest("demo", []));
  assert.throws(() => buildDocumentManifest("demo", [documents[0] as typeof documents[number], documents[0] as typeof documents[number]]));
});

test("payment timeline distinguishes partial, full and unknown snapshots without claiming full repayment", () => {
  assert.equal(businessEventLabel("LoanRepaid", { loan: { status: ["PartiallyRepaid"] } }), "Pago parcial registrado");
  assert.equal(businessEventLabel("LoanRepaid", { loan: { status: ["Repaid"] } }), "Préstamo pagado");
  assert.equal(businessEventLabel("LoanRepaid", { loan: { status: { tag: "Repaid" } } }), "Préstamo pagado");
  assert.equal(businessEventLabel("LoanRepaid", {}), "Pago registrado");
});
