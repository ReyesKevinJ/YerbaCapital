import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile, link, rm } from "node:fs/promises";
import { join } from "node:path";
import { PilotError, emptyState, type State } from "./model.js";

/** One workspace, immutable snapshots. Lock prevents writers across local processes. */
export class PilotStore {
  constructor(private readonly directory: string) {}
  async read(): Promise<State> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const names = (await readdir(this.directory)).filter(name => /^\d{10}\.json$/.test(name)).sort();
    const latest = names.at(-1);
    if (!latest) return emptyState();
    try {
      const envelope = JSON.parse(await readFile(join(this.directory, latest), "utf8")) as { payload: string; sha256: string };
      if (typeof envelope.payload !== "string" || createHash("sha256").update(envelope.payload).digest("hex") !== envelope.sha256) throw new Error("integrity");
      const state = JSON.parse(envelope.payload) as State;
      if (state.version !== 1 || state.revision !== Number(latest.slice(0, 10)) || !Array.isArray(state.agreements) || !Array.isArray(state.documents) || !Array.isArray(state.history)) throw new Error("schema");
      return state;
    } catch { throw new PilotError(503, "El expediente no superó la verificación de almacenamiento. Conservá las revisiones y recuperá una copia verificada."); }
  }
  async update(expected: number, mutation: (state: State) => void): Promise<State> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lock = join(this.directory, ".writer-lock");
    try { await mkdir(lock, { mode: 0o700 }); }
    catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") throw new PilotError(409, "Otro proceso está guardando. Actualizá el expediente antes de reintentar.");
      throw error;
    }
    const temporary = join(this.directory, `.pending-${randomUUID()}`);
    try {
      const state = await this.read();
      if (state.revision !== expected) throw new PilotError(409, "El expediente cambió. Actualizá antes de guardar; conservamos tus campos.");
      if (state.revision >= 5000) throw new PilotError(409, "Se alcanzó el límite del expediente de demostración. Exportá sus revisiones.");
      state.revision += 1;
      mutation(state);
      const payload = JSON.stringify(state);
      await writeFile(temporary, JSON.stringify({ payload, sha256: createHash("sha256").update(payload).digest("hex") }), { mode: 0o600, flag: "wx" });
      await link(temporary, join(this.directory, `${String(state.revision).padStart(10, "0")}.json`));
      return state;
    } finally {
      await rm(temporary, { force: true });
      await rm(lock, { recursive: true });
    }
  }
}
