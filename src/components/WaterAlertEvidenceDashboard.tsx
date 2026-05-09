import React from "react";
import { useLocation } from "react-router-dom";
import { getWaterAlertEvidencePacket } from "../services/dpalIntegrationsApi";
import { NavigatorHelperCard } from "../features/dpalNavigator";

type PacketRecord = Record<string, any>;

const DEFAULT_FORM = {
  lat: "38.949",
  lng: "-77.127",
  label: "Potomac Little Falls",
  usgsSite: "01646500",
};

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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4">
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

export default function WaterAlertEvidenceDashboard(): React.ReactElement {
  const location = useLocation();
  const [form, setForm] = React.useState(DEFAULT_FORM);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [packetData, setPacketData] = React.useState<PacketRecord | null>(null);
  const [showRaw, setShowRaw] = React.useState(false);
  const [navigatorPrefilled, setNavigatorPrefilled] = React.useState(false);

  /**
   * Read DPAL Navigator query params (lat / lng / label / source / navigatorFlow)
   * once on mount and pre-fill the form. We do not auto-run the scan unless
   * `source === "dpal-navigator"` and lat/lng are valid — this keeps existing
   * deep-link behavior intact.
   */
  React.useEffect(() => {
    if (!location.search) return;
    const params = new URLSearchParams(location.search);
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

    setForm({
      lat: String(lat),
      lng: String(lng),
      label,
      usgsSite,
    });
    setNavigatorPrefilled(source === "dpal-navigator" || navigatorFlow === "water-alert");
  }, [location.search]);

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

  async function runScan() {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Latitude and longitude must be valid numbers.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await getWaterAlertEvidencePacket({
        lat,
        lng,
        label: form.label,
        usgsSite: form.usgsSite,
      });
      setPacketData(result as PacketRecord);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Water evidence scan failed.";
      const isOpenMeteoRateLimit =
        /429/.test(rawMessage) && /open-meteo|Daily API request limit exceeded/i.test(rawMessage);
      setPacketData(null);
      setError(
        isOpenMeteoRateLimit
          ? "Live provider rate limit reached for FloodGuard weather input (Open-Meteo). This is a temporary upstream limit; retry later or use backend fallback/provider failover for uninterrupted operations."
          : rawMessage,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <NavigatorHelperCard expectedScenario="water_flood" />
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
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
            onClick={runScan}
            disabled={loading}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Running..." : "Run Water Evidence Scan"}
          </button>
          {loading ? <span className="text-xs text-slate-400">Loading live packet from backend...</span> : null}
        </div>
        {error ? <p className="mt-3 rounded-lg bg-rose-950/40 p-3 text-xs text-rose-200">{error}</p> : null}
      </Panel>

      {packet ? (
        <>
          {packet?.moduleHealth ? (
            <Panel title="Module Health">
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

            <Panel title="Evidence Integrity Panel">
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
    </div>
  );
}
