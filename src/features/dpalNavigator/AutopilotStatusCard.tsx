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
 */
import React from "react";
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

const PROVIDER_TONE: Record<ProviderProgressStatus, string> = {
  pending: "border-slate-600/60 bg-slate-900/60 text-slate-300",
  checking: "border-cyan-500/60 bg-cyan-950/30 text-cyan-100",
  observed: "border-emerald-500/50 bg-emerald-950/30 text-emerald-100",
  unavailable: "border-rose-500/40 bg-rose-950/30 text-rose-100",
};

const PROVIDER_LABEL: Record<ProviderProgressStatus, string> = {
  pending: "Pending",
  checking: "Checking…",
  observed: "Observed",
  unavailable: "Unavailable",
};

const PACKET_TONE: Record<NonNullable<AutopilotPacketStatus>, string> = {
  ok: "border-emerald-500/60 bg-emerald-950/30 text-emerald-100",
  degraded: "border-amber-500/60 bg-amber-950/30 text-amber-100",
  error: "border-rose-500/60 bg-rose-950/30 text-rose-100",
};

const PACKET_HEADLINE: Record<NonNullable<AutopilotPacketStatus>, string> = {
  ok: "Safe checks completed.",
  degraded:
    "One or more providers were unavailable. DPAL continued with available evidence, but this packet requires review.",
  error: "DPAL could not complete the safe checks. The packet is in an error state and requires human review.",
};

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
          const tone = PROVIDER_TONE[s];
          return (
            <div
              key={name}
              className={`rounded-xl border px-3 py-2 ${tone}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{name}</p>
              <p className="mt-0.5 text-[11px] font-semibold">{PROVIDER_LABEL[s]}</p>
            </div>
          );
        })}
      </div>

      {packetStatus ? (
        <div className={`mt-3 rounded-xl border px-3 py-2 ${PACKET_TONE[packetStatus]}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]">
            Packet status: {packetStatus}
          </p>
          <p className="mt-1 text-[11px] leading-snug">{PACKET_HEADLINE[packetStatus]}</p>
        </div>
      ) : null}

      <p className="mt-3 rounded-md border border-amber-500/45 bg-amber-950/25 px-2 py-1.5 text-[11px] leading-snug text-amber-100">
        DPAL has completed safe automated checks. Publication, human verification, QR publication,
        blockchain anchoring, payments, or escalation still require human approval.
      </p>
    </section>
  );
}
