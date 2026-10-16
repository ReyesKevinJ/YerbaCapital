import { test } from "node:test";
import assert from "node:assert/strict";
import { addIdentifier } from "../src/features/dashboard/data";

test("dashboard limits read selections without losing bigint identifier precision", () => {
  assert.deepEqual(addIdentifier(["1"], "18446744073709551615"), ["1", "18446744073709551615"]);
  const ids = ["1", "2"];
  assert.equal(addIdentifier(ids, "2"), ids);
  for (const invalid of ["0", "01", "-1", "2.5", "18446744073709551616", ""]) assert.throws(() => addIdentifier([], invalid));
  assert.throws(() => addIdentifier(Array.from({ length: 12 }, (_, i) => String(i + 1)), "13"), /12/);
});
