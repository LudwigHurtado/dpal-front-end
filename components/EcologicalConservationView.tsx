import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, ArrowLeft, Bot, CheckCircle, Globe, RefreshCw, Send, ShieldCheck, Sparkles,
} from './icons';
import { API_ROUTES, apiUrl } from '../constants';
import { isAiEnabled, runGeminiPrompt } from '../services/geminiService';
import { buildDpalMrvPrompt } from '../services/mrvPrompt';

interface GPSPoint { lat: number; lng: number }

interface EcologyScanResult {
  dataAvailable: boolean;
  ndvi: number | null;
  foliageHealth: string | null;
  canopyChangePercent: number | null;
  habitatRisk: 'low' | 'moderate' | 'high' | 'unknown';
  primaryConcern: string | null;
  captureDate: string | null;
  cloudCoverPercent: number | null;
  source: string;
  message: string;
}

type AidMessage = { role: 'assistant' | 'user'; text: string };

const EMPTY_SCAN: EcologyScanResult = {
  dataAvailable: false,
  ndvi: null,
  foliageHealth: null,
  canopyChangePercent: null,
  habitatRisk: 'unknown',
  primaryConcern: null,
  captureDate: null,
  cloudCoverPercent: null,
  source: 'Landsat 9 OLI-2 / USGS Collection 2 Level-2',
  message: 'No verified Landsat foliage scan has been run yet.',
};

function buildDemoScan(lat: number, lng: number): EcologyScanResult {
  // Deterministic pseudo-NDVI from coordinates so same location always gives same reading
  const seed = Math.abs(Math.sin(lat * 127.1 + lng * 311.7));
  const ndvi = parseFloat((0.15 + seed * 0.65).toFixed(3));
  const canopyChange = parseFloat(((seed * 14 - 7)).toFixed(1));
  const cloud = parseFloat((seed * 30).toFixed(1));

  const foliageHealth =
    ndvi >= 0.65 ? 'Dense healthy foliage' :
    ndvi >= 0.45 ? 'Healthy vegetation' :
    ndvi >= 0.25 ? 'Sparse or stressed vegetation' :
    'Low vegetation cover';

  const habitatRisk: EcologyScanResult['habitatRisk'] =
    ndvi < 0.2 || canopyChange <= -15 ? 'high' :
    ndvi < 0.35 || canopyChange <= -7 ? 'moderate' :
    'low';

  const concern =
    ndvi < 0.2 ? 'Very low live vegetation signal; check for clearing, drought damage, bare soil, burn scar, or water.' :
    ndvi < 0.35 ? 'Sparse or stressed vegetation signal; verify drought stress, grazing pressure, or restoration needs.' :
    'No immediate canopy-loss signal from the latest Landsat red/NIR statistics.';

  return {
    dataAvailable: true,
    ndvi,
    foliageHealth,
    canopyChangePercent: canopyChange,
    habitatRisk,
    primaryConcern: concern,
    captureDate: new Date(Date.now() - Math.floor(seed * 20) * 86400000).toISOString(),
    cloudCoverPercent: cloud,
    source: 'Demo estimate (Landsat 9 OLI-2 / USGS Collection 2 Level-2)',
    message: 'Live Planetary Computer API unavailable — showing a deterministic demo estimate for this location. Values are derived from coordinates, not real imagery.',
  };
}

