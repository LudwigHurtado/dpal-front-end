/**
 * NavigatorHelperCard — small card shown inside a target module after the
 * user lands there from DPAL Navigator.
 *
 * The card explains why DPAL routed the user here, repeats the checklist,
 * and surfaces the human-approval gate so the user does not lose context.
 */
import React from "react";
import GuidedStepCard from "./GuidedStepCard";
import ActionGateWarning from "./ActionGateWarning";
import {
  readNavigatorHelperContext,
  clearNavigatorHelperContext,
} from "./DpalNavigatorPanel";
import type { NavigatorHelperContext } from "./types";

interface NavigatorHelperCardProps {
  /**
   * Restrict to a specific scenario when set — useful inside a single module
   * (e.g. the Water Alert dashboard only wants `water_flood`).
   */
  expectedScenario?: NavigatorHelperContext["scenarioType"];
  className?: string;
}

export default function NavigatorHelperCard({
  expectedScenario,
  className = "",
}: NavigatorHelperCardProps): React.ReactElement | null {
  const [ctx, setCtx] = React.useState<NavigatorHelperContext | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const restored = readNavigatorHelperContext();
    if (!restored) return;
    if (expectedScenario && restored.scenarioType !== expectedScenario) return;
    setCtx(restored);
  }, [expectedScenario]);

  if (dismissed || !ctx) return null;

  return (
    <section
      className={`rounded-2xl border border-cyan-700/40 bg-slate-950/75 p-4 ${className}`}
      role="region"
      aria-label="Started from DPAL Navigator"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            Started from DPAL Navigator
          </p>
          <h3 className="mt-1 text-sm font-bold text-white">{ctx.recommendedModule.label}</h3>
          <p className="mt-1 text-[11px] leading-snug text-slate-300">{ctx.recommendedModule.description}</p>
          {ctx.coordinates ? (
            <p className="mt-2 text-[11px] text-slate-300">
              <span className="text-slate-400">Coordinates:</span> {ctx.coordinates.lat.toFixed(4)},{" "}
              {ctx.coordinates.lng.toFixed(4)}
            </p>
          ) : null}
          {ctx.rawInput ? (
            <p className="mt-1 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">You said:</span> "{ctx.rawInput}"
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            clearNavigatorHelperContext();
            setDismissed(true);
          }}
          className="rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:text-white"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
        {ctx.steps.map((step, i) => (
          <GuidedStepCard
            key={step.id}
            index={i}
            step={step}
            highlight={step.emphasis === "recommended"}
          />
        ))}
      </div>

      <ActionGateWarning className="mt-3" warnings={ctx.safetyWarnings} />
    </section>
  );
}
