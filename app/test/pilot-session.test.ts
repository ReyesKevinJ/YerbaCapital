import { test } from "node:test";
import assert from "node:assert/strict";
import { sealSession, openSession, sessionLifetime } from "../src/lib/pilot/session";

test("pilot session expires, conceals credentials and rejects tampering or rotated keys", () => {
  const token = "t".repeat(43); const secret = "s".repeat(43); const now = 1792160000000;
  const cookie = sealSession(token, secret, now);
  assert.equal(cookie.includes(token), false);
  assert.equal(openSession(cookie, secret, now + 100), token);
  assert.equal(openSession(cookie, secret, now + sessionLifetime * 1000), undefined);
  const tampered = (cookie[0] === "A" ? "B" : "A") + cookie.slice(1);
  assert.equal(openSession(tampered, secret, now), undefined);
  assert.equal(openSession(undefined, secret, now), undefined);
  assert.throws(() => sealSession("short", secret, now));
});
