/**
 * AutopilotControlBar — sticky bottom bar with Pause / Resume / Stop / Take Control.
 * --------------------------------------------------------------------------
 * The bar carries the live `aria-live` region announcing each step's bubble
 * for screen readers (the visual cursor bubble is `aria-hidden`).
 *
 * Buttons:
 *   - Pause:  freezes the timer; cursor + spotlight stay where they are.
 *   - Resume: restarts the timer from the same step.
 *   - Stop:   tears down the autopilot UI fully.
 *   - Take Control: ends the autopilot but keeps any results visible.
 *
 * The bar never offers any "verify", "anchor", "publish", "pay", or
 * "escalate" action. Those are explicit human-approval gates that live in
 * the underlying module, not in the autopilot.
 */
import React from "react";
import type { AutopilotStatus } from "./types";

interface AutopilotControlBarProps {
  status: AutopilotStatus;
  stepIndex: number;
  totalSteps: number;
  bubble: string;
  onPause(): void;
  onResume(): void;
  onStop(): void;
  onTakeControl(): void;
}

const STATUS_TONE: Record<AutopilotStatus, string> = {
  idle: "border-slate-700/70 bg-slate-900/60 text-slate-300",
  running: "border-cyan-500/60 bg-cyan-950/40 text-cyan-100",
  paused: "border-amber-500/60 bg-amber-950/40 text-amber-100",
  completed: "border-emerald-500/60 bg-emerald-950/40 text-emerald-100",
  aborted: "border-rose-500/60 bg-rose-950/40 text-rose-100",
};

const STATUS_LABEL: Record<AutopilotStatus, string> = {
  idle: "Idle",
  running: "Running safe checks",
  paused: "Paused",
  completed: "Completed",
  aborted: "Stopped",
};

export default function AutopilotControlBar({
  status,
  stepIndex,
  totalSteps,
  bubble,
  onPause,
  onResume,
  onStop,
  onTakeControl,
}: AutopilotControlBarProps): React.ReactElement | null {
  if (status === "idle" || status === "aborted") return null;

  const tone = STATUS_TONE[status];
  const stepNumber = stepIndex >= 0 ? stepIndex + 1 : 0;

  return (
    <div
      role="region"
      aria-label="DPAL Autopilot controls"
      data-dpal-autopilot-control-bar
      className="fixed inset-x-0 bottom-0 z-[1190] flex justify-center px-3 pb-3 sm:pb-4"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-3 shadow-2xl shadow-cyan-900/40 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}
          >
            {STATUS_LABEL[status]}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Step {stepNumber} of {totalSteps}
          </span>
          <span className="ml-auto rounded-full border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
            Read-only · Human approval still required
          </span>
        </div>

        <p
          aria-live="polite"
          aria-atomic="true"
          className="mt-2 text-[12px] leading-snug text-slate-100"
        >
          {bubble}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {status === "running" ? (
            <button
              type="button"
              onClick={onPause}
              className="rounded-lg border border-amber-400/50 bg-amber-950/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-100 hover:text-white"
            >
              Pause
            </button>
          ) : null}
          {status === "paused" ? (
            <button
              type="button"
              onClick={onResume}
              className="rounded-lg border border-cyan-400/50 bg-cyan-950/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-100 hover:text-white"
            >
              Resume
            </button>
          ) : null}
          <button
            type="button"
            onClick={onStop}
            className="rounded-lg border border-rose-400/40 bg-rose-950/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-100 hover:text-white"
          >
            Stop Autopilot
          </button>
          <button
            type="button"
            onClick={onTakeControl}
            className="rounded-lg border border-slate-500/60 bg-slate-900/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-200 hover:text-white"
          >
            Take Control
          </button>
          {status === "completed" ? (
            <span className="ml-auto self-center text-[10px] font-semibold text-emerald-200">
              Safe checks finished. Final actions still require human approval.
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
