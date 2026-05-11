import { useEffect, useMemo, useState } from "react";
import {
  buildDryRunCityIntelligencePacket,
  DpalIntegrationHttpError,
  getDpalIntegrationStatus,
  geocodeDpalLocation,
  getDpalCityIntelligence,
} from "../services/dpalIntegrationsApi";
import { isHubConnectivityLikelyRateLimited, type HubConnectivityRow } from "../services/environmentalHubConnectivity";

type Provider = {
  key: string;
  label: string;
  configured: boolean;
  purpose: string;
  mode: string;
};

export type DpalIntegrationCommandCenterProps = {
  /** Live connectivity rows from Environmental Intelligence Hub (optional). */
  hubConnectivityRows?: HubConnectivityRow[] | null;
};

export default function DpalIntegrationCommandCenter({ hubConnectivityRows }: DpalIntegrationCommandCenterProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [city, setCity] = useState("Santa Cruz de la Sierra, Bolivia");
  const [packet, setPacket] = useState<any>(null);
  const [packetMode, setPacketMode] = useState<"none" | "live" | "dry_run_preview">("none");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [scanMode, setScanMode] = useState<"live" | "dry_run">("live");

  const hubLikelyLimited = useMemo(
    () => (hubConnectivityRows?.length ? isHubConnectivityLikelyRateLimited(hubConnectivityRows) : false),
    [hubConnectivityRows],
  );

  useEffect(() => {
    if (hubLikelyLimited) setScanMode("dry_run");
  }, [hubLikelyLimited]);

  useEffect(() => {
    getDpalIntegrationStatus()
      .then((data) => setProviders(data.providers || []))
      .catch((err) => setNotice(err instanceof Error ? err.message : String(err)));
  }, []);

  async function runCityScan() {
    setLoading(true);
    setNotice("");
    try {
      if (scanMode === "dry_run") {
        const geo = await geocodeDpalLocation(city);
        const result = geo.result?.result;
        if (!result?.lat || !result?.lng) {
          throw new Error(geo.result?.message || "No geocoding match found. Add GEOAPIFY_API_KEY in Railway.");
        }
        const dry = buildDryRunCityIntelligencePacket(Number(result.lat), Number(result.lng), city);
        setPacket(dry.packet);
        setPacketMode("dry_run_preview");
        setNotice("");
        return;
      }

      if (hubLikelyLimited) {
        setNotice(
          "Live scan is rate-limited on the hub probes. Switch to Dry Run preview or wait for the connectivity cooldown.",
        );
        setLoading(false);
        return;
      }

      const geo = await geocodeDpalLocation(city);
      const result = geo.result?.result;
      if (!result?.lat || !result?.lng) {
        throw new Error(geo.result?.message || "No geocoding match found. Add GEOAPIFY_API_KEY in Railway.");
      }
      const scan = await getDpalCityIntelligence(Number(result.lat), Number(result.lng), city);
      setPacket(scan.packet);
      setPacketMode("live");
    } catch (err: unknown) {
      if (err instanceof DpalIntegrationHttpError && err.isRateLimited) {
        const wait = err.retryAfterSeconds != null ? ` Retry after: ${err.retryAfterSeconds}s.` : "";
        setNotice(
          `DPAL API rate limited (429).${wait} Use Dry Run preview (no live adapter calls) or wait before retry.`,
        );
        setScanMode("dry_run");
      } else {
        setNotice(err instanceof Error ? err.message : "City scan failed");
      }
    } finally {
      setLoading(false);
    }
  }

  const floodLevel = packet?.modules?.floodguard?.floodRisk?.level;
  const floodScore = packet?.modules?.floodguard?.floodRisk?.score;
  const airRisk = packet?.modules?.airQuality?.risk || packet?.modules?.airQuality?.status;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-400">DPAL Integrations</p>
        <h2 className="text-2xl font-bold">Public API Intelligence Layer</h2>
        <p className="mt-1 text-sm text-slate-300">
          Weather, flood, air, geocoding, carbon, blockchain, and evidence packet adapters.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {providers.map((p) => (
          <div key={p.key} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{p.label}</h3>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  p.configured ? "bg-emerald-900/70 text-emerald-200" : "bg-amber-900/70 text-amber-200"
                }`}
              >
                {p.mode}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{p.purpose}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <fieldset className="mb-3">
          <legend className="text-sm font-semibold text-slate-200">Scan mode</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="scan-mode"
                checked={scanMode === "live"}
                onChange={() => setScanMode("live")}
                className="accent-amber-500"
              />
              <span>Live scan</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="scan-mode"
                checked={scanMode === "dry_run"}
                onChange={() => setScanMode("dry_run")}
                className="accent-amber-500"
              />
              <span>Dry Run preview</span>
            </label>
          </div>
          {hubLikelyLimited ? (
            <p className="mt-2 text-xs text-amber-200/90">
              Hub connectivity shows heavy rate limiting — Dry Run preview is recommended so we do not hammer the API.
              Live scan remains available after cooldown if you switch mode.
            </p>
          ) : null}
        </fieldset>

        <label className="text-sm font-semibold text-slate-200">City or project location</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400"
            placeholder="Santa Cruz de la Sierra, Bolivia"
          />
          <button
            type="button"
            onClick={runCityScan}
            disabled={loading || (scanMode === "live" && hubLikelyLimited)}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60"
          >
            {loading ? "Scanning..." : "Run DPAL Scan"}
          </button>
        </div>

        {scanMode === "live" && hubLikelyLimited ? (
          <p className="mt-3 rounded-lg border border-amber-700/50 bg-amber-950/40 p-3 text-sm text-amber-100">
            Live scan is rate-limited. Choose Dry Run preview (structure only, no live environmental reads) or wait for
            hub cooldown.
          </p>
        ) : null}

        {notice ? <p className="mt-3 rounded-lg bg-red-950/50 p-3 text-sm text-red-200">{notice}</p> : null}

        {packet && (
          <div className="mt-4 space-y-3">
            {packetMode === "dry_run_preview" || packet?.disclaimer ? (
              <p className="rounded-lg border border-cyan-800/60 bg-cyan-950/40 p-3 text-sm text-cyan-100">
                {packet?.disclaimer ??
                  "Dry Run preview — not a completed live scan. Evidence is not verified or blockchain anchored."}
              </p>
            ) : null}
            {packetMode === "live" ? (
              <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-2 text-xs text-emerald-100">
                Live integration packet — still subject to adapter availability and human review; not automatic verification.
              </p>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs uppercase text-slate-500">FloodGuard</p>
                <p className="text-xl font-bold">{floodLevel ?? "unknown"}</p>
                <p className="text-sm text-slate-400">Score: {floodScore ?? "n/a"}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs uppercase text-slate-500">Air Quality</p>
                <p className="text-xl font-bold">{airRisk ?? "not configured"}</p>
                <p className="text-sm text-slate-400">OpenAQ-backed when API key is set.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs uppercase text-slate-500">Evidence Hash</p>
                <p className="break-all text-xs text-amber-300">{packet.evidenceHash}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
