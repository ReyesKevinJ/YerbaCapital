import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { join, resolve, relative, isAbsolute } from "node:path";
import { EvidenceStore } from "../storage/evidence-store.js";
import { PilotStore } from "./store.js";

type Manifest = { version: 1; revision: number; files: { path: string; sha256: string }[] };
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Complete local snapshot; destination must be new and outside the live workspace. */
export async function backupPilot(source: string, destination: string): Promise<number> {
  const from = resolve(source); const to = resolve(destination);
  const child = relative(from, to);
  if (child === "" || (!child.startsWith("..") && !isAbsolute(child))) throw new Error("Backup destination must be outside the live pilot directory.");
  const revisions = join(from, "revisions");
  await mkdir(revisions, { recursive: true, mode: 0o700 });
  const lock = join(revisions, ".writer-lock");
  await mkdir(lock, { mode: 0o700 });
  let created = false;
  try {
    const state = await new PilotStore(revisions).read();
    await mkdir(to, { mode: 0o700 }); created = true;
    await mkdir(join(to, "revisions"), { mode: 0o700 });
    await mkdir(join(to, "documents"), { mode: 0o700 });
    const files: Manifest["files"] = [];
    for (const name of (await readdir(revisions)).filter(name => /^\d{10}\.json$/.test(name)).sort()) {
      const bytes = await readFile(join(revisions, name));
      verifyRevision(bytes);
      await writeFile(join(to, "revisions", name), bytes, { flag: "wx", mode: 0o600 });
      files.push({ path: `revisions/${name}`, sha256: hash(bytes) });
    }
    const store = new EvidenceStore(join(from, "documents"));
    for (const digest of state.documents) {
      const bytes = await store.get(digest);
      if (!bytes) throw new Error("Missing document; backup is incomplete.");
      await writeFile(join(to, "documents", digest), bytes, { flag: "wx", mode: 0o600 });
      files.push({ path: `documents/${digest}`, sha256: digest });
    }
    await writeFile(join(to, "manifest.json"), JSON.stringify({ version: 1, revision: state.revision, files }), { flag: "wx", mode: 0o600 });
    await verifyPilotBackup(to);
    return state.revision;
  } catch (error) {
    if (created) await rm(to, { recursive: true, force: true });
    throw error;
  } finally { await rm(lock, { recursive: true }); }
}

export async function verifyPilotBackup(directory: string): Promise<number> {
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")) as Manifest;
  if (manifest.version !== 1 || !Number.isSafeInteger(manifest.revision) || manifest.revision < 0 || !Array.isArray(manifest.files) || manifest.files.length > 5500) throw new Error("Invalid backup manifest.");
  const paths = new Set<string>();
  for (const entry of manifest.files) {
    if (!entry || !/^(revisions\/\d{10}\.json|documents\/[a-f0-9]{64})$/.test(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256) || paths.has(entry.path)) throw new Error("Invalid backup entry.");
    paths.add(entry.path);
    const bytes = await readFile(join(directory, entry.path));
    if (hash(bytes) !== entry.sha256) throw new Error("Backup checksum mismatch.");
    if (entry.path.startsWith("revisions/")) verifyRevision(bytes);
    else if (entry.path.slice("documents/".length) !== entry.sha256) throw new Error("Document identity mismatch.");
  }
  const state = await new PilotStore(join(directory, "revisions")).read();
  if (state.revision !== manifest.revision || state.documents.some(digest => !paths.has(`documents/${digest}`))) throw new Error("Incomplete backup.");
  for (let revision = 1; revision <= manifest.revision; revision++) {
    if (!paths.has(`revisions/${String(revision).padStart(10, "0")}.json`)) throw new Error("Missing historical revision.");
  }
  return state.revision;
}
function verifyRevision(bytes: Buffer) {
  const envelope = JSON.parse(bytes.toString("utf8")) as { payload: string; sha256: string };
  if (typeof envelope.payload !== "string" || hash(Buffer.from(envelope.payload)) !== envelope.sha256) throw new Error("Revision integrity mismatch.");
}
