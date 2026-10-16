import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const sessionCookie = "yerba-pilot-session";
export const sessionLifetime = 3600;

function key(secret: string): Buffer {
  if (!/^[A-Za-z0-9_-]{32,}$/.test(secret)) throw new Error("Falta configurar la clave de sesión local.");
  return createHash("sha256").update(`yerbacapital-pilot-session:${secret}`).digest();
}
export function sealSession(token: string, secret: string, now = Date.now()): string {
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(token)) throw new Error("Código de acceso inválido.");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), nonce);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ token, expires: now + sessionLifetime * 1000 })), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function openSession(cookie: string | undefined, secret: string, now = Date.now()): string | undefined {
  if (!cookie || cookie.length > 1024) return undefined;
  try {
    const bytes = Buffer.from(cookie, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const result: unknown = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    if (!result || typeof result !== "object" || !("expires" in result) || typeof result.expires !== "number" ||
        result.expires <= now || result.expires > now + sessionLifetime * 1000 || !("token" in result) ||
        typeof result.token !== "string" || !/^[A-Za-z0-9_-]{43,128}$/.test(result.token)) return undefined;
    return result.token;
  } catch { return undefined; }
}
