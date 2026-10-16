import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type EvidenceReference = { sha256: string; uri: string };

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
    return { sha256, uri: `/evidence/${sha256}` };
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
