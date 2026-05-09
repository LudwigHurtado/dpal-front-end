/**
 * ActionGateWarning — surfaces DPAL's mandatory human-approval gate.
 * Always rendered above any "Start guided flow" or other primary action so
 * the user understands what DPAL will and will not do automatically.
 */
import React from "react";
import type { SafetyWarning } from "./types";

interface ActionGateWarningProps {
  warnings: SafetyWarning[];
  className?: string;
}

export default function ActionGateWarning({
  warnings,
  className = "",
}: ActionGateWarningProps): React.ReactElement | null {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div
      className={`rounded-xl border border-amber-500/45 bg-amber-950/30 p-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
        Human approval gate
      </p>
      <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-amber-100">
        {warnings.map((w) => (
          <li key={w.id} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                w.level === "block" ? "bg-rose-300" : "bg-amber-300"
              }`}
            />
            <span>{w.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
