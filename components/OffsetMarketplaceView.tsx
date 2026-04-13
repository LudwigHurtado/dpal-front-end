import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import {
  ArrowLeft, MapPin, CheckCircle, Search, Loader, Sparkles,
  Users, Zap, Award, ShieldCheck, Activity, Globe, Plus, X,
  ChevronLeft, ChevronRight, Map, Camera,
} from './icons';
import { API_ROUTES, apiUrl, OFFSETS_PORTFOLIO, OFFSETS_COALITION, OFFSETS_MY_PARCELS } from '../constants';
import { isAiEnabled } from '../services/geminiService';
import type { Hero } from '../types';

const OffsetWorldMap = lazy(() => import('./OffsetWorldMap'));

const SUSTAINABILITY_COLLAGE = '/main-screen/Offset-Marketplace/hero-dpal-sustainability-collage.png';

// ── Ecosystem metadata ─────────────────────────────────────────────────────────

const ECOSYSTEM_META: Record<string, {
  label: string;
  icon: string;
  color: string;           // hex for map markers + badges
  gradient: string;        // tailwind gradient for card bg
  seqRate: number;         // tCO2e / acre / year
  description: string;
}> = {
  tropical_forest:  { label: 'Tropical Forest',   icon: '🌳', color: '#22c55e', gradient: 'from-green-950 to-emerald-800',    seqRate: 3.5, description: 'Dense equatorial forest with highest biodiversity per acre on Earth.' },
  boreal_forest:    { label: 'Boreal Forest',      icon: '🌲', color: '#16a34a', gradient: 'from-slate-900 to-green-900',       seqRate: 1.8, description: 'Northern conifer forests storing 30% of all land-based carbon.' },
  temperate_forest: { label: 'Temperate Forest',   icon: '🍃', color: '#4ade80', gradient: 'from-green-900 to-lime-800',        seqRate: 2.2, description: 'Mixed broadleaf and conifer forests with seasonal carbon cycles.' },
  mangrove:         { label: 'Mangrove Coast',      icon: '🌊', color: '#06b6d4', gradient: 'from-teal-950 to-cyan-800',        seqRate: 5.5, description: 'Coastal forests sequestering 5× more carbon per acre than tropical forest.' },
  peatland:         { label: 'Peatland',            icon: '💧', color: '#0ea5e9', gradient: 'from-sky-950 to-blue-800',         seqRate: 4.0, description: 'Waterlogged ecosystems accumulating carbon for thousands of years.' },
  savanna:          { label: 'Savanna',             icon: '🌾', color: '#f59e0b', gradient: 'from-amber-950 to-yellow-800',     seqRate: 0.8, description: 'Tropical grasslands with seasonal fire cycles and deep-rooted grasses.' },
  grassland:        { label: 'Grassland',           icon: '🏕️',  color: '#84cc16', gradient: 'from-lime-950 to-green-700',      seqRate: 0.6, description: 'Prairie and steppe ecosystems sequestering carbon in deep soil roots.' },
  cloud_forest:     { label: 'Cloud Forest',        icon: '☁️',  color: '#818cf8', gradient: 'from-indigo-950 to-violet-800',   seqRate: 3.0, description: 'High-altitude forests perpetually shrouded in cloud, capturing atmospheric moisture.' },
  tidal_marsh:      { label: 'Tidal Marsh',         icon: '🦢', color: '#14b8a6', gradient: 'from-teal-950 to-emerald-700',    seqRate: 4.5, description: 'Blue carbon powerhouse — estuarine marshes with massive below-ground carbon stores.' },
  desert:           { label: 'Desert Restoration',  icon: '🏜️', color: '#fb923c', gradient: 'from-orange-950 to-amber-700',    seqRate: 0.3, description: 'Dryland scrub restoration building soil biology in arid regions.' },
  wetland:          { label: 'Wetland',             icon: '🌿', color: '#34d399', gradient: 'from-emerald-950 to-teal-700',    seqRate: 3.8, description: 'Freshwater wetlands with high carbon density in saturated soils.' },
};

const COUNTRIES = [
  'USA','Brazil','Colombia','Argentina','D.R. Congo','Kenya','Senegal',
  'Malaysia','Bangladesh','Finland','Australia','Canada','India',
  'Indonesia','Peru','Mexico','Tanzania','Mozambique','Madagascar','Vietnam',
  'Papua New Guinea','Ecuador','Bolivia','Paraguay','Chile','Norway','Sweden',
  'Russia','China','Japan','Philippines','Myanmar','Cambodia','Ghana','Nigeria',
];

// ── Types ──────────────────────────────────────────────────────────────────────

type ParcelStatus = 'Verified' | 'In Progress' | 'Needs Review';

