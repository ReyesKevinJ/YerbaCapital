/** Server-side transport. The service token must never be returned to the browser. */
export function evidenceServiceConfig(env: Readonly<Record<string, string | undefined>>): { baseUrl: URL; token: string } {
  const baseUrl = new URL(env.EVIDENCE_SERVICE_URL ?? "");
  if (baseUrl.protocol !== "http:" || baseUrl.hostname !== "127.0.0.1" ||
      baseUrl.username || baseUrl.password || baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
    throw new Error("El servicio local de evidencias requiere una URL HTTP en 127.0.0.1.");
  }
  const token = env.EVIDENCE_ACCESS_TOKEN;
  if (!token || !/^[A-Za-z0-9_-]{32,}$/.test(token)) {
    throw new Error("Falta configurar el acceso al servicio de evidencias.");
  }
  return { baseUrl, token };
}

export async function evidenceRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const { baseUrl, token } = evidenceServiceConfig(process.env);
  if (!/^\/(health|evidence(?:\/[a-f0-9]{64})?)$/.test(path)) {
    throw new Error("Ruta de evidencia inválida.");
  }
  return fetch(new URL(path, baseUrl), {
    ...init,
    headers: { ...Object.fromEntries(new Headers(init.headers)), authorization: `Bearer ${token}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
}

/** Explicit trusted browser origin; Next may normalize its internal request URL differently. */
export function localAppOrigin(env: Readonly<Record<string, string | undefined>>): string {
  const origin = new URL(env.APP_ORIGIN ?? "");
  if (origin.protocol !== "http:" || origin.hostname !== "127.0.0.1" ||
      origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("APP_ORIGIN debe identificar el origen HTTP local en 127.0.0.1.");
  }
  return origin.origin;
}
