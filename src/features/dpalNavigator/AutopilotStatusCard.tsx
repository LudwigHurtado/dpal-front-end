/**
 * AutopilotStatusCard — provider checks + packet status panel.
 * --------------------------------------------------------------------------
 * Renders inside the dashboard (above the module-health panel) while the
 * autopilot is running. Shows:
 *   - per-provider check progress (FloodGuard / USGS / NWS / GeoLedger),
 *   - the final packet status with safe wording,
 *   - the human-approval gate copy.
 *
 * No buttons here — actions all live in the AutopilotControlBar.
 *
 * Honest skipping:
 *   - Providers marked `not_applicable`, `not_configured`, or `needs_key` MUST NOT
 *     look like successful observations and MUST NOT look like failures. They render
 *     in a neutral slate tone with explicit "Skipped — why" wording.
 *   - A packet can still be "ok" overall when global providers worked and only
 *     regional / unconfigured providers were skipped.
 */
import React from "react";
import {
  providerStatusLabel,
  providerStatusKind,
  providerStatusShortLabel,
  providerStatusToneClasses,
} from "./providerStatusMapping";
import type {
  AutopilotPacketStatus,
  AutopilotStatus,
  ProviderProgressStatus,
} from "./types";

interface AutopilotStatusCardProps {
  status: AutopilotStatus;
  providers: string[];
  providerProgress: Record<string, ProviderProgressStatus>;
  packetStatus: AutopilotPacketStatus;
}

const PACKET_TONE: Record<NonNullable<AutopilotPacketStatus>, string> = {
  ok: "border-emerald-500/60 bg-emerald-950/30 text-emerald-100",
  degraded: "border-amber-500/60 bg-amber-950/30 text-amber-100",
  error: "border-rose-500/60 bg-rose-950/30 text-rose-100",
};

function buildPacketHeadline(
  packetStatus: NonNullable<AutopilotPacketStatus>,
  providerProgress: Record<string, ProviderProgressStatus>,
): string {
  const kinds = Object.values(providerProgress).map((s) => providerStatusKind(s));
  const skipped = kinds.filter((k) => k === "skipped").length;
  const failed = kinds.filter((k) => k === "failure").length;

  switch (packetStatus) {
    case "ok": {
      if (skipped > 0 && failed === 0) {
        return `Safe checks completed. ${skipped} provider${skipped === 1 ? " was" : "s were"} skipped because they do not apply to this region or are not configured on this server — DPAL continued with global providers.`;
      }
      return "Safe checks completed.";
    }
    case "degraded":
      return "One or more applicable providers were unavailable. DPAL continued with available evidence, but this packet requires review.";
    case "error":
      return "DPAL could not complete the safe checks. The packet is in an error state and requires human review.";
    default: {
      const _exhaustive: never = packetStatus;
      return _exhaustive;
    }
  }
}

export default function AutopilotStatusCard({
  status,
  providers,
  providerProgress,
  packetStatus,
}: AutopilotStatusCardProps): React.ReactElement | null {
  /** Don't render when there's nothing to show. */
  if (status === "idle" || status === "aborted") return null;
  if (providers.length === 0 && packetStatus == null) return null;

  return (
    <section
      className="rounded-2xl border border-cyan-500/40 bg-slate-950/80 p-4"
      role="region"
      aria-label="DPAL Autopilot — provider check status"
      data-dpal-autopilot-status-card
      data-dpal-target="module-health-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
          DPAL Autopilot · Safe Provider Checks
        </p>
        <span className="rounded-full border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
          Read-only checks
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {providers.map((name) => {
          const s = providerProgress[name] ?? "pending";
          const tone = providerStatusToneClasses(s);
          const kind = providerStatusKind(s);
          return (
            <div
              key={name}
              className={`rounded-xl border px-3 py-2 ${tone}`}
              data-dpal-provider-tile={name}
              data-dpal-provider-status={s}
              data-dpal-provider-kind={kind}
              title={providerStatusLabel(s)}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{name}</p>
              <p className="mt-0.5 text-[11px] font-semibold">{providerStatusShortLabel(s)}</p>
              {kind === "skipped" ? (
                <p className="mt-0.5 text-[10px] leading-snug opacity-80">
                  No request was made.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {packetStatus ? (
        <div className={`mt-3 rounded-xl border px-3 py-2 ${PACKET_TONE[packetStatus]}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]">
            Packet status: {packetStatus}
          </p>
          <p className="mt-1 text-[11px] leading-snug">
            {buildPacketHeadline(packetStatus, providerProgress)}
          </p>
        </div>
      ) : null}

      <p className="mt-3 rounded-md border border-amber-500/45 bg-amber-950/25 px-2 py-1.5 text-[11px] leading-snug text-amber-100">
        DPAL has completed safe automated checks. Publication, human verification, QR publication,
        blockchain anchoring, payments, or escalation still require human approval.
      </p>
    </section>
  );
}
