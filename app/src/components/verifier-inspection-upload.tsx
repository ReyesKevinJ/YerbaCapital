"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, CheckCircle2, Copy, ExternalLink, Image as ImageIcon, ShieldAlert, ShieldCheck, UploadCloud } from "lucide-react";
import * as freighter from "@stellar/freighter-api";

type IpfsUploadResult = {
  sha256: string;
  ipfsCid: string;
  ipfsUri: string;
  gatewayUrl: string;
  uri: string;
  filename: string;
  size: number;
  mimeType: string;
  pinnedService: string;
  verifier: string;
};

export function VerifierInspectionUpload({
  onUse,
  useDisabled = false,
  lotId,
}: {
  onUse?: (sha256: string) => void;
  useDisabled?: boolean;
  lotId?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [verifierAddress, setVerifierAddress] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<IpfsUploadResult | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect connected wallet address as verifier
  useEffect(() => {
    let active = true;
    freighter.getAddress().then((res) => {
      if (active && res?.address) {
        setVerifierAddress(res.address);
      }
    }).catch(() => {
      // Wallet not connected yet, user can input manually
    });
    return () => {
      active = false;
    };
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResult(null);
    const selected = event.target.files?.[0];
    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!selected.type.startsWith("image/")) {
      setError("Por favor seleccioná un archivo de imagen válido (JPEG, PNG, WebP).");
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("La imagen no puede superar los 10 MiB.");
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Seleccioná la imagen física del lote.");
      return;
    }
    const verifier = verifierAddress.trim();
    if (!verifier || !verifier.startsWith("G") || verifier.length !== 56) {
      setError("Ingresá la dirección pública de Stellar de la cuenta con rol de Verificador (G...).");
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await fetch(`/api/evidence/upload?verifier=${encodeURIComponent(verifier)}`, {
        method: "POST",
        headers: {
          "x-verifier-address": verifier,
        },
        body: formData,
      });

      const body = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Error al procesar la subida a IPFS."
        );
      }

      const resData = body as unknown as IpfsUploadResult;
      setResult(resData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error inesperado al anclar en IPFS.");
    } finally {
      setBusy(false);
    }
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${label} copiado al portapapeles.`);
      setTimeout(() => setCopyFeedback(""), 4000);
    } catch {
      setCopyFeedback("No se pudo copiar automáticamente.");
    }
  }

  return (
    <section aria-labelledby="ipfs-verifier-heading" className="yc-card">
      <div className="yc-sectionhead">
        <h2 id="ipfs-verifier-heading" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Camera size={20} aria-hidden="true" />
          Fotografía de Inspección Física (Anclaje IPFS)
        </h2>
        <span className="yc-pill green">Solo Rol Verificador</span>
      </div>

      <p className="yc-sub">
        Como inspector autorizado, registrá la fotografía fehaciente del lote de yerba canchada depositado.
        El archivo se ancla a <strong>IPFS</strong> y se calcula su hash SHA-256 para ser registrado de forma
        inmutable en el contrato <code>Registry</code> de Stellar Soroban ({lotId ? `Lote #${lotId}` : "Lote seleccionado"}).
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label htmlFor="verifier-address-input" style={{ fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
            Cuenta Stellar del Verificador (G...)
          </label>
          <input
            id="verifier-address-input"
            type="text"
            required
            placeholder="G..."
            value={verifierAddress}
            onChange={(e) => setVerifierAddress(e.target.value)}
            disabled={busy}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color, #ccc)" }}
          />
          <small className="yc-sub">Solo las cuentas con rol Verificador en el contrato pueden registrar inspecciones.</small>
        </div>

        <div>
          <label htmlFor="inspection-file-input" style={{ fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
            Imagen de la yerba canchada / bolsas / noque
          </label>
          <input
            ref={fileInputRef}
            id="inspection-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={busy}
            style={{ display: "block", marginBottom: "0.5rem" }}
          />
          <small className="yc-sub">Formatos admitidos: JPG, PNG, WebP (máx. 10 MiB). No incluir datos personales (PII).</small>
        </div>

        {previewUrl && (
          <div style={{ maxWidth: "320px", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border-color, #ddd)" }}>
            <img src={previewUrl} alt="Vista previa de inspección" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        )}

        <button
          type="submit"
          className="yc-btn primary"
          disabled={busy || !file}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", alignSelf: "flex-start" }}
        >
          <UploadCloud size={16} aria-hidden="true" />
          {busy ? "Anclando en IPFS y generando hash…" : "Anclar imagen en IPFS"}
        </button>

        {error && (
          <p role="alert" className="error" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#d32f2f" }}>
            <ShieldAlert size={16} />
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="yc-card" style={{ marginTop: "1.25rem", background: "var(--card-subtle, rgba(0, 128, 0, 0.04))", border: "1px solid rgba(0, 128, 0, 0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <CheckCircle2 size={20} color="#2e7d32" />
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Imagen anclada con éxito en IPFS</h3>
          </div>

          <dl className="yc-lotmeta" style={{ display: "grid", gap: "0.5rem" }}>
            <div>
              <dt>CID de IPFS</dt>
              <dd style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                <code>{result.ipfsCid}</code>
                <button
                  type="button"
                  className="yc-btn secondary"
                  style={{ marginLeft: "0.5rem", padding: "0.2rem 0.5rem" }}
                  onClick={() => copyToClipboard(result.ipfsCid, "CID de IPFS")}
                >
                  <Copy size={13} />
                </button>
              </dd>
            </div>

            <div>
              <dt>Hash SHA-256 (BytesN&lt;32&gt; para Soroban)</dt>
              <dd style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                <code>{result.sha256}</code>
                <button
                  type="button"
                  className="yc-btn secondary"
                  style={{ marginLeft: "0.5rem", padding: "0.2rem 0.5rem" }}
                  onClick={() => copyToClipboard(result.sha256, "Hash SHA-256")}
                >
                  <Copy size={13} />
                </button>
              </dd>
            </div>

            <div>
              <dt>Enlace Gateway IPFS</dt>
              <dd>
                <a href={result.gatewayUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  Ver imagen en IPFS Gateway <ExternalLink size={13} />
                </a>
              </dd>
            </div>
          </dl>

          {copyFeedback && <p className="yc-pill green" style={{ marginTop: "0.5rem", display: "inline-block" }}>{copyFeedback}</p>}

          <div className="yc-actions" style={{ marginTop: "1rem" }}>
            {onUse && (
              <button
                type="button"
                className="yc-btn primary"
                disabled={useDisabled || busy}
                onClick={() => onUse(result.sha256)}
              >
                <ShieldCheck size={16} />
                Usar este comprobante en la operación del lote
              </button>
            )}
            <a href={result.uri} download={result.filename} className="yc-btn secondary">
              <ImageIcon size={15} />
              Descargar archivo original
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
