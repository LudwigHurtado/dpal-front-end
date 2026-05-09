/**
 * SmartTooltip — small, focusable hint badge.
 * Used inside helper cards / guided steps. No floating-ui dependency — it is
 * a static badge that sits next to a step or label.
 */
import React from "react";

interface SmartTooltipProps {
  label: string;
  children: React.ReactNode;
  /** Visual emphasis to match `GuidedStep.emphasis`. */
  tone?: "info" | "recommended" | "warning";
  className?: string;
}

const TONE_STYLES: Record<NonNullable<SmartTooltipProps["tone"]>, string> = {
  info: "border-cyan-700/40 bg-cyan-950/30 text-cyan-100",
  recommended: "border-amber-500/50 bg-amber-950/30 text-amber-100",
  warning: "border-rose-500/50 bg-rose-950/30 text-rose-100",
};

export default function SmartTooltip({
  label,
  children,
  tone = "info",
  className = "",
}: SmartTooltipProps): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_STYLES[tone]} ${className}`}
      role="note"
      aria-label={label}
    >
      <span aria-hidden="true">•</span>
      {children}
    </span>
  );
}
