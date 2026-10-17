import { issueUploadChallenge, readLimitedBody } from "../../../../lib/evidence/upload-auth";
import { localAppOrigin } from "../../../../lib/evidence/service";
import { publicNetwork } from "../../../../lib/stellar/clients";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request): Promise<Response> {
  let origin: string;
  try { origin = localAppOrigin(process.env); } catch { return Response.json({ error: "El servicio requiere configurar su origen local." }, { status: 503 }); }
  if (request.headers.get("origin") !== origin) return Response.json({ error: "Origen no permitido." }, { status: 403 });
  try {
    const network = publicNetwork();
    if (!network.chainEnabled || !network.registryId) return Response.json({ error: "Habilitá Testnet para comprobar el rol Verifier." }, { status: 503 });
    const data = JSON.parse(Buffer.from(await readLimitedBody(request, 2048)).toString()) as { address: string; sha256: string };
    return Response.json(issueUploadChallenge(data.address, data.sha256, origin, network.registryId), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: "No se pudo preparar la autorización de carga." }, { status: error instanceof RangeError ? 413 : 400 });
  }
}