interface OffsetProject {
  _id: string;
  projectId: string;
  name: string;
  location: string;
  country: string;
  lat: number;
  lng: number;
  ecosystemType: string;
  address: string;
  imageUrl: string;
  totalUnits: number;
  availableUnits: number;
  retiredUnits: number;
  pricePerTonne: number;
  status: ParcelStatus;
  mission: string;
  description: string;
  credibilityScore: number;
  credibilityNote: string;
  groupTarget: number;
  groupFunded: number;
  coalitionCount: number;
  priceHistory: { date: number; priceUsd: number }[];
}

interface Purchase {
  purchaseId: string;
  projectId: string;
  projectName: string;
  units: number;
  pricePerTonne: number;
  totalUsd: number;
  retired: boolean;
  retiredAt?: number;
  certificateHash?: string;
  createdAt: string;
}

interface FeedItem {
  type: 'purchase' | 'join';
  id: string;
  userName: string;
  projectName?: string;
  projectId: string;
  units?: number;
  retired?: boolean;
  role?: string;
  ts: number;
}

interface MyParcel {
  parcelId: string;
  country: string;
  region: string;
  totalAcres: number;
  ecosystemType: string;
  sectorCount: number;
  creditEstimatePerYear: number;
  status: string;
  submittedAt: number;
}

interface RegisterForm {
  ownerName: string;
  ownerEmail: string;
  country: string;
  region: string;
  totalAcres: string;
  ecosystemType: string;
  lat: string;
  lng: string;
  sectorSizeAcres: string;
  description: string;
}

