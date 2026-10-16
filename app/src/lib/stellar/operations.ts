import { Buffer } from "buffer";
import { StrKey } from "@stellar/stellar-sdk";
import type { AssembledTransaction } from "@stellar/stellar-sdk/contract";
import type { Role } from "registry-client";
import { clients, publicNetwork } from "./clients";
import { parseUnits } from "./units";
import { walletSigners } from "../wallet/freighter";

export type Operation = "grant_role" | "register_lot" | "verify_lot" | "issue_receipt" |
  "post_valuation" | "request_loan" | "fund" | "record_inspection" | "repay" |
  "impair" | "mark_default" | "claim_collateral" | "partial_withdraw" | "cancel_request" | "approve_repayment" | "revoke_allowance";

function integer(value = ""): bigint {
  if (!/^\d+$/.test(value)) throw new Error("Ingresá un entero sin separadores.");
  return BigInt(value);
}
function hash(value = ""): Buffer {
  if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new Error("El SHA-256 debe tener 64 caracteres hexadecimales.");
  return Buffer.from(value, "hex");
}
function account(value = ""): string {
  if (!StrKey.isValidEd25519PublicKey(value)) throw new Error("Ingresá una cuenta pública Stellar válida.");
  return value;
}
function role(value = ""): Role {
  if (value !== "Custodian" && value !== "Verifier" && value !== "PriceOracle") throw new Error("Rol inválido.");
  return { tag: value, values: undefined };
}

/** Form values become generated ABI arguments here; eligibility/economics stay in contracts. */
export async function buildOperation(operation: Operation, values: Record<string, string>, address: string): Promise<AssembledTransaction<unknown>> {
  const { registry, vault, settlement } = clients(walletSigners(address));
  if ((await vault.version()).result !== 3) throw new Error("Este despliegue no incluye la corrección de repago 0.3. Revisá los IDs de Testnet.");
  const lot = () => integer(values.lot);
  const loan = () => integer(values.loan);
  const evidence = () => hash(values.evidence);
  const number = (value = "") => { const n = integer(value); if (n > 0xffffffffn) throw new Error("Entero fuera de rango."); return Number(n); };
  switch (operation) {
    case "approve_repayment": return settlement.approve({ from: address, spender: publicNetwork().vaultId ?? "",
      amount: parseUnits(values.amount ?? ""), live_until_ledger: number(values.expiry) });
    case "revoke_allowance": return settlement.approve({ from: address, spender: publicNetwork().vaultId ?? "", amount: 0n, live_until_ledger: 0 });
    case "grant_role": return registry.grant_role({ admin: address, address: account(values.account), role: role(values.role) });
    case "register_lot": return registry.register_lot({ owner: address, custodian: account(values.custodian),
      commodity: "YERBA_CANCHADA", net_kg: integer(values.kg), warehouse_id: hash(values.warehouse),
      aging_method: { tag: "Natural", values: undefined }, aging_started_at: integer(values.started), evidence: evidence() });
    case "verify_lot": return registry.verify_lot({ verifier: address, lot_id: lot(), net_kg: integer(values.kg), moisture_bps: number(values.moisture), evidence: evidence() });
    case "issue_receipt": return registry.issue_receipt({ verifier: address, lot_id: lot() });
    case "post_valuation": return registry.post_valuation({ oracle: address, lot_id: lot(), valuation: parseUnits(values.amount ?? ""), evidence: evidence() });
    case "request_loan": return vault.request_loan({ borrower: address, lot_id: lot(), principal: parseUnits(values.amount ?? ""), rate_bps: number(values.rate), duration_secs: integer(values.duration) });
    case "fund": return vault.fund({ lender: address, loan_id: loan() });
    case "record_inspection": return registry.record_inspection({ verifier: address, lot_id: lot(), net_kg: integer(values.kg), moisture_bps: number(values.moisture), kind: { tag: "Passed", values: undefined }, evidence: evidence() });
    case "repay": return vault.repay({ payer: address, loan_id: loan(), amount: parseUnits(values.amount ?? "") });
    case "impair": return registry.impair({ verifier: address, lot_id: lot(), reason: { tag: "Moisture", values: undefined }, evidence: evidence() });
    case "mark_default": return vault.mark_default({ caller: address, loan_id: loan() });
    case "claim_collateral": return vault.claim_collateral({ lender: address, loan_id: loan() });
    case "partial_withdraw": return vault.partial_withdraw({ owner: address, loan_id: loan(), kg: integer(values.kg), evidence: evidence() });
    case "cancel_request": return vault.cancel_request({ borrower: address, loan_id: loan() });
  }
}
