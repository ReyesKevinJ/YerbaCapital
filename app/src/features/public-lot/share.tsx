"use client";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { lotLink } from "./identifier";

export function LotShare({ id, registry, vault }: { id: string; registry?: string; vault?: string }) {
  const [url, setUrl] = useState(""); const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null); const qr = useRef<HTMLDivElement>(null);
  useEffect(() => { setUrl(lotLink(location.origin, id, registry, vault)); }, [id, registry, vault]);
  function downloadQr() {
    const svg = qr.current?.querySelector("svg"); if (!svg) return;
    const data = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const reference = URL.createObjectURL(data); const anchor = document.createElement("a");
    anchor.href = reference; anchor.download = `yerbacapital-testnet-lot-${id}.svg`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(reference), 1000);
  }
  return <section className="panel" aria-labelledby="share-heading"><h2 id="share-heading">Compartir este lote</h2>
    <p>El enlace abre una consulta pública sin billetera. El QR identifica el registro digital, no certifica la mercadería.</p>
    {url && <><div ref={qr} className="lot-qr"><QRCodeSVG role="img" aria-label={`QR de consulta del lote ${id}`} value={url} title={`QR de consulta del lote ${id}`} size={232} marginSize={4} level="M" bgColor="#ffffff" fgColor="#000000" /></div>
      <label htmlFor="public-lot-link">Enlace público de Testnet</label><input ref={input} id="public-lot-link" readOnly value={url} />
      <button onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage("Enlace copiado."); } catch { input.current?.focus(); input.current?.select(); setMessage("Seleccionamos el enlace. Copialo desde el menú de tu dispositivo."); } }}>Copiar enlace</button>{" "}
      <button onClick={downloadQr}>Descargar QR en SVG</button>
      {["127.0.0.1", "localhost", "::1", "[::1]"].includes(new URL(url).hostname) && <p className="muted">Este enlace es local: solo abre en esta computadora. Para escanearlo desde otro celular necesitamos publicar la app y generar el QR desde esa dirección.</p>}
    </>}
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
