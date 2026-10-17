import type * as Freighter from "@stellar/freighter-api";

type ConnectionApi = Pick<typeof Freighter, "isConnected" | "getAddress" | "requestAccess" | "getNetwork">;

async function walletRead<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Freighter no respondió. Revisá la extensión y volvé a conectar. No se envió ninguna transacción.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Read-only connection flow. Never retries or times out transaction signatures. */
export async function connectFreighter(api: ConnectionApi, passphrase: string, timeoutMs = 15_000): Promise<string> {
  const installed = await walletRead(api.isConnected(), timeoutMs);
  if (installed.error) throw new Error(installed.error.message);
  if (!installed.isConnected) throw new Error("Instalá o desbloqueá Freighter para conectar una cuenta de Testnet.");

  const existing = await walletRead(api.getAddress(), timeoutMs);
  if (existing.error) throw new Error(existing.error.message);
  // Already-authorized accounts do not need another permission prompt per simulation.
  if (!existing.address) {
    const access = await walletRead(api.requestAccess(), Math.max(timeoutMs, 60_000));
    if (access.error) throw new Error(access.error.message);
    if (!access.address) throw new Error("No se obtuvo la cuenta.");
  }

  const network = await walletRead(api.getNetwork(), timeoutMs);
  if (network.error) throw new Error(network.error.message);
  if (network.networkPassphrase !== passphrase) throw new Error("Cambiá Freighter a Stellar Testnet antes de firmar.");
  const current = await walletRead(api.getAddress(), timeoutMs);
  if (current.error || !current.address) throw new Error(current.error?.message ?? "No se obtuvo la cuenta.");
  return current.address;
}
