/**
 * DPAL Carbon MRV Engine — Frontend Dashboard
 *
 * Views:
 *   dashboard  — overview + my projects + marketplace credits
 *   create     — register a new carbon project
 *   project    — project detail: satellite monitoring, MRV score, blockchain ledger
 *   validator  — validator queue: review MRV reports, approve/reject
 */
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import {
  ArrowLeft, MapPin, CheckCircle, Search, Loader, Sparkles, Activity,
  ShieldCheck, Award, Zap, Globe, Plus, X, ChevronLeft, ChevronRight,
  Camera, Users, AlertTriangle, RefreshCw, Eye, Bot, Send,
} from './icons';
import {
  API_ROUTES, apiUrl,
  CARBON_PROJECT_DETAIL, CARBON_SATELLITE_HISTORY, CARBON_MRV_HISTORY,
  CARBON_CREDITS_OWNED, CARBON_PROJECTS_BY_OWNER, CARBON_PROJECT_LEDGER,
  CARBON_PROJECT_GPS,
} from '../constants';
import { isAiEnabled, runGeminiPrompt } from '../services/geminiService';
import { SatelliteAiInsight } from './SatelliteAiInsight';
import type { Hero } from '../types';

import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { loadGoogleMaps } from '../services/googleMapsLoader';
import { GibsTileViewer } from './GibsTileViewer';

interface SnapshotMapProps {
  lat: number;
  lng: number;
  projectName: string;
  totalAcres: number;
  ndviScore?: number;
}

function SnapshotMap({ lat, lng, projectName, totalAcres, ndviScore }: SnapshotMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapErr, setMapErr]     = useState(false);

  const hasCoords = lat && lng && (lat !== 0 || lng !== 0);

  useEffect(() => {
    if (!hasCoords || !mapDivRef.current) return;
    let cancelled = false;
    const ndviColor = ndviScore != null
      ? (ndviScore >= 0.6 ? '#22c55e' : ndviScore >= 0.3 ? '#f59e0b' : '#f43f5e')
      : '#22c55e';
    const radiusM = Math.sqrt((totalAcres * 4047) / Math.PI);

    loadGoogleMaps().then((g) => {
      if (cancelled || !mapDivRef.current) return;
      const map = new g.maps.Map(mapDivRef.current, {
        center: { lat, lng },
        zoom: 14,
        mapTypeId: 'satellite',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        tilt: 0,
      });
      new g.maps.Circle({
        map,
        center: { lat, lng },
        radius: radiusM,
        strokeColor: ndviColor,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: ndviColor,
        fillOpacity: 0.08,
      });
      new g.maps.InfoWindow({
        content: `<div style="font-family:monospace;font-size:11px;padding:6px 8px;background:#0f172a;color:#e2e8f0;border-radius:6px">
          <strong>${projectName}</strong><br/>
          ${totalAcres.toLocaleString()} acres
          ${ndviScore != null ? `<br/><span style="color:${ndviColor}">NDVI ${ndviScore.toFixed(3)}</span>` : ''}
        </div>`,
        position: { lat, lng },
      }).open(map);
      setMapReady(true);
    }).catch(() => { if (!cancelled) setMapErr(true); });

    return () => { cancelled = true; };
  }, [lat, lng, totalAcres, ndviScore, hasCoords]);

  if (!hasCoords) {
    return (
      <div className="h-52 flex items-center justify-center bg-slate-800/60 rounded-xl border border-slate-700 text-center px-4">
        <div>
          <p className="text-2xl mb-2">📍</p>
          <p className="font-bold text-slate-400 text-sm">No GPS coordinates set</p>
          <p className="text-xs text-slate-600 mt-1">Edit the project to add a GPS center point</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700/60" style={{ height: '240px' }}>
      {!mapReady && !mapErr && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <Loader className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      )}
      {mapErr && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10 text-center px-4">
          <div>
            <p className="text-slate-400 text-sm font-bold mb-1">Satellite view unavailable</p>
            <p className="text-slate-600 text-xs">Check VITE_GOOGLE_MAPS_API_KEY</p>
          </div>
        </div>
      )}
      <div ref={mapDivRef} className="w-full h-full" />
      <div className="absolute top-2 right-2 z-10">
        <span className="text-[8px] font-bold text-white bg-black/60 px-2 py-0.5 rounded uppercase tracking-wider">Google Satellite</span>
      </div>
    </div>
  );
}

interface ScanAreaSelectorProps {
  lat: number;
  lng: number;
  radiusKm: number;
  onSelectLocation: (location: GPSPoint) => void;
}

