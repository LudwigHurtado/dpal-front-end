import { useEffect, useState } from "react";
import {
  getDpalCityIntelligence,
  getDpalIntegrationStatus,
  geocodeDpalLocation,
} from "../services/dpalIntegrationsApi";

type Provider = {
  key: string;
  label: string;
  configured: boolean;
  purpose: string;
  mode: string;
};

export default function DpalIntegrationCommandCenter() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [city, setCity] = useState("Santa Cruz de la Sierra, Bolivia");
  const [packet, setPacket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getDpalIntegrationStatus()
      .then((data) => setProviders(data.providers || []))
      .catch((err) => setNotice(err.message));
  }, []);

  async function runCityScan() {
    setLoading(true);
    setNotice("");
    try {
      const geo = await geocodeDpalLocation(city);
      const result = geo.result?.result;
      if (!result?.lat || !result?.lng) {
        throw new Error(geo.result?.message || "No geocoding match found. Add GEOAPIFY_API_KEY in Railway.");
      }
      const scan = await getDpalCityIntelligence(Number(result.lat), Number(result.lng), city);
      setPacket(scan.packet);
    } catch (err: any) {
      setNotice(err.message || "City scan failed");
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
              <span className={`rounded-full px-2 py-1 text-xs ${
                p.configured ? "bg-emerald-900/70 text-emerald-200" : "bg-amber-900/70 text-amber-200"
              }`}>
                {p.mode}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{p.purpose}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <label className="text-sm font-semibold text-slate-200">City or project location</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400"
            placeholder="Santa Cruz de la Sierra, Bolivia"
          />
          <button
            onClick={runCityScan}
            disabled={loading}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60"
          >
            {loading ? "Scanning..." : "Run DPAL Scan"}
          </button>
        </div>

        {notice && <p className="mt-3 rounded-lg bg-red-950/50 p-3 text-sm text-red-200">{notice}</p>}

        {packet && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <p className="text-xs uppercase text-slate-500">FloodGuard</p>
              <p className="text-xl font-bold">{floodLevel || "unknown"}</p>
              <p className="text-sm text-slate-400">Score: {floodScore ?? "n/a"}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <p className="text-xs uppercase text-slate-500">Air Quality</p>
              <p className="text-xl font-bold">{airRisk || "not configured"}</p>
              <p className="text-sm text-slate-400">OpenAQ-backed when API key is set.</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <p className="text-xs uppercase text-slate-500">Evidence Hash</p>
              <p className="break-all text-xs text-amber-300">{packet.evidenceHash}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
