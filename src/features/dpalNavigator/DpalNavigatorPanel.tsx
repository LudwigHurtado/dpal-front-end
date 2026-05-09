/**
 * DpalNavigatorPanel — main Navigator surface.
 * --------------------------------------------------------------------------
 * Lets the user enter coordinates, an address, or a free-form scenario, then
 * shows:
 *   - detected scenario + confidence + matched keywords
 *   - parsed coordinates (if any)
 *   - recommended module + alternates
 *   - guided checklist + safety gate
 *   - "Start Guided Flow" button that routes with query params
 *
 * The panel never auto-routes — the user must click the action explicitly.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { useDpalNavigatorStore } from "./useDpalNavigatorStore";
import { scenarioLabel } from "./scenarioInterpreter";
import GuidedStepCard from "./GuidedStepCard";
import ActionGateWarning from "./ActionGateWarning";
import SmartTooltip from "./SmartTooltip";
import type { GuidedFlow, NavigatorHelperContext, RecommendedModule } from "./types";

const NAVIGATOR_HELPER_STORAGE_KEY = "dpal_navigator_helper_context_v1";

const EXAMPLE_CHIPS: Array<{ label: string; sample: string }> = [
  { label: "Flooding near coordinates", sample: "Flooding near -17.7833, -63.1821" },
  { label: "Pollution complaint", sample: "Possible illegal dumping near my neighborhood" },
  { label: "Land restoration check", sample: "I want to check if this land restoration project is real" },
  { label: "Create evidence report", sample: "I want to file an accountability report with evidence" },
  { label: "Missing pet or item", sample: "Missing dog last seen near the river" },
  { label: "Need a ride", sample: "Need a ride pickup from downtown to the hospital" },
];

/**
 * Persist a small helper context to sessionStorage so target modules can
 * surface a "Started from DPAL Navigator" card after the route change.
 */
