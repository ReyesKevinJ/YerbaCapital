import { evidenceRequest } from "../../../lib/evidence/service";

export async function GET(request: Request): Promise<Response> {
  const offset = new URL(request.url).searchParams.get("offset") ?? "0";
  if (!/^\d{1,7}$/.test(offset) || Number(offset) > 1_000_000) return Response.json({ error: "Página inválida." }, { status: 400 });
  try {
    const response = await evidenceRequest(`/catalog?offset=${Number(offset)}`);
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Catálogo no disponible. Podés consultar registros por número; no se inventan solicitudes." }, { status: 503 }); }
}
