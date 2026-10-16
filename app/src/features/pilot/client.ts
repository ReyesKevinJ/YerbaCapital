import { parseSharedDossier, type SharedDossier } from "./model";
export class PilotRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export async function pilotRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`/api/pilot/${path}`, { ...init, cache: "no-store" });
  const data: unknown = await response.json();
  if (!response.ok) throw new PilotRequestError(response.status, data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "No se pudo procesar la solicitud.");
  return data;
}
export async function loadShared(): Promise<SharedDossier> { return parseSharedDossier(await pilotRequest("dossier")); }