function persistHelperContext(flow: GuidedFlow, flowId: string, rawInput: string): void {
  try {
    const ctx: NavigatorHelperContext = {
      scenarioType: flow.scenarioType,
      flowId,
      startedAt: new Date().toISOString(),
      recommendedModule: flow.recommendedModule,
      steps: flow.steps,
      safetyWarnings: flow.safetyWarnings,
      coordinates:
        flow.queryParams.lat && flow.queryParams.lng
          ? { lat: Number(flow.queryParams.lat), lng: Number(flow.queryParams.lng) }
          : undefined,
      rawInput,
    };
    sessionStorage.setItem(NAVIGATOR_HELPER_STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    /** sessionStorage may be disabled (private mode, embed, etc.). Safe to ignore. */
  }
}

/** Reads helper context written by the panel before navigation. */
export function readNavigatorHelperContext(): NavigatorHelperContext | null {
  try {
    const raw = sessionStorage.getItem(NAVIGATOR_HELPER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NavigatorHelperContext;
  } catch {
    return null;
  }
}

/** Clears the helper context (used after the helper card is dismissed). */
export function clearNavigatorHelperContext(): void {
  try {
    sessionStorage.removeItem(NAVIGATOR_HELPER_STORAGE_KEY);
  } catch {
    /** noop */
  }
}

function buildSearchString(params: Record<string, string>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") usp.set(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

interface AlternateRowProps {
  module: RecommendedModule;
  onOpen(module: RecommendedModule): void;
}

function AlternateRow({ module, onOpen }: AlternateRowProps): React.ReactElement {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white">{module.label}</p>
        <p className="mt-0.5 text-[11px] text-slate-300">{module.description}</p>
      </div>
      <button
        type="button"
        onClick={() => onOpen(module)}
        disabled={!module.routeTarget}
        className="rounded-md border border-slate-600/60 bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Open
      </button>
    </li>
  );
}

export default function DpalNavigatorPanel(): React.ReactElement | null {
  const navigate = useNavigate();
  const isOpen = useDpalNavigatorStore((s) => s.isOpen);
  const close = useDpalNavigatorStore((s) => s.close);
  const submit = useDpalNavigatorStore((s) => s.submit);
  const reset = useDpalNavigatorStore((s) => s.reset);
  const flow = useDpalNavigatorStore((s) => s.flow);
  const interpretation = useDpalNavigatorStore((s) => s.interpretation);
  const flowId = useDpalNavigatorStore((s) => s.flowId);
  const rawInputFromStore = useDpalNavigatorStore((s) => s.rawInput);

  const [draft, setDraft] = React.useState(rawInputFromStore);

  React.useEffect(() => {
    /** Keep the textbox in sync if the store is reset externally. */
    setDraft(rawInputFromStore);
  }, [rawInputFromStore]);

  /** Close on Escape. */
  React.useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const handleSubmit = React.useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = draft.trim();
      if (!trimmed) return;
      submit(trimmed);
    },
    [draft, submit],
  );

  const handleStart = React.useCallback(
    (target?: RecommendedModule) => {
      if (!flow) return;
      const module = target ?? flow.recommendedModule;
      if (!module.routeTarget) return;
      const params = { ...flow.queryParams };
      const search = buildSearchString(params);
      if (flowId) {
        persistHelperContext(flow, flowId, rawInputFromStore);
      }
      close();
      navigate(`${module.routeTarget}${search}`);
    },
    [flow, flowId, rawInputFromStore, close, navigate],
  );

  /**
   * Visible Autopilot launcher — same target as the regular guided flow but
   * appends the autopilot query params so the destination module renders the
   * cursor + spotlight + control bar and runs the scripted safe-check
   * sequence. Currently wired only for the water_flood scenario.
   */
  const handleStartAutopilot = React.useCallback(() => {
    if (!flow) return;
    const module = flow.recommendedModule;
    if (!module.routeTarget) return;
    const params: Record<string, string> = {
      ...flow.queryParams,
      autopilot: "true",
      autoRun: "true",
      autopilotMode: "visible-safe-checks",
      showCursor: "true",
    };
    const search = buildSearchString(params);
    if (flowId) persistHelperContext(flow, flowId, rawInputFromStore);
    close();
    navigate(`${module.routeTarget}${search}`);
  }, [flow, flowId, rawInputFromStore, close, navigate]);

  /** Whether the recommended module supports the visible autopilot. */
  const autopilotSupported = !!flow && flow.scenarioType === "water_flood" && !!flow.recommendedModule.routeTarget;

  if (!isOpen) return null;

  const hasFlow = !!flow && !!interpretation;
  const coords = interpretation?.coordinates;

  return (
    <>
      <div
        className="fixed inset-0 z-[1090] bg-slate-950/55 backdrop-blur-[2px]"
        onClick={close}
        aria-hidden="true"
      />
      <aside
        id="dpal-navigator-panel"
        role="dialog"
        aria-modal="true"
        aria-label="DPAL Navigator"
        className="fixed bottom-0 right-0 z-[1100] flex h-[min(92vh,720px)] w-full flex-col overflow-hidden border border-cyan-700/40 bg-slate-950/95 text-slate-100 shadow-2xl shadow-cyan-900/30 backdrop-blur sm:right-4 sm:bottom-20 sm:max-w-[480px] sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-800/80 bg-slate-950/70 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Tell DPAL what happened
            </p>
            <h2 className="mt-1 text-base font-extrabold text-white">DPAL Navigator</h2>
            <p className="mt-1 text-[11px] leading-snug text-slate-300">
              DPAL never publishes, anchors, or marks claims as verified automatically. Every recommendation is
              advisory.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close DPAL Navigator"
            className="rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:text-white"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              Your input
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Enter coordinates, address, or describe the problem..."
                className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm font-normal text-white outline-none focus:border-cyan-400"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {EXAMPLE_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setDraft(chip.sample)}
                  className="rounded-full border border-slate-700/70 bg-slate-900/50 px-2.5 py-1 text-[10px] font-semibold text-slate-200 hover:border-cyan-400/60 hover:text-white"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Plan DPAL Path
              </button>
              {hasFlow ? (
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setDraft("");
                  }}
                  className="rounded-lg border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white"
                >
                  Reset
                </button>
              ) : null}
            </div>
          </form>

          {hasFlow && flow && interpretation ? (
            <section className="space-y-4">
              <div className="rounded-xl border border-cyan-700/40 bg-slate-950/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SmartTooltip label="Detected scenario" tone="info">
                    {scenarioLabel(interpretation.scenario.scenarioType)}
                  </SmartTooltip>
                  <SmartTooltip label="Confidence" tone="info">
                    Confidence {Math.round(flow.confidence * 100)}%
                  </SmartTooltip>
                  {coords?.hasCoordinates ? (
                    <SmartTooltip label="Coordinates" tone="info">
                      {coords.lat?.toFixed(4)}, {coords.lng?.toFixed(4)}
                    </SmartTooltip>
                  ) : coords?.error ? (
                    <SmartTooltip label="Coordinate error" tone="warning">
                      Coordinate parse error
                    </SmartTooltip>
                  ) : null}
                </div>
                {interpretation.scenario.matchedKeywords.length ? (
                  <p className="mt-2 text-[11px] text-slate-300">
                    <span className="text-slate-400">Why this match:</span>{" "}
                    {interpretation.scenario.matchedKeywords.slice(0, 6).join(", ")}
                  </p>
                ) : null}
                {coords?.error ? (
                  <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-100">
                    {coords.error}
                  </p>
                ) : null}
                <h3 className="mt-3 text-sm font-bold text-white">{flow.title}</h3>
                <p className="mt-1 text-[11px] leading-snug text-slate-300">{flow.explanation}</p>
              </div>

              <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  Recommended module
                </p>
                <h4 className="mt-1 text-sm font-bold text-white">{flow.recommendedModule.label}</h4>
                <p className="mt-1 text-[11px] text-slate-300">{flow.recommendedModule.description}</p>
                <p className="mt-2 text-[11px] leading-snug text-slate-200">
                  <span className="font-semibold text-cyan-200">Next best action: </span>
                  {flow.nextBestAction}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                  Guided checklist
                </p>
                <div className="space-y-2">
                  {flow.steps.map((step, i) => (
                    <GuidedStepCard
                      key={step.id}
                      index={i}
                      step={step}
                      highlight={step.emphasis === "recommended"}
                    />
                  ))}
                </div>
              </div>

              <ActionGateWarning warnings={flow.safetyWarnings} />

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleStart()}
                  disabled={!flow.recommendedModule.routeTarget}
                  className="w-full rounded-lg bg-amber-400 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Open Guided Flow
                </button>
                {autopilotSupported ? (
                  <button
                    type="button"
                    onClick={handleStartAutopilot}
                    className="w-full rounded-lg border border-cyan-400/60 bg-cyan-950/30 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-cyan-100 hover:text-white"
                  >
                    Watch DPAL Run Safe Checks
                  </button>
                ) : null}
                <p className="text-[10px] leading-snug text-slate-400">
                  <span className="font-semibold text-slate-300">Open Guided Flow</span> opens the
                  module with a checklist.{" "}
                  {autopilotSupported ? (
                    <>
                      <span className="font-semibold text-slate-300">Watch DPAL Run Safe Checks</span>{" "}
                      walks you through the same module step-by-step using a visible cursor and
                      runs only read-only checks. No publication, anchoring, payments, or
                      escalation.
                    </>
                  ) : null}
                </p>
              </div>

              {flow.alternateModules && flow.alternateModules.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                    Other DPAL paths
                  </p>
                  <ul className="space-y-2">
                    {flow.alternateModules.map((m) => (
                      <AlternateRow key={m.id} module={m} onOpen={handleStart} />
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : (
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3 text-[11px] leading-snug text-slate-300">
              Enter coordinates, an address, or describe the problem in your own words. DPAL will recommend the
              right module, show a checklist, and stop for human approval before any public claim.
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
