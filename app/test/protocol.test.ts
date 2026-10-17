import assert from "node:assert/strict";
import { test } from "node:test";
import type { AssembledTransaction } from "@stellar/stellar-sdk/contract";
import { parseUnits, formatUnits } from "../src/lib/stellar/units";
import { ConfirmationPending, invoke } from "../src/lib/stellar/invoke";
import { contractError, explainError } from "../src/lib/stellar/errors";

test("amount input/display preserves exact large quantities and rejects rounding input", () => {
  assert.equal(parseUnits("9007199254740993.0000001"), 90071992547409930000001n);
  assert.equal(formatUnits(90071992547409930000001n), "9007199254740993.0000001");
  assert.equal(formatUnits(-1n), "-0.0000001");
  assert.equal(parseUnits("0"), 0n);
  for (const value of ["1.00000001", "1e3", "1,5", "-1", "", " 1 ", "NaN"]) assert.throws(() => parseUnits(value));
  assert.match(contractError(999), /999/);
  assert.equal(contractError(13, "en"), "ValuationStale");
});

function transaction(status: string, missing: string[] = []) {
  const calls = { signs: 0, sends: 0 };
  const tx = {
    needsNonInvokerSigningBy: () => missing,
    signed: { hash: () => Buffer.alloc(32, 1) },
    sign: async () => { calls.signs++; },
    send: async () => { calls.sends++; return { getTransactionResponse: { status }, result: "confirmed-result" }; },
  } as unknown as AssembledTransaction<string>;
  return { tx, calls };
}

test("transaction wrapper confirms only SUCCESS and never signs missing co-authorizations", async () => {
  const ready = transaction("SUCCESS");
  const phases: string[] = [];
  const outcome = await invoke(async () => ready.tx, phase => phases.push(phase));
  assert.equal(outcome.result, "confirmed-result");
  assert.equal(outcome.hash, "01".repeat(32));
  assert.deepEqual(phases, ["simulating", "awaiting_signature", "submitting", "confirmed"]);
  const missing = transaction("SUCCESS", ["custodian"]);
  await assert.rejects(invoke(async () => missing.tx), /co-firmas/);
  assert.deepEqual(missing.calls, { signs: 0, sends: 0 });
});

test("unknown confirmation retains transaction hash and is never automatically resent", async () => {
  const pending = transaction("NOT_FOUND");
  await assert.rejects(invoke(async () => pending.tx), error => error instanceof ConfirmationPending && error.hash === "01".repeat(32));
  assert.deepEqual(pending.calls, { signs: 1, sends: 1 });
  const failed = transaction("FAILED");
  await assert.rejects(invoke(async () => failed.tx), /Transacción fallida/);
  assert.deepEqual(failed.calls, { signs: 1, sends: 1 });
});

test("simulation and wallet rejection stop before broadcast", async () => {
  await assert.rejects(invoke(async () => { throw new Error("simulation failed"); }), /simulation failed/);
  const rejected = transaction("SUCCESS");
  rejected.tx.sign = async () => { throw new Error("wallet rejected"); };
  await assert.rejects(invoke(async () => rejected.tx), /wallet rejected/);
  assert.equal(rejected.calls.sends, 0);
});

test("a returned contract simulation error is rejected before wallet signing", async () => {
  const rejected = transaction("SUCCESS");
  rejected.tx.simulation = { id: "test", _parsed: true, error: "HostError: Error(Contract, #3)", latestLedger: 1, events: [] };
  await assert.rejects(invoke(async () => rejected.tx), error => {
    assert.match(explainError(error), /La cuenta no tiene el rol requerido.*#3/);
    return true;
  });
  assert.deepEqual(rejected.calls, { signs: 0, sends: 0 });
});
