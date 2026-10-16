import test from "node:test";
import assert from "node:assert/strict";
import { percentToBasisPoints, basisPointsToPercent, daysToSeconds, toContractValues, toDisplayValues } from "../src/features/operations/form-values";

test("familiar percentages and days convert exactly without financial calculations", () => {
  assert.equal(percentToBasisPoints("5,25"), "525");
  assert.equal(percentToBasisPoints("12"), "1200");
  assert.equal(percentToBasisPoints("0.01"), "1");
  assert.equal(basisPointsToPercent("525"), "5,25");
  assert.equal(daysToSeconds("180"), "15552000");
  assert.equal(daysToSeconds("999999999999999999"), "86399999999999999913600");
  for (const invalid of ["5.123", "-5", "5,2,5", "cinco", ""]) assert.throws(() => percentToBasisPoints(invalid));
  assert.throws(() => daysToSeconds("1.5"));
  assert.deepEqual(toContractValues({ moisture: "5", rate: "12", duration: "180", amount: "1000.0000001" }), { moisture: "500", rate: "1200", duration: "15552000", amount: "1000.0000001" });
  assert.deepEqual(toDisplayValues({ moisture: "500", kg: "12000" }), { moisture: "5", kg: "12000" });
  assert.throws(() => toContractValues({ started: "invalid" }));
  assert.throws(() => toDisplayValues({ duration: "86401" }));
});
