/**
 * Shared provider-status mapping for the Water Alert Evidence Packet and the
 * Visible Autopilot status card.
 *
 * Why this lives in one place:
 *   - The backend `moduleHealth` enum (ok / cached / stale_fallback / unavailable /
 *     error / not_applicable / not_configured / needs_key) is consumed by *both*
 *     the dashboard's "Module Health" panel and the autopilot's per-provider tiles.
 *   - We previously had a dashboard-local mapper that defaulted unknown values to
 *     "observed". That made *skipped* providers (USGS / NWS for non-U.S. coordinates,
 *     GeoLedger without GEOAPIFY_API_KEY) look like successful checks. This module
 *     fixes that with explicit, honest labels.
 *
 * Hard rules for any UI consuming these helpers:
 *   1. A skipped provider MUST NOT be styled like a success.
 *   2. A skipped provider MUST NOT be styled like a failure.
 *   3. The label MUST tell the user *why* the provider was skipped.
 *   4. The packet can still be "ok" overall when global providers worked and only
 *      regional / unconfigured providers were skipped.
 */
import type { ProviderProgressStatus } from "./types";

export type ProviderStatusKind =
  /** Provider produced a usable observation (live, cached, or stale-fallback). */
  | "ok"
  /** Provider was intentionally skipped — not a failure, not an observation. */
  | "skipped"
  /** Provider was applicable + attempted but did not produce usable data. */
  | "failure"
  /** UI placeholder before the run starts or while the request is in flight. */
  | "pending";

/**
 * Normalize a raw backend `moduleHealth.*` string into a `ProviderProgressStatus`.
 *
 * Important: when the value is unknown / unparseable, we fall back to "unavailable"
 * — not "observed". Treating unknown-as-success is exactly the bug that previously
 * made skipped providers look checked.
 */
export function moduleHealthToProviderStatus(value: unknown): ProviderProgressStatus {
  if (value == null) return "unavailable";
  const raw = String(value).trim().toLowerCase();
  if (!raw || raw === "n/a") return "unavailable";

  switch (raw) {
    case "ok":
    case "checked":
    case "observed":
      return "observed";
    case "cached":
    case "cache_hit":
      return "cached";
    case "stale_fallback":
    case "stale-fallback":
    case "stale":
      return "stale_fallback";
    case "not_applicable":
    case "not-applicable":
      return "not_applicable";
    case "not_configured":
    case "not-configured":
      return "not_configured";
    case "needs_key":
    case "needs-key":
    case "missing_key":
    case "missing-key":
      return "needs_key";
    case "error":
    case "failed":
      return "error";
    case "unavailable":
    case "no_data":
    case "no-data":
    case "offline":
      return "unavailable";
    default:
      break;
  }

  // Substring fallbacks for legacy / mixed payloads. Order matters — check the
  // skip statuses before the failure statuses so "skipped: not applicable" never
  // matches "applicable" inside "error".
  if (raw.includes("not_applicable") || raw.includes("not applicable")) return "not_applicable";
  if (raw.includes("not_configured") || raw.includes("not configured")) return "not_configured";
  if (raw.includes("missing_key") || raw.includes("missing key") || raw.includes("needs_key") || raw.includes("needs key")) {
    return "needs_key";
  }
  if (raw.includes("unavailable") || raw.includes("no_data") || raw.includes("offline")) return "unavailable";
  if (raw.includes("error") || raw.includes("failed")) return "error";

  // Anything we cannot recognize → "unavailable", never "observed".
  return "unavailable";
}

/** Long, human-readable label used in module-health rows and autopilot tiles. */
export function providerStatusLabel(status: ProviderProgressStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "checking":
      return "Checking…";
    case "observed":
      return "Checked";
    case "cached":
      return "Cached";
    case "stale_fallback":
      return "Stale fallback";
    case "unavailable":
      return "Unavailable";
    case "error":
      return "Unavailable";
    case "not_applicable":
      return "Skipped — not applicable for this region";
    case "not_configured":
      return "Skipped — provider not configured";
    case "needs_key":
      return "Skipped — missing API key";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Short tile-friendly label (for the autopilot status tiles). */
export function providerStatusShortLabel(status: ProviderProgressStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "checking":
      return "Checking…";
    case "observed":
      return "Checked";
    case "cached":
      return "Cached";
    case "stale_fallback":
      return "Stale fallback";
    case "unavailable":
      return "Unavailable";
    case "error":
      return "Unavailable";
    case "not_applicable":
      return "Skipped · region";
    case "not_configured":
      return "Skipped · not configured";
    case "needs_key":
      return "Skipped · missing key";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Tailwind border + background + text-color classes for a status pill / tile.
 *
 * Color taxonomy:
 *   - emerald → real, healthy live observation
 *   - teal    → cached observation (still healthy, but disclosed as cached)
 *   - amber   → stale fallback (advisory, healthy-ish, disclosed as stale)
 *   - rose    → real failure or no-data (error / unavailable)
 *   - slate   → skipped on purpose (not_applicable / not_configured / needs_key)
 *   - cyan    → autopilot is checking now
 *   - dim slate → not started yet
 */
export function providerStatusToneClasses(status: ProviderProgressStatus): string {
  switch (status) {
    case "pending":
      return "border-slate-600/60 bg-slate-900/60 text-slate-300";
    case "checking":
      return "border-cyan-500/60 bg-cyan-950/30 text-cyan-100";
    case "observed":
      return "border-emerald-500/50 bg-emerald-950/30 text-emerald-100";
    case "cached":
      return "border-teal-500/50 bg-teal-950/30 text-teal-100";
    case "stale_fallback":
      return "border-amber-500/50 bg-amber-950/25 text-amber-100";
    case "unavailable":
    case "error":
      return "border-rose-500/40 bg-rose-950/30 text-rose-100";
    case "not_applicable":
    case "not_configured":
    case "needs_key":
      // Neutral slate-blue: not a tick, not a cross.
      return "border-slate-500/50 bg-slate-800/60 text-slate-200";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** High-level category — used to count "applicable healthy" vs "skipped" for status text. */
export function providerStatusKind(status: ProviderProgressStatus): ProviderStatusKind {
  switch (status) {
    case "pending":
    case "checking":
      return "pending";
    case "observed":
    case "cached":
    case "stale_fallback":
      return "ok";
    case "unavailable":
    case "error":
      return "failure";
    case "not_applicable":
    case "not_configured":
    case "needs_key":
      return "skipped";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Convenience: was the provider intentionally skipped? */
export function isProviderStatusSkipped(status: ProviderProgressStatus): boolean {
  return providerStatusKind(status) === "skipped";
}

/** Convenience: did the provider produce a usable observation? */
export function isProviderStatusHealthy(status: ProviderProgressStatus): boolean {
  return providerStatusKind(status) === "ok";
}

/**
 * Why-skipped tooltip text. Mirrors backend `providerRouting.skippedRegional[].message`
 * shape so we can render the same explanation even when the structured field is missing.
 */
export function providerStatusSkipReason(status: ProviderProgressStatus): string | null {
  switch (status) {
    case "not_applicable":
      return "This provider's data product is region-specific (for example USGS Water Services and NOAA/NWS only cover U.S. territory). DPAL did not call it for this coordinate, and continued with global providers.";
    case "not_configured":
      return "This provider requires server-side configuration that is not set on this DPAL deployment. No external request was made.";
    case "needs_key":
      return "This provider requires an API key that is not configured on this DPAL deployment. No external request was made.";
    default:
      return null;
  }
}
