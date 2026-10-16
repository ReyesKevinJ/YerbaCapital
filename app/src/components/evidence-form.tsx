"use client";

import { useRef, useState, type FormEvent } from "react";

type EvidenceResult = { sha256: string; uri: string };

export function EvidenceForm({ onUse, useDisabled = false }: { onUse?: (sha256: string) => void; useDisabled?: boolean } = {}) {
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const digest = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    setResult(null); setCopyMessage("");
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
    <p className="eyebrow">01 / Comprobantes del lote</p>
    <h2 id="evidence-heading">Guardá un archivo de prueba</h2>
    <p>Subí una foto o informe de prueba. Vas a recibir un código para vincular ese archivo a la operación. El código permite comprobar que el archivo no cambió; no demuestra que la mercadería exista ni su calidad.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <label htmlFor="evidence">Archivo sintético</label>
      <p id="evidence-help" className="muted">Máximo 5 MiB. No incluyas datos personales ni documentos comerciales reales.</p>
      <input ref={input} id="evidence" type="file" aria-describedby={error ? "evidence-help evidence-error" : "evidence-help"}
        aria-invalid={!!error} disabled={busy} onChange={() => { setError(""); setResult(null); }} />
      <button type="submit" disabled={busy}>{busy ? "Guardando evidencia…" : "Guardar comprobante"}</button>
      {error && <p id="evidence-error" role="alert" className="error">{error}</p>}
    </form>
    <div role="status" aria-live="polite">
      {result && <div className="result">
        <h3>Evidencia guardada localmente</h3>
        <p>No está firmada ni registrada en blockchain.</p>
        <label htmlFor="digest">Código del comprobante (SHA-256)</label>
        <textarea ref={digest} id="digest" readOnly value={result.sha256} rows={2} />
        <p>Copiá este código en el campo «Código del comprobante» de la operación que vas a firmar.</p>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(result.sha256); setCopyMessage("Código copiado. Pegalo en la operación."); } catch { digest.current?.focus(); digest.current?.select(); setCopyMessage("El navegador no pudo copiarlo. El código quedó seleccionado: copiálo con el menú de tu dispositivo."); } }}>Copiar código del comprobante</button>
        <p>{copyMessage}</p>{onUse && <button type="button" disabled={useDisabled || busy} onClick={() => onUse(result.sha256)}>Usar comprobante en la operación actual</button>}<a href={result.uri} download>Descargar archivo original</a>
      </div>}
    </div>
  </section>;
}
