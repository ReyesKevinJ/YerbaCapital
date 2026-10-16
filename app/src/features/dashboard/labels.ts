export const physicalLabels: Record<string, string> = { Registered: "Registrado", Verified: "Verificado", Rejected: "Rechazado", Impaired: "Deteriorado", Closed: "Cerrado" };
export const receiptLabels: Record<string, string> = { Unissued: "Sin emitir", Receipted: "Emitido / libre", Encumbered: "En garantía", Retired: "Retirado" };
export const loanLabels: Record<string, string> = { Requested: "Solicitado", Cancelled: "Cancelado", Funded: "Financiado", PartiallyRepaid: "Pagado en parte", Repaid: "Pagado", Defaulted: "En incumplimiento", Liquidated: "Certificado reclamado" };
export const eventLabels: Record<string, string> = { LotRegistered: "Lote registrado", LotVerified: "Ingreso verificado", LotRejected: "Lote rechazado", ReceiptIssued: "Certificado emitido", ValuationPosted: "Valuación publicada", CollateralLocked: "Certificado puesto en garantía", LoanRequested: "Préstamo solicitado", LoanCancelled: "Solicitud cancelada", LoanFunded: "Préstamo financiado", InspectionRecorded: "Inspección registrada", LoanPartiallyRepaid: "Pago parcial registrado", LoanRepaid: "Pago registrado", CollateralReleased: "Garantía liberada", CollateralUnlocked: "Garantía liberada", PartialWithdrawal: "Retiro parcial registrado", LotImpaired: "Deterioro registrado", LoanDefaulted: "Incumplimiento declarado", CollateralClaimed: "Certificado reclamado", ReceiptTransferred: "Titular del certificado actualizado" };

/** Event names may describe both partial and full payment; use the confirmed snapshot for copy. */
export function businessEventLabel(name: string, data?: unknown): string {
  if (name !== "LoanRepaid") return eventLabels[name] ?? "Registro del lote";
  if (data && typeof data === "object" && "loan" in data && data.loan && typeof data.loan === "object" && "status" in data.loan) {
    const status: unknown = data.loan.status;
    const tag = Array.isArray(status) ? status[0] : status && typeof status === "object" && "tag" in status ? status.tag : undefined;
    if (tag === "PartiallyRepaid") return "Pago parcial registrado";
    if (tag === "Repaid") return "Préstamo pagado";
  }
  return "Pago registrado";
}
