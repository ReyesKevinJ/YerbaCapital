import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Keypair, StrKey } from "@stellar/stellar-sdk";

export type UploadChallenge = { address: string; sha256: string; origin: string; registry: string; nonce: string; expires: number };
const lifetime = 300_000;

function secret(): string {
  const token = process.env.EVIDENCE_ACCESS_TOKEN;
  if (!token || !/^[A-Za-z0-9_-]{32,}$/.test(token)) throw new Error("Evidence authentication is not configured.");
  return token;
}
export function challengeMessage(data: UploadChallenge): string {
  return `YerbaCapital: guardar evidencia sintetica de inspeccion.\nNo es una transaccion ni acredita un hecho fisico.\nRed: Stellar Testnet\nOrigen: ${data.origin}\nCuenta: ${data.address}\nRegistry: ${data.registry}\nSHA-256: ${data.sha256}\nNonce: ${data.nonce}\nVence: ${new Date(data.expires).toISOString()}`;
}
export function issueUploadChallenge(address: string, sha256: string, origin: string, registry: string, now = Date.now()) {
  if (!StrKey.isValidEd25519PublicKey(address) || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Invalid challenge input.");
  const data: UploadChallenge = { address, sha256, origin, registry, nonce: randomBytes(32).toString("hex"), expires: now + lifetime };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(`yerbacapital-upload-v1:${payload}`).digest("base64url");
  return { token: `${payload}.${mac}`, message: challengeMessage(data), expires: data.expires };
}
export function verifyUploadChallenge(token: string, signature: string, origin: string, registry: string, now = Date.now()): UploadChallenge {
  if (token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token) || !/^[A-Za-z0-9+/]{86}==$/.test(signature)) throw new Error("Invalid authentication.");
  const [payload, mac] = token.split(".");
  if (!payload || !mac) throw new Error("Invalid authentication.");
  const expected = createHmac("sha256", secret()).update(`yerbacapital-upload-v1:${payload}`).digest();
  const supplied = Buffer.from(mac, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("Invalid challenge.");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadChallenge;
  if (data.origin !== origin || data.registry !== registry || !Number.isSafeInteger(data.expires) || data.expires <= now || data.expires > now + lifetime ||
      !StrKey.isValidEd25519PublicKey(data.address) || !/^[a-f0-9]{64}$/.test(data.sha256) || !/^[a-f0-9]{64}$/.test(data.nonce)) throw new Error("Expired or mismatched challenge.");
  // SEP-53 proves control of this Ed25519 key; it never substitutes on-chain transaction authorization.
  const digest = createHash("sha256").update("Stellar Signed Message:\n").update(challengeMessage(data), "utf8").digest();
  if (!Keypair.fromPublicKey(data.address).verify(digest, Buffer.from(signature, "base64"))) throw new Error("Invalid signature.");
  return data;
}
export async function consumeUploadChallenge(data: UploadChallenge, directory = resolve(process.env.EVIDENCE_STORAGE_DIR ?? ".evidence", "upload-nonces")): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  // Atomic exclusive creation makes replay fail across processes/restarts on this local filesystem.
  await writeFile(resolve(directory, data.nonce), String(data.expires), { flag: "wx", mode: 0o600 });
}
export async function readLimitedBody(request: Pick<Request, "body">, maximum: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty body.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) { await reader.cancel(); throw new RangeError("Upload exceeds limit."); }
      chunks.push(value);
    }
    if (!size) throw new Error("Empty body.");
    return Buffer.concat(chunks, size);
  } finally { reader.releaseLock(); }
}
export function imageMediaType(bytes: Uint8Array): string | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (Buffer.from(bytes.subarray(0,4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8,12)).toString() === "WEBP") return "image/webp";
  return undefined;
}
