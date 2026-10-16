"use client";
import { useRef, useState, type FormEvent } from "react";

type DocumentCategory = "inspection" | "insurance" | "origin";
const categories: { key: DocumentCategory; label: string; required?: boolean }[] = [
  { key: "inspection", label: "Informe o foto de inspección de prueba", required: true },
  { key: "origin", label: "Comprobante del secadero (opcional, de prueba)" },
  { key: "insurance", label: "Póliza de seguro (opcional, de prueba)" },
];
export function buildDocumentManifest(dryerAlias: string, documents: { category: DocumentCategory; sha256: string }[]): string {
  if (dryerAlias.length > 80 || !documents.some(document => document.category === "inspection") || new Set(documents.map(document => document.category)).size !== documents.length || documents.some(document => !["inspection", "insurance", "origin"].includes(document.category) || !/^[a-f0-9]{64}$/.test(document.sha256))) throw new Error("Referencias documentales inválidas.");
  return JSON.stringify({ dryerAlias: dryerAlias.trim(), evidence: documents.slice().sort((a, b) => a.category.localeCompare(b.category)).map(document => ({ category: document.category, sha256: document.sha256 })), kind: "lot-evidence-bundle", synthetic: true, version: 1 });
}
async function upload(bytes: Blob | Uint8Array): Promise<string> {
  const response = await fetch("/api/evidence", { method: "POST", headers: { "content-type": "application/octet-stream" }, body: bytes instanceof Uint8Array ? new Blob([bytes as Uint8Array<ArrayBuffer>]) : bytes });
  const value: unknown = await response.json();
  if (!response.ok || !value || typeof value !== "object" || !("sha256" in value) || typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.sha256)) throw new Error("No se completó el guardado de documentos. Los archivos seleccionados se conservan para reintentar; alguno puede haber quedado guardado sin vincular.");
  return value.sha256;
}
export function LotDocuments({ onUse, disabled }: { onUse: (sha256: string) => void; disabled: boolean }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [result, setResult] = useState<{ sha256: string; manifest: string; documents: { category: DocumentCategory; sha256: string }[] }>();
  const active = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (active.current) return;
    const values = new FormData(event.currentTarget); setError(""); setResult(undefined);
    const files = categories.flatMap(category => { const file = values.get(category.key); return file instanceof File && file.size > 0 ? [{ category: category.key, file }] : []; });
    if (!files.some(item => item.category === "inspection") || files.some(item => item.file.size > 5 * 1024 * 1024)) { setError("Adjuntá el informe de prueba. Cada archivo debe tener contenido y pesar hasta 5 MiB."); return; }
    active.current = true; setBusy(true);
    try {
      const documents: { category: DocumentCategory; sha256: string }[] = [];
      for (const item of files) documents.push({ category: item.category, sha256: await upload(item.file) });
      const manifest = buildDocumentManifest(String(values.get("dryerAlias") ?? ""), documents);
      const sha256 = await upload(new TextEncoder().encode(manifest)); setResult({ sha256, manifest, documents });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron guardar los documentos."); }
    finally { active.current = false; setBusy(false); }
  }
  return <details className="panel lot-documents"><summary>Preparar documentos de un lote: informe, secadero y seguro</summary><h2>Carpeta de comprobantes del lote</h2><p>Solo archivos y alias inventados para la demo. Secadero y seguro se adjuntan fuera de la cadena; cargar una póliza de prueba no contrata un seguro ni confirma cobertura.</p>
    <form onSubmit={submit} onChange={() => setResult(undefined)} aria-busy={busy}><fieldset disabled={busy}><legend>Documentación de prueba</legend><label htmlFor="bundle-dryer">Alias ficticio del secadero (opcional)</label><input id="bundle-dryer" name="dryerAlias" maxLength={80} placeholder="Secadero de prueba A" />{categories.map(category => <div className="field" key={category.key}><label htmlFor={`bundle-${category.key}`}>{category.label}</label><input id={`bundle-${category.key}`} type="file" name={category.key} required={category.required} /></div>)}<button type="submit">Guardar carpeta de comprobantes</button></fieldset></form>
    {error && <p role="alert" className="error">{error}</p>}
    {result && <div className="result"><h3>Carpeta guardada, todavía sin firmar</h3><label htmlFor="bundle-digest">Código de la carpeta (SHA-256)</label><textarea id="bundle-digest" readOnly value={result.sha256} rows={2} /><p>El código corresponde a un manifiesto que lista los archivos y sus huellas. Podés descargarlo y comparar cada archivo. Solo ese código se usa en la operación; nombres y archivos no se agregan como datos del contrato.</p><ul>{result.documents.map(document => <li key={document.category}><a href={`/api/evidence/${document.sha256}`} download>Descargar {categories.find(category => category.key === document.category)?.label}</a></li>)}</ul><a href={`/api/evidence/${result.sha256}`} download>Descargar manifiesto de la carpeta</a><p><button disabled={disabled || busy} onClick={() => onUse(result.sha256)}>Usar carpeta en la operación actual</button></p><details><summary>Ver manifiesto y códigos</summary><pre>{result.manifest}</pre></details></div>}
  </details>;
}
