import { createHash } from "node:crypto";
import { pinToIpfs } from "../../../../lib/evidence/ipfs";
import { evidenceRequest, localAppOrigin } from "../../../../lib/evidence/service";
import { consumeUploadChallenge, imageMediaType, readLimitedBody, verifyUploadChallenge } from "../../../../lib/evidence/upload-auth";
import { clients, publicNetwork } from "../../../../lib/stellar/clients";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let origin: string;
  try { origin = localAppOrigin(process.env); } catch { return Response.json({ error: "Configurá el origen local del servicio." }, { status: 503 }); }
  if (request.headers.get("origin") !== origin) return Response.json({ error: "Origen no permitido." }, { status: 403 });
  const network = publicNetwork();
  if (!network.chainEnabled || !network.registryId) return Response.json({ error: "Testnet está deshabilitada; no se puede comprobar el rol." }, { status: 503 });
  let identity;
  try {
    identity = verifyUploadChallenge(request.headers.get("x-upload-challenge") ?? "", request.headers.get("x-upload-signature") ?? "", origin, network.registryId);
  } catch { return Response.json({ error: "Firmá una autorización vigente con Freighter. Una dirección pública sola no autentica." }, { status: 401 }); }
  try {
    const role = await clients().registry.has_role({ address: identity.address, role: { tag: "Verifier", values: undefined } });
    if (!role.result) return Response.json({ error: "La cuenta no posee el rol Verifier vigente." }, { status: 403 });
  } catch { return Response.json({ error: "No se pudo comprobar el rol en Testnet." }, { status: 503 }); }
  const contentType = request.headers.get("content-type");
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType ?? "")) return Response.json({ error: "Enviá bytes originales JPEG, PNG o WebP." }, { status: 415 });
  let bytes: Uint8Array;
  try { bytes = await readLimitedBody(request, 5 * 1024 * 1024); }
  catch (error) { return Response.json({ error: "La imagen debe tener entre 1 byte y 5 MiB." }, { status: error instanceof RangeError ? 413 : 400 }); }
  if (imageMediaType(bytes) !== contentType) return Response.json({ error: "El contenido no coincide con un formato de imagen admitido." }, { status: 415 });
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== identity.sha256) return Response.json({ error: "La imagen cambió después de autorizarla. Volvé a firmar." }, { status: 400 });
  try { await consumeUploadChallenge(identity); }
  catch { return Response.json({ error: "La autorización ya se utilizó o no pudo registrarse. Volvé a firmar." }, { status: 409 }); }
  try {
    const saved = await evidenceRequest("/evidence", { method: "POST", headers: { "content-type": "application/octet-stream" }, body: Buffer.from(bytes) });
    if (!saved.ok) throw new Error("Storage unavailable.");
    const reference = await saved.json() as { sha256?: string };
    if (reference.sha256 !== sha256) throw new Error("Storage digest mismatch.");
    let storage: { kind: "local" | "ipfs"; cid?: string; gatewayUrl?: string } = { kind: "local" };
    let warning = "IPFS no está configurado. El archivo quedó guardado en el servicio local.";
    if (process.env.PINATA_JWT?.trim()) {
      try {
        const pinned = await pinToIpfs(bytes, `inspection-${sha256}`, contentType ?? "image/jpeg");
        storage = { kind: "ipfs", cid: pinned.ipfsCid, gatewayUrl: pinned.gatewayUrl };
        warning = "";
      } catch { warning = "El archivo quedó guardado localmente; no se pudo confirmar su publicación y recuperación en IPFS."; }
    }
    const metadata = { sha256, mediaType: contentType, storage };
    const persisted = await evidenceRequest(`/evidence/${sha256}/metadata`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(metadata) });
    if (!persisted.ok) throw new Error("Metadata storage unavailable.");
    return Response.json({ ...metadata, uri: `/api/evidence/${sha256}`, size: bytes.length, verifier: identity.address, warning }, { status: 201 });
  } catch { return Response.json({ error: "No se pudo confirmar el guardado completo de la evidencia. Volvé a intentar con una nueva autorización." }, { status: 503 }); }
}
/** Compatibility lookup; an unknown hash has no invented IPFS location. */
export async function GET(request: Request): Promise<Response> {
  const hash = new URL(request.url).searchParams.get("hash") ?? "";
  if (!/^[a-f0-9]{64}$/.test(hash)) return Response.json({ error: "Hash inválido." }, { status: 400 });
  try {
    const response = await evidenceRequest(`/evidence/${hash}/metadata`);
    if (!response.ok) return Response.json({ error: "Evidencia no disponible." }, { status: response.status });
    return Response.json(await response.json(), { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "Servicio no disponible." }, { status: 503 }); }
}
