export function validIdentifier(value: string): boolean {
  return /^[1-9]\d{0,19}$/.test(value) && BigInt(value) <= 18446744073709551615n;
}
export function lotLink(origin: string, id: string, registry?: string, vault?: string): string {
  if (!validIdentifier(id)) throw new Error("Número de lote inválido.");
  const base = new URL(origin);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("Origen inválido.");
  const url = new URL(`/lots/${id}`, base.origin);
  if (registry) url.searchParams.set("registry", registry);
  if (vault) url.searchParams.set("vault", vault);
  return url.toString();
}
