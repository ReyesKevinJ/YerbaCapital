import { Info } from "lucide-react";
import type { ReactNode } from "react";

/** Native disclosure works with touch, keyboard and screen readers, without hover. */
export function ContextHelp({ title, children }: { title: string; children: ReactNode }) {
  return <details className="context-help"><summary><Info size={18} aria-hidden="true" /><span>{title}</span></summary><div className="context-help-content">{children}</div></details>;
}
