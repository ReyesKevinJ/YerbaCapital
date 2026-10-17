"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Camera, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { connectWallet, signEvidenceMessage } from "../lib/wallet/freighter";

type UploadResult = { sha256: string; uri: string; mediaType: string; storage: { kind: "local" | "ipfs"; cid?: string; gatewayUrl?: string }; warning?: string };
export function VerifierInspectionUpload({ onUse, useDisabled = false, lotId }: { onUse?: (sha256: string) => void; useDisabled?: boolean; lotId?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult>();
  useEffect(() => {
    if (!file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    setError(""); setResult(undefined); setBusy(true);
    try {
      const address = await connectWallet();
      const bytes = await file.arrayBuffer();
      const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
      const sha256 = Array.from(hash, byte => byte.toString(16).padStart(2, "0")).join("");
      const challengeResponse = await fetch("/api/evidence/challenge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, sha256 }) });
      const challenge = await challengeResponse.json() as { token: string; message: string; error?: string };
      if (!challengeResponse.ok) throw new Error(challenge.error ?? "No se pudo preparar la autorización.");
      const signature = await signEvidenceMessage(address, challenge.message);
      const response = await fetch("/api/evidence/upload", { method: "POST", headers: { "content-type": file.type, "x-upload-challenge": challenge.token, "x-upload-signature": signature }, body: bytes });
      const data = await response.json() as UploadResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la imagen.");
      if (data.sha256 !== sha256 || !data.uri || !data.storage) throw new Error("El servicio devolvió una referencia inválida.");
      setResult(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la imagen."); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="inspection-upload-heading" className="yc-card">
    <div className="yc-sectionhead"><h2 id="inspection-upload-heading"><Camera size={20} aria-hidden="true" /> Fotografía de inspección</h2><span className="yc-pill green">Verifier · Testnet</span></div>
    <p className="yc-sub">Prepará una imagen sintética{lotId ? ` para el lote #${lotId}` : " del lote"}. Freighter te pide firmar un permiso de carga, sin mover fondos. Luego el contrato exige otra firma para registrar la inspección y las co-firmas que correspondan: guardar un archivo no acredita un hecho físico.</p>
    <p className="yc-sub">Se guarda en el servicio local. Solo se informa IPFS si el proveedor confirma el pin y podemos recuperar los mismos bytes. No incluyas información personal ni comercial real.</p>
    <form onSubmit={submit} className="yc-form">
      <label htmlFor="inspection-file-input">Imagen sintética del lote (JPG, PNG o WebP, hasta 5 MiB)</label>
      <input id="inspection-file-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => {
        setResult(undefined); setError("");
        const next = event.target.files?.[0];
        if (next && (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || !next.size || next.size > 5 * 1024 * 1024)) { setFile(null); setError("Seleccioná una imagen JPG, PNG o WebP de hasta 5 MiB."); return; }
        setFile(next ?? null);
      }} />
      {preview && <img src={preview} alt="Vista previa de la imagen sintética seleccionada" style={{ maxWidth: "100%", width: 320, height: "auto" }} />}
      <button className="yc-btn primary" disabled={busy || !file} type="submit">{busy ? "Autorizando y guardando…" : "Autorizar con Freighter y guardar"}</button>
      {error && <p role="alert" className="error">{error}</p>}
    </form>
    {result && <div role="status" className="yc-result">
      <h3><CheckCircle2 size={18} aria-hidden="true" /> {result.storage.kind === "ipfs" ? "Imagen guardada y pin IPFS verificado" : "Imagen guardada localmente"}</h3>
      {result.warning && <p>{result.warning}</p>}
      <p>SHA-256: <code style={{ overflowWrap: "anywhere" }}>{result.sha256}</code></p>
      {result.storage.kind === "ipfs" && <><p>CID: <code>{result.storage.cid}</code></p><a href={result.storage.gatewayUrl} target="_blank" rel="noreferrer">Ver archivo en IPFS <ExternalLink size={14} aria-hidden="true" /></a></>}
      <div className="yc-actions"><a href={result.uri} download className="yc-btn secondary">Descargar bytes originales</a>{onUse && <button className="yc-btn primary" type="button" disabled={useDisabled || busy} onClick={() => onUse(result.sha256)}><ShieldCheck size={16} aria-hidden="true" /> Usar este comprobante en la operación del lote</button>}</div>
    </div>}
  </section>;
}
