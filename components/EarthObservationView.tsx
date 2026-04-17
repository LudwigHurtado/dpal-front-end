import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, AlertTriangle, ArrowLeft, Bot, CheckCircle, Globe, MapPin, RefreshCw, Send, ShieldCheck, Sparkles, Target,
} from './icons';
import { API_ROUTES, apiUrl } from '../constants';
import { isAiEnabled, runGeminiPrompt } from '../services/geminiService';

interface GPSPoint { lat: number; lng: number }

type ObservationUse =
  | 'deforestation'
  | 'agriculture'
  | 'pollution'
  | 'carbon_projects'
  | 'floods_fires'
  | 'roads_cities'
  | 'water'
  | 'heat';

interface EarthObservationResult {
  dataAvailable: boolean;
  observationType: ObservationUse;
  signalStatus: string;
  primarySignal: string | null;
  riskLevel: 'low' | 'moderate' | 'high' | 'unknown';
  confidenceScore: number | null;
  captureDate: string | null;
  source: string;
  message: string;
  metrics: Record<string, number | string | null>;
}

type AidMessage = { role: 'assistant' | 'user'; text: string };

const USE_CASES: Array<{ id: ObservationUse; label: string; looksFor: string; satellites: string }> = [
  { id: 'deforestation', label: 'Deforestation', looksFor: 'tree loss, clearing edges, canopy change over time', satellites: 'Landsat, Sentinel-2, MODIS' },
  { id: 'agriculture', label: 'Agriculture', looksFor: 'crop health, drought stress, vegetation change', satellites: 'Landsat, Sentinel-2, SMAP' },
  { id: 'pollution', label: 'Pollution', looksFor: 'smoke, methane, dust, water contamination indicators', satellites: 'TROPOMI, OCO-2, VIIRS, Landsat' },
  { id: 'carbon_projects', label: 'Carbon Projects', looksFor: 'forest cover, biomass proxies, land-use change', satellites: 'Landsat, Sentinel-2, GEDI' },
  { id: 'floods_fires', label: 'Floods / Fires', looksFor: 'disaster damage, spread, burn or inundation extent', satellites: 'Sentinel-1, VIIRS, Landsat' },
  { id: 'roads_cities', label: 'Roads / Cities', looksFor: 'urban growth, road expansion, infrastructure change', satellites: 'Landsat, Sentinel-2, night lights' },
  { id: 'water', label: 'Water', looksFor: 'river changes, lakes, floods, algae indicators', satellites: 'SWOT, Sentinel-1, Landsat, MODIS' },
  { id: 'heat', label: 'Heat', looksFor: 'surface temperature and urban heat islands', satellites: 'Landsat TIRS, MODIS, ECOSTRESS' },
];

const EMPTY_RESULT = (observationType: ObservationUse): EarthObservationResult => ({
  dataAvailable: false,
  observationType,
  signalStatus: 'Not verified',
  primarySignal: null,
  riskLevel: 'unknown',
  confidenceScore: null,
  captureDate: null,
  source: 'LEO remote-sensing products',
  message: 'No verified Earth-observation scan has been run yet.',
  metrics: {},
});

function ObservationMap({ center, radiusKm, onSelect }: { center: GPSPoint; radiusKm: number; onSelect: (point: GPSPoint) => void }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef     = useRef<any>(null);

  function Picker() {
    const map = useMapEvents({
      click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }); },
    });
    useEffect(() => {
      if (!map) return;
      mapRef.current = map;
      const timers = [100, 300, 600, 1200].map((ms) =>
        window.setTimeout(() => map.invalidateSize(), ms),
      );
      return () => timers.forEach(window.clearTimeout);
    }, [map]);
    return null;
  }

  useEffect(() => {
    if (!wrapperRef.current || !mapRef.current) return;
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { mapRef.current?.invalidateSize(); }, [center.lat, center.lng, radiusKm]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900 flex flex-col">
      <div className="border-b border-slate-800 px-4 py-3 flex-shrink-0">
        <p className="text-sm font-bold text-white">LEO Observation Area</p>
        <p className="text-xs text-slate-500">Click the map to choose the target area for Earth analysis.</p>
      </div>
      <div ref={wrapperRef} style={{ flex: 1, minHeight: '320px', width: '100%' }}>
        <MapContainer
          key={`eo-map-${center.lat.toFixed(3)}-${center.lng.toFixed(3)}`}
          center={[center.lat, center.lng]}
          zoom={7}
          scrollWheelZoom
          style={{ height: '100%', width: '100%', minHeight: '320px', background: '#0d2137' }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, USGS, AeroGRID, IGN"
            maxZoom={19}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            opacity={0.65}
          />
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.15, weight: 2.5, dashArray: '5 7' }}
          />
          <Picker />
        </MapContainer>
      </div>
      <div className="border-t border-slate-800 px-4 py-3 text-[11px] text-slate-500 flex-shrink-0">
        Center: {center.lat.toFixed(5)}, {center.lng.toFixed(5)} · Radius: {radiusKm} km
      </div>
    </div>
  );
}

