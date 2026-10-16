import { evidenceRequest } from "../../../../lib/evidence/service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ sha256: string }> }): Promise<Response> {
  const { sha256 } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    return Response.json({ error: "Hash inválido." }, { status: 400 });
  }
  try {
    const upstream = await evidenceRequest(`/evidence/${sha256}`);
    if (!upstream.ok) return Response.json({ error: "La evidencia no está disponible o falló su verificación." }, { status: upstream.status });
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sha256}.bin"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "El servicio de evidencias no está disponible." }, { status: 503 });
  }
}
