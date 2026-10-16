import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "YerbaCapital · Demo Testnet",
  description: "Financiamiento y trazabilidad de lotes sintéticos. Solo Stellar Testnet.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es-AR"><body>{children}</body></html>;
}