function ScanAreaSelector({ lat, lng, radiusKm, onSelectLocation }: ScanAreaSelectorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);
  const center: [number, number] = [lat, lng];

  function LocationPicker() {
    const map = useMapEvents({
      click(e) {
        onSelectLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });

    useEffect(() => {
      if (!map) return;
      mapRef.current = map;
      const t1 = window.setTimeout(() => map.invalidateSize(), 100);
      const t2 = window.setTimeout(() => map.invalidateSize(), 500);
      return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    }, [map]);

    return null;
  }

  useEffect(() => {
    if (!wrapperRef.current || !mapRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [hasCoords]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.invalidateSize();
  }, [lat, lng, radiusKm]);

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="text-sm font-bold text-white">Scan Area Preview</p>
            <p className="text-xs text-slate-500">Click anywhere on the map to choose a scan center.</p>
          </div>
        </div>
      </div>
      <div ref={wrapperRef} style={{ height: '320px', position: 'relative' }}>
        {hasCoords ? (
          <MapContainer
            center={center}
            zoom={8}
            scrollWheelZoom
            style={{ height: '320px', width: '100%', position: 'absolute', inset: 0 }}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com">Esri</a>'
              maxZoom={19}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution=""
              maxZoom={19}
              opacity={0.7}
            />
            <Circle
              center={center}
              radius={radiusKm * 1000}
              pathOptions={{ color: '#14b8a6', fillColor: '#14b8a6', fillOpacity: 0.12, weight: 2 }}
            />
            <LocationPicker />
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">Invalid scan coordinates</div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-500">
        Selected center: {lat.toFixed(5)}, {lng.toFixed(5)} • Radius: {radiusKm} km
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface GPSPoint { lat: number; lng: number; }

interface CarbonProject {
  projectId: string;
  ownerId: string;
  ownerName: string;
  projectName: string;
  projectType: string;
  description: string;
  location: { country: string; region: string; city: string; gpsCenter: GPSPoint; polygon: GPSPoint[] };
  totalAcres: number;
  baselineDate: string;
  baselineNdvi: number;
  status: string;
  evidenceUrls: string[];
  createdAt: string;
}

type ImpactAidMode = 'air' | 'minerals' | 'project';
type ImpactAidMessage = { role: 'assistant' | 'user'; text: string };

interface ImpactAidChatProps {
  mode: ImpactAidMode;
  data: Record<string, unknown> | null;
  location: GPSPoint;
  radiusKm: number;
  project?: CarbonProject | null;
}

function buildImpactAidPrompt({
  mode,
  data,
  location,
  radiusKm,
  project,
  question,
}: ImpactAidChatProps & { question: string }): string {
  const projectContext = project
    ? `Project: ${project.projectName || project.projectId}. Type: ${project.projectType || 'carbon project'}.`
    : 'Project: no registered project selected; use the scan area as context.';

  return `You are DPAL's field impact assistant. Help a non-expert understand an environmental scan and turn it into practical support for a person, community, or project.

Scan type: ${mode}
Scan center: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}
Scan radius: ${radiusKm} km
${projectContext}

Latest available data:
${JSON.stringify(data || {}, null, 2)}

User question:
${question}

Answer in plain English. Be honest about missing or unavailable measurements; never invent values. Organize the answer into:
1. What might be happening
2. What issues or risks to check first
3. What can be done to fix or reduce harm
4. How DPAL users could help the person, community, or project

Keep it specific, compassionate, and action-oriented.`;
}

function ImpactAidChat({ mode, data, location, radiusKm, project }: ImpactAidChatProps) {
  const [messages, setMessages] = useState<ImpactAidMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingImpactAid, setLoadingImpactAid] = useState(false);
  const [impactAidError, setImpactAidError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiReady = isAiEnabled();
  const defaultQuestion = 'What are the issues here, what can fix them, and how can we help the affected person, community, or project?';

  const askImpactAid = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loadingImpactAid) return;
    setImpactAidError('');
    setLoadingImpactAid(true);
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    try {
      const prompt = buildImpactAidPrompt({ mode, data, location, radiusKm, project, question: trimmed });
      const text = await runGeminiPrompt(prompt);
      setMessages((prev) => [...prev, { role: 'assistant', text: text.trim() }]);
    } catch (err) {
      setImpactAidError(err instanceof Error ? err.message : 'AI helper failed.');
    } finally {
      setLoadingImpactAid(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingImpactAid]);

  const modeLabel = mode === 'air' ? 'Air Quality Impact Helper' : mode === 'minerals' ? 'Mineral Dust Impact Helper' : 'Project Impact Helper';

  return (
    <div className="rounded-xl border border-emerald-700/30 bg-emerald-950/10 p-4 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{modeLabel}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Ask what the scan could mean, what risks to verify, what fixes are realistic, and how DPAL can support the people or project affected.
            </p>
          </div>
        </div>
        <button
          onClick={() => askImpactAid(defaultQuestion)}
          disabled={!aiReady || loadingImpactAid}
          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-colors"
        >
          {loadingImpactAid ? 'Thinking...' : 'Explain impact'}
        </button>
      </div>

      {!aiReady && (
        <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-500">
          AI helper requires <span className="font-mono">VITE_GEMINI_API_KEY</span> or <span className="font-mono">VITE_USE_SERVER_AI=true</span>.
        </div>
      )}

      {impactAidError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-xs text-rose-300">
          {impactAidError}
        </div>
      )}

      {messages.length > 0 && (
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                message.role === 'assistant'
                  ? 'bg-slate-900/80 border border-slate-700 text-slate-200'
                  : 'bg-emerald-700/20 border border-emerald-600/30 text-emerald-100 ml-8'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                {message.role === 'assistant' ? 'AI Guidance' : 'Question'}
              </p>
              {message.text.split('\n').map((line, lineIdx) => (
                <span key={lineIdx}>
                  {line}
                  {lineIdx < message.text.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          ))}
          {loadingImpactAid && (
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
          onKeyDown={(e) => e.key === 'Enter' && askImpactAid(input)}
          disabled={!aiReady || loadingImpactAid}
          placeholder="Ask: who is affected, what should we verify, or what help should we organize?"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 disabled:opacity-50"
        />
        <button
          onClick={() => {
            const q = input;
            setInput('');
            void askImpactAid(q);
          }}
          disabled={!aiReady || loadingImpactAid || !input.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          Ask
        </button>
      </div>
    </div>
  );
}

interface SatelliteSnapshot {
  snapshotId: string;
  captureDate: string;
  ndviScore: number;
  ndviPrevious: number;
  ndviChange: number;
  vegetationChangePercent: number;
  deforestationAlert: boolean;
  cloudCoverPercent: number;
  landCoverType: string;
  provider: string;
  isBaseline: boolean;
}

interface MRVReport {
  reportId: string;
  reportDate: string;
  carbonScore: number;
  creditEstimateTons: number;
  ndviImprovement: number;
  noDeforestationScore: number;
  protectedAreaScore: number;
  validatorTrustScore: number;
  riskLevel: string;
  aiSummary: string;
  status: string;
  validatorNotes: string;
}

interface CarbonCredit {
  creditId: string;
  projectId: string;
  projectName: string;
  creditAmountTons: number;
  verificationStatus: string;
  marketplaceStatus: string;
  pricePerTon: number;
  blockchainHash: string;
  issuedAt: number;
  retirementCertHash?: string;
}

interface TxRecord {
  txId: string;
  txType: string;
  amountTons: number;
  priceUsd: number;
  blockchainHash: string;
  note: string;
  ts: number;
}

interface CarbonMRVDashboardProps {
  onReturn: () => void;
  hero?: Hero;
  onGoToMarket?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  { key: 'forest',        label: 'Forest',          icon: '🌲', rate: 2.5 },
  { key: 'reforestation', label: 'Reforestation',   icon: '🌱', rate: 3.2 },
  { key: 'mangrove',      label: 'Mangrove',        icon: '🌊', rate: 5.5 },
  { key: 'wetland',       label: 'Wetland',         icon: '💧', rate: 3.8 },
  { key: 'peatland',      label: 'Peatland',        icon: '🍂', rate: 4.0 },
  { key: 'grassland',     label: 'Grassland',       icon: '🌾', rate: 0.6 },
  { key: 'farm',          label: 'Regenerative Farm', icon: '🚜', rate: 0.5 },
  { key: 'methane',       label: 'Methane Capture', icon: '♻️', rate: 0 },
  { key: 'solar',         label: 'Solar / Clean Energy', icon: '☀️', rate: 0 },
  { key: 'other',         label: 'Other',           icon: '🌍', rate: 1.0 },
];

const STATUS_STYLE: Record<string, string> = {
  submitted:   'bg-slate-700/40 text-slate-300 border-slate-600',
  monitoring:  'bg-sky-500/15 text-sky-300 border-sky-500/30',
  review:      'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved:    'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected:    'bg-rose-500/15 text-rose-300 border-rose-500/30',
  listed:      'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const RISK_STYLE: Record<string, string> = {
  low:    'text-emerald-400',
  medium: 'text-amber-400',
  high:   'text-rose-400',
};

function scoreBar(value: number, max = 1, width = 'w-full') {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className={`h-1.5 rounded-full bg-slate-800 overflow-hidden ${width}`}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function relTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function projectTypeInfo(type: string) {
  return PROJECT_TYPES.find((t) => t.key === type) || { icon: '🌍', label: type, rate: 1 };
}

// ── Create Project Form ────────────────────────────────────────────────────────

interface CreateFormState {
  projectName: string; projectType: string; description: string;
  country: string; region: string; city: string;
  lat: string; lng: string;
  totalAcres: string; baselineDate: string;
}

const BLANK_CREATE: CreateFormState = {
  projectName: '', projectType: '', description: '',
  country: '', region: '', city: '',
  lat: '', lng: '',
  totalAcres: '', baselineDate: new Date().toISOString().split('T')[0],
};

const COUNTRIES = [
  'USA','Brazil','Colombia','Argentina','D.R. Congo','Kenya','Senegal',
  'Malaysia','Bangladesh','Finland','Australia','Canada','India',
  'Indonesia','Peru','Mexico','Tanzania','Mozambique','Papua New Guinea',
  'Ecuador','Bolivia','Chile','Norway','Sweden','Russia','China','Philippines',
];

function CreateProjectForm({ hero, onCreated, onCancel }: {
  hero?: Hero;
  onCreated: (project: CarbonProject) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateFormState>(BLANK_CREATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof CreateFormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const pType = projectTypeInfo(form.projectType);
  const acres = parseFloat(form.totalAcres) || 0;
  const estCredits = acres > 0 ? Math.round(acres * (pType.rate || 1)) : 0;

  const canNext: Record<number, boolean> = {
    1: !!form.projectName && !!form.projectType,
    2: !!form.country && !!form.lat && !!form.lng && acres > 0,
    3: true,
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(apiUrl(API_ROUTES.CARBON_PROJECTS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: hero?.operativeId || 'anonymous',
          ownerName: hero?.name || 'Anonymous',
          projectName: form.projectName,
          projectType: form.projectType,
          description: form.description,
          country: form.country,
          region: form.region,
          city: form.city,
          lat: Number(form.lat),
          lng: Number(form.lng),
          totalAcres: Number(form.totalAcres),
          baselineDate: form.baselineDate,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      onCreated(d.project);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel}
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">DPAL Carbon MRV</p>
          <h2 className="text-xl font-black text-white">Register Carbon Project</h2>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all shrink-0
              ${s < step ? 'bg-emerald-500 text-black' : s === step ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
              {s < step ? '✓' : s}
            </div>
            {s < 4 && <div className={`flex-1 h-0.5 rounded ${s < step ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        {/* Step 1: Project identity */}
        {step === 1 && <>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Project Name *</label>
            <input value={form.projectName} onChange={(e) => set('projectName', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
              placeholder="e.g. Amazon Corridor Restoration Project" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 block">Project Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_TYPES.map((t) => (
                <button key={t.key} onClick={() => set('projectType', t.key)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all
                    ${form.projectType === t.key ? 'border-emerald-500 bg-emerald-900/30' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
                  <span className="text-lg">{t.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">{t.label}</p>
                    {t.rate > 0 && <p className="text-[10px] text-emerald-400">{t.rate} tCO2e/ac/yr</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all resize-none"
              placeholder="Describe the project goals, existing ecosystem, and conservation strategy…" />
          </div>
        </>}

        {/* Step 2: Location + acreage */}
        {step === 2 && <>
          <p className="text-sm text-slate-300">Enter the GPS center-point of the project boundary. Google Maps right-click provides coordinates.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Country *</label>
              <select value={form.country} onChange={(e) => set('country', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all">
                <option value="">Select…</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Region / State</label>
              <input value={form.region} onChange={(e) => set('region', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                placeholder="e.g. Amazonas" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Latitude *</label>
              <input value={form.lat} onChange={(e) => set('lat', e.target.value)}
                type="number" step="0.0001"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                placeholder="-3.4653" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Longitude *</label>
              <input value={form.lng} onChange={(e) => set('lng', e.target.value)}
                type="number" step="0.0001"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                placeholder="-62.2159" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Total Acres *</label>
              <input value={form.totalAcres} onChange={(e) => set('totalAcres', e.target.value)}
                type="number" min="1"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                placeholder="500000" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Baseline Date</label>
              <input value={form.baselineDate} onChange={(e) => set('baselineDate', e.target.value)}
                type="date"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all" />
            </div>
          </div>

          {/* Live estimate */}
          {acres > 0 && form.projectType && (
            <div className="rounded-xl bg-emerald-900/20 border border-emerald-500/30 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-black text-white">{acres.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">Total Acres</p>
                </div>
                <div>
                  <p className="text-xl font-black text-emerald-400">{estCredits.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">tCO2e/yr est.</p>
                </div>
                <div>
                  <p className="text-xl font-black text-amber-400">${(estCredits * 12).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">Revenue/yr est.</p>
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-2 text-center">Estimates at ~{pType.rate} tCO2e/acre/year, $12/tonne avg. Actual credits depend on MRV score.</p>
            </div>
          )}
        </>}

        {/* Step 3: Additional info */}
        {step === 3 && <>
          <div className="rounded-xl bg-sky-900/20 border border-sky-500/30 p-4 space-y-2">
            <p className="text-xs font-black text-sky-300 uppercase tracking-wider">MRV Process Overview</p>
            {[
              ['🛰️ Baseline snapshot', 'Satellite imagery pulled to establish NDVI baseline'],
              ['📊 Monthly monitoring', 'Automated satellite comparisons track vegetation change'],
              ['🧮 Carbon scoring', 'AI calculates DPAL Carbon Score (0–100) from NDVI + alerts'],
              ['✅ Validator review', 'Verified validator approves or rejects MRV report'],
              ['🪙 Credit issuance', 'Verified credits issued on DPAL blockchain ledger'],
              ['🏪 Marketplace listing', 'Approved credits listed for buyers worldwide'],
            ].map(([icon, text]) => (
              <div key={icon as string} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="shrink-0">{icon}</span>{text}
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-amber-900/20 border border-amber-500/30 p-4">
            <p className="text-xs font-black text-amber-300 uppercase tracking-wider mb-1.5">Legal Notice</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              DPAL issues <strong>DPAL Verified Carbon Impact Credits</strong> — an internal impact token.
              These are not Verra VCS or Gold Standard certified credits. For global compliance markets,
              third-party registry certification is required. DPAL credits demonstrate verified impact and
              can be retired for corporate ESG reporting.
            </p>
          </div>
        </>}

        {/* Step 4: Review + submit */}
        {step === 4 && <>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-teal-900 border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{pType.icon}</span>
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">New Carbon Project</p>
                <p className="text-lg font-black text-white">{form.projectName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Type', pType.label],
                ['Country', form.country],
                ['Region', form.region || '—'],
                ['Acres', Number(form.totalAcres).toLocaleString()],
                ['GPS', `${Number(form.lat).toFixed(4)}, ${Number(form.lng).toFixed(4)}`],
                ['Baseline', form.baselineDate],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-white/50 text-[10px] uppercase tracking-wider">{k}</p>
                  <p className="text-white font-bold">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-emerald-900/20 border border-emerald-500/30 p-4 text-center">
            <p className="text-2xl font-black text-emerald-400 mb-1">{estCredits.toLocaleString()} tCO2e/yr</p>
            <p className="text-xs text-slate-400">Estimated annual credits (subject to MRV verification)</p>
          </div>
          {error && <div className="rounded-xl bg-rose-900/30 border border-rose-500/40 p-3 text-sm text-rose-300">{error}</div>}
        </>}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-4">
        {step > 1 && (
          <button onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-all">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <button onClick={() => setStep((s) => s + 1)} disabled={!canNext[step]}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-black transition-all disabled:opacity-40">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-black transition-all disabled:opacity-50">
            {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Submitting…</> : <><CheckCircle className="w-4 h-4" /> Register Project</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type DashView = 'dashboard' | 'create' | 'project' | 'validator';

const CarbonMRVDashboard: React.FC<CarbonMRVDashboardProps> = ({ onReturn, hero, onGoToMarket }) => {
  const [view, setView] = useState<DashView>('dashboard');
  const [activeTab, setActiveTab] = useState<'myprojects' | 'marketplace' | 'ledger' | 'airquality' | 'minerals'>('myprojects');

  // Data
  const [projects, setProjects] = useState<CarbonProject[]>([]);
  const [marketCredits, setMarketCredits] = useState<CarbonCredit[]>([]);
  const [stats, setStats] = useState({ totalProjects: 0, approvedProjects: 0, totalCreditsTons: 0, listedCredits: 0 });
  const [airQualityData, setAirQualityData] = useState<any>(null);
  const [airQualityError, setAirQualityError] = useState('');
  const [mineralData, setMineralData] = useState<any>(null);
  const [mineralError, setMineralError] = useState('');
  const [loadingAirQuality, setLoadingAirQuality] = useState(false);
  const [loadingMinerals, setLoadingMinerals] = useState(false);
  const [scanLocation, setScanLocation] = useState<GPSPoint>({ lat: 34.05, lng: -118.25 });
  const [scanRadius, setScanRadius] = useState(15);
  const [globalTxs, setGlobalTxs] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected project detail
  const [selectedProject, setSelectedProject] = useState<CarbonProject | null>(null);
  const [snapshots, setSnapshots] = useState<SatelliteSnapshot[]>([]);
  const [mrvReports, setMrvReports] = useState<MRVReport[]>([]);
  const [projectTxs, setProjectTxs] = useState<TxRecord[]>([]);
  const [runningSnapshot, setRunningSnapshot] = useState(false);
  const [runningMRV, setRunningMRV] = useState(false);
  const [mrvMsg, setMrvMsg] = useState('');

  // Validator queue
  const [validatorQueue, setValidatorQueue] = useState<any[]>([]);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Project editing
  const [editingProject, setEditingProject] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    projectName: string; projectType: string; description: string;
    country: string; region: string; city: string;
    lat: string; lng: string; totalAcres: string; baselineDate: string;
  }>({ projectName: '', projectType: '', description: '', country: '', region: '', city: '', lat: '', lng: '', totalAcres: '', baselineDate: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  const userId = hero?.operativeId || 'anonymous';
  const userName = hero?.name || 'Anonymous';

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, mktRes, statsRes, ledgerRes] = await Promise.all([
        fetch(CARBON_PROJECTS_BY_OWNER(userId)),
        fetch(apiUrl(API_ROUTES.CARBON_MARKETPLACE)),
        fetch(apiUrl(API_ROUTES.CARBON_STATS)),
        fetch(apiUrl(API_ROUTES.CARBON_LEDGER)),
      ]);
      if (projRes.ok) setProjects((await projRes.json()).projects || []);
      if (mktRes.ok) setMarketCredits((await mktRes.json()).credits || []);
      if (statsRes.ok) setStats((await statsRes.json()).stats || stats);
      if (ledgerRes.ok) setGlobalTxs((await ledgerRes.json()).transactions || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId]);

  const fetchAirQuality = useCallback(async () => {
    setAirQualityError('');
    setLoadingAirQuality(true);
    try {
      const lat = scanLocation.lat;
      const lng = scanLocation.lng;
      const res = await fetch(apiUrl(API_ROUTES.CARBON_AIR_QUALITY) + `?lat=${lat}&lng=${lng}`);
      const body = await res.text();
      if (!res.ok) {
        setAirQualityData(null);
        setAirQualityError(`Air quality request failed (${res.status}): ${body || res.statusText}`);
        return;
      }
      let data: any = null;
      try { data = body ? JSON.parse(body) : null; } catch {
        setAirQualityError('Received unexpected response from air quality service.');
        return;
      }
      setAirQualityData(data);
    } catch (error: any) {
      console.error('Failed to fetch air quality:', error);
      setAirQualityError('Unable to load air quality data. Please try again later.');
      setAirQualityData(null);
    } finally {
      setLoadingAirQuality(false);
    }
  }, [scanLocation]);

  const fetchMinerals = useCallback(async () => {
    setMineralError('');
    setLoadingMinerals(true);
    try {
      const lat = scanLocation.lat;
      const lng = scanLocation.lng;
      const res = await fetch(apiUrl(API_ROUTES.CARBON_MINERALS) + `?lat=${lat}&lng=${lng}`);
      const body = await res.text();
      if (!res.ok) {
        setMineralData(null);
        setMineralError(`Mineral scan failed (${res.status}): ${body || res.statusText}`);
        return;
      }
      let data: any = null;
      try { data = body ? JSON.parse(body) : null; } catch {
        setMineralError('Received unexpected response from mineral service.');
        return;
      }
      setMineralData(data);
    } catch (error: any) {
      console.error('Failed to fetch minerals:', error);
      setMineralError('Unable to load mineral scan. Please try again later.');
      setMineralData(null);
    } finally {
      setLoadingMinerals(false);
    }
  }, [scanLocation]);

  const fetchProjectDetail = useCallback(async (project: CarbonProject) => {
    const [snapRes, mrvRes, txRes] = await Promise.all([
      fetch(CARBON_SATELLITE_HISTORY(project.projectId)),
      fetch(CARBON_MRV_HISTORY(project.projectId)),
      fetch(CARBON_PROJECT_LEDGER(project.projectId)),
    ]);
    if (snapRes.ok) setSnapshots((await snapRes.json()).snapshots || []);
    if (mrvRes.ok) setMrvReports((await mrvRes.json()).reports || []);
    if (txRes.ok) setProjectTxs((await txRes.json()).transactions || []);
  }, []);

  const fetchValidatorQueue = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(API_ROUTES.CARBON_VALIDATOR_QUEUE));
      if (res.ok) setValidatorQueue((await res.json()).queue || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void fetchDashboard(); }, [userId]);

  useEffect(() => {
    if (selectedProject?.location?.gpsCenter?.lat && selectedProject?.location?.gpsCenter?.lng) {
      setScanLocation({
        lat: selectedProject.location.gpsCenter.lat,
        lng: selectedProject.location.gpsCenter.lng,
      });
    }
  }, [selectedProject]);

  const openProject = (project: CarbonProject) => {
    setSelectedProject(project);
    setView('project');
    void fetchProjectDetail(project);
  };

  const airQualitySource = String(airQualityData?.source || '');
  const hasVerifiedAirQuality = airQualityData?.dataAvailable === true && airQualityData?.measurementStatus === 'verified' && !/mock data/i.test(airQualitySource);
  const hasVerifiedCo2 = hasVerifiedAirQuality && typeof airQualityData?.co2ppm === 'number';
  const hasVerifiedCh4 = hasVerifiedAirQuality && typeof airQualityData?.ch4ppb === 'number';
  const hasVerifiedNo2 = hasVerifiedAirQuality && typeof airQualityData?.no2 === 'number';
  const hiddenLegacyAirValues = airQualityData && !hasVerifiedAirQuality
    ? {
        co2ppm: typeof airQualityData.co2ppm === 'number' ? airQualityData.co2ppm : null,
        ch4ppb: typeof airQualityData.ch4ppb === 'number' ? airQualityData.ch4ppb : null,
        no2: typeof airQualityData.no2 === 'number' ? airQualityData.no2 : null,
      }
    : null;
  const airQualityAiContext = airQualityData
    ? {
        readingStatus: hasVerifiedAirQuality ? 'verified real integration reading' : 'not a verified real integration reading',
        verifiedCo2ppm: hasVerifiedCo2 ? airQualityData.co2ppm : null,
        verifiedCh4ppb: hasVerifiedCh4 ? airQualityData.ch4ppb : null,
        verifiedNo2: hasVerifiedNo2 ? airQualityData.no2 : null,
        hiddenUnverifiedValues: hiddenLegacyAirValues,
        source: airQualitySource || null,
        backendMessage: airQualityData.message || null,
        note: hasVerifiedAirQuality
          ? 'Only values listed as verified should be discussed as measurements.'
          : 'Do not treat CO2, CH4, or NO2 numbers as real until DPAL confirms they came from its real satellite product integration.',
      }
    : null;

  const mineralSource = String(mineralData?.source || '');
  const mineralNames = Array.isArray(mineralData?.minerals) ? mineralData.minerals.filter(Boolean) : [];
  const hasVerifiedMineralComposition = mineralData?.dataAvailable === true && mineralNames.length > 0 && !/mock data/i.test(mineralSource);
  const hasVerifiedDustSource = hasVerifiedMineralComposition && typeof mineralData?.dustArea === 'number' && mineralData.dustArea > 0;
  const hiddenLegacyMinerals = mineralData && !hasVerifiedMineralComposition && mineralNames.length > 0 ? mineralNames : [];
  const mineralAiContext = mineralData
    ? {
        readingStatus: hasVerifiedMineralComposition ? 'verified mineral composition returned' : 'not a verified mineral composition reading',
        verifiedMinerals: hasVerifiedMineralComposition ? mineralNames : [],
        verifiedPrimaryMineral: hasVerifiedMineralComposition ? mineralNames[0] : null,
        verifiedDustSourceAreaKm2: hasVerifiedDustSource ? mineralData.dustArea : null,
        hiddenUnverifiedMineralNames: hiddenLegacyMinerals,
        source: mineralSource || null,
        backendMessage: mineralData.message || null,
        note: hasVerifiedMineralComposition
          ? 'Use the listed minerals as verified scan outputs.'
          : 'Do not treat any mineral type, primary mineral, or dust-source area as real until a spectral mineral product reader confirms it.',
      }
    : null;

  // ── Actions ────────────────────────────────────────────────────────────────

  const runSnapshot = async () => {
    if (!selectedProject) return;
    setRunningSnapshot(true);
    try {
      const res = await fetch(apiUrl(API_ROUTES.CARBON_SATELLITE_SNAPSHOT), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject.projectId }),
      });
      if (res.ok) await fetchProjectDetail(selectedProject);
    } catch { /* silent */ }
    finally { setRunningSnapshot(false); }
  };

  const runMRV = async () => {
    if (!selectedProject) return;
    setRunningMRV(true);
    setMrvMsg('');
    try {
      const res = await fetch(apiUrl(API_ROUTES.CARBON_MRV_SCORE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject.projectId, validatorTrustScore: 0.5 }),
      });
      const d = await res.json();
      if (res.ok) {
        setMrvMsg(`Carbon Score: ${d.report.carbonScore}/100 — ${d.report.creditEstimateTons.toLocaleString()} tCO2e estimated`);
        await fetchProjectDetail(selectedProject);
        await fetchDashboard();
      } else {
        setMrvMsg(d.error || 'MRV failed');
      }
    } catch { setMrvMsg('Network error'); }
    finally { setRunningMRV(false); }
  };

  const submitReview = async (reportId: string, decision: 'approved' | 'rejected') => {
    setReviewingId(reportId);
    try {
      const res = await fetch(apiUrl(API_ROUTES.CARBON_VALIDATOR_REVIEW), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          validatorId: userId,
          validatorName: userName,
          decision,
          trustScore: 0.85,
          notes: reviewNotes,
        }),
      });
      if (res.ok) {
        setReviewing(null);
        setReviewNotes('');
        await fetchValidatorQueue();
        await fetchDashboard();
      }
    } catch { /* silent */ }
    finally { setReviewingId(null); }
  };

  const openProjectEdit = () => {
    if (!selectedProject) return;
    setEditDraft({
      projectName:  selectedProject.projectName,
      projectType:  selectedProject.projectType,
      description:  selectedProject.description || '',
      country:      selectedProject.location.country || '',
      region:       selectedProject.location.region || '',
      city:         selectedProject.location.city || '',
      lat:          selectedProject.location.gpsCenter.lat ? String(selectedProject.location.gpsCenter.lat) : '',
      lng:          selectedProject.location.gpsCenter.lng ? String(selectedProject.location.gpsCenter.lng) : '',
      totalAcres:   selectedProject.totalAcres > 0 ? String(selectedProject.totalAcres) : '',
      baselineDate: selectedProject.baselineDate || '',
    });
    setEditMsg('');
    setEditingProject(true);
  };

  const saveProjectEdit = async () => {
    if (!selectedProject) return;
    const lat = editDraft.lat ? parseFloat(editDraft.lat) : 0;
    const lng = editDraft.lng ? parseFloat(editDraft.lng) : 0;
    if (editDraft.lat && (isNaN(lat) || lat < -90 || lat > 90))   { setEditMsg('Latitude must be −90 to 90'); return; }
    if (editDraft.lng && (isNaN(lng) || lng < -180 || lng > 180))  { setEditMsg('Longitude must be −180 to 180'); return; }
    if (!editDraft.projectName.trim()) { setEditMsg('Project name cannot be empty'); return; }
    setSavingEdit(true);
    setEditMsg('');
    try {
      const res = await fetch(CARBON_PROJECT_DETAIL(selectedProject.projectId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName:  editDraft.projectName.trim(),
          projectType:  editDraft.projectType,
          description:  editDraft.description,
          totalAcres:   editDraft.totalAcres ? parseFloat(editDraft.totalAcres) : 0,
          baselineDate: editDraft.baselineDate,
          location: {
            country: editDraft.country,
            region:  editDraft.region,
            city:    editDraft.city,
            gpsCenter: { lat: lat || 0, lng: lng || 0 },
            polygon: selectedProject.location.polygon ?? [],
          },
        }),
      });
      const d = await res.json();
      if (!res.ok) { setEditMsg(d.error || 'Save failed'); return; }
      setSelectedProject({ ...selectedProject, ...d.project });
      setEditingProject(false);
      setEditMsg('Project updated successfully.');
    } catch { setEditMsg('Network error — changes not saved'); }
    finally { setSavingEdit(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (view === 'create') {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <CreateProjectForm
          hero={hero}
          onCancel={() => setView('dashboard')}
          onCreated={(project) => {
            void fetchDashboard();
            openProject(project);
          }}
        />
      </div>
    );
  }

  if (view === 'project' && selectedProject) {
    const latestSnap = snapshots[0] || null;
    const latestMRV = mrvReports[0] || null;
    const pType = projectTypeInfo(selectedProject.projectType);

    return (
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setView('dashboard')}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{pType.icon} {pType.label}</p>
            <h2 className="text-base font-black text-white truncate">{selectedProject.projectName}</h2>
          </div>
          <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${STATUS_STYLE[selectedProject.status] || ''}`}>
            {selectedProject.status}
          </span>
        </div>

        <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">

          {/* Location card */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-teal-900 border border-white/10 p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-3">
              {[
                { label: 'Country', value: selectedProject.location.country },
                { label: 'Region', value: selectedProject.location.region || '—' },
                { label: 'Total Acres', value: selectedProject.totalAcres.toLocaleString() },
                { label: 'Baseline', value: selectedProject.baselineDate || '—' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm font-black text-white mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
            {/* GPS row + Edit Project button */}
            <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {selectedProject.location.gpsCenter.lat && selectedProject.location.gpsCenter.lat !== 0 ? (
                  <span className="text-xs font-mono text-emerald-300">
                    {selectedProject.location.gpsCenter.lat.toFixed(4)}, {selectedProject.location.gpsCenter.lng.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-xs text-amber-400 italic">No GPS set</span>
                )}
              </div>
              <button
                onClick={openProjectEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-600/40 text-emerald-300 text-xs font-bold transition shrink-0"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Project
              </button>
            </div>
            {editMsg && !editingProject && (
              <p className={`mt-2 text-xs font-semibold ${editMsg.includes('successfully') ? 'text-emerald-400' : 'text-rose-400'}`}>{editMsg}</p>
            )}
            {/* Full project edit form */}
            {editingProject && (
              <div className="mt-4 border-t border-white/10 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">Edit Project</p>
                  <button onClick={() => setEditingProject(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Name + type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">Project Name *</label>
                    <input type="text" value={editDraft.projectName}
                      onChange={e => setEditDraft(d => ({ ...d, projectName: e.target.value }))}
                      className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      placeholder="Project name" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">Type</label>
                    <select value={editDraft.projectType}
                      onChange={e => setEditDraft(d => ({ ...d, projectType: e.target.value }))}
                      className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                      {[
                        ['forest','🌳 Forest Protection'],['reforestation','🌱 Reforestation'],
                        ['mangrove','🌴 Mangrove'],['wetland','💧 Wetland'],['grassland','🌾 Grassland'],
                        ['peatland','🟫 Peatland'],['savanna','🌿 Savanna'],['agroforestry','🚜 Agroforestry'],
                        ['soil_carbon','🪱 Soil Carbon'],['blue_carbon','🌊 Blue Carbon'],
                        ['avoided_deforestation','🛡️ Avoided Deforestation'],
                      ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                {/* Description */}
                <div>
                  <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">Description</label>
                  <textarea rows={2} value={editDraft.description}
                    onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                    placeholder="Brief project description" />
                </div>
                {/* Acres + baseline date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">Total Acres</label>
                    <input type="number" min="0" step="0.1" value={editDraft.totalAcres}
                      onChange={e => setEditDraft(d => ({ ...d, totalAcres: e.target.value }))}
                      className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. 500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">Baseline Date</label>
                    <input type="date" value={editDraft.baselineDate}
                      onChange={e => setEditDraft(d => ({ ...d, baselineDate: e.target.value }))}
                      className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                {/* Location */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">Country</label>
                    <input type="text" value={editDraft.country}
                      onChange={e => setEditDraft(d => ({ ...d, country: e.target.value }))}
                      className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. Brazil" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">Region</label>
                    <input type="text" value={editDraft.region}
                      onChange={e => setEditDraft(d => ({ ...d, region: e.target.value }))}
                      className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. Amazonas" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">City</label>
                    <input type="text" value={editDraft.city}
                      onChange={e => setEditDraft(d => ({ ...d, city: e.target.value }))}
                      className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. Manaus" />
                  </div>
                </div>
                {/* GPS */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">GPS Latitude (−90 to 90)</label>
                    <input type="number" step="any" value={editDraft.lat}
                      onChange={e => setEditDraft(d => ({ ...d, lat: e.target.value }))}
                      className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. −3.4653" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">GPS Longitude (−180 to 180)</label>
                    <input type="number" step="any" value={editDraft.lng}
                      onChange={e => setEditDraft(d => ({ ...d, lng: e.target.value }))}
                      className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. −62.2159" />
                  </div>
                </div>
                {editMsg && <p className="text-xs text-rose-400">{editMsg}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={saveProjectEdit} disabled={savingEdit}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition disabled:opacity-50">
                    {savingEdit ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditingProject(false)}
                    className="px-4 py-2 rounded-xl border border-slate-600 text-slate-400 hover:text-slate-200 text-sm transition">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Satellite panel */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Satellite Monitoring</p>
                {latestSnap && (
                  <p className="text-xs text-slate-500 mt-0.5">Last scan: {latestSnap.captureDate}</p>
                )}
              </div>
              <button onClick={runSnapshot} disabled={runningSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold hover:bg-sky-500/30 transition-all disabled:opacity-50">
                {runningSnapshot ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Pull Snapshot
              </button>
            </div>

            {latestSnap ? (
              <div className="p-4 space-y-4">
                {/* Satellite imagery map */}
                <Suspense fallback={<div className="h-52 rounded-xl bg-slate-800 animate-pulse" />}>
                  <SnapshotMap
                    lat={selectedProject.location.gpsCenter.lat}
                    lng={selectedProject.location.gpsCenter.lng}
                    projectName={selectedProject.projectName}
                    totalAcres={selectedProject.totalAcres}
                    ndviScore={latestSnap.ndviScore}
                  />
                </Suspense>

                {/* NDVI metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'NDVI Score', value: latestSnap.ndviScore.toFixed(3), color: 'text-emerald-400', subtitle: 'vegetation index' },
                    { label: 'NDVI Change', value: (latestSnap.ndviChange >= 0 ? '+' : '') + latestSnap.ndviChange.toFixed(3), color: latestSnap.ndviChange >= 0 ? 'text-emerald-400' : 'text-rose-400', subtitle: 'vs. previous scan' },
                    { label: 'Veg Change', value: `${latestSnap.vegetationChangePercent > 0 ? '+' : ''}${latestSnap.vegetationChangePercent}%`, color: latestSnap.vegetationChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400', subtitle: 'vegetation area' },
                    { label: 'Cloud Cover', value: `${latestSnap.cloudCoverPercent}%`, color: 'text-slate-300', subtitle: 'at capture' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-slate-800 p-3 text-center">
                      <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</p>
                      <p className="text-[9px] text-slate-600">{s.subtitle}</p>
                    </div>
                  ))}
                </div>

                {/* Deforestation alert */}
                {latestSnap.deforestationAlert && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-900/30 border border-rose-500/40 p-3">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <p className="text-sm text-rose-300 font-bold">Deforestation alert detected — project escalated to review</p>
                  </div>
                )}

                {/* Land cover type */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-bold text-white">Land cover:</span>
                  {latestSnap.landCoverType.replace(/_/g, ' ')}
                  <span className="ml-auto text-slate-600">Provider: {latestSnap.provider}</span>
                </div>

                {/* NDVI bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">NDVI</span>
                    <span className="text-emerald-400 font-bold">{latestSnap.ndviScore.toFixed(3)}</span>
                  </div>
                  {scoreBar(latestSnap.ndviScore, 1)}
                </div>

                {/* AI Satellite Analyst */}
                <SatelliteAiInsight
                  domain="carbon"
                  data={{
                    ndviScore: latestSnap.ndviScore.toFixed(3),
                    ndviChange: (latestSnap.ndviChange >= 0 ? '+' : '') + latestSnap.ndviChange.toFixed(3),
                    vegetationChange: `${latestSnap.vegetationChangePercent >= 0 ? '+' : ''}${latestSnap.vegetationChangePercent}%`,
                    landCoverType: latestSnap.landCoverType.replace(/_/g, ' '),
                    cloudCoverAtCapture: `${latestSnap.cloudCoverPercent}%`,
                    deforestationAlert: latestSnap.deforestationAlert,
                    dataProvider: latestSnap.provider,
                    captureDate: latestSnap.captureDate,
                  }}
                  project={{
                    name: selectedProject.projectName,
                    type: selectedProject.projectType,
                    lat: selectedProject.location.gpsCenter.lat,
                    lng: selectedProject.location.gpsCenter.lng,
                  }}
                />

                {/* NASA GIBS multi-layer imagery viewer */}
                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-300">NASA GIBS Satellite Imagery</p>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      NDVI · SMAP · True Color · +15 layers
                    </span>
                  </div>
                  <GibsTileViewer
                    lat={selectedProject.location.gpsCenter.lat}
                    lng={selectedProject.location.gpsCenter.lng}
                    polygon={selectedProject.location.polygon}
                    projectName={selectedProject.projectName}
                    totalAcres={selectedProject.totalAcres}
                    defaultLayerId="MODIS_Terra_NDVI_8Day"
                    height={320}
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Show the project location even before first snapshot */}
                <Suspense fallback={<div className="h-52 rounded-xl bg-slate-800 animate-pulse" />}>
                  <SnapshotMap
                    lat={selectedProject.location.gpsCenter.lat}
                    lng={selectedProject.location.gpsCenter.lng}
                    projectName={selectedProject.projectName}
                    totalAcres={selectedProject.totalAcres}
                  />
                </Suspense>
                <p className="text-center text-slate-500 text-sm mb-4">
                  No NDVI data yet — click <span className="text-sky-400 font-bold">Pull Snapshot</span> to run baseline analysis
                </p>
                {/* Show GIBS true color before first snapshot */}
                <div className="border-t border-slate-800 pt-4">
                  <p className="text-xs font-semibold text-slate-300 mb-3">NASA GIBS Satellite Imagery</p>
                  <GibsTileViewer
                    lat={selectedProject.location.gpsCenter.lat}
                    lng={selectedProject.location.gpsCenter.lng}
                    polygon={selectedProject.location.polygon}
                    projectName={selectedProject.projectName}
                    totalAcres={selectedProject.totalAcres}
                    defaultLayerId="MODIS_Terra_CorrectedReflectance_TrueColor"
                    height={300}
                  />
                </div>
              </div>
            )}

            {/* Snapshot history */}
            {snapshots.length > 1 && (
              <div className="border-t border-slate-800 p-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Snapshot History</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {snapshots.slice(1).map((s) => (
                    <div key={s.snapshotId} className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500 w-20 shrink-0">{s.captureDate}</span>
                      <span className={`font-bold ${s.ndviChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        NDVI {s.ndviScore.toFixed(3)} ({s.ndviChange >= 0 ? '+' : ''}{s.ndviChange.toFixed(3)})
                      </span>
                      {s.deforestationAlert && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                      {s.isBaseline && <span className="text-sky-400 ml-auto">BASELINE</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* MRV Carbon Score panel */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">MRV Carbon Score</p>
              <button onClick={runMRV} disabled={runningMRV || !latestSnap}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/30 transition-all disabled:opacity-50">
                {runningMRV ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Run MRV Score
              </button>
            </div>

            {mrvMsg && (
              <div className="mx-4 mt-3 rounded-xl bg-emerald-900/20 border border-emerald-500/30 p-3 text-sm text-emerald-300">
                {mrvMsg}
              </div>
            )}

            {latestMRV ? (
              <div className="p-4 space-y-4">
                {/* Score display */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r="38" fill="none" stroke="#1e293b" strokeWidth="10" />
                        <circle cx="48" cy="48" r="38" fill="none"
                          stroke={latestMRV.carbonScore >= 70 ? '#10b981' : latestMRV.carbonScore >= 40 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="10"
                          strokeDasharray={`${(latestMRV.carbonScore / 100) * 238.76} 238.76`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-2xl font-black text-white">{latestMRV.carbonScore}</p>
                        <p className="text-[9px] text-slate-400">/ 100</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Carbon Score</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400">NDVI Improvement (×40)</span>
                        <span className="text-white font-bold">{(latestMRV.ndviImprovement * 40).toFixed(1)} pts</span>
                      </div>
                      {scoreBar(latestMRV.ndviImprovement)}
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400">Protected Area (×25)</span>
                        <span className="text-white font-bold">{(latestMRV.protectedAreaScore * 25).toFixed(1)} pts</span>
                      </div>
                      {scoreBar(latestMRV.protectedAreaScore)}
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400">No Deforestation (×20)</span>
                        <span className="text-white font-bold">{(latestMRV.noDeforestationScore * 20).toFixed(1)} pts</span>
                      </div>
                      {scoreBar(latestMRV.noDeforestationScore)}
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400">Validator Trust (×15)</span>
                        <span className="text-white font-bold">{(latestMRV.validatorTrustScore * 15).toFixed(1)} pts</span>
                      </div>
                      {scoreBar(latestMRV.validatorTrustScore)}
                    </div>
                  </div>
                </div>

                {/* Credit estimate */}
                <div className="flex items-center gap-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30 p-3">
                  <div>
                    <p className="text-2xl font-black text-emerald-400">{latestMRV.creditEstimateTons.toLocaleString()} tCO2e</p>
                    <p className="text-xs text-slate-400">Verified carbon credits</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className={`text-sm font-black uppercase ${RISK_STYLE[latestMRV.riskLevel]}`}>{latestMRV.riskLevel} risk</p>
                    <p className={`text-[10px] font-black px-2 py-0.5 rounded-full border inline-block mt-1
                      ${latestMRV.status === 'validated' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : latestMRV.status === 'rejected' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
                      {latestMRV.status}
                    </p>
                  </div>
                </div>

                {/* AI summary */}
                <div className="rounded-xl bg-slate-800 p-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">AI Analysis</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{latestMRV.aiSummary}</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                {latestSnap
                  ? 'Satellite data ready — click "Run MRV Score" to calculate your carbon score'
                  : 'Pull a satellite snapshot first, then run the MRV score'}
              </div>
            )}
          </div>

          {/* Blockchain ledger */}
          {projectTxs.length > 0 && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Blockchain Audit Log</p>
              <div className="space-y-2">
                {projectTxs.map((tx) => (
                  <div key={tx.txId}
                    className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0
                      ${tx.txType === 'issue' ? 'bg-emerald-500/20' : tx.txType === 'buy' ? 'bg-sky-500/20' : tx.txType === 'retire' ? 'bg-violet-500/20' : 'bg-slate-700'}`}>
                      {tx.txType === 'issue' ? '🪙' : tx.txType === 'buy' ? '🛒' : tx.txType === 'retire' ? '✅' : tx.txType === 'list' ? '🏪' : '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white capitalize">{tx.txType}</span>
                        {tx.amountTons > 0 && <span className="text-xs text-emerald-400">{tx.amountTons.toLocaleString()} tCO2e</span>}
                        {tx.priceUsd > 0 && <span className="text-xs text-amber-400">${tx.priceUsd.toLocaleString()}</span>}
                        <span className="ml-auto text-[10px] text-slate-500">{relTime(tx.ts)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{tx.note}</p>
                      <p className="text-[9px] font-mono text-slate-600 mt-0.5 truncate">{tx.blockchainHash}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'validator') {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setView('dashboard')}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Validator Portal</p>
            <h2 className="text-base font-black text-white">MRV Review Queue</h2>
          </div>
          <button onClick={fetchValidatorQueue}
            className="ml-auto p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
          {validatorQueue.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No reports awaiting review.</p>
              <button onClick={fetchValidatorQueue}
                className="mt-3 text-xs text-emerald-400 underline">Refresh queue</button>
            </div>
          )}

          {validatorQueue.map((item: any) => {
            const report: MRVReport = item;
            const proj: CarbonProject = item.project;
            const snap: SatelliteSnapshot = item.snapshot;
            const pType = projectTypeInfo(proj?.projectType || 'other');
            const isReviewing = reviewing === report.reportId;

            return (
              <div key={report.reportId}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-900/50">
                  <span className="text-2xl">{pType.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">{proj?.projectName || report.reportId}</p>
                    <p className="text-xs text-slate-400">{proj?.location?.country} · {proj?.totalAcres?.toLocaleString()} acres · {report.reportDate}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${RISK_STYLE[report.riskLevel] || ''} border-current bg-current/10`}>
                    {report.riskLevel} risk
                  </span>
                </div>

                {/* Satellite before/after */}
                <div className="grid grid-cols-2 gap-0 border-b border-slate-800">
                  {[
                    { label: 'BASELINE', ndvi: proj?.baselineNdvi ?? 0.3 },
                    { label: 'CURRENT', ndvi: snap?.ndviScore ?? report.ndviImprovement + (proj?.baselineNdvi ?? 0.3) },
                  ].map((s) => (
                    <div key={s.label} className="p-3 text-center border-r border-slate-800 last:border-r-0">
                      <div
                        className="h-20 rounded-xl mb-2 flex items-center justify-center text-3xl"
                        style={{ background: `linear-gradient(135deg, #052e16 0%, hsl(${s.ndvi * 140 + 60}, 70%, ${s.ndvi * 20 + 10}%) 100%)` }}
                      >
                        🛰️
                      </div>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                      <p className="text-sm font-black text-white">NDVI {s.ndvi.toFixed(3)}</p>
                    </div>
                  ))}
                </div>

                {/* Carbon score breakdown */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-black text-white">{report.carbonScore}</p>
                      <p className="text-[10px] text-slate-400">/ 100</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[
                        ['NDVI ×40', report.ndviImprovement * 40],
                        ['Protected ×25', report.protectedAreaScore * 25],
                        ['No-Deforest ×20', report.noDeforestationScore * 20],
                        ['Validator ×15', report.validatorTrustScore * 15],
                      ].map(([label, pts]) => (
                        <div key={label as string} className="flex items-center gap-2 text-[10px]">
                          <span className="text-slate-500 w-24 shrink-0">{label}</span>
                          {scoreBar(pts as number, 40, 'flex-1')}
                          <span className="text-white font-bold w-8 text-right">{(pts as number).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-emerald-400">{report.creditEstimateTons.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">tCO2e</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{report.aiSummary}</p>

                  {/* Review controls */}
                  {!isReviewing ? (
                    <button onClick={() => setReviewing(report.reportId)}
                      className="w-full py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-bold hover:bg-violet-500/30 transition-all">
                      <Eye className="w-4 h-4 inline mr-1.5" />
                      Review This Report
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3} placeholder="Validator notes — observations, evidence, concerns…"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500 transition-all resize-none" />
                      <div className="flex gap-3">
                        <button
                          onClick={() => submitReview(report.reportId, 'rejected')}
                          disabled={reviewingId === report.reportId}
                          className="flex-1 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm font-bold hover:bg-rose-500/30 transition-all disabled:opacity-50">
                          {reviewingId === report.reportId ? <Loader className="w-4 h-4 animate-spin inline" /> : '✗'} Reject
                        </button>
                        <button
                          onClick={() => submitReview(report.reportId, 'approved')}
                          disabled={reviewingId === report.reportId}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-50">
                          {reviewingId === report.reportId ? <Loader className="w-4 h-4 animate-spin inline" /> : '✓'} Approve & Issue Credits
                        </button>
                      </div>
                      <button onClick={() => setReviewing(null)}
                        className="w-full text-xs text-slate-500 hover:text-white transition-all">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Dashboard view ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">

      {/* Hero banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 px-5 pt-12 pb-6 overflow-hidden">
        <button onClick={onReturn}
          className="absolute top-4 left-4 p-2 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur border border-white/10 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-4 right-4 flex gap-2">
          {onGoToMarket && (
            <button onClick={onGoToMarket}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all">
              <Globe className="w-3.5 h-3.5" /> Carbon Market
            </button>
          )}
          <button onClick={() => { setView('validator'); void fetchValidatorQueue(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/30 transition-all">
            <ShieldCheck className="w-3.5 h-3.5" /> Validator
          </button>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400 mb-1">DPAL Carbon MRV Engine</p>
        <h1 className="text-2xl md:text-3xl font-black">Carbon Impact Platform</h1>
        <p className="text-sm text-slate-300 mt-1 max-w-md">
          Satellite-verified land monitoring · AI carbon scoring · Blockchain-issued credits · Global marketplace
        </p>

        {/* Platform stats */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          {[
            { label: 'Projects', value: stats.totalProjects || projects.length || '—' },
            { label: 'Approved', value: stats.approvedProjects || '—' },
            { label: 'tCO2e Issued', value: stats.totalCreditsTons > 0 ? stats.totalCreditsTons.toLocaleString() : '—' },
            { label: 'Listed', value: stats.listedCredits || marketCredits.length || '—' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-black/30 border border-white/10 p-2.5 text-center">
              <p className="text-lg font-black text-emerald-400">{s.value}</p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-800 shrink-0">
        {([
          { id: 'myprojects', label: `My Projects${projects.length ? ` (${projects.length})` : ''}` },
          { id: 'marketplace', label: `Marketplace${marketCredits.length ? ` (${marketCredits.length})` : ''}` },
          { id: 'ledger', label: 'Global Ledger' },
          { id: 'airquality', label: 'Air Quality Monitor' },
          { id: 'minerals', label: 'Mineral Mapping' },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 shrink-0
              ${activeTab === t.id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* My Projects tab */}
        {activeTab === 'myprojects' && (
          <div className="p-4 md:p-6 space-y-4">
            <button onClick={() => setView('create')}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Register New Carbon Project
            </button>

            {loading && (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader className="w-5 h-5 animate-spin mr-2" /> Loading…
              </div>
            )}

            {!loading && projects.length === 0 && (
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">How the MRV Engine Works</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { step: '1', icon: '📋', title: 'Register Project', desc: 'Submit land type, GPS boundary, and acreage' },
                    { step: '2', icon: '🛰️', title: 'Satellite Baseline', desc: 'AI pulls NDVI vegetation index for your land' },
                    { step: '3', icon: '🧮', title: 'MRV Carbon Score', desc: 'Monthly AI scoring across 4 dimensions (0–100)' },
                    { step: '4', icon: '✅', title: 'Validator Approval', desc: 'Trusted validator reviews and approves report' },
                    { step: '5', icon: '🪙', title: 'Credits Issued', desc: 'Verified tCO2e minted on DPAL blockchain ledger' },
                    { step: '6', icon: '🏪', title: 'List & Trade', desc: 'Credits appear in the Carbon Market for buyers' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black flex items-center justify-center shrink-0">{s.step}</div>
                      <div>
                        <p className="text-[11px] font-black text-white leading-tight">{s.icon} {s.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 text-center">Register your first project above to get started</p>
              </div>
            )}

            {projects.map((project) => {
              const pType = projectTypeInfo(project.projectType);
              return (
                <button key={project.projectId} onClick={() => openProject(project)}
                  className="w-full text-left rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-900/30 border border-emerald-500/20 flex items-center justify-center text-2xl shrink-0">
                      {pType.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-white">{project.projectName}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[project.status] || ''}`}>
                          {project.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {project.location.country}{project.location.region ? `, ${project.location.region}` : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-emerald-400 font-bold">{project.totalAcres.toLocaleString()} acres</span>
                        <span className="text-xs text-slate-500">{pType.label}</span>
                        <span className="text-xs text-amber-400 font-bold">{(project.totalAcres * (pType.rate || 1)).toLocaleString()} tCO2e/yr est.</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Marketplace tab */}
        {activeTab === 'marketplace' && (
          <div className="p-4 md:p-6 space-y-4">
            <div className="rounded-xl bg-emerald-900/20 border border-emerald-500/30 p-4 text-center">
              <p className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-1">DPAL Verified Carbon Impact Credits</p>
              <p className="text-xs text-slate-400">All credits verified by MRV Engine + validator review. Blockchain-anchored.</p>
            </div>

            {marketCredits.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No credits listed yet. Register and verify a project to list credits.</p>
              </div>
            )}

            {marketCredits.map((credit) => (
              <div key={credit.creditId}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{credit.projectName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{credit.creditId}</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                    Verified
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <div><p className="text-xs text-slate-500">Tonnes</p><p className="font-black text-white">{credit.creditAmountTons.toLocaleString()} tCO2e</p></div>
                  <div><p className="text-xs text-slate-500">Price</p><p className="font-black text-amber-400">${credit.pricePerTon}/t</p></div>
                  <div><p className="text-xs text-slate-500">Total</p><p className="font-black text-emerald-400">${(credit.creditAmountTons * credit.pricePerTon).toLocaleString()}</p></div>
                </div>
                <p className="text-[9px] font-mono text-slate-600 break-all">{credit.blockchainHash}</p>
                <button
                  onClick={async () => {
                    const res = await fetch(apiUrl(API_ROUTES.CARBON_MARKETPLACE_BUY), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ creditId: credit.creditId, buyerId: userId, buyerName: userName }),
                    });
                    if (res.ok) await fetchDashboard();
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-bold hover:bg-emerald-500/30 transition-all">
                  <Zap className="w-3.5 h-3.5 inline mr-1.5" />
                  Buy {credit.creditAmountTons} tCO2e — ${(credit.creditAmountTons * credit.pricePerTon).toLocaleString()}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Global Ledger tab */}
        {activeTab === 'ledger' && (
          <div className="p-4 md:p-6 space-y-2.5">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Recent Blockchain Transactions</p>
            {globalTxs.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                No blockchain transactions yet.
              </div>
            )}
            {globalTxs.map((tx) => (
              <div key={tx.txId}
                className="flex items-start gap-3 rounded-xl bg-slate-900 border border-slate-800 p-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0
                  ${tx.txType === 'issue' ? 'bg-emerald-500/20' : tx.txType === 'buy' ? 'bg-sky-500/20' : tx.txType === 'retire' ? 'bg-violet-500/20' : 'bg-slate-700'}`}>
                  {tx.txType === 'issue' ? '🪙' : tx.txType === 'buy' ? '🛒' : tx.txType === 'retire' ? '✅' : tx.txType === 'list' ? '🏪' : '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white capitalize">{tx.txType}</span>
                    {tx.amountTons > 0 && <span className="text-xs text-emerald-400">{tx.amountTons.toLocaleString()} tCO2e</span>}
                    {tx.priceUsd > 0 && <span className="text-xs text-amber-400">${tx.priceUsd.toLocaleString()}</span>}
                    <span className="ml-auto text-[10px] text-slate-500">{relTime(tx.ts)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{tx.note}</p>
                  <p className="text-[9px] font-mono text-slate-600 mt-0.5 truncate">{tx.blockchainHash}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Air Quality Monitor tab */}
        {activeTab === 'airquality' && (
          <div className="p-4 md:p-6 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
              <div className="rounded-3xl border border-slate-700 p-5 bg-slate-900/80">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="w-10 h-10 text-emerald-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Carbon Gas & Air Quality Monitoring</h3>
                    <p className="text-sm text-slate-400">Track CO2, CH4, and other greenhouse gases using NASA OCO-2/3 and TROPOMI data</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scan latitude</label>
                    <input
                      value={scanLocation.lat.toFixed(5)}
                      onChange={(e) => {
                        const lat = parseFloat(e.target.value);
                        if (!Number.isNaN(lat)) setScanLocation((prev) => ({ ...prev, lat }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scan longitude</label>
                    <input
                      value={scanLocation.lng.toFixed(5)}
                      onChange={(e) => {
                        const lng = parseFloat(e.target.value);
                        if (!Number.isNaN(lng)) setScanLocation((prev) => ({ ...prev, lng }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Area radius (km)</label>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={scanRadius}
                      onChange={(e) => setScanRadius(Number(e.target.value))}
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">{scanRadius} km radius around the scan center.</p>
                  </div>
                  <button
                    onClick={fetchAirQuality}
                    disabled={loadingAirQuality}
                    className="w-full mt-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-sm font-bold rounded-2xl transition-colors"
                  >
                    {loadingAirQuality ? 'Loading...' : 'Scan selected area'}
                  </button>
                  <div className="rounded-2xl border border-slate-700 p-3 bg-slate-950 text-sm text-slate-400">
                    <p className="font-semibold text-slate-200">Tip</p>
                    <p className="mt-1">Click the map to reposition the scan center, or enter coordinates directly.</p>
                  </div>
                </div>
              </div>
              <ScanAreaSelector
                lat={scanLocation.lat}
                lng={scanLocation.lng}
                radiusKm={scanRadius}
                onSelectLocation={(location) => setScanLocation(location)}
              />
            </div>
            {airQualityError && (
              <div className="rounded-xl bg-rose-900/30 border border-rose-500/40 p-3 text-sm text-rose-300 mb-4">
                {airQualityError}
              </div>
            )}
            {airQualityData?.message && (
              <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-sm text-slate-300 mb-4">
                <p>{airQualityData.message}</p>
                {airQualityData.source && <p className="text-xs text-slate-500 mt-1">{airQualityData.source}</p>}
              </div>
            )}
            {airQualityData && !hasVerifiedAirQuality && (
              <div className="rounded-xl bg-amber-950/30 border border-amber-500/40 p-4 text-sm text-amber-100">
                <p className="font-bold text-amber-300">Reading status: air quality values not verified</p>
                <p className="mt-1 text-slate-300">
                  DPAL is hiding any numeric CO2, methane, or NO2 values until the response is confirmed from our real satellite-product integration. Metadata alone, model output, or legacy mock payloads are not treated as measurements.
                </p>
                {hiddenLegacyAirValues && Object.values(hiddenLegacyAirValues).some((value) => value !== null) && (
                  <p className="mt-2 text-xs text-amber-200">
                    Unverified legacy values were received but are not shown as real measurements.
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'CO2 Concentration', value: hasVerifiedCo2 ? `${airQualityData.co2ppm.toFixed(1)} ppm` : 'Not verified', icon: '🌫️', desc: 'Requires verified OCO-2/OCO-3 product read' },
                { label: 'Methane (CH4)', value: hasVerifiedCh4 ? `${airQualityData.ch4ppb.toFixed(0)} ppb` : 'Not verified', icon: '💨', desc: 'Requires verified methane product integration' },
                { label: 'NO2 Levels', value: hasVerifiedNo2 ? `${airQualityData.no2.toFixed(2)} DU` : 'Not verified', icon: '🌬️', desc: 'Requires verified NO2 product integration' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl bg-black/30 border border-white/10 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{metric.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{metric.label}</p>
                      <p className="text-xs text-slate-500">{metric.desc}</p>
                    </div>
                  </div>
                  <p className="text-xl font-black text-emerald-400">{metric.value}</p>
                </div>
              ))}
            </div>
            <ImpactAidChat
              mode="air"
              data={airQualityAiContext}
              location={scanLocation}
              radiusKm={scanRadius}
              project={selectedProject}
            />
          </div>
        )}

        {/* Mineral Mapping tab */}
        {activeTab === 'minerals' && (
          <div className="p-4 md:p-6 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
              <div className="rounded-3xl border border-slate-700 p-5 bg-slate-900/80">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-10 h-10 text-amber-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Mineral Dust & Surface Mapping</h3>
                    <p className="text-sm text-slate-400">Monitor mineral composition and dust sources using NASA EMIT and ASTER data</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scan latitude</label>
                    <input
                      value={scanLocation.lat.toFixed(5)}
                      onChange={(e) => {
                        const lat = parseFloat(e.target.value);
                        if (!Number.isNaN(lat)) setScanLocation((prev) => ({ ...prev, lat }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scan longitude</label>
                    <input
                      value={scanLocation.lng.toFixed(5)}
                      onChange={(e) => {
                        const lng = parseFloat(e.target.value);
                        if (!Number.isNaN(lng)) setScanLocation((prev) => ({ ...prev, lng }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Area radius (km)</label>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={scanRadius}
                      onChange={(e) => setScanRadius(Number(e.target.value))}
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">{scanRadius} km radius around the scan center.</p>
                  </div>
                  <button
                    onClick={fetchMinerals}
                    disabled={loadingMinerals}
                    className="w-full mt-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white text-sm font-bold rounded-2xl transition-colors"
                  >
                    {loadingMinerals ? 'Scanning...' : 'Scan selected area'}
                  </button>
                  <div className="rounded-2xl border border-slate-700 p-3 bg-slate-950 text-sm text-slate-400">
                    <p className="font-semibold text-slate-200">Tip</p>
                    <p className="mt-1">Use the map to place your scan center on the area of interest for more targeted results.</p>
                  </div>
                </div>
              </div>
              <ScanAreaSelector
                lat={scanLocation.lat}
                lng={scanLocation.lng}
                radiusKm={scanRadius}
                onSelectLocation={(location) => setScanLocation(location)}
              />
            </div>
            {mineralError && (
              <div className="rounded-xl bg-rose-900/30 border border-rose-500/40 p-3 text-sm text-rose-300 mb-4">
                {mineralError}
              </div>
            )}
            {mineralData?.message && (
              <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-sm text-slate-300 mb-4">
                <p>{mineralData.message}</p>
                {mineralData.source && <p className="text-xs text-slate-500 mt-1">{mineralData.source}</p>}
              </div>
            )}
            {mineralData && !hasVerifiedMineralComposition && (
              <div className="rounded-xl bg-amber-950/30 border border-amber-500/40 p-4 text-sm text-amber-100">
                <p className="font-bold text-amber-300">Reading status: mineral composition not verified</p>
                <p className="mt-1 text-slate-300">
                  This scan has not returned a confirmed EMIT/ASTER spectral mineral product. DPAL is hiding any legacy mineral names from the metric cards until the backend confirms a real mineral-composition read.
                </p>
                {hiddenLegacyMinerals.length > 0 && (
                  <p className="mt-2 text-xs text-amber-200">
                    Unverified legacy values received but not shown as real: {hiddenLegacyMinerals.join(', ')}.
                  </p>
                )}
                {typeof mineralData.dustArea === 'number' && mineralData.dustArea > 0 && (
                  <p className="mt-2 text-xs text-slate-400">
                    The backend may know an EMIT scene footprint, but that is not the same thing as a verified dust-source area.
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Mineral Types', value: hasVerifiedMineralComposition ? `${mineralNames.length} verified` : 'Not verified', icon: '⛰️', desc: hasVerifiedMineralComposition ? mineralNames.join(', ') : 'Needs spectral product confirmation' },
                { label: 'Dust Source Areas', value: hasVerifiedDustSource ? `${mineralData.dustArea.toFixed(0)} km²` : 'Not verified', icon: '🌪️', desc: 'Dust-source area requires derived mineral/dust analysis' },
                { label: 'Primary Mineral', value: hasVerifiedMineralComposition ? mineralNames[0] : 'Not verified', icon: '🧪', desc: 'Most abundant confirmed mineral' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl bg-black/30 border border-white/10 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{metric.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{metric.label}</p>
                      <p className="text-xs text-slate-500">{metric.desc}</p>
                    </div>
                  </div>
                  <p className="text-xl font-black text-amber-400">{metric.value}</p>
                </div>
              ))}
            </div>
            <ImpactAidChat
              mode="minerals"
              data={mineralAiContext}
              location={scanLocation}
              radiusKm={scanRadius}
              project={selectedProject}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CarbonMRVDashboard;
