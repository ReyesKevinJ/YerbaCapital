import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "YerbaCapital · Base local",
  description: "Base de evidencia sintética de YerbaCapital. Solo Stellar Testnet.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es-AR"><body>{children}</body></html>;
}
