/** Display/input conversion only. Debt, capacity and interest are queried on-chain. */
export function parseUnits(input: string, decimals = 7): bigint {
  if (!/^\d+(?:\.\d+)?$/.test(input)) throw new Error("Ingresá un importe positivo con punto decimal.");
  const [whole = "", fraction = ""] = input.split(".");
  if (fraction.length > decimals) throw new Error(`El activo admite hasta ${decimals} decimales.`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

export function formatUnits(amount: bigint, decimals = 7): string {
  const sign = amount < 0n ? "-" : "";
  const value = amount < 0n ? -amount : amount;
  const scale = 10n ** BigInt(decimals);
  const fraction = (value % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${sign}${value / scale}${fraction ? "." + fraction : ""}`;
}
