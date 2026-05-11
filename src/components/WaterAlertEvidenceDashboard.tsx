import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getWaterAlertEvidencePacket } from "../services/dpalIntegrationsApi";
import {
  AutopilotControlBar,
  AutopilotSpotlight,
  AutopilotStatusCard,
  NavigatorHelperCard,
  VisibleAutopilotCursor,
  WATER_ALERT_AUTOPILOT_STEPS,
  getAutopilotTimeline,
  logAutopilotEvent,
  subscribeAutopilotTimeline,
  useNavigatorOutcomeTracking,
  useVisibleAutopilot,
} from "../features/dpalNavigator";
import type { ProviderProgressStatus, VisibleAutopilotApi } from "../features/dpalNavigator";

type PacketRecord = Record<string, any>;

const DEFAULT_FORM = {
  lat: "38.949",
  lng: "-77.127",
  label: "Potomac Little Falls",
  usgsSite: "01646500",
};

const AUTOPILOT_PROVIDERS = ["FloodGuard", "USGS", "NWS", "GeoLedger"] as const;

/** Session-scoped: at most one URL-driven autoRun per pathname + coords + mode per browser tab. */
export function buildVisibleAutopilotConsumedStorageKey(
  pathname: string,
  lat: string,
  lng: string,
  autopilotMode: string,
): string {
  return `dpal_visible_autopilot_consumed:${pathname}:${lat}:${lng}:${autopilotMode}`;
}

/** Cross-tab: last time URL-driven autopilot was claimed for this route + coords + mode (localStorage). */
export function buildVisibleAutopilotUrlClaimStorageKey(
  pathname: string,
  lat: string,
  lng: string,
  autopilotMode: string,
): string {
  return `dpal_visible_autopilot_url_claim:${pathname}:${lat}:${lng}:${autopilotMode}`;
}

/** Ignore stale URL autorun claims older than this (ms). */
const VISIBLE_AUTOPILOT_URL_CLAIM_MAX_AGE_MS = 120_000;

/** Dev-only safe param snapshot — redacts obvious secret-like keys (values still omit raw tokens). */
function stripSensitiveSearchParamsForDevLog(search: string): Record<string, string> {
  const usp = new URLSearchParams(search);
  const out: Record<string, string> = {};
  const denyKey = /^(token|access_token|refresh_token|id_token|key|apikey|api_key|secret|password|auth|authorization|jwt)$/i;
  usp.forEach((v, k) => {
    if (denyKey.test(k)) out[k] = "[redacted]";
    else out[k] = v.length > 120 ? `${v.slice(0, 120)}…` : v;
  });
  return out;
}

function autopilotUiSettled(status: string): boolean {
  return status === "idle" || status === "completed" || status === "aborted";
}

/** Validate latitude/longitude before treating query params as authoritative. */
function isUsableLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function Chip({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-full border border-slate-600/70 bg-slate-900/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
      <span className="text-slate-400">{label}: </span>
      <span className="text-cyan-200">{String(value ?? "n/a")}</span>
    </div>
  );
}

