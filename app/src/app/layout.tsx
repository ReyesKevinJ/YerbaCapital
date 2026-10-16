import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeToggle } from "../components/theme-toggle";
import "./globals.css";
import "../features/dashboard/dashboard.css";

export const metadata: Metadata = {
  title: "YerbaCapital · Demo Testnet",
  description: "Financiamiento y trazabilidad de lotes sintéticos. Solo Stellar Testnet.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es-AR" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: `(function(){var p='system';try{var s=localStorage.getItem('yerbacapital-theme');if(s==='light'||s==='dark')p=s;}catch(e){}var r=document.documentElement;r.dataset.themePreference=p;r.dataset.theme=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;})();` }} /></head>
    <body>{children}<ThemeToggle /></body>
  </html>;
}
