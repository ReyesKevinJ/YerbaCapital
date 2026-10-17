"use client";

import { useEffect, useState } from "react";
import { evidenceLocation, matchesEvidenceHash, rasterMediaType, type EvidenceLocation } from "./evidence-integrity";

type EvidenceState =
  | { hash: string; status: "loading" | "unavailable" | "mismatch" }
  | { hash: string; status: "verified"; downloadUrl: string; previewUrl?: string; location?: EvidenceLocation };

export function LotEvidence({ id, hash }: { id: string; hash: string }) {
  const [state, setState] = useState<EvidenceState>({ hash, status: "loading" });
  const [retry, setRetry] = useState(0);
  const [previewFailed, setPreviewFailed] = useState(false);
  const valid = /^[a-f0-9]{64}$/.test(hash) && !/^0+$/.test(hash);
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let active = true;
    let downloadUrl: string | undefined;
    setState({ hash, status: "loading" });
    setPreviewFailed(false);
    async function load() {
      try {
        const [response, metadata] = await Promise.all([
          fetch(`/api/evidence/${hash}`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/evidence/${hash}/metadata`, { cache: "no-store", signal: controller.signal }).then(async response => response.ok ? response.json() as Promise<unknown> : undefined).catch(() => undefined),
        ]);
        if (!response.ok) throw new Error("Evidence unavailable");
        const blob = await response.blob();
        if (!blob.size || blob.size > 5 * 1024 * 1024) throw new Error("Evidence size unsupported");
        const bytes = await blob.arrayBuffer();
        const matches = await matchesEvidenceHash(bytes, hash);
        if (!active) return;
        if (!matches) { setState({ hash, status: "mismatch" }); return; }
        const mediaType = rasterMediaType(new Uint8Array(bytes));
        downloadUrl = URL.createObjectURL(new Blob([bytes], { type: mediaType ?? "application/octet-stream" }));
        setState({ hash, status: "verified", downloadUrl, previewUrl: mediaType ? downloadUrl : undefined, location: evidenceLocation(metadata, hash) });
      } catch {
        if (active) setState({ hash, status: "unavailable" });
      } finally { clearTimeout(timer); }
    }
    void load();
    return () => { active = false; clearTimeout(timer); controller.abort(); if (downloadUrl) URL.revokeObjectURL(downloadUrl); };
  }, [hash, retry, valid]);
  if (!valid) return null;
  const current = state.hash === hash ? state : { hash, status: "loading" as const };
  return <section className="panel" aria-labelledby="public-inspection" style={{ marginTop: "1rem" }}>
    <h2 id="public-inspection">Comprobante vinculado al lote</h2>
    <p>El código se consultó en el contrato. Comparamos los bytes del archivo con ese código antes de mostrarlo. La coincidencia no demuestra que la yerba exista ni que la declaración física sea verdadera.</p>
    <dl><div><dt>Código SHA-256 registrado</dt><dd className="address" style={{ overflowWrap: "anywhere" }}>{hash}</dd></div></dl>
    {current.status === "loading" && <p role="status">Descargando y comprobando el archivo…</p>}
    {current.status === "mismatch" && <p role="alert" className="error">El archivo recibido no coincide con el código registrado. No se muestra ni se ofrece como comprobante válido.</p>}
    {current.status === "unavailable" && <p role="status">No se pudo recuperar y comprobar el archivo. Que su código esté registrado no garantiza que el archivo esté disponible.</p>}
    {current.status === "verified" && <>
      <p role="status"><strong>Integridad comprobada: el archivo coincide con el código registrado.</strong></p>
      {current.previewUrl && !previewFailed ? <img src={current.previewUrl} alt={`Archivo de evidencia del lote #${id}; integridad comprobada, contenido físico no garantizado`} style={{ display: "block", width: "100%", maxWidth: "440px", height: "auto", borderRadius: "8px" }} onError={() => setPreviewFailed(true)} /> : <p>{previewFailed ? "El archivo coincide, pero el navegador no pudo mostrar la imagen." : "Este comprobante no es una imagen compatible. Podés descargarlo para revisarlo."}</p>}
      <p><a className="yc-btn secondary" href={current.downloadUrl} download={`${hash}.bin`}>Descargar archivo comprobado</a></p>
      {current.location?.kind === "ipfs" ? <><p className="address">Ubicación IPFS informada por el servicio: {current.location.cid}</p>{current.location.gatewayUrl && <p><a href={current.location.gatewayUrl} target="_blank" rel="noreferrer">Consultar ubicación IPFS</a></p>}<p className="muted">La disponibilidad del gateway puede cambiar. La comparación anterior corresponde a los bytes descargados en esta consulta.</p></> : <p className="muted">{current.location?.kind === "local" ? "Archivo recuperado del almacenamiento local de la demo. No se publicó en IPFS." : "Ubicación externa no confirmada. No se infiere una publicación en IPFS a partir del código."}</p>}
    </>}
    {current.status !== "loading" && <button type="button" onClick={() => setRetry(value => value + 1)}>Volver a comprobar archivo</button>}
  </section>;
}
