import { cookies } from "next/headers";
import { evidenceServiceConfig, localAppOrigin } from "../evidence/service";
import { openSession, sealSession, sessionCookie, sessionLifetime } from "./session";

class GatewayError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function readBody(request: Request, maximum: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) throw new GatewayError(400, "Solicitud vacía.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new GatewayError(413, "La solicitud supera el límite permitido."); }
      chunks.push(value);
    }
    return Buffer.concat(chunks, size);
  } finally { reader.releaseLock(); }
}

export async function pilotGateway(request: Request, path: string): Promise<Response> {
  try {
    const { baseUrl, token: secret } = evidenceServiceConfig(process.env);
    if (request.method !== "GET" && request.headers.get("origin") !== localAppOrigin(process.env)) throw new GatewayError(403, "Origen de solicitud no permitido.");
    const cookieStore = await cookies();
    if (path === "session" && request.method === "DELETE") {
      cookieStore.set(sessionCookie, "", { path: "/api/pilot", maxAge: 0, httpOnly: true, sameSite: "strict" });
      return Response.json({ signedOut: true }, { headers: { "Cache-Control": "no-store" } });
    }
    let token = openSession(cookieStore.get(sessionCookie)?.value, secret);
    const login = path === "session" && request.method === "POST";
    if (login) {
      if (request.headers.get("content-type") !== "application/json") throw new GatewayError(415, "Se requiere JSON.");
      let input: unknown;
      try { input = JSON.parse(Buffer.from(await readBody(request, 1024)).toString("utf8")); }
      catch (error) { if (error instanceof GatewayError) throw error; throw new GatewayError(400, "Solicitud inválida."); }
      if (!input || typeof input !== "object" || !("token" in input) || typeof input.token !== "string" || !/^[A-Za-z0-9_-]{43,128}$/.test(input.token)) throw new GatewayError(401, "Código de integrante inválido.");
      token = input.token;
    }
    if (!token) throw new GatewayError(401, "Ingresá con tu código de integrante.");
    const target = path === "dossier" ? "/pilot" : `/pilot/${path}`;
    if (!/^\/pilot(?:\/(?:session|documents(?:\/[a-f0-9]{64})?|agreements(?:\/[a-zA-Z0-9_-]{1,100}(?:\/comments)?)?))?$/.test(target)) throw new GatewayError(404, "Ruta no disponible.");
    const headers = new Headers({ authorization: `Bearer ${token}` });
    const type = request.headers.get("content-type"); if (type) headers.set("content-type", type);
    const revision = request.headers.get("if-match"); if (revision) headers.set("if-match", revision);
    const body = request.method !== "GET" && !login ? await readBody(request, path === "documents" ? 5 * 1024 * 1024 : 16000) : undefined;
    const upstream = await fetch(new URL(target, baseUrl), { method: login ? "GET" : request.method, headers, ...(body ? { body: Buffer.from(body) } : {}), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (login && upstream.ok) cookieStore.set(sessionCookie, sealSession(token, secret), { path: "/api/pilot", maxAge: sessionLifetime, httpOnly: true, sameSite: "strict", secure: false });
    if (upstream.status === 401) cookieStore.set(sessionCookie, "", { path: "/api/pilot", maxAge: 0, httpOnly: true, sameSite: "strict" });
    const outputHeaders = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Type": upstream.headers.get("content-type") ?? "application/json" });
    const disposition = upstream.headers.get("content-disposition"); if (disposition) outputHeaders.set("Content-Disposition", disposition);
    return new Response(upstream.body, { status: upstream.status, headers: outputHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof GatewayError ? error.message : "No se pudo conectar con el expediente compartido. No reenvíes una escritura sin consultar su estado." }, { status: error instanceof GatewayError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
  }
}
