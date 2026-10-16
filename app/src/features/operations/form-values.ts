/** Display conversions only; debt, interest and eligibility remain authoritative on-chain. */
export function percentToBasisPoints(value: string): string {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Ingresá un porcentaje con hasta dos decimales. Por ejemplo: 5 o 5,25.");
  const [whole = "0", fraction = ""] = normalized.split(".");
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))).toString();
}
export function basisPointsToPercent(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  const n = BigInt(value);
  return `${n / 100n}${n % 100n ? `,${(n % 100n).toString().padStart(2, "0").replace(/0$/, "")}` : ""}`;
}
export function daysToSeconds(value: string): string {
  if (!/^\d+$/.test(value.trim())) throw new Error("Ingresá el plazo en días enteros. Por ejemplo: 180.");
  return (BigInt(value.trim()) * 86400n).toString();
}
export function toContractValues(values: Record<string, string>): Record<string, string> {
  const result = { ...values };
  for (const field of ["moisture", "rate"]) if (values[field]) result[field] = percentToBasisPoints(values[field]);
  if (values.duration) result.duration = daysToSeconds(values.duration);
  if (values.started) {
    const date = new Date(values.started);
    if (!Number.isFinite(date.getTime())) throw new Error("Elegí una fecha y hora de inicio del estacionamiento.");
    result.started = Math.floor(date.getTime() / 1000).toString();
  }
  return result;
}
export function toDisplayValues(values: Record<string, string>): Record<string, string> {
  const result = { ...values };
  for (const field of ["moisture", "rate"]) if (values[field]) result[field] = basisPointsToPercent(values[field]);
  // Current dashboard shortcuts supply kg/moisture only. Avoid losing sub-day precision.
  if (values.duration) {
    const seconds = BigInt(values.duration);
    if (seconds % 86400n !== 0n) throw new Error("El plazo recibido no está expresado en días enteros.");
    result.duration = (seconds / 86400n).toString();
  }
  return result;
}
