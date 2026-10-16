import type { Operation } from "../../lib/stellar/operations";

export type WorkspaceRole = "borrower" | "lender" | "custodian" | "verifier" | "price_oracle" | "admin" | "observer";
export type DashboardPage = "Resumen" | "Lotes" | "Financiamiento" | "Verificaciones" | "Actividad" | "Integraciones" | "Operaciones";
type RoleWorkspace = { label: string; description: string; pages: DashboardPage[]; operations: Operation[] };
const shared: DashboardPage[] = ["Resumen", "Lotes", "Actividad", "Integraciones"];

/** Presentation presets only. The contract authenticates every signer and decides permissions. */
export const roleWorkspaces: Record<WorkspaceRole, RoleWorkspace> = {
  borrower: { label: "Cooperativa / quien pide el préstamo", description: "Registrá la yerba, pedí un préstamo y organizá los pagos o retiros con el depósito.", pages: [...shared, "Financiamiento", "Operaciones"], operations: ["register_lot", "request_loan", "cancel_request", "approve_repayment", "repay", "revoke_allowance", "partial_withdraw", "mark_default"] },
  lender: { label: "Prestamista", description: "Revisá las solicitudes, financiá un préstamo y seguí sus pagos.", pages: [...shared, "Financiamiento", "Operaciones"], operations: ["fund", "mark_default", "claim_collateral", "approve_repayment", "repay", "revoke_allowance"] },
  custodian: { label: "Depósito / custodio", description: "Revisá los informes de ingreso y retiro y confirmá junto al inspector o al titular.", pages: [...shared, "Verificaciones", "Operaciones"], operations: ["verify_lot", "partial_withdraw"] },
  verifier: { label: "Inspector / verificador", description: "Confirmá ingresos junto al depósito, emití certificados y registrá las inspecciones.", pages: [...shared, "Verificaciones", "Operaciones"], operations: ["verify_lot", "issue_receipt", "record_inspection", "impair"] },
  price_oracle: { label: "Valuador del lote", description: "Publicá cuánto vale todo el lote y vinculá el informe que respalda ese valor.", pages: [...shared, "Operaciones"], operations: ["post_valuation"] },
  admin: { label: "Administrador", description: "Otorgá roles especializados. Esta vista no permite mover fondos ni colateral de terceros.", pages: [...shared, "Operaciones"], operations: ["grant_role"] },
  observer: { label: "Consulta pública", description: "Consultá estados e historial sin conectar una billetera ni preparar transacciones.", pages: [...shared, "Financiamiento"], operations: [] },
};
