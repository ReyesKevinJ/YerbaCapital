import { rpc } from "@stellar/stellar-sdk";
import { clients, publicNetwork } from "./clients";

export async function getLot(id: bigint) { return (await clients().registry.get_lot({ lot_id: id })).result.unwrap(); }
export async function getLoan(id: bigint) { return (await clients().vault.get_loan({ loan_id: id })).result.unwrap(); }
export async function getDebt(id: bigint) { return (await clients().vault.debt_of({ loan_id: id })).result.unwrap(); }
export async function getCapacity(id: bigint) { return (await clients().vault.max_principal({ lot_id: id })).result.unwrap(); }
export async function getLatestLedger() { return (await new rpc.Server(publicNetwork().rpcUrl).getLatestLedger()).sequence; }
export async function getTransaction(hash: string) {
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error("Hash de transacción inválido.");
  return new rpc.Server(publicNetwork().rpcUrl).getTransaction(hash);
}
