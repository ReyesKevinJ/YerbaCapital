import { Errors } from "registry-client";

const messages: Record<keyof typeof Errors, string> = {
  1: "El contrato ya está inicializado.", 2: "La cuenta no está autorizada.",
  3: "La cuenta no tiene el rol requerido.", 4: "Los roles del lote deben usar cuentas distintas.",
  5: "No existe ese lote.", 6: "El estado físico o del certificado no permite esta acción.",
  7: "La humedad está fuera de las bandas admitidas.", 8: "Revisá el peso y el remanente mínimo.",
  9: "Falta un hash de evidencia válido.", 10: "El certificado está bloqueado o no está disponible.",
  11: "La cuenta no es titular del certificado.", 12: "El lote está deteriorado.",
  13: "La valuación venció; el price oracle debe actualizarla.", 14: "El importe supera la capacidad del colateral.",
  15: "No existe ese préstamo.", 16: "El estado del préstamo no permite esta acción.",
  17: "Todavía no se cumple una condición de default.", 18: "El importe debe ser positivo.",
  19: "El cálculo excede los límites numéricos.", 20: "Los parámetros están fuera de los límites admitidos.",
  21: "Las solicitudes y fondeos están pausados.", 22: "Ese retiro deja colateral insuficiente para la deuda.",
  23: "Solo el vault vinculado puede realizar esta acción.", 24: "El MVP admite yerba canchada.",
  25: "Todavía no se vinculó el vault.", 26: "El vínculo del vault es inmutable.",
  27: "El plazo no está dentro de los límites del estacionamiento.", 28: "La dirección no es válida para esta operación.",
};

export function contractError(code: number, language: "es" | "en" = "es"): string {
  const known = Object.entries(Errors).find(([key]) => Number(key) === code);
  if (!known) return `Error de contrato #${code}`;
  return language === "en" ? known[1].message : messages[Number(known[0]) as keyof typeof Errors];
}

export function explainError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const code = /Error\(Contract, #(\d+)\)/.exec(message)?.[1];
  if (code) return `${contractError(Number(code))} (#${code})`;
  const known = Object.entries(Errors).find(([, value]) => message.includes(value.message));
  return known ? `${contractError(Number(known[0]))} (#${known[0]})` : message;
}
