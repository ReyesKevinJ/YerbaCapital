import type { AssembledTransaction } from "@stellar/stellar-sdk/contract";

export type TxPhase = "simulating" | "awaiting_signature" | "submitting" | "confirmed";
export type TxOutcome<T> = { hash: string; result: T };
export class ConfirmationPending extends Error {
  constructor(public readonly hash: string) {
    super("La confirmación sigue pendiente. Consultá la transacción antes de volver a enviarla.");
  }
}

/** Generated clients own simulation/assembly. Never retry a possibly submitted transaction. */
export async function invoke<T>(
  build: () => Promise<AssembledTransaction<T>>,
  phase: (value: TxPhase) => void = () => {},
): Promise<TxOutcome<T>> {
  phase("simulating");
  const tx = await build();
  const required = tx.needsNonInvokerSigningBy();
  if (required.length) throw new Error(`Faltan co-firmas de: ${required.join(", ")}. Exportá la operación para co-firmarla.`);
  phase("awaiting_signature");
  await tx.sign();
  const hash = tx.signed?.hash().toString("hex");
  if (!hash) throw new Error("No se obtuvo una transacción firmada.");
  phase("submitting");
  try {
    const sent = await tx.send();
    if (sent.getTransactionResponse?.status === "FAILED") throw new Error(`Transacción fallida: ${hash}`);
    if (sent.getTransactionResponse?.status !== "SUCCESS") throw new ConfirmationPending(hash);
    phase("confirmed");
    return { hash, result: sent.result };
  } catch (error) {
    if (error instanceof ConfirmationPending) throw error;
    // Preserve the hash even if transport fails after broadcast; do not imply failure.
    if (error instanceof Error && error.message.includes("Transacción fallida")) throw error;
    throw new ConfirmationPending(hash);
  }
}
