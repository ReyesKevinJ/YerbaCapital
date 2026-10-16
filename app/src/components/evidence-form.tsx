"use client";

import { useRef, useState, type FormEvent } from "react";

type EvidenceResult = { sha256: string; uri: string };

export function EvidenceForm() {
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    setResult(null);
    const file = input.current?.files?.[0];
    if (!file || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("Seleccioná un archivo sintético de entre 1 byte y 5 MiB.");
      input.current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/evidence", {
        method: "POST", headers: { "content-type": "application/octet-stream" }, body: file,
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error : "No se pudo guardar la evidencia.");
      }
      if (!body || typeof body !== "object" || !("sha256" in body) || !("uri" in body) ||
          typeof body.sha256 !== "string" || typeof body.uri !== "string" ||
          !/^[a-f0-9]{64}$/.test(body.sha256) || body.uri !== `/api/evidence/${body.sha256}`) {
        throw new Error("El servicio devolvió una referencia de evidencia inválida.");
      }
      setResult({ sha256: body.sha256, uri: body.uri });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la evidencia.");
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }

  return <section aria-labelledby="evidence-heading" className="panel">
    <p className="eyebrow">01 / Evidencia off-chain</p>
    <h2 id="evidence-heading">Guardá un archivo de prueba</h2>
    <p>El servicio conserva los bytes originales y devuelve su hash SHA-256. Esto verifica integridad, no la verdad de un hecho físico.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <label htmlFor="evidence">Archivo sintético</label>
      <p id="evidence-help" className="muted">Máximo 5 MiB. No incluyas datos personales ni documentos comerciales reales.</p>
      <input ref={input} id="evidence" type="file" aria-describedby={error ? "evidence-help evidence-error" : "evidence-help"}
        aria-invalid={!!error} disabled={busy} onChange={() => { setError(""); setResult(null); }} />
      <button type="submit" disabled={busy}>{busy ? "Guardando evidencia…" : "Guardar y calcular hash"}</button>
      {error && <p id="evidence-error" role="alert" className="error">{error}</p>}
    </form>
    <div role="status" aria-live="polite">
      {result && <div className="result">
        <h3>Evidencia guardada localmente</h3>
        <p>No está firmada ni registrada en blockchain.</p>
        <label htmlFor="digest">SHA-256</label>
        <textarea id="digest" readOnly value={result.sha256} rows={2} />
        <a href={result.uri} download>Descargar los bytes originales</a>
      </div>}
    </div>
  </section>;
}
