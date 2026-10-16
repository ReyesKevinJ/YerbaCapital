import { evidenceRequest } from "../../../../../lib/evidence/service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) return Response.json({ error: "Identificador de lote inválido." }, { status: 400 });
  try {
    const response = await evidenceRequest(`/lots/${id}/history`);
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ error: "El historial no está disponible; no se infiere el estado del lote." }, { status: 503 });
  }
}
