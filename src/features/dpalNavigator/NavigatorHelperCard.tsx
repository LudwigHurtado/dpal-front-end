/**
 * NavigatorHelperCard — small card shown inside a target module after the
 * user lands there from DPAL Navigator.
 *
 * The card explains why DPAL routed the user here, repeats the checklist,
 * and surfaces the human-approval gate so the user does not lose context.
 *
 * Phase 3: when outcome events exist for this Navigator session, the card
 * also renders a compact "Workflow status" strip — a short list of safely
 * worded milestones already observed. The strip is hidden when no events
 * exist.
 */
import React from "react";
import GuidedStepCard from "./GuidedStepCard";
import ActionGateWarning from "./ActionGateWarning";
import {
  readNavigatorHelperContext,
  clearNavigatorHelperContext,
} from "./DpalNavigatorPanel";
import {
  getNavigatorOutcomes,
  OUTCOME_EVENTS_STORAGE_KEY,
} from "./dpalNavigatorOutcomeService";
import type {
  DpalNavigatorOutcomeEvent,
  NavigatorHelperContext,
  OutcomeEventStatus,
} from "./types";

interface NavigatorHelperCardProps {
  /**
   * Restrict to a specific scenario when set — useful inside a single module
   * (e.g. the Water Alert dashboard only wants `water_flood`).
   */
  expectedScenario?: NavigatorHelperContext["scenarioType"];
  className?: string;
}

const STATUS_TONE: Record<OutcomeEventStatus, string> = {
  observed: "border-slate-600/60 bg-slate-900/60 text-slate-200",
  started: "border-cyan-600/60 bg-cyan-950/30 text-cyan-100",
  draft_created: "border-cyan-500/60 bg-cyan-950/40 text-cyan-100",
  completed: "border-emerald-600/50 bg-emerald-950/30 text-emerald-100",
  blocked: "border-rose-500/50 bg-rose-950/30 text-rose-100",
  review_required: "border-amber-500/50 bg-amber-950/30 text-amber-100",
};

const STATUS_LABEL: Record<OutcomeEventStatus, string> = {
  observed: "Observed",
  started: "Pending user action",
  draft_created: "Draft started",
  completed: "Ready for next step",
  blocked: "Blocked",
  review_required: "Review required",
};

function OutcomeRow({ event }: { event: DpalNavigatorOutcomeEvent }) {
  const tone = STATUS_TONE[event.status] ?? STATUS_TONE.observed;
  const statusLabel = STATUS_LABEL[event.status] ?? "Observed";
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}
      >
        {statusLabel}
      </span>
      <span className="text-[11px] text-slate-200">{event.label}</span>
      {event.safetyFlags.requiresHumanReview ? (
        <span className="rounded-full border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
          Human review required
        </span>
      ) : null}
    </li>
  );
}

export default function NavigatorHelperCard({
  expectedScenario,
  className = "",
}: NavigatorHelperCardProps): React.ReactElement | null {
  const [ctx, setCtx] = React.useState<NavigatorHelperContext | null>(null);
  const [dismissed, setDismissed] = React.useState(false);
  const [outcomes, setOutcomes] = React.useState<DpalNavigatorOutcomeEvent[]>([]);

  React.useEffect(() => {
    const restored = readNavigatorHelperContext();
    if (!restored) return;
    if (expectedScenario && restored.scenarioType !== expectedScenario) return;
    setCtx(restored);
    setOutcomes(getNavigatorOutcomes(restored.flowId));
  }, [expectedScenario]);

  /**
   * Refresh outcomes when the storage key changes (other tabs) or when the
   * window regains focus (typical when a user finishes an action and comes
   * back to read progress). Cheap and avoids a polling timer.
   */
  React.useEffect(() => {
    if (!ctx) return;
    function refresh() {
      if (!ctx) return;
      setOutcomes(getNavigatorOutcomes(ctx.flowId));
    }
    function onStorage(e: StorageEvent) {
      if (e.key === OUTCOME_EVENTS_STORAGE_KEY) refresh();
    }
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", onStorage);
    /**
     * Same-tab updates don't fire `storage`; poll once per second only
     * while the card is mounted. Cost is negligible vs UX continuity.
     */
    const intervalId = window.setInterval(refresh, 1500);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(intervalId);
    };
  }, [ctx]);

  if (dismissed || !ctx) return null;

  /** Latest 4 events, newest first, scoped to this Navigator session. */
  const recent = outcomes.slice(-4).reverse();

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

      {recent.length > 0 ? (
        <div className="mt-3 rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
              Workflow status
            </p>
            <span className="text-[10px] text-slate-500">
              Local observations only — not verified or anchored
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {recent.map((event) => (
              <OutcomeRow key={event.id} event={event} />
            ))}
          </ul>
        </div>
      ) : null}

      <ActionGateWarning className="mt-3" warnings={ctx.safetyWarnings} />
    </section>
  );
}
