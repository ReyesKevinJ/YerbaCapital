import { evidenceRequest, localAppOrigin } from "../../../lib/evidence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Developer-only loopback gateway; this is not a public evidence intake endpoint. */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  let expectedOrigin: string;
  try {
    expectedOrigin = localAppOrigin(process.env);
  } catch {
    return Response.json({ error: "Falta configurar el origen local de la aplicación." }, { status: 503 });
  }
  if (!origin || origin !== expectedOrigin) {
    return Response.json({ error: "Origen de solicitud no permitido." }, { status: 403 });
  }
  if (request.headers.get("content-type") !== "application/octet-stream") {
    return Response.json({ error: "Se requieren los bytes originales del archivo." }, { status: 415 });
  }
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Seleccioná un archivo." }, { status: 400 });
  // The gateway also bounds chunked requests before buffering them.
  const maximum = 5 * 1024 * 1024;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        return Response.json({ error: "El archivo supera los 5 MiB." }, { status: 413 });
      }
      chunks.push(value);
    }
    if (size === 0) return Response.json({ error: "El archivo está vacío." }, { status: 400 });
    const upstream = await evidenceRequest("/evidence", {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: Buffer.concat(chunks, size),
    });
    if (!upstream.ok) {
      return Response.json({ error: "El servicio no pudo guardar la evidencia." }, { status: upstream.status });
    }
    const result: unknown = await upstream.json();
    if (!result || typeof result !== "object" || !("sha256" in result) ||
        typeof result.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(result.sha256)) {
      throw new Error("Invalid service response.");
    }
    return Response.json({ sha256: result.sha256, uri: `/api/evidence/${result.sha256}` }, { status: 201 });
  } catch {
    return Response.json({ error: "No se pudo conectar con el servicio de evidencias. Podés volver a intentar." }, { status: 503 });
  } finally {
    reader.releaseLock();
  }
}