interface OffsetMarketplaceViewProps {
  onReturn: () => void;
  hero?: Hero;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const statusColor: Record<ParcelStatus, string> = {
  Verified:       'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'In Progress':  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Needs Review': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const parcelStatusColor: Record<string, string> = {
  pending:       'bg-slate-700/40 text-slate-300 border-slate-600',
  under_review:  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved:      'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  active:        'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  suspended:     'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

function relTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function ecoMeta(type: string) {
  return ECOSYSTEM_META[type] || { label: type, icon: '🌱', color: '#34d399', gradient: 'from-slate-900 to-slate-800', seqRate: 1, description: '' };
}

// ── Mini price sparkline ───────────────────────────────────────────────────────

function Sparkline({ data }: { data: { date: number; priceUsd: number }[] }) {
  if (!data.length) return null;
  const prices = data.map((d) => d.priceUsd);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 100, H = 30;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1 || 1)) * W;
    const y = H - ((p - min) / range) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const trend = prices[prices.length - 1] >= prices[0];
  return (
    <svg width={W} height={H} className="shrink-0">
      <polyline points={pts} fill="none" stroke={trend ? '#34d399' : '#f87171'} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

// ── Ecosystem badge ────────────────────────────────────────────────────────────

function EcoBadge({ type, size = 'sm' }: { type: string; size?: 'xs' | 'sm' }) {
  const m = ecoMeta(type);
  const cls = size === 'xs'
    ? 'text-[9px] px-1.5 py-0.5'
    : 'text-[10px] px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold border ${cls}`}
      style={{ color: m.color, borderColor: m.color + '44', background: m.color + '18' }}
    >
      {m.icon} {m.label}
    </span>
  );
}

// ── Register Land Modal ────────────────────────────────────────────────────────

interface RegisterModalProps {
  hero?: Hero;
  onClose: () => void;
  onSuccess: (parcelId: string, credits: number) => void;
}

const BLANK_FORM: RegisterForm = {
  ownerName: '', ownerEmail: '', country: '', region: '',
  totalAcres: '', ecosystemType: '', lat: '', lng: '',
  sectorSizeAcres: '100', description: '',
};

function RegisterModal({ hero, onClose, onSuccess }: RegisterModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RegisterForm>({
    ...BLANK_FORM,
    ownerName: hero?.heroName || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof RegisterForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const meta = ecoMeta(form.ecosystemType);
  const acres = parseFloat(form.totalAcres) || 0;
  const sectorSize = parseFloat(form.sectorSizeAcres) || 100;
  const sectorCount = acres > 0 ? Math.ceil(acres / sectorSize) : 0;
  const creditsPerYear = acres > 0 ? Math.round(acres * (meta.seqRate || 1)) : 0;

  const canNext: Record<number, boolean> = {
    1: !!form.ownerName && !!form.country && acres > 0 && !!form.ecosystemType,
    2: !!form.lat && !!form.lng,
    3: true,
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(apiUrl(API_ROUTES.OFFSETS_PARCELS_REGISTER), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          heroId: hero?.id || '',
          country: form.country,
          region: form.region,
          totalAcres: Number(form.totalAcres),
          ecosystemType: form.ecosystemType,
          lat: Number(form.lat),
          lng: Number(form.lng),
          sectorSizeAcres: Number(form.sectorSizeAcres) || 100,
          description: form.description,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Submission failed'); return; }
      onSuccess(d.parcel?.parcelId || '', d.creditEstimatePerYear || creditsPerYear);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">DPAL Green Registry</p>
            <h3 className="text-lg font-black text-white">Register Your Land</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-2 shrink-0">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all
                ${s < step ? 'bg-emerald-500 text-black' : s === step ? 'bg-emerald-500/30 border-2 border-emerald-500 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                {s < step ? '✓' : s}
              </div>
              {s < 4 && <div className={`flex-1 h-0.5 w-8 rounded ${s < step ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-slate-400">
            {['Land Info', 'Location', 'Description', 'Review'][step - 1]}
          </span>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Step 1: Land basics */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Your Name *</label>
                  <input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                    placeholder="Full name" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Email</label>
                  <input value={form.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)}
                    type="email"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                    placeholder="contact@example.com" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Country *</label>
                  <select value={form.country} onChange={(e) => set('country', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all">
                    <option value="">Select…</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Region / State</label>
                  <input value={form.region} onChange={(e) => set('region', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g. Amazonas" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Total Acres *</label>
                  <input value={form.totalAcres} onChange={(e) => set('totalAcres', e.target.value)}
                    type="number" min="1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g. 500000" />
                </div>
              </div>

              {/* Ecosystem type selector */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Ecosystem Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ECOSYSTEM_META).map(([key, m]) => (
                    <button
                      key={key}
                      onClick={() => set('ecosystemType', key)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all
                        ${form.ecosystemType === key
                          ? 'border-emerald-500 bg-emerald-900/30'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-xs font-bold text-white leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live preview */}
              {form.ecosystemType && acres > 0 && (
                <div className={`rounded-2xl bg-gradient-to-br ${meta.gradient} border border-white/10 p-4`}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: meta.color }}>Preliminary Estimate</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xl font-black text-white">{acres.toLocaleString()}</p>
                      <p className="text-[10px] text-white/60">Acres</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-white">{sectorCount.toLocaleString()}</p>
                      <p className="text-[10px] text-white/60">Sectors</p>
                    </div>
                    <div>
                      <p className="text-xl font-black" style={{ color: meta.color }}>{creditsPerYear.toLocaleString()}</p>
                      <p className="text-[10px] text-white/60">tCO2e/yr</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/50 mt-2 text-center">Based on {meta.seqRate} tCO2e/acre/year for {meta.label}</p>
                </div>
              )}
            </>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <>
              <p className="text-sm text-slate-300">Enter the GPS center-point of your land. You can find coordinates using Google Maps (right-click → coordinates).</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Latitude *</label>
                  <input value={form.lat} onChange={(e) => set('lat', e.target.value)}
                    type="number" step="0.0001" min="-90" max="90"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g. -3.465" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Longitude *</label>
                  <input value={form.lng} onChange={(e) => set('lng', e.target.value)}
                    type="number" step="0.0001" min="-180" max="180"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g. -62.21" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Sector Size (acres)</label>
                <input value={form.sectorSizeAcres} onChange={(e) => set('sectorSizeAcres', e.target.value)}
                  type="number" min="10"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                  placeholder="100" />
                <p className="text-xs text-slate-500 mt-1.5">Each sector becomes a tradeable carbon credit lot. Default: 100 acres per sector.</p>
              </div>

              {/* Sector preview */}
              {acres > 0 && (
                <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sector Breakdown Preview</p>
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {Array.from({ length: Math.min(sectorCount, 32) }).map((_, i) => (
                      <div key={i} className={`h-6 rounded text-[8px] flex items-center justify-center font-bold
                        ${i < 8 ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-slate-700/60 text-slate-500'}`}>
                        {i < 8 ? 'S' : '·'}
                      </div>
                    ))}
                    {sectorCount > 32 && (
                      <div className="col-span-4 text-center text-xs text-slate-500 pt-1">
                        +{(sectorCount - 32).toLocaleString()} more sectors
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-300 font-bold">{sectorCount.toLocaleString()} total sectors</span>
                    <span className="text-slate-400">{sectorSize} acres each</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 3: Description */}
          {step === 3 && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Land Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={5}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all resize-none"
                  placeholder="Describe your land — current vegetation, conservation history, water features, existing wildlife…"
                />
              </div>
              <div className="rounded-2xl bg-amber-900/20 border border-amber-500/30 p-4 space-y-2">
                <p className="text-xs font-black text-amber-300 uppercase tracking-wider">Verification Process</p>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {[
                    'DPAL team reviews your submission within 5 business days',
                    'Satellite imagery analysis confirms land type and acreage',
                    'Community validators may request a field visit',
                    'Approved parcels enter the Green Registry and begin earning credits',
                    'Annual re-verification required to maintain active status',
                  ].map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-3">
              <div className={`rounded-2xl bg-gradient-to-br ${meta.gradient} border border-white/10 p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Registration Summary</p>
                    <p className="text-lg font-black text-white">{form.ownerName}'s {meta.label}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ['Country', form.country],
                    ['Region', form.region || '—'],
                    ['Total Acres', Number(form.totalAcres).toLocaleString()],
                    ['Ecosystem', meta.label],
                    ['GPS', `${Number(form.lat).toFixed(4)}, ${Number(form.lng).toFixed(4)}`],
                    ['Sector Size', `${form.sectorSizeAcres} ac`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-white/50 text-[10px] uppercase tracking-wider">{k}</p>
                      <p className="text-white font-bold text-sm">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credit projection */}
              <div className="rounded-2xl bg-emerald-900/20 border border-emerald-500/30 p-4">
                <p className="text-xs font-black text-emerald-300 uppercase tracking-wider mb-3">Projected Impact</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-black text-emerald-400">{sectorCount.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Sectors</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-emerald-400">{creditsPerYear.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">tCO2e/yr est.</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-emerald-400">${(creditsPerYear * 12).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Revenue/yr est.</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-900/30 border border-rose-500/40 p-3 text-sm text-rose-300">{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center gap-3 p-5 border-t border-slate-800 shrink-0">
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-all">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext[step]}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-black transition-all disabled:opacity-50"
            >
              {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Submitting…</> : <><CheckCircle className="w-4 h-4" /> Submit Registration</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const OffsetMarketplaceView: React.FC<OffsetMarketplaceViewProps> = ({ onReturn, hero }) => {
  // Data state
  const [projects, setProjects] = useState<OffsetProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<Purchase[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [myParcels, setMyParcels] = useState<MyParcel[]>([]);

  // UI state
  const [query, setQuery] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio' | 'feed' | 'register'>('market');
  const [showMap, setShowMap] = useState(false);

  // Buy flow
  const [buyQty, setBuyQty] = useState(1);
  const [buyGroup, setBuyGroup] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  // Coalition
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  // Retire
  const [retiringId, setRetiringId] = useState<string | null>(null);

  // AI score
  const [scoringId, setScoringId] = useState<string | null>(null);

  // Verify
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyDone, setVerifyDone] = useState(false);

  // Register modal
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<{ parcelId: string; credits: number } | null>(null);

  const userId = hero?.id || 'anonymous';
  const userName = hero?.heroName || 'Anonymous';

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, feedRes] = await Promise.all([
        fetch(apiUrl(API_ROUTES.OFFSETS_LIST)),
        fetch(apiUrl(API_ROUTES.OFFSETS_ACTIVITY)),
      ]);
      if (projRes.ok) {
        const d = await projRes.json();
        const list: OffsetProject[] = d.projects || [];
        setProjects(list);
        if (list.length && !activeProjectId) setActiveProjectId(list[0].projectId);
      }
      if (feedRes.ok) {
        const d = await feedRes.json();
        setFeed(d.feed || []);
      }
    } catch {
      // server unavailable
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  const fetchPortfolio = useCallback(async () => {
    if (userId === 'anonymous') return;
    try {
      const res = await fetch(OFFSETS_PORTFOLIO(userId));
      if (res.ok) {
        const d = await res.json();
        setPortfolio(d.purchases || []);
      }
    } catch { /* silent */ }
  }, [userId]);

  const fetchMyParcels = useCallback(async () => {
    if (userId === 'anonymous') return;
    try {
      const res = await fetch(OFFSETS_MY_PARCELS(userId));
      if (res.ok) {
        const d = await res.json();
        setMyParcels(d.parcels || []);
      }
    } catch { /* silent */ }
  }, [userId]);

  useEffect(() => { void fetchAll(); }, []);
  useEffect(() => { void fetchPortfolio(); }, [userId]);
  useEffect(() => { void fetchMyParcels(); }, [userId]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      `${p.name} ${p.projectId} ${p.location} ${p.mission} ${p.status} ${p.country} ${p.ecosystemType}`.toLowerCase().includes(q)
    );
  }, [projects, query]);

  const activeProject = useMemo(
    () => projects.find((p) => p.projectId === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const networkTotals = useMemo(() => ({
    projects: projects.length,
    countries: new Set(projects.map((p) => p.country).filter(Boolean)).size,
    units: projects.reduce((s, p) => s + p.availableUnits, 0),
    retired: projects.reduce((s, p) => s + p.retiredUnits, 0),
  }), [projects]);

  const portfolioTotals = useMemo(() => ({
    total: portfolio.reduce((s, p) => s + p.units, 0),
    retired: portfolio.filter((p) => p.retired).reduce((s, p) => s + p.units, 0),
    active: portfolio.filter((p) => !p.retired).reduce((s, p) => s + p.units, 0),
  }), [portfolio]);

  // Map project data
  const mapProjects = useMemo(() =>
    projects
      .filter((p) => p.lat && p.lng)
      .map((p) => ({
        projectId: p.projectId,
        name: p.name,
        location: p.location,
        country: p.country || '',
        lat: p.lat,
        lng: p.lng,
        ecosystemType: p.ecosystemType || '',
        availableUnits: p.availableUnits,
        pricePerTonne: p.pricePerTonne,
        status: p.status,
        ecosystemColor: ecoMeta(p.ecosystemType).color,
      })),
  [projects]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleBuy = async () => {
    if (!activeProject || buyQty <= 0) return;
    setBuying(true);
    setBuyError(null);
    setBuySuccess(null);
    try {
      const res = await fetch(apiUrl(API_ROUTES.OFFSETS_BUY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.projectId,
          userId, userName,
          units: buyQty,
          coinsSpent: buyQty * 10,
          isGroupPurchase: buyGroup,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setBuyError(d.error || 'Purchase failed'); return; }
      setBuySuccess(`Purchased ${buyQty} tCO2e from ${activeProject.name}`);
      await Promise.all([fetchAll(), fetchPortfolio()]);
    } catch { setBuyError('Network error. Try again.'); }
    finally { setBuying(false); }
  };

  const handleJoin = async (projectId: string) => {
    setJoiningId(projectId);
    try {
      const res = await fetch(apiUrl(API_ROUTES.OFFSETS_JOIN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId, userName }),
      });
      if (res.ok) {
        setJoinedIds((prev) => new Set([...prev, projectId]));
        await fetchAll();
      }
    } catch { /* silent */ }
    finally { setJoiningId(null); }
  };

  const handleRetire = async (purchase: Purchase) => {
    setRetiringId(purchase.purchaseId);
    try {
      const res = await fetch(apiUrl(API_ROUTES.OFFSETS_RETIRE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: purchase.purchaseId, userId }),
      });
      if (res.ok) await fetchPortfolio();
    } catch { /* silent */ }
    finally { setRetiringId(null); }
  };

  const handleAiScore = async (project: OffsetProject) => {
    if (!isAiEnabled()) return;
    setScoringId(project.projectId);
    try {
      const { runGeminiGenerate } = await import('../services/geminiService');
      const prompt = `You are a carbon credit auditor. Rate this project's credibility from 0-100 and give a one-sentence note.
Project: ${project.name}
Location: ${project.location}
Mission: ${project.mission}
Description: ${project.description}
Units: ${project.totalUnits} tCO2e
Respond ONLY with JSON: {"score": number, "note": "string"}`;
      const text = await runGeminiGenerate(prompt);
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      if (parsed.score != null) {
        setProjects((prev) => prev.map((p) =>
          p.projectId === project.projectId
            ? { ...p, credibilityScore: Number(parsed.score), credibilityNote: String(parsed.note || '') }
            : p
        ));
      }
    } catch { /* silent */ }
    finally { setScoringId(null); }
  };

  const handleVerify = async () => {
    if (!activeProject) return;
    setVerifying(true);
    try {
      await fetch(apiUrl(API_ROUTES.OFFSETS_VERIFY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.projectId, userId, userName,
          summary: verifyNotes, proofImageUrls: [],
        }),
      });
      setVerifyDone(true);
      setVerifyNotes('');
    } catch { /* silent */ }
    finally { setVerifying(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white font-sans">

      {/* Hero banner */}
      <div className="relative h-44 md:h-56 overflow-hidden shrink-0">
        <img src={SUSTAINABILITY_COLLAGE} alt="Carbon Market" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8">
          <button onClick={onReturn}
            className="absolute top-4 left-4 p-2 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400 mb-1">DPAL Green Network</p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Carbon Credit Market</h1>
          <p className="text-sm text-slate-300 mt-1">Buy, retire, and verify real carbon offsets. Register your land. Join coalitions.</p>
        </div>
      </div>

      {/* Network stats */}
      <div className="grid grid-cols-4 gap-px bg-slate-800/50 border-y border-slate-800">
        {[
          { label: 'Projects', value: networkTotals.projects },
          { label: 'Countries', value: networkTotals.countries },
          { label: 'tCO2e Available', value: networkTotals.units.toLocaleString() },
          { label: 'tCO2e Retired', value: networkTotals.retired.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="bg-slate-950 py-3 px-2 text-center">
            <p className="text-lg font-black text-emerald-400">{s.value}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
        {([
          { id: 'market',    label: 'Market' },
          { id: 'portfolio', label: portfolioTotals.total ? `My Credits (${portfolioTotals.total})` : 'My Credits' },
          { id: 'feed',      label: 'Impact Feed' },
          { id: 'register',  label: '+ Register Land' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 shrink-0
              ${activeTab === t.id
                ? t.id === 'register' ? 'border-emerald-500 text-emerald-400' : 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MARKET TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'market' && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar: search + map toggle */}
          <div className="flex items-center gap-2 p-3 border-b border-slate-800 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, country, ecosystem…"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <button
              onClick={() => setShowMap((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all
                ${showMap ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{showMap ? 'Hide' : 'World'} Map</span>
            </button>
          </div>

          {/* World map panel */}
          {showMap && (
            <div className="h-56 md:h-72 shrink-0 border-b border-slate-800">
              <Suspense fallback={<div className="h-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500 text-sm"><Globe className="w-5 h-5 mr-2 animate-spin" />Loading map…</div>}>
                <OffsetWorldMap
                  projects={mapProjects}
                  selectedId={activeProjectId}
                  onSelect={(id) => { setActiveProjectId(id); setShowMap(false); }}
                />
              </Suspense>
            </div>
          )}

          {/* Split: list + detail */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

            {/* Left: project list */}
            <div className="lg:w-[380px] shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader className="w-5 h-5 animate-spin mr-2" /> Loading global projects…
                  </div>
                ) : visible.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No projects match your search.</div>
                ) : visible.map((p) => {
                  const em = ecoMeta(p.ecosystemType);
                  return (
                    <button
                      key={p.projectId}
                      onClick={() => setActiveProjectId(p.projectId)}
                      className={`w-full text-left border-b border-slate-800 transition-all
                        ${activeProjectId === p.projectId
                          ? 'bg-emerald-900/15 border-l-2 border-l-emerald-500'
                          : 'hover:bg-slate-900/60'}`}
                    >
                      {/* Ecosystem gradient header strip */}
                      <div className={`h-1.5 w-full bg-gradient-to-r ${em.gradient}`} />
                      <div className="p-3.5 flex items-start gap-3">
                        {/* Ecosystem icon bubble */}
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                          style={{ background: em.color + '18', borderColor: em.color + '44' }}
                        >
                          {em.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className="text-sm font-black text-white truncate">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${statusColor[p.status]}`}>
                              {p.status}
                            </span>
                            <EcoBadge type={p.ecosystemType} size="xs" />
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {p.country ? `${p.location}` : p.location}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-emerald-400 font-bold">{p.availableUnits.toLocaleString()} tCO2e</span>
                            <span className="text-xs text-amber-400 font-bold">${p.pricePerTonne}/t</span>
                            <span className="text-xs text-slate-500 flex items-center gap-0.5">
                              <Users className="w-3 h-3" />{p.coalitionCount}
                            </span>
                          </div>
                        </div>
                        {p.priceHistory?.length > 1 && (
                          <div className="shrink-0 hidden sm:block">
                            <Sparkline data={p.priceHistory} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: project detail */}
            {activeProject ? (() => {
              const em = ecoMeta(activeProject.ecosystemType);
              const groupPct = activeProject.groupTarget > 0
                ? Math.min(100, Math.round((activeProject.groupFunded / activeProject.groupTarget) * 100))
                : 0;
              return (
                <div className="flex-1 overflow-y-auto">
                  {/* Gradient hero */}
                  <div className={`relative h-32 bg-gradient-to-br ${em.gradient} flex items-end p-5`}>
                    <div className="absolute inset-0 opacity-30">
                      <img src={SUSTAINABILITY_COLLAGE} alt="" className="w-full h-full object-cover mix-blend-overlay" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-3xl">{em.icon}</span>
                        <EcoBadge type={activeProject.ecosystemType} />
                      </div>
                      <h2 className="text-xl font-black text-white leading-tight">{activeProject.name}</h2>
                      <p className="text-sm text-white/70 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />{activeProject.location}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 md:p-5 space-y-5">

                    {/* Action row */}
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${statusColor[activeProject.status]}`}>
                        {activeProject.status}
                      </span>
                      {isAiEnabled() && (
                        <button onClick={() => handleAiScore(activeProject)}
                          disabled={scoringId === activeProject.projectId}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition-all disabled:opacity-50">
                          {scoringId === activeProject.projectId
                            ? <Loader className="w-3 h-3 animate-spin" />
                            : <Sparkles className="w-3 h-3" />}
                          AI Score
                        </button>
                      )}
                      <button onClick={() => handleJoin(activeProject.projectId)}
                        disabled={joiningId === activeProject.projectId || joinedIds.has(activeProject.projectId)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 transition-all disabled:opacity-50">
                        {joiningId === activeProject.projectId ? <Loader className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
                        {joinedIds.has(activeProject.projectId) ? 'Joined ✓' : 'Join Coalition'}
                      </button>
                    </div>

                    {/* AI credibility */}
                    {activeProject.credibilityScore > 0 && (
                      <div className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800 p-3">
                        <ShieldCheck className="w-5 h-5 text-violet-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">AI Credibility Score</p>
                          <p className={`text-xl font-black ${scoreColor(activeProject.credibilityScore)}`}>
                            {activeProject.credibilityScore}/100
                          </p>
                          {activeProject.credibilityNote !== 'AI review pending' && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{activeProject.credibilityNote}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Mission</p>
                      <p className="text-sm font-bold text-emerald-300">{activeProject.mission}</p>
                      <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{activeProject.description}</p>
                    </div>

                    {/* Ecosystem detail */}
                    <div className={`rounded-xl bg-gradient-to-br ${em.gradient} border border-white/10 p-4`}>
                      <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: em.color }}>
                        {em.label} Ecosystem
                      </p>
                      <p className="text-sm text-white/80">{em.description}</p>
                      <p className="text-xs mt-2" style={{ color: em.color }}>
                        Sequestration rate: ~{em.seqRate} tCO2e/acre/year
                      </p>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Available', value: `${activeProject.availableUnits.toLocaleString()} t`, color: 'text-emerald-400' },
                        { label: 'Retired', value: `${activeProject.retiredUnits.toLocaleString()} t`, color: 'text-slate-300' },
                        { label: 'Coalition', value: `${activeProject.coalitionCount} members`, color: 'text-cyan-400' },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
                          <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Group purchase progress */}
                    {activeProject.groupTarget > 0 && (
                      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="font-bold text-slate-300">Group Purchase Goal</span>
                          <span className="font-black text-emerald-400">{groupPct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${groupPct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                          <span>{activeProject.groupFunded.toLocaleString()} tCO2e funded</span>
                          <span>Goal: {activeProject.groupTarget.toLocaleString()} tCO2e</span>
                        </div>
                      </div>
                    )}

                    {/* Price chart */}
                    {activeProject.priceHistory.length > 1 && (
                      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">7-Day Price</p>
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <p className="text-2xl font-black text-white">${activeProject.pricePerTonne}/t</p>
                            <p className="text-xs text-slate-500">per tonne CO2e</p>
                          </div>
                          <Sparkline data={activeProject.priceHistory} />
                        </div>
                      </div>
                    )}

                    {/* Buy panel */}
                    <div className="rounded-xl bg-slate-900 border border-emerald-500/30 p-4 space-y-3">
                      <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">Purchase Credits</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Tonnes</label>
                          <input
                            type="number" min="1" max={activeProject.availableUnits}
                            value={buyQty}
                            onChange={(e) => setBuyQty(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total</p>
                          <p className="text-xl font-black text-white">${(buyQty * activeProject.pricePerTonne).toFixed(0)}</p>
                          <p className="text-[10px] text-slate-500">{buyQty * 10} coins</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={buyGroup} onChange={(e) => setBuyGroup(e.target.checked)}
                          className="rounded" />
                        <span className="text-xs text-slate-300">Group purchase (contributes to coalition goal)</span>
                      </label>
                      {buySuccess && <p className="text-xs text-emerald-400 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />{buySuccess}</p>}
                      {buyError && <p className="text-xs text-rose-400">{buyError}</p>}
                      <button onClick={handleBuy} disabled={buying || buyQty <= 0}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {buying ? <><Loader className="w-4 h-4 animate-spin" /> Processing…</> : <><Zap className="w-4 h-4" /> Buy {buyQty} tCO2e</>}
                      </button>
                    </div>

                    {/* Verification form */}
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                      <button onClick={() => setVerifyOpen((v) => !v)}
                        className="flex items-center justify-between w-full text-left">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Submit Field Verification</p>
                        <ShieldCheck className="w-4 h-4 text-slate-500" />
                      </button>
                      {verifyOpen && (
                        <div className="mt-3 space-y-3">
                          {verifyDone ? (
                            <p className="text-sm text-emerald-400 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" /> Verification submitted — thank you!
                            </p>
                          ) : (
                            <>
                              <textarea value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)}
                                rows={3}
                                placeholder="Describe what you observed on-site: vegetation coverage, water features, encroachment…"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-all resize-none" />
                              <button onClick={handleVerify} disabled={verifying || !verifyNotes.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-bold hover:bg-violet-500/30 transition-all disabled:opacity-50">
                                {verifying ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                                Submit Verification
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })() : (
              <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-3">
                <Globe className="w-10 h-10 opacity-30" />
                <p className="text-sm">Select a project to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PORTFOLIO TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'portfolio' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {/* Totals */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Held', value: `${portfolioTotals.total} tCO2e`, color: 'text-emerald-400' },
              { label: 'Active', value: `${portfolioTotals.active} tCO2e`, color: 'text-cyan-400' },
              { label: 'Retired', value: `${portfolioTotals.retired} tCO2e`, color: 'text-slate-300' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center">
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {userId === 'anonymous' && (
            <div className="rounded-xl bg-amber-900/20 border border-amber-500/30 p-4 text-sm text-amber-300 text-center">
              Sign in as a hero to track your personal credit portfolio.
            </div>
          )}

          {portfolio.length === 0 && userId !== 'anonymous' && (
            <div className="text-center py-12 text-slate-500">
              <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No credits yet — buy your first offset in the Market tab.</p>
            </div>
          )}

          {portfolio.map((p) => (
            <div key={p.purchaseId}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{p.projectName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.purchaseId}</p>
                </div>
                {p.retired
                  ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600 shrink-0">Retired</span>
                  : <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">Active</span>}
              </div>
              <div className="flex gap-4 text-sm">
                <div><p className="text-xs text-slate-500">Units</p><p className="font-black text-white">{p.units} tCO2e</p></div>
                <div><p className="text-xs text-slate-500">Price</p><p className="font-black text-white">${p.pricePerTonne}/t</p></div>
                <div><p className="text-xs text-slate-500">Total</p><p className="font-black text-emerald-400">${p.totalUsd}</p></div>
              </div>
              {p.retired && p.certificateHash && (
                <div className="rounded-xl bg-emerald-900/20 border border-emerald-500/20 p-3">
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider mb-1">Retirement Certificate</p>
                  <p className="text-[10px] font-mono text-slate-400 break-all">{p.certificateHash}</p>
                </div>
              )}
              {!p.retired && (
                <button onClick={() => handleRetire(p)}
                  disabled={retiringId === p.purchaseId}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-bold text-slate-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {retiringId === p.purchaseId ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Retire & Certify
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          IMPACT FEED TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'feed' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3">Live Activity</p>
          {feed.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
              No activity yet — be the first to buy or join a coalition!
            </div>
          )}
          {feed.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-xl bg-slate-900 border border-slate-800 p-3.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'purchase' ? 'bg-emerald-500/20' : 'bg-cyan-500/20'}`}>
                {item.type === 'purchase' ? <Zap className="w-4 h-4 text-emerald-400" /> : <Users className="w-4 h-4 text-cyan-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  <span className="font-bold">{item.userName}</span>{' '}
                  {item.type === 'purchase'
                    ? <><span className="text-emerald-400">purchased {item.units} tCO2e</span> from <span className="font-bold">{item.projectName}</span></>
                    : <><span className="text-cyan-400">joined as {item.role}</span> at {projects.find((p) => p.projectId === item.projectId)?.name || item.projectId}</>}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{relTime(item.ts)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REGISTER LAND TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'register' && (
        <div className="flex-1 overflow-y-auto">

          {/* Register success banner */}
          {registerSuccess && (
            <div className="mx-4 mt-4 rounded-2xl bg-emerald-900/30 border border-emerald-500/40 p-5 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-lg font-black text-white mb-1">Registration Submitted!</p>
              <p className="text-sm text-slate-300 mb-3">Your land is pending review. Estimated {registerSuccess.credits.toLocaleString()} tCO2e/year once approved.</p>
              <p className="text-xs font-mono text-emerald-400">{registerSuccess.parcelId}</p>
              <button onClick={() => setRegisterSuccess(null)}
                className="mt-3 text-xs text-slate-400 underline">Submit another parcel</button>
            </div>
          )}

          {/* Hero section */}
          <div className="relative overflow-hidden">
            <div className="h-40 bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 flex items-center justify-center">
              <div className="text-center px-4">
                <p className="text-4xl mb-2">🌍</p>
                <h2 className="text-xl font-black text-white">Register Your Land</h2>
                <p className="text-sm text-emerald-300 mt-1">Turn your acreage into verified carbon credits</p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="p-4 md:p-6">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">How It Works</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { step: 1, icon: '📋', title: 'Register', desc: 'Submit your land details and GPS coordinates' },
                { step: 2, icon: '🛰️', title: 'Satellite Review', desc: 'DPAL verifies land type via satellite imagery' },
                { step: 3, icon: '✅', title: 'Approval', desc: 'Approved parcels enter the Green Registry' },
                { step: 4, icon: '💰', title: 'Earn Credits', desc: 'Annual credits issued based on sequestration rate' },
              ].map((s) => (
                <div key={s.step} className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black flex items-center justify-center mx-auto mb-1.5">{s.step}</div>
                  <p className="text-xs font-black text-white mb-1">{s.title}</p>
                  <p className="text-[10px] text-slate-400 leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Ecosystem rates reference */}
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Sequestration Rates by Ecosystem</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
              {Object.entries(ECOSYSTEM_META).map(([key, m]) => (
                <div key={key} className="flex items-center gap-2.5 rounded-xl bg-slate-900 border border-slate-800 p-2.5">
                  <span className="text-xl shrink-0">{m.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{m.label}</p>
                    <p className="text-[10px]" style={{ color: m.color }}>{m.seqRate} tCO2e/acre/yr</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            {!registerSuccess && (
              <button
                onClick={() => setRegisterOpen(true)}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40"
              >
                <Plus className="w-5 h-5" />
                Register My Land
              </button>
            )}

            {/* My submitted parcels */}
            {myParcels.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">My Submissions</p>
                <div className="space-y-3">
                  {myParcels.map((parcel) => {
                    const em = ecoMeta(parcel.ecosystemType);
                    return (
                      <div key={parcel.parcelId}
                        className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center gap-4">
                        <span className="text-2xl shrink-0">{em.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-black text-white truncate">{parcel.country}{parcel.region ? `, ${parcel.region}` : ''}</p>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${parcelStatusColor[parcel.status] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                              {parcel.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{parcel.totalAcres.toLocaleString()} acres · {parcel.sectorCount} sectors · ~{parcel.creditEstimatePerYear.toLocaleString()} tCO2e/yr</p>
                          <p className="text-[10px] font-mono text-slate-600 mt-0.5">{parcel.parcelId}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Register modal */}
      {registerOpen && (
        <RegisterModal
          hero={hero}
          onClose={() => setRegisterOpen(false)}
          onSuccess={(parcelId, credits) => {
            setRegisterOpen(false);
            setRegisterSuccess({ parcelId, credits });
            void fetchMyParcels();
          }}
        />
      )}
    </div>
  );
};

export default OffsetMarketplaceView;