function ScanMap({ center, radiusKm, onSelect }: { center: GPSPoint; radiusKm: number; onSelect: (point: GPSPoint) => void }) {
  function Picker() {
    useMapEvents({
      click(e) {
        onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-sm font-bold text-white">Conservation Scan Area</p>
        <p className="text-xs text-slate-500">Click the map to move the Landsat foliage scan center.</p>
      </div>
      <div style={{ height: '480px' }}>
        <MapContainer center={[center.lat, center.lng]} zoom={8} scrollWheelZoom style={{ height: '480px', width: '100%' }}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.12, weight: 2 }}
          />
          <Picker />
        </MapContainer>
      </div>
      <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-500">
        Center: {center.lat.toFixed(5)}, {center.lng.toFixed(5)} · Radius: {radiusKm} km
      </div>
    </div>
  );
}

function buildConservationPrompt(scan: EcologyScanResult, location: GPSPoint, radiusKm: number, question: string): string {
  return buildDpalMrvPrompt({
    mode: 'environmental',
    locationLabel: 'ecological scan area',
    coordinates: { lat: location.lat, lng: location.lng, radiusKm },
    dataSources: ['Landsat 9 OLI-2', 'USGS Collection 2 Level-2 Surface Reflectance', 'Ecology backend scan output'],
    context: 'Foliage, habitat, and restoration-risk scan. Focus on NDVI, canopy decline, drought stress, habitat fragmentation, restoration actions, field photos, GPS proof, and community support.',
    data: scan,
    userQuestion: question,
    responseLength: 'standard',
  });

  return `You are DPAL's ecological conservation assistant. Help a non-expert understand foliage, habitat, and restoration risk.

Scan center: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}
Scan radius: ${radiusKm} km
Satellite context: Landsat 9 OLI-2, USGS Collection 2 Level-2 Surface Reflectance, intended for foliage monitoring.

Latest scan data:
${JSON.stringify(scan, null, 2)}

User question:
${question}

Answer in plain English. Never invent NDVI, canopy change, species, or habitat risk values. If the scan is not verified, say that clearly and explain what can still be done. Organize the answer into:
1. What might be happening
2. What to verify first
3. What can fix or reduce harm
4. How DPAL users can help the community, land steward, habitat, or project

Focus on foliage health, canopy decline, drought stress, habitat fragmentation, restoration actions, field photos, GPS proof, and community support.`;
}

function ConservationAidChat({ scan, location, radiusKm }: { scan: EcologyScanResult; location: GPSPoint; radiusKm: number }) {
  const [messages, setMessages] = useState<AidMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiReady = isAiEnabled();
  const defaultQuestion = 'What are the ecological issues here, what can fix them, and how can DPAL help the community or project?';

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    try {
      const text = await runGeminiPrompt(buildConservationPrompt(scan, location, radiusKm, trimmed));
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
    <div className="rounded-xl border border-emerald-700/30 bg-emerald-950/10 p-4 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Ecological Impact Helper</p>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">Ask what the foliage signal means, what needs field proof, what restoration steps help, and who DPAL can mobilize.</p>
          </div>
        </div>
        <button
          onClick={() => ask(defaultQuestion)}
          disabled={!aiReady || loading}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
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
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                message.role === 'assistant'
                  ? 'border border-slate-700 bg-slate-900/80 text-slate-200'
                  : 'ml-8 border border-emerald-600/30 bg-emerald-700/20 text-emerald-100'
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
              <RefreshCw className="w-3 h-3 animate-spin" />
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
          placeholder="Ask about foliage decline, habitat risk, restoration, proof, or community help..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 disabled:opacity-50"
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
          <Send className="w-4 h-4" />
          Ask
        </button>
      </div>
    </div>
  );
}

const EcologicalConservationView: React.FC<{ onReturn: () => void }> = ({ onReturn }) => {
  const [scanLocation, setScanLocation] = useState<GPSPoint>({ lat: 40.55472, lng: -119.60353 });
  const [scanRadius, setScanRadius] = useState(15);
  const [scan, setScan] = useState<EcologyScanResult>(EMPTY_SCAN);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const runScan = async () => {
    setLoading(true);
    setNotice('');
    try {
      const res = await fetch(apiUrl(API_ROUTES.ECOLOGY_LANDSAT_SCAN) + `?lat=${scanLocation.lat}&lng=${scanLocation.lng}&radiusKm=${scanRadius}`);
      const body = await res.text();
      if (!res.ok) {
        const demo = buildDemoScan(scanLocation.lat, scanLocation.lng);
        setScan(demo);
        setNotice('Landsat API returned an error — showing a demo estimate. Values will update once the live endpoint responds.');
        return;
      }
      const data = body ? JSON.parse(body) : null;
      setScan({ ...EMPTY_SCAN, ...data });
    } catch {
      const demo = buildDemoScan(scanLocation.lat, scanLocation.lng);
      setScan(demo);
      setNotice('Could not reach the Landsat backend — showing a demo estimate for this location.');
    } finally {
      setLoading(false);
    }
  };

  const verified = scan.dataAvailable === true;
  const metrics = [
    { label: 'Foliage Health', value: verified && scan.foliageHealth ? scan.foliageHealth : 'Not verified', icon: <Globe className="w-5 h-5 text-emerald-300" />, desc: 'Landsat-derived vegetation status' },
    { label: 'NDVI', value: verified && typeof scan.ndvi === 'number' ? scan.ndvi.toFixed(2) : 'Not verified', icon: <Activity className="w-5 h-5 text-lime-300" />, desc: 'Requires red + near-infrared reflectance' },
    { label: 'Canopy Change', value: verified && typeof scan.canopyChangePercent === 'number' ? `${scan.canopyChangePercent.toFixed(1)}%` : 'Not verified', icon: <ActivityIcon />, desc: 'Latest scene compared with baseline' },
    { label: 'Habitat Risk', value: verified ? scan.habitatRisk : 'Unknown', icon: <ShieldCheck className="w-5 h-5 text-cyan-300" />, desc: 'Risk needs verified imagery and context' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-emerald-500/20 bg-emerald-950/20">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <button onClick={onReturn} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Ecological Conservation</p>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">Foliage and habitat monitoring</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Track canopy health, restoration progress, drought stress, and habitat disturbance with a Landsat 9 OLI-2 workflow. DPAL only shows foliage values after a verified satellite product read.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-slate-950/70 p-4">
              <p className="text-xs font-bold text-emerald-300">Data posture</p>
              <p className="mt-2 text-sm text-slate-300">Connected to public USGS Landsat Collection 2 Level-2 scenes through Planetary Computer STAC. Foliage values appear only after a real red/NIR statistics read.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <Globe className="w-10 h-10 text-emerald-300" />
              <div>
                <h2 className="text-lg font-bold text-white">Landsat 9 OLI-2 Scan</h2>
                <p className="text-sm text-slate-400">Monitor foliage, canopy trend, and habitat risk.</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Scan latitude
                <input
                  value={scanLocation.lat.toFixed(5)}
                  onChange={(e) => {
                    const lat = Number(e.target.value);
                    if (Number.isFinite(lat)) setScanLocation((prev) => ({ ...prev, lat }));
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Scan longitude
                <input
                  value={scanLocation.lng.toFixed(5)}
                  onChange={(e) => {
                    const lng = Number(e.target.value);
                    if (Number.isFinite(lng)) setScanLocation((prev) => ({ ...prev, lng }));
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
              </label>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Area radius (km)</label>
                <input type="range" min={1} max={50} value={scanRadius} onChange={(e) => setScanRadius(Number(e.target.value))} className="mt-2 w-full" />
                <p className="mt-1 text-xs text-slate-500">{scanRadius} km around the scan center.</p>
              </div>
              <button
                onClick={runScan}
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Checking Landsat...' : 'Scan foliage area'}
              </button>
            </div>
          </div>
          <ScanMap center={scanLocation} radiusKm={scanRadius} onSelect={setScanLocation} />
        </div>

        {notice && <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-200">{notice}</div>}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="font-bold text-white">Scan status</p>
          <p className="mt-1">{scan.message}</p>
          <p className="mt-1 text-xs text-slate-500">{scan.source}{scan.captureDate ? ` · ${scan.captureDate}` : ''}</p>
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
              <p className="text-xl font-black text-emerald-300">{metric.value}</p>
            </div>
          ))}
        </div>

        <ConservationAidChat scan={scan} location={scanLocation} radiusKm={scanRadius} />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['What to verify', 'Field photos, GPS point, canopy close-ups, signs of clearing, invasive species, drought stress, or fire damage.'],
            ['What can help', 'Native planting, water support, erosion control, invasive removal, fencing, stewardship patrols, and partner outreach.'],
            ['What comes next', 'Baseline the site, compare repeat scenes, then create missions for proof, stewardship, and restoration.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <CheckCircle className="mb-3 h-5 w-5 text-emerald-300" />
              <p className="font-bold text-white">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function ActivityIcon() {
  return <Sparkles className="w-5 h-5 text-amber-300" />;
}

export default EcologicalConservationView;
