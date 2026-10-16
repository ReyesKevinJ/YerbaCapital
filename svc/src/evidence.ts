import { createHash, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";

/** Hash the exact file bytes without uploading or changing the evidence. */
export async function hashEvidence(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

/** Verify integrity only; this does not attest the truth of a physical claim. */
export async function verifyEvidence(path: string, expected: string): Promise<boolean> {
  if (!/^[a-fA-F0-9]{64}$/.test(expected)) {
    throw new Error("Expected a SHA-256 hash with exactly 64 hexadecimal characters.");
  }
  const actual = await hashEvidence(path);
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}
