/**
 * DPAL Global Signals Engine
 *
 * Displays live intelligence signals from USGS, NASA EONET, OpenAQ and
 * manually imported sources. Users can:
 *   • View signals on a world map or in a list
 *   • Filter by category, risk level, status, country
 *   • Import fresh signals from live feeds (one click)
 *   • Get AI summary for any signal
 *   • Convert a signal into a DPAL verification mission
 *   • Send signals directly to the verification queue
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, Activity, RefreshCw, Globe, MapPin, CheckCircle,
  Zap, Filter, ChevronRight, ExternalLink, Target, ShieldCheck,
  Sparkles, ArrowLeft, BarChart2,
} from './icons';
import {
  apiUrl, API_ROUTES,
  SIGNAL_DETAIL, SIGNAL_STATUS, SIGNAL_ENRICH, SIGNAL_CREATE_MISSION,
} from '../constants';

// ── Types ──────────────────────────────────────────────────────────────────────

type SignalCategory =
  | 'environmental_hazard' | 'fire_smoke' | 'climate_risk'
  | 'public_safety' | 'infrastructure_failure' | 'pollution'
  | 'carbon_project' | 'community_verification';

type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
type SignalStatus =
  | 'new' | 'reviewed' | 'mission_created'
  | 'sent_to_verification' | 'verified' | 'closed' | 'logged';

interface GlobalSignal {
  signalId: string;
  title: string;
  description: string;
  category: SignalCategory;
  sourceName: string;
  sourceUrl?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  riskLevel: RiskLevel;
  confidenceScore: number;
  status: SignalStatus;
  aiSummary?: string;
  suggestedMissionTitle?: string;
  suggestedMissionDescription?: string;
  missionId?: string;
  createdAt: string;
}

interface SignalStats {
  total: number;
  critical: number;
  high: number;
  missionsCreated: number;
  categories: Record<string, number>;
}

interface GlobalSignalsViewProps {
  onReturn: () => void;
  onNavigateToMission?: (missionId: string) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<SignalCategory, { label: string; emoji: string; color: string; dot: string }> = {
  environmental_hazard:  { label: 'Environmental Hazard', emoji: '🌍', color: 'text-orange-400 border-orange-700/40 bg-orange-950/20', dot: '#f97316' },
  fire_smoke:            { label: 'Fire / Smoke',         emoji: '🔥', color: 'text-red-400 border-red-700/40 bg-red-950/20',         dot: '#ef4444' },
  climate_risk:          { label: 'Climate Risk',         emoji: '🌀', color: 'text-sky-400 border-sky-700/40 bg-sky-950/20',         dot: '#38bdf8' },
  public_safety:         { label: 'Public Safety',        emoji: '🚨', color: 'text-rose-400 border-rose-700/40 bg-rose-950/20',      dot: '#f43f5e' },
  infrastructure_failure:{ label: 'Infrastructure',       emoji: '⚡', color: 'text-amber-400 border-amber-700/40 bg-amber-950/20',   dot: '#fbbf24' },
  pollution:             { label: 'Pollution',            emoji: '🌫️', color: 'text-slate-400 border-slate-600 bg-slate-800/40',       dot: '#94a3b8' },
  carbon_project:        { label: 'Carbon Project',       emoji: '🌱', color: 'text-emerald-400 border-emerald-700/40 bg-emerald-950/20', dot: '#10b981' },
  community_verification:{ label: 'Community Verify',    emoji: '👁️', color: 'text-violet-400 border-violet-700/40 bg-violet-950/20', dot: '#a78bfa' },
};

const RISK_STYLE: Record<RiskLevel, { label: string; cls: string; dot: string }> = {
  low:      { label: 'Low',      cls: 'bg-slate-700/40 text-slate-300 border-slate-600',           dot: 'bg-slate-500' },
  moderate: { label: 'Moderate', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',        dot: 'bg-amber-400' },
  high:     { label: 'High',     cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30',     dot: 'bg-orange-500 animate-pulse' },
  critical: { label: 'Critical', cls: 'bg-red-500/15 text-red-300 border-red-500/30',              dot: 'bg-red-500 animate-ping' },
};

const STATUS_META: Record<SignalStatus, { label: string; cls: string }> = {
  new:                 { label: 'New',               cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  reviewed:            { label: 'Reviewed',          cls: 'bg-slate-700/40 text-slate-300 border-slate-600' },
  mission_created:     { label: 'Mission Created',   cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  sent_to_verification:{ label: 'Sent to Verify',    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  verified:            { label: 'Verified',          cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  closed:              { label: 'Closed',            cls: 'bg-slate-700/40 text-slate-400 border-slate-600' },
  logged:              { label: 'Ledger Logged',     cls: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
};

const ALL_CATEGORIES: SignalCategory[] = [
  'environmental_hazard','fire_smoke','climate_risk','public_safety',
  'infrastructure_failure','pollution','carbon_project','community_verification',
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function relTime(ts: string): string {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60_000)       return 'just now';
  if (d < 3_600_000)    return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000)   return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const json = await res.json();
  if (!res.ok || json.ok === false) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

// ── Map helpers ────────────────────────────────────────────────────────────────

function makeSignalPin(signal: GlobalSignal) {
  const color = CATEGORY_META[signal.category]?.dot ?? '#94a3b8';
  const pulse = signal.riskLevel === 'critical' || signal.riskLevel === 'high';
  const html = `<div style="position:relative;width:20px;height:20px;">
    <span style="display:block;width:12px;height:12px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);position:absolute;top:4px;left:4px;box-shadow:0 0 6px ${color}88;"></span>
    ${pulse ? `<span style="display:block;width:20px;height:20px;border-radius:50%;border:2px solid ${color}66;position:absolute;top:0;left:0;animation:dpal-ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></span>` : ''}
  </div>`;
  return L.divIcon({ html, iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -12], className: '' });
}

const FitAll: React.FC<{ signals: GlobalSignal[] }> = ({ signals }) => {
  const map = useMap();
  useEffect(() => {
    const mapped = signals.filter((s) => s.latitude != null && s.longitude != null);
    if (!mapped.length) return;
    if (mapped.length === 1) { map.flyTo([mapped[0].latitude!, mapped[0].longitude!], 5, { duration: 1 }); return; }
    const bounds = L.latLngBounds(mapped.map((s) => [s.latitude!, s.longitude!]));
    map.flyToBounds(bounds.pad(0.2), { duration: 1.2, maxZoom: 7 });
  }, [map, signals]);
  return null;
};

// ── Signal Detail Panel ────────────────────────────────────────────────────────

const SignalDetail: React.FC<{
  signal: GlobalSignal;
  onClose: () => void;
  onStatusChange: (id: string, status: SignalStatus) => void;
  onMissionCreated: (id: string, missionId: string) => void;
}> = ({ signal, onClose, onStatusChange, onMissionCreated }) => {
  const [enriching, setEnriching]       = useState(false);
  const [creating, setCreating]         = useState(false);
  const [sending, setSending]           = useState(false);
  const [localSignal, setLocalSignal]   = useState(signal);
  const [notice, setNotice]             = useState('');
  const [err, setErr]                   = useState('');
  const cat  = CATEGORY_META[localSignal.category];
  const risk = RISK_STYLE[localSignal.riskLevel];
  const stat = STATUS_META[localSignal.status];

  async function handleEnrich() {
    setEnriching(true); setErr('');
    try {
      const r = await apiFetch<{ ok: boolean; signal: GlobalSignal }>(SIGNAL_ENRICH(localSignal.signalId), { method: 'POST' });
      setLocalSignal(r.signal);
      setNotice('AI enrichment complete.');
    } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : String(ex)); }
    finally { setEnriching(false); }
  }

  async function handleCreateMission() {
    setCreating(true); setErr('');
    try {
      const r = await apiFetch<{ ok: boolean; missionId: string }>(SIGNAL_CREATE_MISSION(localSignal.signalId), { method: 'POST' });
      setLocalSignal((s) => ({ ...s, status: 'mission_created', missionId: r.missionId }));
      onStatusChange(localSignal.signalId, 'mission_created');
      onMissionCreated(localSignal.signalId, r.missionId);
      setNotice(`Mission ${r.missionId} created.`);
    } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : String(ex)); }
    finally { setCreating(false); }
  }

  async function handleSendToVerification() {
    setSending(true); setErr('');
    try {
      await apiFetch(SIGNAL_STATUS(localSignal.signalId), {
        method: 'PATCH',
        body: JSON.stringify({ status: 'sent_to_verification', reviewedBy: 'community' }),
      });
      setLocalSignal((s) => ({ ...s, status: 'sent_to_verification' }));
      onStatusChange(localSignal.signalId, 'sent_to_verification');
      setNotice('Signal sent to verification queue.');
    } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : String(ex)); }
    finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <span className="text-2xl shrink-0 mt-0.5">{cat.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-100 text-sm leading-snug">{localSignal.title}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {[localSignal.city, localSignal.country].filter(Boolean).join(', ')} · {relTime(localSignal.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition shrink-0">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${risk.cls}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${risk.dot}`} />
              {risk.label} Risk
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${stat.cls}`}>
              {stat.label}
            </span>
            <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded-full border border-slate-700">
              {localSignal.sourceName}
            </span>
            <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded-full border border-slate-700">
              {Math.round(localSignal.confidenceScore * 100)}% conf
            </span>
          </div>

          {/* Notices */}
          {notice && <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg px-3 py-2 text-xs text-teal-300 flex gap-2"><CheckCircle size={12} className="shrink-0 mt-0.5" />{notice}</div>}
          {err    && <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-xs text-rose-300 flex gap-2"><AlertTriangle size={12} className="shrink-0 mt-0.5" />{err}</div>}

          {/* Description */}
          <p className="text-sm text-slate-300 leading-relaxed">{localSignal.description}</p>

          {/* AI Summary */}
          {localSignal.aiSummary ? (
            <div className="bg-violet-900/20 border border-violet-700/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-violet-400" />
                <p className="text-[10px] font-bold text-violet-300 uppercase tracking-wide">AI Intelligence Summary</p>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{localSignal.aiSummary}</p>
              {localSignal.suggestedMissionTitle && (
                <div className="bg-slate-800/60 rounded-lg px-3 py-2 mt-2">
                  <p className="text-[9px] font-bold text-teal-400 uppercase mb-1">Suggested Mission</p>
                  <p className="text-xs font-semibold text-slate-200">{localSignal.suggestedMissionTitle}</p>
                  {localSignal.suggestedMissionDescription && (
                    <p className="text-[10px] text-slate-400 mt-1">{localSignal.suggestedMissionDescription}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleEnrich}
              disabled={enriching}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-900/20 hover:bg-violet-900/30 border border-violet-700/30 text-violet-300 text-xs font-semibold transition disabled:opacity-50"
            >
              <Sparkles size={12} className={enriching ? 'animate-pulse' : ''} />
              {enriching ? 'Generating AI summary…' : 'Generate AI Summary'}
            </button>
          )}

          {/* Coords */}
          {localSignal.latitude != null && (
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <MapPin size={11} />
              {localSignal.latitude.toFixed(4)}, {localSignal.longitude?.toFixed(4)}
              {localSignal.sourceUrl && (
                <a href={localSignal.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-teal-500 hover:text-teal-300">
                  Source <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}

          {/* Signal ID for audit */}
          <p className="text-[9px] text-slate-600 font-mono">Signal ID: {localSignal.signalId}</p>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
            {localSignal.status !== 'mission_created' && localSignal.status !== 'verified' && localSignal.status !== 'logged' && (
              <button
                onClick={handleCreateMission}
                disabled={creating}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700/30 hover:bg-teal-600/40 border border-teal-600/40 text-teal-300 text-sm font-semibold transition disabled:opacity-50"
              >
                <Target size={14} className={creating ? 'animate-pulse' : ''} />
                {creating ? 'Creating Mission…' : 'Create DPAL Mission'}
              </button>
            )}
            {localSignal.status === 'mission_created' && localSignal.missionId && (
              <div className="flex items-center gap-2 bg-violet-900/20 border border-violet-700/30 rounded-xl px-4 py-2.5 text-xs text-violet-300">
                <CheckCircle size={13} />
                Mission created: <span className="font-mono">{localSignal.missionId}</span>
              </div>
            )}
            {localSignal.status === 'new' || localSignal.status === 'reviewed' ? (
              <button
                onClick={handleSendToVerification}
                disabled={sending}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-700/20 hover:bg-amber-700/30 border border-amber-600/30 text-amber-300 text-sm font-semibold transition disabled:opacity-50"
              >
                <ShieldCheck size={14} />
                {sending ? 'Sending…' : 'Send to Verification'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main View ──────────────────────────────────────────────────────────────────

const GlobalSignalsView: React.FC<GlobalSignalsViewProps> = ({ onReturn }) => {
  const [signals, setSignals]         = useState<GlobalSignal[]>([]);
  const [stats, setStats]             = useState<SignalStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [importing, setImporting]     = useState(false);
  const [err, setErr]                 = useState('');
  const [notice, setNotice]           = useState('');
  const [view, setView]               = useState<'list' | 'map'>('list');
  const [selected, setSelected]       = useState<GlobalSignal | null>(null);
  const [filterCat, setFilterCat]     = useState<SignalCategory | 'all'>('all');
  const [filterRisk, setFilterRisk]   = useState<RiskLevel | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<SignalStatus | 'all'>('new');

  const loadData = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterCat    !== 'all') params.set('category',  filterCat);
      if (filterRisk   !== 'all') params.set('riskLevel', filterRisk);
      if (filterStatus !== 'all') params.set('status',    filterStatus);

      const [sd, stD] = await Promise.all([
        apiFetch<{ ok: boolean; signals: GlobalSignal[] }>(apiUrl(API_ROUTES.SIGNALS_LIST) + '?' + params.toString()),
        apiFetch<{ ok: boolean; stats: SignalStats }>(apiUrl(API_ROUTES.SIGNALS_STATS)),
      ]);
      setSignals(sd.signals);
      setStats(stD.stats);
    } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : String(ex)); }
    finally { setLoading(false); }
  }, [filterCat, filterRisk, filterStatus]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleImport() {
    setImporting(true); setNotice('');
    try {
      const r = await apiFetch<{ ok: boolean; imported: { usgs: number; eonet: number; aq: number; total: number } }>(
        apiUrl(API_ROUTES.SIGNALS_IMPORT), { method: 'POST' }
      );
      const { usgs, eonet, aq, total } = r.imported;
      setNotice(`Imported ${total} new signals — USGS: ${usgs}, EONET: ${eonet}, Air Quality: ${aq}`);
      await loadData();
    } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : String(ex)); }
    finally { setImporting(false); }
  }

  function handleStatusChange(id: string, status: SignalStatus) {
    setSignals((prev) => prev.map((s) => s.signalId === id ? { ...s, status } : s));
    void loadData();
  }
  function handleMissionCreated(id: string, missionId: string) {
    setSignals((prev) => prev.map((s) => s.signalId === id ? { ...s, status: 'mission_created', missionId } : s));
  }

  const mappable = useMemo(() => signals.filter((s) => s.latitude != null && s.longitude != null), [signals]);
  const criticalCount = useMemo(() => signals.filter((s) => s.riskLevel === 'critical' || s.riskLevel === 'high').length, [signals]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <button onClick={onReturn} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Globe size={18} className="text-teal-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-100">DPAL Global Signals Engine</p>
            <p className="text-[10px] text-slate-500">Live intelligence from USGS · NASA EONET · OpenAQ</p>
          </div>
        </div>
        {criticalCount > 0 && (
          <span className="flex items-center gap-1.5 bg-red-900/30 border border-red-700/40 text-red-300 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            {criticalCount} critical
          </span>
        )}
        <button
          onClick={() => void handleImport()}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700/30 hover:bg-teal-600/40 border border-teal-600/40 text-teal-300 text-xs font-semibold transition disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={12} className={importing ? 'animate-spin' : ''} />
          {importing ? 'Importing…' : 'Import Feeds'}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Signals',     value: stats.total,           icon: <Activity size={15} className="text-teal-400" /> },
              { label: 'Critical / High',   value: `${stats.critical} / ${stats.high}`, icon: <AlertTriangle size={15} className="text-red-400" /> },
              { label: 'Missions Created',  value: stats.missionsCreated, icon: <Target size={15} className="text-violet-400" /> },
              { label: 'Categories Active', value: Object.keys(stats.categories).length, icon: <BarChart2 size={15} className="text-amber-400" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
                {icon}
                <div>
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className="text-lg font-bold text-slate-100">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notices */}
        {notice && <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl px-4 py-3 text-sm text-teal-300 flex gap-2"><CheckCircle size={14} className="shrink-0 mt-0.5" />{notice}</div>}
        {err    && <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-300 flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{err}</div>}

        {/* Filters + view toggle */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-slate-500 shrink-0" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide shrink-0">Filters</span>

            {/* Risk */}
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as RiskLevel | 'all')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Risk Levels</option>
              {(['critical','high','moderate','low'] as RiskLevel[]).map((r) => (
                <option key={r} value={r}>{RISK_STYLE[r].label}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as SignalStatus | 'new')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Statuses</option>
              {(['new','reviewed','mission_created','sent_to_verification','verified','closed','logged'] as SignalStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>

            {/* View toggle */}
            <div className="ml-auto flex gap-1">
              {(['list','map'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${view === v ? 'bg-teal-700/40 border border-teal-600/50 text-teal-300' : 'bg-slate-800 border border-slate-700 text-slate-500 hover:text-slate-300'}`}
                >
                  {v === 'list' ? '☰ List' : '🗺 Map'}
                </button>
              ))}
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterCat('all')}
              className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border transition ${filterCat === 'all' ? 'bg-teal-900/40 border-teal-600/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
            >All</button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border transition ${filterCat === cat ? 'bg-teal-900/40 border-teal-600/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
              >
                {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* MAP VIEW */}
        {view === 'map' && (
          <div className="rounded-xl overflow-hidden border border-slate-700/60" style={{ height: 480 }}>
            <style>{`@keyframes dpal-ping{75%,100%{transform:scale(1.8);opacity:0}}.leaflet-popup-content-wrapper{background:#0f172a!important;border:1px solid #334155!important;border-radius:12px!important;color:#e2e8f0!important;font-family:ui-monospace,monospace!important;padding:0!important}.leaflet-popup-tip{background:#0f172a!important}.leaflet-popup-content{margin:0!important}`}</style>
            <MapContainer center={[20, 0]} zoom={2} minZoom={1} maxZoom={14} style={{ height: '100%', width: '100%', background: '#0a0f1a' }} scrollWheelZoom>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OSM contributors &copy; CARTO'
                subdomains="abcd"
              />
              {mappable.length > 0 && <FitAll signals={mappable} />}
              {mappable.map((s) => (
                <Marker key={s.signalId} position={[s.latitude!, s.longitude!]} icon={makeSignalPin(s)}>
                  <Popup minWidth={200}>
                    <div className="p-3 space-y-2">
                      <p className="font-bold text-slate-100 text-xs leading-snug">{CATEGORY_META[s.category].emoji} {s.title}</p>
                      <p className="text-[10px] text-slate-400">{[s.city, s.country].filter(Boolean).join(', ')}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${RISK_STYLE[s.riskLevel].cls}`}>{RISK_STYLE[s.riskLevel].label}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_META[s.status].cls}`}>{STATUS_META[s.status].label}</span>
                      </div>
                      <button onClick={() => setSelected(s)} className="w-full text-[10px] font-bold text-teal-300 bg-teal-900/30 border border-teal-700/40 rounded-lg py-1.5 hover:bg-teal-900/50 transition">
                        View Details →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
                <RefreshCw size={16} className="animate-spin text-teal-400" /> Loading signals…
              </div>
            )}
            {!loading && signals.length === 0 && (
              <div className="text-center py-16 bg-slate-900 border border-dashed border-slate-700 rounded-xl">
                <Globe size={40} className="mx-auto text-teal-500/30 mb-3" />
                <p className="text-slate-400 text-sm font-semibold">No signals yet</p>
                <p className="text-slate-500 text-xs mt-1 mb-4">Click "Import Feeds" to pull live data from USGS, NASA and OpenAQ</p>
                <button onClick={() => void handleImport()} disabled={importing} className="px-5 py-2 rounded-xl bg-teal-700/30 border border-teal-600/40 text-teal-300 text-sm font-semibold hover:bg-teal-600/40 transition">
                  {importing ? 'Importing…' : 'Import Now'}
                </button>
              </div>
            )}
            {signals.map((s) => {
              const cat  = CATEGORY_META[s.category];
              const risk = RISK_STYLE[s.riskLevel];
              const stat = STATUS_META[s.status];
              return (
                <button
                  key={s.signalId}
                  onClick={() => setSelected(s)}
                  className="w-full text-left bg-slate-900 border border-slate-700 rounded-xl p-4 hover:border-teal-600/40 hover:bg-slate-800/60 transition group"
                >
                  <div className="flex items-start gap-3">
                    {/* Risk dot */}
                    <div className="mt-1.5 shrink-0 relative w-2.5 h-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full absolute inset-0 ${risk.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="text-base shrink-0">{cat.emoji}</span>
                        <p className="text-sm font-semibold text-slate-200 group-hover:text-teal-300 transition flex-1 min-w-0 truncate">
                          {s.title}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.aiSummary || s.description}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${risk.cls}`}>{risk.label}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${stat.cls}`}>{stat.label}</span>
                        {s.city && <span className="text-[9px] text-slate-500 flex items-center gap-0.5"><MapPin size={9} />{s.city}{s.country ? `, ${s.country}` : ''}</span>}
                        <span className="text-[9px] text-slate-600 ml-auto">{relTime(s.createdAt)}</span>
                      </div>
                      {s.suggestedMissionTitle && (
                        <p className="text-[10px] text-violet-400 mt-1.5 flex items-center gap-1">
                          <Sparkles size={9} /> {s.suggestedMissionTitle}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-slate-600 shrink-0 mt-1 group-hover:text-teal-500 transition" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Signal detail modal */}
      {selected && (
        <SignalDetail
          signal={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onMissionCreated={handleMissionCreated}
        />
      )}
    </div>
  );
};

export default GlobalSignalsView;
