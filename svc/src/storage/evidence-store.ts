import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";


export type EvidenceReference = {
  sha256: string;
  uri: string;
  ipfsCid?: string;
  ipfsUri?: string;
};

export class EvidenceIntegrityError extends Error {}

/** Local content-addressed storage. Storing evidence does not attest its contents. */
export class EvidenceStore {
  constructor(private readonly directory: string) {}

  async put(bytes: Uint8Array): Promise<EvidenceReference> {
    const sha256 = digest(bytes);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const temporary = join(this.directory, `.upload-${randomUUID()}`);
    try {
      await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
      try {
        // Publish completed bytes atomically; concurrent identical uploads never see a partial file.
        await link(temporary, join(this.directory, sha256));
      } catch (error: unknown) {
        if (!hasCode(error, "EEXIST")) throw error;
        const existing = await this.get(sha256);
        if (!existing) throw new EvidenceIntegrityError("Existing evidence disappeared.");
      }
    } finally {
      await rm(temporary, { force: true });
    }
    return {
      sha256,
      uri: `/evidence/${sha256}`,
    };
  }

  async putMetadata(sha256: string, metadata: EvidenceMetadata): Promise<void> {
    if (!(await this.get(sha256))) throw new Error("Evidence must exist before metadata.");
    // Separate pin metadata is monotonic: concurrent local fallbacks cannot erase a confirmed pin.
    const suffix = metadata.storage.kind === "ipfs" ? "ipfs.json" : "metadata.json";
    const temporary = join(this.directory, `.metadata-${randomUUID()}`);
    try {
      await writeFile(temporary, JSON.stringify(metadata), { flag: "wx", mode: 0o600 });
      await rename(temporary, join(this.directory, `${sha256}.${suffix}`));
    } finally { await rm(temporary, { force: true }); }
  }

  async getMetadata(sha256: string): Promise<EvidenceMetadata | undefined> {
    const bytes = await this.get(sha256);
    if (!bytes) return undefined;
    for (const suffix of ["ipfs.json", "metadata.json"]) {
      try { return JSON.parse(await readFile(join(this.directory, `${sha256}.${suffix}`), "utf8")) as EvidenceMetadata; }
      catch (error) { if (!hasCode(error, "ENOENT")) throw error; }
    }
    return { sha256, mediaType: detectImageType(bytes) ?? "application/octet-stream", storage: { kind: "local" } };
  }

  async get(sha256: string): Promise<Buffer | undefined> {
    if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Invalid evidence digest.");
    let bytes: Buffer;
    try {
      bytes = await readFile(join(this.directory, sha256));
    } catch (error: unknown) {
      if (hasCode(error, "ENOENT")) return undefined;
      throw error;
    }
    if (digest(bytes) !== sha256) {
      throw new EvidenceIntegrityError("Stored evidence no longer matches its digest.");
    }
    return bytes;
  }
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

export type EvidenceMetadata = { sha256: string; mediaType: string; storage: { kind: "local" | "ipfs"; cid?: string; gatewayUrl?: string } };
export function detectImageType(bytes: Uint8Array): string | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (Buffer.from(bytes.subarray(0,4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8,12)).toString() === "WEBP") return "image/webp";
  return undefined;
}
