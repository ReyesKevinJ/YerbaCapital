/** Recognize passive raster formats from bytes, never a filename or declared MIME type. */
export function rasterMediaType(bytes: Uint8Array): string | undefined {
  const starts = (prefix: number[]) => prefix.every((byte, index) => bytes[index] === byte);
  if (starts([137, 80, 78, 71, 13, 10, 26, 10])) return "image/png";
  if (starts([255, 216, 255])) return "image/jpeg";
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return undefined;
}

export async function matchesEvidenceHash(bytes: ArrayBuffer, hash: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(hash)) return false;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("") === hash;
}

export type EvidenceLocation = { kind: "local" } | { kind: "ipfs"; cid: string; gatewayUrl?: string };

/** Location is service metadata, not proof of publication, pinning or physical existence. */
export function evidenceLocation(metadata: unknown, hash: string): EvidenceLocation | undefined {
  if (!metadata || typeof metadata !== "object" || !("sha256" in metadata) || metadata.sha256 !== hash || !("storage" in metadata)) return;
  const storage = metadata.storage;
  if (!storage || typeof storage !== "object" || !("kind" in storage)) return;
  if (storage.kind === "local") return { kind: "local" };
  if (storage.kind !== "ipfs" || !("cid" in storage) || typeof storage.cid !== "string" || !/^(b[a-z2-7]{20,120}|Qm[1-9A-HJ-NP-Za-km-z]{44})$/.test(storage.cid)) return;
  let gatewayUrl: string | undefined;
  if ("gatewayUrl" in storage && typeof storage.gatewayUrl === "string") {
    try {
      const url = new URL(storage.gatewayUrl);
      if (url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && url.pathname === `/ipfs/${storage.cid}`) gatewayUrl = url.href;
    } catch { /* A malformed URL must not become a public link. */ }
  }
  return { kind: "ipfs", cid: storage.cid, gatewayUrl };
}
