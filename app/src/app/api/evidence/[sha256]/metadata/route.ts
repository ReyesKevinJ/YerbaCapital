import { evidenceRequest } from "../../../../../lib/evidence/service";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ sha256: string }> }): Promise<Response> {
  const { sha256 } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(sha256)) return Response.json({ error: "Hash inválido." }, { status: 400 });
  try {
    const upstream = await evidenceRequest(`/evidence/${sha256}/metadata`);
    if (!upstream.ok) return Response.json({ error: "Metadatos no disponibles." }, { status: upstream.status });
    return Response.json(await upstream.json(), { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "Servicio de evidencia no disponible." }, { status: 503 }); }
}
