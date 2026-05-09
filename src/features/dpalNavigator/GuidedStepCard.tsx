/**
 * GuidedStepCard — single step in the Navigator's checklist.
 * The `recommended` emphasis triggers a subtle pulsing border (defined in
 * `dpal-theme.css` as `.dpal-nav-pulse`) so the user notices the next action
 * without the UI feeling childish or sci-fi.
 */
import React from "react";
import type { GuidedStep } from "./types";
import SmartTooltip from "./SmartTooltip";

interface GuidedStepCardProps {
  index: number;
  step: GuidedStep;
  /** When true, the step renders the subtle blinking outline. */
  highlight?: boolean;
}

export default function GuidedStepCard({
  index,
  step,
  highlight = false,
}: GuidedStepCardProps): React.ReactElement {
  const emphasis = step.emphasis ?? "info";
  const isRecommended = emphasis === "recommended";
  const isWarning = emphasis === "warning";

  const baseBorder = isWarning
    ? "border-rose-500/50"
    : isRecommended
    ? "border-amber-500/50"
    : "border-slate-700/70";

  const glow = highlight && isRecommended ? "dpal-nav-pulse" : "";

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border bg-slate-950/60 p-3 ${baseBorder} ${glow}`}
    >
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
          isWarning
            ? "border-rose-400/60 bg-rose-900/40 text-rose-100"
            : isRecommended
            ? "border-amber-400/60 bg-amber-900/40 text-amber-100"
            : "border-slate-600/70 bg-slate-900/60 text-slate-200"
        }`}
      >
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-white">{step.title}</p>
          {isRecommended ? (
            <SmartTooltip label="Recommended next step" tone="recommended">
              Recommended next step
            </SmartTooltip>
          ) : null}
          {isWarning ? (
            <SmartTooltip label="Human approval required" tone="warning">
              Human approval required
            </SmartTooltip>
          ) : null}
        </div>
        {step.helperText ? (
          <p className="mt-1 text-[11px] leading-snug text-slate-300">{step.helperText}</p>
        ) : null}
      </div>
    </div>
  );
}