function Panel({
  title,
  children,
  dataTarget,
}: {
  title: string;
  children: React.ReactNode;
  dataTarget?: string;
}) {
  return (
    <section
      className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4"
      data-dpal-target={dataTarget}
    >
      <h2 className="text-sm font-bold text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ReadRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 py-1.5 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-100">{value == null || value === "" ? "n/a" : String(value)}</span>
    </div>
  );
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getPacketRoot(data: PacketRecord | null): PacketRecord | null {
  if (!data) return null;
  if (data.packet && typeof data.packet === "object") return data.packet as PacketRecord;
  return data;
}

/**
 * Map a `moduleHealth` field (free-form string from backend) to a safe
 * autopilot status word. We intentionally only have two outcomes — observed
 * or unavailable — to avoid implying verification.
 */
function moduleHealthToProviderStatus(value: unknown): ProviderProgressStatus {
  if (value == null) return "unavailable";
  const s = String(value).toLowerCase();
  if (!s || s === "n/a" || s.includes("unavailable") || s.includes("error") || s.includes("offline")) {
    return "unavailable";
  }
  return "observed";
}

export default function WaterAlertEvidenceDashboard(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const navOutcome = useNavigatorOutcomeTracking("water_flood");
  const [form, setForm] = React.useState(DEFAULT_FORM);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [packetData, setPacketData] = React.useState<PacketRecord | null>(null);
  const [showRaw, setShowRaw] = React.useState(false);
  const [navigatorPrefilled, setNavigatorPrefilled] = React.useState(false);

  /* ----------------------- Navigator URL params ----------------------- */
  const params = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const autopilotEnabled =
    params.get("autopilot") === "true" && params.get("autopilotMode") === "visible-safe-checks";
  const autopilotShowCursor = params.get("showCursor") !== "false";
  const autopilotAutoRun = params.get("autoRun") === "true";

  const [autopilotDiagTick, setAutopilotDiagTick] = React.useState(0);
  const [autopilotDiagOpen, setAutopilotDiagOpen] = React.useState(false);
  const [scanDiag, setScanDiag] = React.useState({
    triggered: false,
    requestStarted: false,
    requestCompleted: false,
    requestFailed: false,
  });
  const humanGateLoggedRef = React.useRef(false);
  const waterEvidenceScanBusyRef = React.useRef(false);
  const [sessionConsumedForAutopilot, setSessionConsumedForAutopilot] = React.useState(false);
  const [pendingUrlAutoStart, setPendingUrlAutoStart] = React.useState(false);

  React.useEffect(() => {
    if (!autopilotEnabled) {
      setSessionConsumedForAutopilot(false);
      return;
    }
    const latStr = params.get("lat");
    const lngStr = params.get("lng");
    const mode = params.get("autopilotMode") || "visible-safe-checks";
    if (!latStr || !lngStr) {
      setSessionConsumedForAutopilot(false);
      return;
    }
    try {
      const key = buildVisibleAutopilotConsumedStorageKey(location.pathname, latStr, lngStr, mode);
      setSessionConsumedForAutopilot(sessionStorage.getItem(key) === "1");
    } catch {
      setSessionConsumedForAutopilot(false);
    }
  }, [autopilotEnabled, location.pathname, location.search, params]);

  React.useEffect(() => {
    if (!import.meta.env.DEV) return () => undefined;
    return subscribeAutopilotTimeline(() => setAutopilotDiagTick((n) => n + 1));
  }, []);

  React.useEffect(() => {
    if (!import.meta.env.DEV || !autopilotEnabled) return;
    logAutopilotEvent({
      eventName: "autopilot_dashboard_loaded",
      details: { autoRun: autopilotAutoRun, showCursor: autopilotShowCursor },
    });
  }, [autopilotEnabled, autopilotAutoRun, autopilotShowCursor]);

  React.useEffect(() => {
    if (!autopilotEnabled) {
      humanGateLoggedRef.current = false;
      if (import.meta.env.DEV) {
        setScanDiag({ triggered: false, requestStarted: false, requestCompleted: false, requestFailed: false });
      }
    }
  }, [autopilotEnabled]);

  /**
   * The dashboard exposes `runWaterEvidenceScan({ source })` so both manual
   * clicks and the autopilot drive the same backend call. Manual mode is
   * unchanged — autopilot only adds an outcome-tracking metadata flag.
   */
  const runWaterEvidenceScanRef = React.useRef<((opts: { source: "manual" | "visible-autopilot" }) => Promise<void>) | null>(null);
  const autopilotMarkScanCompleteRef = React.useRef<VisibleAutopilotApi["markScanComplete"] | null>(null);

  /* ------------------------- autopilot wiring ------------------------- */
  const autopilot = useVisibleAutopilot({
    enabled: autopilotEnabled,
    steps: WATER_ALERT_AUTOPILOT_STEPS,
    onPrefillCoordinates: React.useCallback(() => {
      /** Coordinates are already prefilled in the form by the URL effect below.
       * This callback exists so the user *visibly* sees the cursor land on the
       * coordinate inputs at step 1. We re-affirm form state from the URL in
       * case the user has typed something else manually before pressing
       * "Resume". */
      const latStr = params.get("lat");
      const lngStr = params.get("lng");
      if (!latStr || !lngStr) return;
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!isUsableLatLng(lat, lng)) return;
      setForm((prev) => ({
        ...prev,
        lat: String(lat),
        lng: String(lng),
        label: prev.label || `Navigator focus ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      }));
    }, [params]),
    onTriggerScan: React.useCallback(() => {
      const fn = runWaterEvidenceScanRef.current;
      if (fn) void fn({ source: "visible-autopilot" });
    }, []),
  });

  autopilotMarkScanCompleteRef.current = autopilot.markScanComplete;

  /* ----------------------- outcome tracking (Phase 3) ----------------------- */

  React.useEffect(() => {
    if (!navOutcome.hasActiveNavigatorSession) return;
    navOutcome.trackOutcomeOnce({
      moduleId: "water_alert_evidence",
      eventType: "module_opened",
      label: "Opened Water Alert Evidence dashboard",
      status: "observed",
    });
  }, [navOutcome]);

  React.useEffect(() => {
    if (!location.search) return;
    const source = params.get("source");
    const navigatorFlow = params.get("navigatorFlow");
    const latStr = params.get("lat");
    const lngStr = params.get("lng");
    if (!latStr || !lngStr) return;

    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!isUsableLatLng(lat, lng)) return;

    const label = params.get("label") || `Navigator focus ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const usgsSite = params.get("usgsSite") || "";

    setForm({ lat: String(lat), lng: String(lng), label, usgsSite });

    const fromNavigator = source === "dpal-navigator" || navigatorFlow === "water-alert";
    setNavigatorPrefilled(fromNavigator);
    if (fromNavigator) {
      navOutcome.trackOutcomeOnce({
        moduleId: "water_alert_evidence",
        eventType: "location_prefilled",
        label: "Coordinates and label pre-filled from DPAL Navigator",
        status: "started",
        coordinates: { lat, lng },
      });
    }
  }, [location.search, navOutcome, params]);

  /**
   * Auto-start visible autopilot only when `autoRun=true` and this pathname +
   * coords + mode have not already consumed a URL-driven run in sessionStorage.
   * On consume: strip `autoRun` from the URL (replace) so refresh/bookmarks do not
   * imply another automatic scan.
   */
  const autopilotStartedRef = React.useRef(false);
  React.useEffect(() => {
    if (!autopilotEnabled) {
      autopilotStartedRef.current = false;
      return;
    }
    if (!autopilotAutoRun) return;

    const latStr = params.get("lat");
    const lngStr = params.get("lng");
    const mode = params.get("autopilotMode") || "visible-safe-checks";
    if (!latStr || !lngStr || !isUsableLatLng(Number(latStr), Number(lngStr))) return;

    let consumed = false;
    try {
      const key = buildVisibleAutopilotConsumedStorageKey(location.pathname, latStr, lngStr, mode);
      consumed = sessionStorage.getItem(key) === "1";
    } catch {
      consumed = false;
    }

    if (consumed) {
      if (import.meta.env.DEV) {
        console.info("[DPAL visible autopilot] duplicate autoRun blocked — session already consumed", {
          pathname: location.pathname,
          searchParams: stripSensitiveSearchParamsForDevLog(location.search),
        });
      }
      return;
    }

    if (!isUsableLatLng(Number(form.lat), Number(form.lng))) return;
    if (Math.abs(Number(form.lat) - Number(latStr)) > 1e-4 || Math.abs(Number(form.lng) - Number(lngStr)) > 1e-4) {
      return;
    }

    if (autopilotStartedRef.current) return;

    const searchAtSchedule = location.search;
    setPendingUrlAutoStart(true);

    /**
     * Claim + cross-tab check run inside the delayed callback (not before scheduling).
     * React Strict Mode runs effect cleanup before the timer fires; writing localStorage
     * synchronously before the timer left a stale claim and the second mount skipped
     * autorun entirely (no scan, Playwright scanCount stayed 0).
     */
    const t = window.setTimeout(() => {
      const claimKey = buildVisibleAutopilotUrlClaimStorageKey(location.pathname, latStr, lngStr, mode);
      const nowMs = Date.now();
      let crossTabSkip = false;
      try {
        const prevClaim = localStorage.getItem(claimKey);
        const prevTs = prevClaim ? Number(prevClaim) : 0;
        if (prevTs && Number.isFinite(prevTs) && nowMs - prevTs < VISIBLE_AUTOPILOT_URL_CLAIM_MAX_AGE_MS) {
          crossTabSkip = true;
          if (import.meta.env.DEV) {
            console.info("[DPAL visible autopilot] URL autorun skipped — cross-tab claim active", {
              pathname: location.pathname,
              claimAgeMs: nowMs - prevTs,
            });
          }
        } else {
          localStorage.setItem(claimKey, String(nowMs));
        }
      } catch {
        /* private mode — still allow single-tab autorun */
      }

      const storeKey = buildVisibleAutopilotConsumedStorageKey(location.pathname, latStr, lngStr, mode);
      if (crossTabSkip) {
        try {
          sessionStorage.setItem(storeKey, "1");
        } catch {
          /* quota */
        }
        const uspEarly = new URLSearchParams(searchAtSchedule);
        uspEarly.delete("autoRun");
        const nextEarly = uspEarly.toString();
        navigate({ pathname: location.pathname, search: nextEarly ? `?${nextEarly}` : "" }, { replace: true });
        setSessionConsumedForAutopilot(true);
        setPendingUrlAutoStart(false);
        return;
      }

      try {
        sessionStorage.setItem(storeKey, "1");
      } catch {
        /* private mode / quota */
      }

      if (import.meta.env.DEV) {
        console.info("[DPAL visible autopilot] autoRun consumed (session marked)", {
          pathname: location.pathname,
          searchParamsBeforeStrip: stripSensitiveSearchParamsForDevLog(searchAtSchedule),
        });
      }

      const usp = new URLSearchParams(searchAtSchedule);
      usp.delete("autoRun");
      const nextSearch = usp.toString();
      navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" }, { replace: true });

      setSessionConsumedForAutopilot(true);
      setPendingUrlAutoStart(false);
      autopilot.start();
      autopilotStartedRef.current = true;
    }, 600);

    return () => {
      window.clearTimeout(t);
      setPendingUrlAutoStart(false);
    };
    /** `autopilot.start` is stable (useCallback); avoid `autopilot` object — new ref each render would cancel this timer. */
  }, [
    autopilotEnabled,
    autopilotAutoRun,
    autopilot.start,
    form.lat,
    form.lng,
    params,
    location.pathname,
    location.search,
    navigate,
  ]);

  /* --------------------------- packet readouts --------------------------- */

  const packet = getPacketRoot(packetData);
  const summary = (packet?.summary || packet?.waterAlertSummary || {}) as PacketRecord;
  const floodGuard = (packet?.floodguard || packet?.floodGuard || packet?.modules?.floodguard || {}) as PacketRecord;
  const floodRisk = (floodGuard?.floodRisk || {}) as PacketRecord;
  const floodRadar = (floodGuard?.radar || {}) as PacketRecord;
  const moduleHealth = (packet?.moduleHealth || {}) as PacketRecord;
  const isDegraded = packet?.status === "degraded";
  const isFloodGuardUnavailable =
    floodGuard?.status === "unavailable" || String(floodRisk?.level || "").toLowerCase() === "unavailable";
  const usgs = (packet?.usgsWater || packet?.usgs || packet?.waterGauge || packet?.modules?.usgs || {}) as PacketRecord;
  const usgsWaterSignals = (usgs?.waterSignals || {}) as PacketRecord;
  const nws = (packet?.nwsAlerts || packet?.nws || packet?.modules?.nws || {}) as PacketRecord;
  const geoLedger = (packet?.geoLedger || packet?.geo || packet?.modules?.geoLedger || {}) as PacketRecord;
  const evidence = (packet?.evidenceIntegrity || packet?.integrity || {}) as PacketRecord;
  const anchorPreview = (packet?.anchorPreview || evidence?.anchorPreview || {}) as PacketRecord;
  const claimSafety = packet?.claimSafety || evidence?.claimSafety;

  const activeAlerts = asArray<PacketRecord>(nws.activeAlerts || nws.alerts || []);
  const usgsReadings = asArray<PacketRecord>(usgs.readings || usgs.latestReadings || []);
  const claimSafetyChipValue = claimSafety
    ? claimSafety.publicClaimAllowed === false
      ? "Public claim blocked"
      : claimSafety.validatorReviewed === false
      ? "Validator review required"
      : claimSafety.warning || claimSafety.status || claimSafety.level || "Claim guidance available"
    : "n/a";

  /* --------------------------- scan handler --------------------------- */

  const runWaterEvidenceScan = React.useCallback(
    async ({ source: scanSource }: { source: "manual" | "visible-autopilot" }) => {
      const lat = Number(form.lat);
      const lng = Number(form.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setError("Latitude and longitude must be valid numbers.");
        return;
      }
      if (waterEvidenceScanBusyRef.current) {
        if (import.meta.env.DEV) {
          console.info("[DPAL water alert evidence] skipped overlapping scan — request already in flight", {
            source: scanSource,
          });
        }
        return;
      }
      waterEvidenceScanBusyRef.current = true;
      if (import.meta.env.DEV) {
        logAutopilotEvent({
          eventName: "scan_request_started",
          details: { source: scanSource, endpoint: "GET /api/integrations/water/alert-evidence-packet" },
        });
        if (scanSource === "visible-autopilot") {
          logAutopilotEvent({ eventName: "scan_triggered", details: { source: scanSource } });
          setScanDiag((d) => ({ ...d, triggered: true, requestStarted: true, requestCompleted: false, requestFailed: false }));
        } else {
          setScanDiag((d) => ({ ...d, requestStarted: true, requestCompleted: false, requestFailed: false }));
        }
      }
      setLoading(true);
      setError("");
      if (import.meta.env.DEV) {
        const g = window as Window & { __DPAL_WATER_ALERT_SCAN_COUNT?: number };
        g.__DPAL_WATER_ALERT_SCAN_COUNT = (g.__DPAL_WATER_ALERT_SCAN_COUNT ?? 0) + 1;
        console.info("[DPAL water alert evidence] scan invocation #", g.__DPAL_WATER_ALERT_SCAN_COUNT, {
          source: scanSource,
        });
      }
      navOutcome.trackOutcome({
        moduleId: "water_alert_evidence",
        eventType: "scan_started",
        label:
          scanSource === "visible-autopilot"
            ? "Started water evidence scan (visible autopilot)"
            : "Started water evidence scan",
        status: "started",
        coordinates: { lat, lng },
        metadata: { scanSource },
        requiresHumanReview: true,
      });
      try {
        const result = await getWaterAlertEvidencePacket({
          lat,
          lng,
          label: form.label,
          usgsSite: form.usgsSite,
        });
        setPacketData(result as PacketRecord);
        const packetStatusRaw =
          (result as PacketRecord)?.packet?.status ?? (result as PacketRecord)?.status;
        const packetStatus: "ok" | "degraded" | "error" | null =
          packetStatusRaw === "degraded" || packetStatusRaw === "error" || packetStatusRaw === "ok"
            ? packetStatusRaw
            : null;
        if (import.meta.env.DEV) {
          const mhRoot =
            ((result as PacketRecord)?.packet?.moduleHealth || (result as PacketRecord)?.moduleHealth || {}) as PacketRecord;
          console.info("[DPAL water alert evidence] scan completed", {
            source: scanSource,
            packetStatus: packetStatus ?? packetStatusRaw ?? null,
            moduleHealthKeys: Object.keys(mhRoot),
          });
          logAutopilotEvent({
            eventName: "scan_request_completed",
            details: { source: scanSource, packetStatus: packetStatus ?? String(packetStatusRaw ?? "") },
          });
          logAutopilotEvent({
            eventName: "packet_received",
            details: {
              packetStatus: packetStatus ?? String(packetStatusRaw ?? ""),
              moduleHealthKeys: Object.keys(mhRoot),
            },
          });
          if (Object.keys(mhRoot).length) {
            logAutopilotEvent({
              eventName: "module_health_rendered",
              details: { keys: Object.keys(mhRoot) },
            });
          }
          setScanDiag((d) => ({ ...d, requestCompleted: true, requestFailed: false }));
        }
        navOutcome.trackOutcome({
          moduleId: "water_alert_evidence",
          eventType: "draft_packet_generated",
          label:
            packetStatus === "degraded"
              ? "Draft packet generated (degraded — review required)"
              : "Draft packet generated",
          status: packetStatus === "degraded" ? "review_required" : "draft_created",
          coordinates: { lat, lng },
          requiresHumanReview: true,
          metadata: { packetStatus: packetStatus ?? undefined, scanSource },
        });
        /** Feed result into the autopilot if it's the one that triggered this scan. */
        if (scanSource === "visible-autopilot") {
          const mh = ((result as PacketRecord)?.packet?.moduleHealth ||
            (result as PacketRecord)?.moduleHealth ||
            {}) as PacketRecord;
          const providerProgress: Record<string, ProviderProgressStatus> = {
            FloodGuard: moduleHealthToProviderStatus(mh.floodguard),
            USGS: moduleHealthToProviderStatus(mh.usgsWater),
            NWS: moduleHealthToProviderStatus(mh.nwsAlerts),
            GeoLedger: moduleHealthToProviderStatus(mh.geoLedger),
          };
          autopilotMarkScanCompleteRef.current?.({ packetStatus, providerProgress });
        }
      } catch (err) {
        const rawMessage = err instanceof Error ? err.message : "Water evidence scan failed.";
        if (import.meta.env.DEV) {
          const m = rawMessage.match(/\b(\d{3})\b/);
          console.warn("[DPAL water alert evidence] scan failed", {
            source: scanSource,
            httpStatus: m?.[1] ?? "unknown",
          });
          logAutopilotEvent({
            eventName: "scan_request_failed",
            details: { source: scanSource, httpStatus: m?.[1] ?? "unknown" },
          });
          setScanDiag((d) => ({ ...d, requestCompleted: false, requestFailed: true }));
        }
        const isOpenMeteoRateLimit =
          /429/.test(rawMessage) && /open-meteo|Daily API request limit exceeded/i.test(rawMessage);
        setPacketData(null);
        setError(
          isOpenMeteoRateLimit
            ? "Live provider rate limit reached for FloodGuard weather input (Open-Meteo). This is a temporary upstream limit; retry later or use backend fallback/provider failover for uninterrupted operations."
            : rawMessage,
        );
        if (scanSource === "visible-autopilot") {
          autopilotMarkScanCompleteRef.current?.({
            packetStatus: "error",
            providerProgress: AUTOPILOT_PROVIDERS.reduce(
              (acc, p) => {
                acc[p] = "unavailable";
                return acc;
              },
              {} as Record<string, ProviderProgressStatus>,
            ),
          });
        }
      } finally {
        waterEvidenceScanBusyRef.current = false;
        setLoading(false);
      }
    },
    [form.lat, form.lng, form.label, form.usgsSite, navOutcome.trackOutcome, navOutcome.trackOutcomeOnce],
  );

  React.useEffect(() => {
    if (!import.meta.env.DEV || !autopilotEnabled) return;
    if (autopilot.currentStep?.intent !== "human_approval_gate") return;
    if (humanGateLoggedRef.current) return;
    humanGateLoggedRef.current = true;
    logAutopilotEvent({
      eventName: "human_approval_gate_reached",
      stepIndex: autopilot.stepIndex,
      stepId: autopilot.currentStep?.id,
    });
  }, [autopilotEnabled, autopilot.currentStep, autopilot.stepIndex]);

  /** Keep the ref in sync so autopilot can call the latest version. */
  React.useEffect(() => {
    runWaterEvidenceScanRef.current = runWaterEvidenceScan;
  }, [runWaterEvidenceScan]);

  /** Manual click — preserves the original UX exactly. */
  const onClickRunScan = React.useCallback(() => {
    void runWaterEvidenceScan({ source: "manual" });
  }, [runWaterEvidenceScan]);

  /* ------------------------------ render ------------------------------ */

  return (
    <div className="space-y-4">
      <NavigatorHelperCard expectedScenario="water_flood" />
      {autopilotEnabled && autopilotUiSettled(autopilot.status) ? (
        <div className="rounded-xl border border-cyan-500/45 bg-cyan-950/25 px-4 py-3 text-[11px] leading-snug text-cyan-50">
          <p className="font-semibold text-cyan-200">Visible safe checks</p>
          {sessionConsumedForAutopilot ? (
            <p className="mt-1 text-slate-200">
              Visible Autopilot already ran for this location in this session. Click Begin visible safe checks to run it
              again.
            </p>
          ) : !autopilotAutoRun ? (
            <p className="mt-1 text-slate-200">
              Autopilot mode is on, but automatic run is off (no{" "}
              <span className="font-mono text-cyan-100">autoRun=true</span> in the URL). Start when you want one read-only
              provider packet — DPAL will not scan until you begin.
            </p>
          ) : pendingUrlAutoStart ? (
            <p className="mt-1 text-slate-400">Starting visible safe checks from URL…</p>
          ) : (
            <p className="mt-1 text-slate-200">
              <span className="font-mono text-cyan-100">autoRun=true</span> is set, but automatic start is waiting for
              matching coordinates from the URL and form. Use Begin when ready — DPAL will not scan until then.
            </p>
          )}
          {sessionConsumedForAutopilot || !autopilotAutoRun || !pendingUrlAutoStart ? (
            <button
              type="button"
              data-dpal-target="begin-visible-safe-checks"
              onClick={() => autopilot.start()}
              className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
            >
              Begin visible safe checks
            </button>
          ) : null}
        </div>
      ) : null}
      {import.meta.env.DEV && autopilotEnabled ? (
        <div className="rounded-xl border border-dashed border-slate-600 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-200">
          <button
            type="button"
            onClick={() => setAutopilotDiagOpen((o) => !o)}
            className="flex w-full items-center justify-between font-bold text-cyan-200 hover:text-white"
          >
            <span>Autopilot Diagnostics</span>
            <span className="text-[10px] text-slate-400">{autopilotDiagOpen ? "Hide" : "Show"}</span>
          </button>
          {autopilotDiagOpen ? (
            <div className="mt-2 space-y-1.5 font-mono text-[10px] leading-relaxed text-slate-300">
              <p>autoRun param: {autopilotAutoRun ? "true" : "false (or missing)"}</p>
              <p>current step id: {autopilot.currentStep?.id ?? "—"}</p>
              <p>cursor target selector: {autopilot.currentStep?.targetSelector ?? "—"}</p>
              <p>target element found (rect): {autopilot.targetRect ? "yes" : "no"}</p>
              <p>scan triggered (autopilot): {scanDiag.triggered ? "yes" : "no"}</p>
              <p>API request started: {scanDiag.requestStarted ? "yes" : "no"}</p>
              <p>API request completed: {scanDiag.requestCompleted ? "yes" : "no"}</p>
              <p>API request failed: {scanDiag.requestFailed ? "yes" : "no"}</p>
              <p>packet status (autopilot): {autopilot.packetStatus ?? "null"}</p>
              <p>packet status (dashboard): {String(packet?.status ?? packet?.packetStatus ?? summary.packetStatus ?? "—")}</p>
              <p>moduleHealth keys: {Object.keys(moduleHealth).length ? Object.keys(moduleHealth).join(", ") : "—"}</p>
              <p>human approval gate reached: {autopilot.currentStep?.intent === "human_approval_gate" ? "yes" : "no"}</p>
              <p>autopilot status: {autopilot.status}</p>
              <p className="pt-1 text-slate-500">timeline tick #{autopilotDiagTick}</p>
              <ul className="max-h-40 overflow-auto border-t border-slate-700 pt-1 text-slate-500">
                {getAutopilotTimeline()
                  .slice(-12)
                  .map((e, i) => (
                    <li key={`${e.timestamp}-${i}`}>
                      {e.eventName}
                      {e.stepId ? ` · ${e.stepId}` : ""}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {navigatorPrefilled ? (
        <div className="rounded-xl border border-cyan-700/40 bg-cyan-950/25 px-3 py-2 text-[11px] leading-snug text-cyan-100">
          <span className="font-semibold text-cyan-200">Started from DPAL Navigator.</span>{" "}
          Coordinates and label were passed forward. Review module health and packet status before treating
          anything as verified — DPAL Navigator never publishes or anchors automatically.
        </div>
      ) : null}
      <header className="rounded-2xl border border-cyan-700/40 bg-slate-950/70 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Operator Dashboard</p>
        <h1 className="mt-2 text-xl font-extrabold text-white">DPAL Water Alert Evidence Packet</h1>
        <p className="mt-2 max-w-5xl text-xs text-slate-300">
          Combines FloodGuard forecast/radar, USGS water gauges, NOAA/NWS alerts, GeoLedger location identity, and
          blockchain-ready evidence hashing.
        </p>
        <p className="mt-2 text-[11px] text-amber-200">
          Advisory only. Validator review required when flagged. Anchor preview only. Not official emergency
          instruction.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip label="Packet status" value={packet?.status || packet?.packetStatus || summary.packetStatus || packet?.packetType || "idle"} />
          <Chip label="Review recommendation" value={summary.recommendedReviewStatus || packet?.recommendedReviewStatus || "n/a"} />
          <Chip label="Claim safety" value={claimSafetyChipValue} />
          <Chip label="Anchor status" value={anchorPreview.anchorStatus || packet?.anchorStatus || "n/a"} />
          {isDegraded ? <Chip label="System state" value="Degraded — one or more providers unavailable" /> : null}
        </div>
      </header>

      <Panel title="Input Panel">
        <div
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
          data-dpal-target="water-coordinates"
        >
          <label className="text-xs text-slate-300">
            Latitude
            <input
              value={form.lat}
              onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="text-xs text-slate-300">
            Longitude
            <input
              value={form.lng}
              onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="text-xs text-slate-300">
            Location label
            <input
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="text-xs text-slate-300">
            USGS site ID
            <input
              value={form.usgsSite}
              onChange={(e) => setForm((p) => ({ ...p, usgsSite: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onClickRunScan}
            disabled={loading}
            data-dpal-target="run-water-evidence-scan"
            className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Running..." : "Run Water Evidence Scan"}
          </button>
          {loading ? <span className="text-xs text-slate-400">Loading live packet from backend...</span> : null}
        </div>
        {error ? <p className="mt-3 rounded-lg bg-rose-950/40 p-3 text-xs text-rose-200">{error}</p> : null}
      </Panel>

      {autopilot.status !== "idle" && autopilot.status !== "aborted" ? (
        <AutopilotStatusCard
          status={autopilot.status}
          providers={[...AUTOPILOT_PROVIDERS]}
          providerProgress={autopilot.providerProgress}
          packetStatus={autopilot.packetStatus}
        />
      ) : null}

      {autopilotEnabled && !packet ? (
        <section
          className="rounded-2xl border border-amber-500/45 bg-amber-950/20 p-4"
          data-dpal-target="human-approval-gate"
        >
          <h2 className="text-sm font-bold text-amber-100">Human approval gate</h2>
          <p className="mt-2 text-[11px] leading-snug text-amber-50">
            When no draft packet is on screen yet, DPAL still stops here: publication, verification, anchoring, payments,
            and escalation require explicit human decisions — nothing below is auto-finalized.
          </p>
        </section>
      ) : null}

      {packet ? (
        <>
          {packet?.moduleHealth ? (
            <Panel title="Module Health" dataTarget="module-health-readouts">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <ReadRow label="FloodGuard" value={moduleHealth.floodguard || "n/a"} />
                <ReadRow label="USGS" value={moduleHealth.usgsWater || "n/a"} />
                <ReadRow label="NWS" value={moduleHealth.nwsAlerts || "n/a"} />
                <ReadRow label="GeoLedger" value={moduleHealth.geoLedger || "n/a"} />
              </div>
            </Panel>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Summary Panel">
              <ReadRow label="floodRiskLevel" value={summary.floodRiskLevel || floodRisk.level} />
              <ReadRow label="floodRiskScore" value={summary.floodRiskScore || floodRisk.score} />
              <ReadRow label="usgsStatus" value={summary.usgsStatus || usgs.status} />
              <ReadRow label="nwsStatus" value={summary.nwsStatus || nws.status} />
              <ReadRow label="nwsAlertCount" value={summary.nwsAlertCount ?? nws.alertCount ?? activeAlerts.length} />
              <ReadRow label="highestNwsSeverity" value={summary.highestNwsSeverity ?? "None"} />
              <ReadRow label="hasOfficialAlert" value={String(summary.hasOfficialAlert ?? nws.hasOfficialAlert ?? false)} />
              <ReadRow
                label="recommendedReviewStatus"
                value={summary.recommendedReviewStatus || packet.recommendedReviewStatus}
              />
            </Panel>

            <Panel title="FloodGuard Panel">
              {isFloodGuardUnavailable ? (
                <div className="space-y-2">
                  <p className="rounded-md border border-amber-500/50 bg-amber-950/30 px-2 py-1 text-xs font-semibold text-amber-100">
                    FloodGuard temporarily unavailable
                  </p>
                  {floodGuard.errorType === "rate_limited" ? (
                    <p className="text-xs text-amber-200">
                      Open-Meteo rate limit reached. Packet generated using remaining sources.
                    </p>
                  ) : null}
                  <ReadRow label="status" value={floodGuard.status || "unavailable"} />
                  <ReadRow label="message" value={floodGuard.message || "Provider unavailable"} />
                  <ReadRow label="originalError" value={floodGuard.originalError || "n/a"} />
                  <ReadRow label="cacheStatus" value={floodGuard.cacheStatus || "n/a"} />
                  <ReadRow label="cachedAt" value={floodGuard.cachedAt || "n/a"} />
                  <ReadRow label="cacheTtlMinutes" value={floodGuard.cacheTtlMinutes || "n/a"} />
                </div>
              ) : (
                <>
                  <ReadRow label="score" value={floodRisk.score} />
                  <ReadRow label="level" value={floodRisk.level} />
                  <ReadRow label="next24PrecipMm" value={floodRisk.next24PrecipMm} />
                  <ReadRow label="next24RainMm" value={floodRisk.next24RainMm} />
                  <ReadRow label="maxHourlyRainMm" value={floodRisk.maxHourlyRainMm} />
                  <ReadRow label="method" value={floodRisk.method} />
                  <ReadRow label="radar frame count" value={floodRadar.frameCount} />
                  {floodGuard.cacheStatus ? <ReadRow label="cacheStatus" value={floodGuard.cacheStatus} /> : null}
                  {floodGuard.cachedAt ? <ReadRow label="cachedAt" value={floodGuard.cachedAt} /> : null}
                  {floodGuard.cacheTtlMinutes ? (
                    <ReadRow label="cacheTtlMinutes" value={floodGuard.cacheTtlMinutes} />
                  ) : null}
                  {floodGuard.warning ? <ReadRow label="warning" value={floodGuard.warning} /> : null}
                </>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="USGS Water Gauge Panel">
              <ReadRow label="siteName" value={usgs.siteName} />
              <ReadRow label="site number" value={usgs.site} />
              <ReadRow label="dischargeCfs" value={usgsWaterSignals.dischargeCfs} />
              <ReadRow label="gageHeightFt" value={usgsWaterSignals.gageHeightFt} />
              <ReadRow label="waterTempC" value={usgsWaterSignals.waterTempC} />
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-slate-200">Readings table</p>
                <div className="overflow-auto rounded-lg border border-slate-800">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-300">
                      <tr>
                        <th className="px-3 py-2">parameterName</th>
                        <th className="px-3 py-2">value</th>
                        <th className="px-3 py-2">unit</th>
                        <th className="px-3 py-2">dateTime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usgsReadings.length ? (
                        usgsReadings.map((row, idx) => (
                          <tr key={`${row.parameterName || "param"}-${idx}`} className="border-t border-slate-800 text-slate-200">
                            <td className="px-3 py-2">{row.parameterName ?? "n/a"}</td>
                            <td className="px-3 py-2">{row.value ?? "n/a"}</td>
                            <td className="px-3 py-2">{row.unit ?? "n/a"}</td>
                            <td className="px-3 py-2">{row.dateTime ?? "n/a"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr className="border-t border-slate-800 text-slate-400">
                          <td className="px-3 py-2" colSpan={4}>
                            No readings returned.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Panel>

            <Panel title="NOAA/NWS Alerts Panel">
              <ReadRow label="alertCount" value={nws.alertCount ?? activeAlerts.length} />
              <ReadRow label="highestSeverity" value={nws.highestSeverity} />
              <div className="mt-3 space-y-2">
                {activeAlerts.length ? (
                  activeAlerts.map((alert, idx) => {
                    const status = String(alert.status || "").toLowerCase();
                    const event = String(alert.event || "");
                    const isTest = status === "test" || event.toLowerCase().includes("test message");
                    return (
                      <article key={`${alert.event || "alert"}-${idx}`} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-cyan-200">{alert.event || "NWS alert"}</span>
                          <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300">
                            {alert.status || "n/a"}
                          </span>
                          <span className="rounded-full border border-amber-500/60 px-2 py-0.5 text-[10px] text-amber-200">
                            {alert.severity || "n/a"}
                          </span>
                        </div>
                        {isTest ? (
                          <p className="mt-2 rounded-md border border-amber-500/50 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-100">
                            Test / monitoring alert — not treated as official emergency alert by DPAL.
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-300">{alert.headline || alert.description || "No headline."}</p>
                        <p className="mt-1 text-xs text-slate-400">{alert.instruction || "No instruction provided."}</p>
                        <p className="mt-1 text-[11px] text-slate-500">Expires: {alert.expires || "n/a"}</p>
                      </article>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400">No active alerts returned.</p>
                )}
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="GeoLedger Panel">
              <ReadRow label="formattedAddress" value={geoLedger.formattedAddress} />
              <ReadRow label="city" value={geoLedger.city} />
              <ReadRow label="county" value={geoLedger.county} />
              <ReadRow label="state" value={geoLedger.state} />
              <ReadRow label="country" value={geoLedger.country} />
              <ReadRow label="distanceMeters" value={geoLedger.distanceMeters} />
              <ReadRow label="geoLedgerId" value={geoLedger.geoLedgerId} />
              <ReadRow label="validationStatus" value={geoLedger.validationStatus} />
            </Panel>

            <Panel title="Evidence Integrity Panel" dataTarget="human-approval-gate">
              <ReadRow label="evidenceHash" value={packet.evidenceHash || evidence.evidenceHash} />
              <ReadRow label="anchorPreview.anchorStatus" value={anchorPreview.anchorStatus} />
              <ReadRow label="anchorPreview.chainTarget" value={anchorPreview.chainTarget} />
              <ReadRow label="anchorPreview.anchorPayloadHash" value={anchorPreview.anchorPayloadHash} />
              <ReadRow label="claimSafety warning" value={claimSafety?.warning || claimSafety?.message || "n/a"} />
              <p className="mt-3 rounded-md border border-amber-500/45 bg-amber-950/25 px-2 py-1.5 text-[11px] text-amber-100">
                Anchor preview only. Human validation required before any operational or legal claim.
              </p>
            </Panel>
          </div>

          <section className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4">
            <button
              type="button"
              onClick={() => setShowRaw((s) => !s)}
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            >
              {showRaw ? "Hide Raw Packet" : "View Raw Packet"}
            </button>
            {showRaw ? (
              <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-slate-800 bg-black/35 p-3 text-[11px] text-slate-200">
                {JSON.stringify(packetData, null, 2)}
              </pre>
            ) : null}
          </section>
        </>
      ) : null}

      {/* Visible Autopilot overlays */}
      {autopilot.isActive ? (
        <>
          <AutopilotSpotlight
            visible={autopilotShowCursor}
            targetRect={autopilot.targetRect}
            reduceMotion={autopilot.reduceMotion}
          />
          <VisibleAutopilotCursor
            visible={autopilotShowCursor}
            targetRect={autopilot.targetRect}
            bubble={autopilot.currentStep?.bubble ?? ""}
            reduceMotion={autopilot.reduceMotion}
          />
        </>
      ) : null}
      <AutopilotControlBar
        status={autopilot.status}
        stepIndex={autopilot.stepIndex}
        totalSteps={autopilot.totalSteps}
        bubble={autopilot.currentStep?.bubble ?? ""}
        onPause={autopilot.pause}
        onResume={autopilot.resume}
        onStop={autopilot.stop}
        onTakeControl={autopilot.takeControl}
      />
    </div>
  );
}