function buildObservationPrompt(result: EarthObservationResult, location: GPSPoint, radiusKm: number, question: string): string {
  const useCase = USE_CASES.find((item) => item.id === result.observationType);
  return `You are DPAL's Earth Observation assistant. NASA describes remote sensing as collecting information from a distance by measuring reflected or emitted energy from Earth. Help a non-expert turn LEO satellite context into practical civic or environmental action.

Observation type: ${useCase?.label || result.observationType}
What satellites look for: ${useCase?.looksFor || 'Earth surface change'}
Likely satellite families: ${useCase?.satellites || 'LEO remote-sensing satellites'}
Scan center: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}
Scan radius: ${radiusKm} km

Latest scan data:
${JSON.stringify(result, null, 2)}

User question:
${question}

Answer in plain English. Never invent satellite measurements. If data is unavailable or unverified, say so clearly and explain what can still be checked. Organize the answer into:
1. What might be happening
2. What satellite or ground evidence to verify first
3. What can fix or reduce harm
4. How DPAL users can help the person, community, project, or public agency

Be practical, compassionate, and action-oriented.`;
}

function ObservationAidChat({ result, location, radiusKm }: { result: EarthObservationResult; location: GPSPoint; radiusKm: number }) {
  const [messages, setMessages] = useState<AidMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiReady = isAiEnabled();
  const defaultQuestion = 'What can LEO satellites help us understand here, what should we verify, and how can DPAL help?';

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    try {
      const text = await runGeminiPrompt(buildObservationPrompt(result, location, radiusKm, trimmed));
      setMessages((prev) => [...prev, { role: 'assistant', text: text.trim() }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI helper failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="space-y-3 rounded-xl border border-sky-700/30 bg-sky-950/10 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-sky-500/30 bg-sky-500/10 p-2 text-sky-300">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Earth Observation Helper</p>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">Ask what satellites can reveal, what needs verification, and how DPAL can turn the signal into action.</p>
          </div>
        </div>
        <button
          onClick={() => ask(defaultQuestion)}
          disabled={!aiReady || loading}
          className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
        >
          {loading ? 'Thinking...' : 'Explain impact'}
        </button>
      </div>

      {!aiReady && (
        <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-500">
          AI helper requires <span className="font-mono">VITE_GEMINI_API_KEY</span> or <span className="font-mono">VITE_USE_SERVER_AI=true</span>.
        </div>
      )}
      {error && <div className="rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-xs text-rose-300">{error}</div>}

      {messages.length > 0 && (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                message.role === 'assistant'
                  ? 'border border-slate-700 bg-slate-900/80 text-slate-200'
                  : 'ml-8 border border-sky-600/30 bg-sky-700/20 text-sky-100'
              }`}
            >
              <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{message.role === 'assistant' ? 'AI Guidance' : 'Question'}</p>
              {message.text.split('\n').map((line, lineIdx) => (
                <span key={lineIdx}>{line}{lineIdx < message.text.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Building guidance...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="flex flex-col gap-2 md:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          disabled={!aiReady || loading}
          placeholder="Ask about deforestation, crops, pollution, disasters, cities, water, heat, or carbon projects..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-500 disabled:opacity-50"
        />
        <button
          onClick={() => {
            const q = input;
            setInput('');
            void ask(q);
          }}
          disabled={!aiReady || loading || !input.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          Ask
        </button>
      </div>
    </div>
  );
}

const EarthObservationView: React.FC<{ onReturn: () => void }> = ({ onReturn }) => {
  const [scanLocation, setScanLocation] = useState<GPSPoint>({ lat: 39.5, lng: -98.35 });
  const [scanRadius, setScanRadius] = useState(25);
  const [observationType, setObservationType] = useState<ObservationUse>('deforestation');
  const [result, setResult] = useState<EarthObservationResult>(EMPTY_RESULT('deforestation'));
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const selectedUse = USE_CASES.find((item) => item.id === observationType) ?? USE_CASES[0];

  const runScan = async () => {
    setLoading(true);
    setNotice('');
    try {
      const params = new URLSearchParams({
        lat: String(scanLocation.lat),
        lng: String(scanLocation.lng),
        radiusKm: String(scanRadius),
        type: observationType,
      });
      const res = await fetch(apiUrl(API_ROUTES.EARTH_OBSERVATION_SCAN) + `?${params.toString()}`);
      const body = await res.text();
      if (!res.ok) {
        setResult({
          ...EMPTY_RESULT(observationType),
          source: selectedUse.satellites,
          message: 'The LEO Earth-observation processing endpoint is not deployed yet. No satellite signal is verified for this area.',
        });
        setNotice(`Earth Observation endpoint unavailable (${res.status}). The workspace is ready, but verified readings require the backend adapter.`);
        return;
      }
      const data = body ? JSON.parse(body) : null;
      setResult({ ...EMPTY_RESULT(observationType), ...data, observationType });
    } catch {
      setResult({
        ...EMPTY_RESULT(observationType),
        source: selectedUse.satellites,
        message: 'Unable to reach the Earth Observation processing endpoint. No satellite signal is verified yet.',
      });
      setNotice('Network unavailable for Earth Observation scan. Try again after the backend adapter is deployed.');
    } finally {
      setLoading(false);
    }
  };

  const verified = result.dataAvailable === true;
  const metrics = [
    { label: 'Signal Status', value: verified ? result.signalStatus : 'Not verified', icon: <Activity className="h-5 w-5 text-sky-300" />, desc: selectedUse.looksFor },
    { label: 'Primary Signal', value: verified && result.primarySignal ? result.primarySignal : 'Not verified', icon: <Target className="h-5 w-5 text-emerald-300" />, desc: 'Main observed change or condition' },
    { label: 'Risk Level', value: verified ? result.riskLevel : 'Unknown', icon: <AlertTriangle className="h-5 w-5 text-amber-300" />, desc: 'Requires verified imagery and context' },
    { label: 'Confidence', value: verified && typeof result.confidenceScore === 'number' ? `${Math.round(result.confidenceScore * 100)}%` : 'Not verified', icon: <ShieldCheck className="h-5 w-5 text-cyan-300" />, desc: 'Based on source quality and usable pixels' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-sky-500/20 bg-sky-950/20">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <button onClick={onReturn} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-sky-300">Earth Observation</p>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">LEO satellite analysis workspace</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Monitor deforestation, crop health, pollution indicators, carbon project land cover, floods, fires, urban change, water shifts, and heat islands with verified remote-sensing signals.
              </p>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-slate-950/70 p-4">
              <p className="text-xs font-bold text-sky-300">Remote-sensing posture</p>
              <p className="mt-2 text-sm text-slate-300">The UI is ready for LEO satellite products. Values remain unverified until a backend adapter reads real imagery or atmospheric products.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[380px_1fr] lg:items-stretch">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <Globe className="h-10 w-10 text-sky-300" />
              <div>
                <h2 className="text-lg font-bold text-white">Select Analysis Type</h2>
                <p className="text-sm text-slate-400">Choose what the satellites should look for.</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Observation use
                <select
                  value={observationType}
                  onChange={(e) => {
                    const next = e.target.value as ObservationUse;
                    setObservationType(next);
                    setResult(EMPTY_RESULT(next));
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                >
                  {USE_CASES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs font-bold text-white">{selectedUse.label}</p>
                <p className="mt-1 text-xs text-slate-400">{selectedUse.looksFor}</p>
                <p className="mt-2 text-[11px] text-slate-500">{selectedUse.satellites}</p>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Latitude
                <input
                  value={scanLocation.lat.toFixed(5)}
                  onChange={(e) => {
                    const lat = Number(e.target.value);
                    if (Number.isFinite(lat)) setScanLocation((prev) => ({ ...prev, lat }));
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Longitude
                <input
                  value={scanLocation.lng.toFixed(5)}
                  onChange={(e) => {
                    const lng = Number(e.target.value);
                    if (Number.isFinite(lng)) setScanLocation((prev) => ({ ...prev, lng }));
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                />
              </label>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Area radius (km)</label>
                <input type="range" min={1} max={100} value={scanRadius} onChange={(e) => setScanRadius(Number(e.target.value))} className="mt-2 w-full" />
                <p className="mt-1 text-xs text-slate-500">{scanRadius} km around the scan center.</p>
              </div>
              <button
                onClick={runScan}
                disabled={loading}
                className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
              >
                {loading ? 'Checking satellite products...' : 'Scan observation area'}
              </button>
            </div>
          </div>
          <ObservationMap center={scanLocation} radiusKm={scanRadius} onSelect={setScanLocation} />
        </div>

        {notice && <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-200">{notice}</div>}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="font-bold text-white">Scan status</p>
          <p className="mt-1">{result.message}</p>
          <p className="mt-1 text-xs text-slate-500">{result.source}{result.captureDate ? ` · ${result.captureDate}` : ''}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="mb-2 flex items-center gap-3">
                {metric.icon}
                <div>
                  <p className="text-sm font-bold text-white">{metric.label}</p>
                  <p className="text-xs text-slate-500">{metric.desc}</p>
                </div>
              </div>
              <p className="text-xl font-black text-sky-300">{metric.value}</p>
            </div>
          ))}
        </div>

        <ObservationAidChat result={result} location={scanLocation} radiusKm={scanRadius} />

        <div className="grid gap-4 md:grid-cols-4">
          {USE_CASES.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setObservationType(item.id);
                setResult(EMPTY_RESULT(item.id));
              }}
              className={`rounded-xl border p-4 text-left transition-colors ${
                observationType === item.id
                  ? 'border-sky-400 bg-sky-500/10'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-500'
              }`}
            >
              <p className="text-sm font-bold text-white">{item.label}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.looksFor}</p>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-sky-300" />
            <p className="font-bold text-white">How this helps DPAL users</p>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            This area turns LEO satellite signals into practical reports and missions: verify what changed, collect field proof, route help to affected people or projects, and avoid presenting unverified satellite indicators as facts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EarthObservationView;
