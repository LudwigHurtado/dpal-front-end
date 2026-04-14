/**
 * DPAL Water Monitor + Verified Water Impact Credits
 *
 * Sub-views (internal):
 *   dashboard  — platform overview, my projects, activity feed
 *   create     — register a new water project
 *   project    — project detail: snapshots, score breakdown, reports
 *   validator  — validator queue: approve / reject reports
 *   credits    — water impact credits + marketplace
 *
 * All credits are labelled "DPAL Verified Water Impact Credits" (internal).
 * No real regulated commodity. Future third-party certification adds external status.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WaterGlobe, type WaterProjectPin } from './WaterGlobe';
import {
  ArrowLeft, MapPin, CheckCircle, AlertTriangle, Activity,
  ShieldCheck, Award, Zap, Plus, RefreshCw, Eye,
  Droplets, Waves, TrendingUp, TrendingDown, Globe, ChevronRight,
  FileText, BarChart2, Star, Clock, Filter,
} from './icons';
import {
  apiUrl,
  WATER_PROJECT_DETAIL,
  WATER_PROJECT_SNAPSHOTS,
  WATER_MOCK_REFRESH,
  WATER_PROJECT_REPORTS,
  WATER_GENERATE_REPORT,
  WATER_ISSUE_CREDITS,
  WATER_CREDIT_LIST,
  WATER_CREDIT_RETIRE,
  API_ROUTES,
} from '../constants';

import type { Hero } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface GPSPoint { lat: number; lng: number }

interface WaterProject {
  projectId: string;
  ownerId: string;
  ownerName: string;
  projectName: string;
  projectType: string;
  description: string;
  location: {
    country: string;
    region: string;
    city: string;
    gpsCenter: GPSPoint;
    polygon: GPSPoint[];
  };
  totalAcres: number;
  baselineDate: string;
  baselineWaterIndex: number;
  improvementGoal: string;
  status: string;
  evidenceUrls: string[];
  adminNotes: string;
  createdAt: string;
}

interface WaterSnapshotMetrics {
  soilMoistureIndex: number;
  surfaceWaterLevel: number;
  waterStorageTrend: number;
  vegetationStress: number;
  droughtRisk: number;
  usageReductionEstimate: number;
  confidenceScore: number;
}

interface WaterSnapshot {
  snapshotId: string;
  projectId: string;
  source: string;
  captureDate: string;
  metrics: WaterSnapshotMetrics;
  anomalyFlags: string[];
  isBaseline: boolean;
  notes: string;
}

interface ComponentScores {
  baselineImprovement: number;
  moistureStability: number;
  droughtRiskReduction: number;
  proofCompleteness: number;
  validatorConfidence: number;
}

interface WaterImpactReport {
  reportId: string;
  projectId: string;
  periodStart: string;
  periodEnd: string;
  waterImpactScore: number;
  grade: string;
  summary: string;
  findings: string[];
  recommendation: string;
  componentScores: ComponentScores;
  eligibleForCredits: boolean;
  validatorStatus: 'pending' | 'approved' | 'rejected' | 'needs_evidence';
  validatorNotes?: string;
  createdAt: string;
}

interface WaterCredit {
  creditId: string;
  projectId: string;
  creditType: string;
  amountKiloLitres: number;
  verificationStatus: string;
  issuedAt: number;
  blockchainHash: string;
  marketplaceStatus: 'not_listed' | 'listed' | 'retired';
  ownerId: string;
  ownerName: string;
  pricePerKL?: number;
  retiredAt?: number;
  retirementCertHash?: string;
}

interface TxRecord {
  txId: string;
  txType: string;
  projectId: string;
  creditId: string;
  amountKiloLitres: number;
  priceUsd: number;
  blockchainHash: string;
  note: string;
  ts: number;
}

interface ValidatorQueueItem extends WaterImpactReport {
  project?: WaterProject;
}

interface PlatformStats {
  totalProjects: number;
  approvedProjects: number;
  totalCreditsKL: number;
  listedCredits: number;
}

interface WaterMonitorViewProps {
  onReturn: () => void;
  hero?: Hero;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PROJECT_TYPES: { key: string; label: string; icon: string }[] = [
  { key: 'farm_irrigation',         label: 'Farm Irrigation',         icon: '🌾' },
  { key: 'reservoir_monitoring',    label: 'Reservoir Monitoring',    icon: '🏞️' },
  { key: 'wetland_restoration',     label: 'Wetland Restoration',     icon: '🦆' },
  { key: 'leak_reduction',          label: 'Leak Reduction',          icon: '🔧' },
  { key: 'community_conservation',  label: 'Community Conservation',  icon: '🏘️' },
  { key: 'drought_response',        label: 'Drought Response',        icon: '🌵' },
  { key: 'school_or_facility_savings', label: 'School / Facility Savings', icon: '🏫' },
  { key: 'other',                   label: 'Other',                   icon: '💧' },
];

const STATUS_STYLE: Record<string, string> = {
  draft:        'bg-slate-700/40 text-slate-300 border-slate-600',
  submitted:    'bg-sky-500/15 text-sky-300 border-sky-500/30',
  monitoring:   'bg-teal-500/15 text-teal-300 border-teal-500/30',
  under_review: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved:     'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected:     'bg-rose-500/15 text-rose-300 border-rose-500/30',
  credited:     'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const VALIDATOR_STATUS_STYLE: Record<string, string> = {
  pending:        'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved:       'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected:       'bg-rose-500/15 text-rose-300 border-rose-500/30',
  needs_evidence: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
};

const MARKETPLACE_STYLE: Record<string, string> = {
  not_listed: 'bg-slate-700/40 text-slate-300 border-slate-600',
  listed:     'bg-teal-500/15 text-teal-300 border-teal-500/30',
  retired:    'bg-slate-600/40 text-slate-400 border-slate-500',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function projectTypeInfo(key: string) {
  return PROJECT_TYPES.find((t) => t.key === key) ?? { icon: '💧', label: key };
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
}

function scoreBarColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

function gradeColor(grade: string): string {
  if (grade === 'A') return 'text-emerald-400';
  if (grade === 'B') return 'text-teal-400';
  if (grade === 'C') return 'text-amber-400';
  if (grade === 'D') return 'text-orange-400';
  return 'text-rose-400';
}

function relTime(ts: number | string): string {
  const d = Date.now() - (typeof ts === 'string' ? new Date(ts).getTime() : ts);
  if (d < 60_000)    return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

function fmtKL(kl: number): string {
  if (kl >= 1_000_000) return `${(kl / 1_000_000).toFixed(2)}M KL`;
  if (kl >= 1_000)     return `${(kl / 1_000).toFixed(1)}K KL`;
  return `${kl.toLocaleString()} KL`;
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden w-full">
      <div
        className={`h-full rounded-full transition-all ${scoreBarColor(pct)}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function ComponentBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-medium">{value.toFixed(1)}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-teal-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ── API helpers ────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok || json.ok === false) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

// ── CreateProjectForm ──────────────────────────────────────────────────────────

interface CreateFormState {
  projectName: string; projectType: string; description: string;
  country: string; region: string; city: string;
  lat: string; lng: string;
  totalAcres: string; baselineDate: string; improvementGoal: string;
}

const EMPTY_FORM: CreateFormState = {
  projectName: '', projectType: 'farm_irrigation', description: '',
  country: '', region: '', city: '',
  lat: '', lng: '',
  totalAcres: '', baselineDate: new Date().toISOString().split('T')[0], improvementGoal: '',
};

function CreateProjectForm({
  onCreated,
  onCancel,
}: {
  onCreated: (p: WaterProject) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof CreateFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectName.trim() || !form.country.trim()) {
      setErr('Project name and country are required.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const body: Record<string, unknown> = {
        ...form,
        lat: form.lat ? parseFloat(form.lat) : 0,
        lng: form.lng ? parseFloat(form.lng) : 0,
        totalAcres: form.totalAcres ? parseFloat(form.totalAcres) : 0,
        ownerId: 'demo-user-001',
        ownerName: 'Demo User',
      };
      const data = await apiFetch<{ ok: boolean; project: WaterProject }>(
        apiUrl(API_ROUTES.WATER_PROJECTS),
        { method: 'POST', body: JSON.stringify(body) }
      );
      onCreated(data.project);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 transition';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Register Water Project</h2>
          <p className="text-xs text-slate-400">Define your water conservation area for satellite monitoring</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Basic info */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Project Identity</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Project Name *</label>
              <input className={inputCls} placeholder="e.g. Sonora Valley Water Restoration" value={form.projectName} onChange={set('projectName')} required />
            </div>
            <div>
              <label className={labelCls}>Project Type *</label>
              <select className={inputCls} value={form.projectType} onChange={set('projectType')}>
                {PROJECT_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Total Area (acres)</label>
              <input className={inputCls} type="number" min="0" step="0.1" placeholder="e.g. 450" value={form.totalAcres} onChange={set('totalAcres')} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea className={inputCls} rows={3} placeholder="Describe the water source, current challenge, and conservation approach…" value={form.description} onChange={set('description') as never} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Country *</label>
              <input className={inputCls} placeholder="e.g. Mexico" value={form.country} onChange={set('country')} required />
            </div>
            <div>
              <label className={labelCls}>Region / State</label>
              <input className={inputCls} placeholder="e.g. Sonora" value={form.region} onChange={set('region')} />
            </div>
            <div>
              <label className={labelCls}>City / Area</label>
              <input className={inputCls} placeholder="e.g. Hermosillo" value={form.city} onChange={set('city')} />
            </div>
            <div>
              <label className={labelCls}>GPS Latitude</label>
              <input className={inputCls} type="number" step="any" placeholder="e.g. 29.0729" value={form.lat} onChange={set('lat')} />
            </div>
            <div>
              <label className={labelCls}>GPS Longitude</label>
              <input className={inputCls} type="number" step="any" placeholder="e.g. -110.9559" value={form.lng} onChange={set('lng')} />
            </div>
          </div>
          {/* Polygon placeholder — MapLibre / Leaflet integration TODO */}
          <div className="rounded-lg border border-dashed border-slate-600 bg-slate-800/50 p-5 text-center">
            <MapPin size={24} className="mx-auto text-teal-500 mb-2" />
            <p className="text-sm text-slate-300 font-medium">Polygon Boundary</p>
            <p className="text-xs text-slate-500 mt-1">
              Interactive map boundary drawing is available when MapLibre / Leaflet is wired.
              {/* TODO: integrate react-leaflet PolygonDrawer or MapLibre GL Draw here */}
              GPS center coordinates above are used for satellite data queries in the MVP.
            </p>
          </div>
        </div>

        {/* Monitoring params */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Monitoring Parameters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Baseline Date</label>
              <input className={inputCls} type="date" value={form.baselineDate} onChange={set('baselineDate')} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Improvement Goal</label>
              <input className={inputCls} placeholder="e.g. Reduce irrigation usage by 30% within 18 months" value={form.improvementGoal} onChange={set('improvementGoal')} />
            </div>
          </div>
        </div>

        {err && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-300">{err}</div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition text-sm">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium transition text-sm flex items-center gap-2">
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            {busy ? 'Registering…' : 'Register Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── ProjectCard ────────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onClick,
}: {
  project: WaterProject;
  onClick: () => void;
}) {
  const { icon, label } = projectTypeInfo(project.projectType);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-900 border border-slate-700 rounded-xl p-5 hover:border-teal-500/40 hover:bg-slate-800/50 transition group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="font-semibold text-slate-100 group-hover:text-teal-300 transition text-sm leading-tight">{project.projectName}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide whitespace-nowrap ${STATUS_STYLE[project.status] ?? STATUS_STYLE.submitted}`}>
          {statusLabel(project.status)}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><MapPin size={10} />{project.location.city || project.location.country}</span>
        {project.totalAcres > 0 && <span>{project.totalAcres.toLocaleString()} ac</span>}
        <span className="ml-auto flex items-center gap-1"><ChevronRight size={12} className="text-teal-500 opacity-0 group-hover:opacity-100 transition" /></span>
      </div>
    </button>
  );
}

// ── ProjectDetailView ──────────────────────────────────────────────────────────

function ProjectDetailView({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const [project, setProject] = useState<WaterProject | null>(null);
  const [snapshots, setSnapshots] = useState<WaterSnapshot[]>([]);
  const [reports, setReports] = useState<WaterImpactReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [issuingCredits, setIssuingCredits] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [pd, sd, rd] = await Promise.all([
        apiFetch<{ ok: boolean; project: WaterProject }>(WATER_PROJECT_DETAIL(projectId)),
        apiFetch<{ ok: boolean; snapshots: WaterSnapshot[] }>(WATER_PROJECT_SNAPSHOTS(projectId)),
        apiFetch<{ ok: boolean; reports: WaterImpactReport[] }>(WATER_PROJECT_REPORTS(projectId)),
      ]);
      setProject(pd.project);
      setSnapshots(sd.snapshots);
      setReports(rd.reports);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function mockRefresh() {
    setRefreshing(true);
    setNotice('');
    try {
      await apiFetch(WATER_MOCK_REFRESH(projectId), { method: 'POST' });
      await load();
      setNotice('Satellite snapshot captured from 5 data adapters.');
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setRefreshing(false);
    }
  }

  async function generateReport() {
    setGenerating(true);
    setNotice('');
    try {
      await apiFetch(WATER_GENERATE_REPORT(projectId), { method: 'POST' });
      await load();
      setNotice('Impact report generated and sent to validator queue.');
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setGenerating(false);
    }
  }

  async function issueCredits() {
    setIssuingCredits(true);
    setNotice('');
    try {
      await apiFetch(WATER_ISSUE_CREDITS(projectId), { method: 'POST' });
      await load();
      setNotice('DPAL Verified Water Impact Credits issued to your portfolio.');
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setIssuingCredits(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={20} className="animate-spin text-teal-400 mr-2" />
      <span className="text-slate-400 text-sm">Loading project…</span>
    </div>
  );

  if (!project) return (
    <div className="text-center py-16 text-slate-400">Project not found.</div>
  );

  const latestSnap = snapshots[0];
  const latestReport = reports[0];
  const { icon, label } = projectTypeInfo(project.projectType);
  const canIssueCredits = project.status === 'approved'
    && latestReport?.validatorStatus === 'approved'
    && latestReport?.eligibleForCredits
    && project.status !== 'credited';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{icon}</span>
            <h2 className="text-xl font-bold text-slate-100 truncate">{project.projectName}</h2>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide ${STATUS_STYLE[project.status] ?? STATUS_STYLE.submitted}`}>
              {statusLabel(project.status)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{label} · {project.location.city ? `${project.location.city}, ` : ''}{project.location.country} · {project.totalAcres.toLocaleString()} acres</p>
        </div>
      </div>

      {notice && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg px-4 py-3 text-sm text-teal-300">
          <CheckCircle size={14} className="inline mr-2" />{notice}
        </div>
      )}
      {err && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-300">
          <AlertTriangle size={14} className="inline mr-2" />{err}
          <button onClick={() => setErr('')} className="ml-2 underline text-xs">dismiss</button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={mockRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-700/30 hover:bg-teal-700/50 border border-teal-600/40 text-teal-300 text-sm transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Pulling data…' : 'Pull Satellite Data'}
        </button>
        <button
          onClick={generateReport}
          disabled={generating || snapshots.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-700/30 hover:bg-indigo-700/50 border border-indigo-600/40 text-indigo-300 text-sm transition disabled:opacity-50"
          title={snapshots.length === 0 ? 'Pull satellite data first' : undefined}
        >
          <FileText size={14} className={generating ? 'animate-pulse' : ''} />
          {generating ? 'Generating…' : 'Generate Impact Report'}
        </button>
        {canIssueCredits && (
          <button
            onClick={issueCredits}
            disabled={issuingCredits}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-600/40 text-emerald-300 text-sm transition disabled:opacity-50"
          >
            <Award size={14} />
            {issuingCredits ? 'Issuing…' : 'Issue Water Impact Credits'}
          </button>
        )}
      </div>

      {/* Latest metrics */}
      {latestSnap && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Latest Satellite Snapshot</h3>
            <div className="flex items-center gap-2">
              {latestSnap.isBaseline && (
                <span className="text-[10px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full uppercase tracking-wide">Baseline</span>
              )}
              <span className="text-xs text-slate-500">{latestSnap.captureDate}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <MetricTile
              label="Soil Moisture Index"
              value={fmtPct(latestSnap.metrics.soilMoistureIndex)}
              sub={latestSnap.metrics.soilMoistureIndex >= 0.4 ? 'Healthy' : latestSnap.metrics.soilMoistureIndex >= 0.25 ? 'Moderate' : 'Low'}
              good={latestSnap.metrics.soilMoistureIndex >= 0.4}
              warn={latestSnap.metrics.soilMoistureIndex < 0.2}
            />
            <MetricTile
              label="Surface Water Level"
              value={`${latestSnap.metrics.surfaceWaterLevel.toFixed(2)} m`}
              sub="SWOT adapter"
            />
            <MetricTile
              label="Water Storage Trend"
              value={`${latestSnap.metrics.waterStorageTrend >= 0 ? '+' : ''}${latestSnap.metrics.waterStorageTrend.toFixed(1)} mm/mo`}
              good={latestSnap.metrics.waterStorageTrend > 0}
              warn={latestSnap.metrics.waterStorageTrend < -3}
              sub="GRACE-FO adapter"
            />
            <MetricTile
              label="Drought Risk"
              value={fmtPct(latestSnap.metrics.droughtRisk)}
              sub={latestSnap.metrics.droughtRisk < 0.3 ? 'Low' : latestSnap.metrics.droughtRisk < 0.6 ? 'Moderate' : 'High'}
              good={latestSnap.metrics.droughtRisk < 0.3}
              warn={latestSnap.metrics.droughtRisk > 0.6}
              invertColor
            />
            <MetricTile
              label="Vegetation Stress"
              value={fmtPct(latestSnap.metrics.vegetationStress)}
              sub="NASA GIBS"
              warn={latestSnap.metrics.vegetationStress > 0.6}
              invertColor
            />
            <MetricTile
              label="Confidence Score"
              value={fmtPct(latestSnap.metrics.confidenceScore)}
              good={latestSnap.metrics.confidenceScore >= 0.7}
              sub="5-adapter avg"
            />
          </div>

          {latestSnap.anomalyFlags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {latestSnap.anomalyFlags.map((flag) => (
                <span key={flag} className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  <AlertTriangle size={8} className="inline mr-1" />{flag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Latest impact report */}
      {latestReport && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Latest Impact Report</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide ${VALIDATOR_STATUS_STYLE[latestReport.validatorStatus] ?? VALIDATOR_STATUS_STYLE.pending}`}>
              {statusLabel(latestReport.validatorStatus)}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${scoreColor(latestReport.waterImpactScore)}`}>
                {latestReport.waterImpactScore}
              </div>
              <div className="text-xs text-slate-500">/ 100</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${gradeColor(latestReport.grade)}`}>
                {latestReport.grade}
              </div>
              <div className="text-xs text-slate-500">Grade</div>
            </div>
            <div className="flex-1">
              <ScoreBar value={latestReport.waterImpactScore} />
              <p className="text-xs text-slate-500 mt-1">
                {latestReport.eligibleForCredits
                  ? '✓ Eligible for DPAL Verified Water Impact Credits'
                  : 'Score must reach 70+ for credit eligibility'}
              </p>
            </div>
          </div>

          {/* Component scores */}
          {latestReport.componentScores && (
            <div className="space-y-2">
              <ComponentBar label="Baseline Improvement" value={latestReport.componentScores.baselineImprovement} max={30} />
              <ComponentBar label="Moisture Stability" value={latestReport.componentScores.moistureStability} max={20} />
              <ComponentBar label="Drought Risk Reduction" value={latestReport.componentScores.droughtRiskReduction} max={15} />
              <ComponentBar label="Proof Completeness" value={latestReport.componentScores.proofCompleteness} max={15} />
              <ComponentBar label="Validator Confidence" value={latestReport.componentScores.validatorConfidence} max={20} />
            </div>
          )}

          {/* Findings */}
          {latestReport.findings?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Findings</p>
              {latestReport.findings.map((f, i) => (
                <p key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                  <span className="text-teal-500 mt-0.5 shrink-0">•</span>{f}
                </p>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div className="bg-slate-800/60 rounded-lg px-4 py-3 text-xs text-slate-300 border-l-2 border-teal-600">
            <span className="font-semibold text-teal-400">Recommendation: </span>
            {latestReport.recommendation}
          </div>

          {latestReport.validatorNotes && (
            <div className="bg-slate-800/60 rounded-lg px-4 py-3 text-xs text-slate-300 border-l-2 border-indigo-600">
              <span className="font-semibold text-indigo-400">Validator notes: </span>
              {latestReport.validatorNotes}
            </div>
          )}
        </div>
      )}

      {/* Snapshot history */}
      {snapshots.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Snapshot History ({snapshots.length})</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {snapshots.map((snap) => (
              <div key={snap.snapshotId} className="flex items-start gap-3 text-xs">
                <div className="shrink-0 mt-0.5">
                  <Activity size={12} className="text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">{snap.captureDate}</span>
                    {snap.isBaseline && <span className="text-[9px] bg-teal-500/15 text-teal-400 px-1.5 py-0.5 rounded uppercase">Baseline</span>}
                    {snap.anomalyFlags.length > 0 && (
                      <AlertTriangle size={10} className="text-amber-400" />
                    )}
                  </div>
                  <p className="text-slate-500 truncate">{snap.source} · SMI: {fmtPct(snap.metrics.soilMoistureIndex)} · Drought: {fmtPct(snap.metrics.droughtRisk)}</p>
                </div>
                <span className="text-slate-600 shrink-0">{fmtPct(snap.metrics.confidenceScore)} conf</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project metadata */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Project Details</h3>
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-slate-500">Project ID</dt>
            <dd className="text-slate-300 font-mono text-[10px]">{project.projectId}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Baseline Date</dt>
            <dd className="text-slate-300">{project.baselineDate}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Baseline Water Index</dt>
            <dd className="text-slate-300">{project.baselineWaterIndex.toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Improvement Goal</dt>
            <dd className="text-slate-300 col-span-2">{project.improvementGoal || '—'}</dd>
          </div>
          {project.description && (
            <div className="col-span-2">
              <dt className="text-slate-500">Description</dt>
              <dd className="text-slate-300">{project.description}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

// ── MetricTile ─────────────────────────────────────────────────────────────────

function MetricTile({
  label, value, sub, good, warn, invertColor,
}: {
  label: string; value: string; sub?: string; good?: boolean; warn?: boolean; invertColor?: boolean;
}) {
  const valColor = warn
    ? (invertColor ? 'text-emerald-400' : 'text-rose-400')
    : good
    ? (invertColor ? 'text-rose-400' : 'text-emerald-400')
    : 'text-slate-100';

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
      <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-lg font-bold ${valColor}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── ValidatorView ──────────────────────────────────────────────────────────────

function ValidatorView({ onBack }: { onBack: () => void }) {
  const [queue, setQueue] = useState<ValidatorQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ ok: boolean; queue: ValidatorQueueItem[] }>(
        apiUrl(API_ROUTES.WATER_VALIDATOR_QUEUE)
      );
      setQueue(data.queue);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function decide(reportId: string, decision: 'approved' | 'rejected' | 'needs_evidence') {
    setSubmitting(reportId);
    setNotice('');
    setErr('');
    try {
      await apiFetch(apiUrl(API_ROUTES.WATER_VALIDATOR_REVIEWS), {
        method: 'POST',
        body: JSON.stringify({
          reportId,
          validatorId: 'demo-validator-001',
          validatorName: 'Demo Validator',
          decision,
          notes: notes[reportId] ?? '',
          trustScore: 0.85,
        }),
      });
      setNotice(`Report ${reportId.slice(-6)} marked as ${decision}.`);
      await loadQueue();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Validator Review Queue</h2>
          <p className="text-xs text-slate-400">Review water impact reports and approve or reject them</p>
        </div>
        <button onClick={loadQueue} className="ml-auto p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {notice && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg px-4 py-3 text-sm text-teal-300">
          <CheckCircle size={14} className="inline mr-2" />{notice}
        </div>
      )}
      {err && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-300">{err}</div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-10 justify-center text-slate-400 text-sm">
          <RefreshCw size={16} className="animate-spin" /> Loading queue…
        </div>
      )}

      {!loading && queue.length === 0 && (
        <div className="text-center py-16">
          <ShieldCheck size={40} className="mx-auto text-teal-500/40 mb-3" />
          <p className="text-slate-400 text-sm">No pending reports in the validator queue.</p>
          <p className="text-slate-500 text-xs mt-1">Generate a report from a project to populate this queue.</p>
        </div>
      )}

      {queue.map((item) => {
        const { icon, label } = projectTypeInfo(item.project?.projectType ?? 'other');
        const busy = submitting === item.reportId;
        return (
          <div key={item.reportId} className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span>{icon}</span>
                  <p className="font-semibold text-slate-100 text-sm">{item.project?.projectName ?? item.projectId}</p>
                </div>
                <p className="text-xs text-slate-500">{label} · {item.project?.location.country} · Report {item.reportId.slice(-8)}</p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${scoreColor(item.waterImpactScore)}`}>{item.waterImpactScore}</div>
                <div className="text-xs text-slate-500">/ 100 · Grade {item.grade}</div>
              </div>
            </div>

            {/* Score bar */}
            <ScoreBar value={item.waterImpactScore} />

            {/* Findings */}
            {item.findings?.length > 0 && (
              <div className="space-y-1">
                {item.findings.slice(0, 3).map((f, i) => (
                  <p key={i} className="text-xs text-slate-400 flex gap-1.5">
                    <span className="text-teal-500 shrink-0 mt-0.5">•</span>{f}
                  </p>
                ))}
              </div>
            )}

            {/* Eligibility badge */}
            <div className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${item.eligibleForCredits ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-slate-700/40 text-slate-400 border-slate-600'}`}>
              {item.eligibleForCredits ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
              {item.eligibleForCredits ? 'Credit-eligible (score ≥ 70)' : 'Not yet credit-eligible'}
            </div>

            {/* Period */}
            <p className="text-xs text-slate-500">
              Monitoring period: {item.periodStart} → {item.periodEnd}
            </p>

            {/* Notes */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Validator notes</label>
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
                rows={2}
                placeholder="Add context or evidence requests…"
                value={notes[item.reportId] ?? ''}
                onChange={(e) => setNotes((n) => ({ ...n, [item.reportId]: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => decide(item.reportId, 'approved')}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-600/40 text-emerald-300 text-xs font-medium transition disabled:opacity-50"
              >
                <CheckCircle size={13} />Approve
              </button>
              <button
                onClick={() => decide(item.reportId, 'needs_evidence')}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-700/30 hover:bg-amber-700/50 border border-amber-600/40 text-amber-300 text-xs font-medium transition disabled:opacity-50"
              >
                <FileText size={13} />Request Evidence
              </button>
              <button
                onClick={() => decide(item.reportId, 'rejected')}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-700/20 hover:bg-rose-700/40 border border-rose-600/30 text-rose-300 text-xs font-medium transition disabled:opacity-50"
              >
                <AlertTriangle size={13} />Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CreditsView ────────────────────────────────────────────────────────────────

function CreditsView({ onBack }: { onBack: () => void }) {
  const [credits, setCredits] = useState<WaterCredit[]>([]);
  const [feed, setFeed] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cd, fd] = await Promise.all([
        apiFetch<{ ok: boolean; credits: WaterCredit[] }>(apiUrl(API_ROUTES.WATER_CREDITS)),
        apiFetch<{ ok: boolean; feed: TxRecord[] }>(apiUrl(API_ROUTES.WATER_ACTIVITY_FEED)),
      ]);
      setCredits(cd.credits);
      setFeed(fd.feed);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function listCredit(creditId: string) {
    setBusy(creditId);
    setNotice(''); setErr('');
    try {
      const pricePerKL = parseFloat(priceInput[creditId] ?? '0.05') || 0.05;
      await apiFetch(WATER_CREDIT_LIST(creditId), { method: 'PATCH', body: JSON.stringify({ pricePerKL }) });
      setNotice('Credit listed on DPAL Water Impact Marketplace.');
      await load();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(null);
    }
  }

  async function retireCredit(creditId: string) {
    setBusy(creditId);
    setNotice(''); setErr('');
    try {
      await apiFetch(WATER_CREDIT_RETIRE(creditId), { method: 'PATCH' });
      setNotice('Credit permanently retired — water impact offset claimed.');
      await load();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(null);
    }
  }

  const totalKL = credits.reduce((s, c) => s + c.amountKiloLitres, 0);
  const verifiedKL = credits.filter((c) => c.verificationStatus === 'verified').reduce((s, c) => s + c.amountKiloLitres, 0);
  const listedCount = credits.filter((c) => c.marketplaceStatus === 'listed').length;
  const retiredCount = credits.filter((c) => c.marketplaceStatus === 'retired').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Water Impact Credits</h2>
          <p className="text-xs text-slate-400">DPAL Verified Water Impact Credits — internal system (pending third-party certification)</p>
        </div>
      </div>

      {notice && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg px-4 py-3 text-sm text-teal-300">
          <CheckCircle size={14} className="inline mr-2" />{notice}
        </div>
      )}
      {err && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-300">{err}</div>
      )}

      {/* Portfolio stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Credits', value: fmtKL(totalKL), icon: <Droplets size={16} className="text-teal-400" /> },
          { label: 'Verified', value: fmtKL(verifiedKL), icon: <ShieldCheck size={16} className="text-emerald-400" /> },
          { label: 'Listed', value: String(listedCount), icon: <Globe size={16} className="text-indigo-400" /> },
          { label: 'Retired', value: String(retiredCount), icon: <Award size={16} className="text-violet-400" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
            {icon}
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-bold text-slate-100">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer banner */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-3 text-xs text-amber-300">
        <AlertTriangle size={12} className="inline mr-1.5" />
        <strong>Internal Credits Only:</strong> DPAL Verified Water Impact Credits are an internal measurement and recognition system. They do not represent regulated environmental commodities. Third-party certification integration is planned for future releases.
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
          <RefreshCw size={16} className="animate-spin" /> Loading credits…
        </div>
      )}

      {!loading && credits.length === 0 && (
        <div className="text-center py-16">
          <Award size={40} className="mx-auto text-teal-500/30 mb-3" />
          <p className="text-slate-400 text-sm">No water impact credits yet.</p>
          <p className="text-slate-500 text-xs mt-1">Approve a project and generate an impact report with score ≥ 70 to issue credits.</p>
        </div>
      )}

      {/* Credit cards */}
      <div className="space-y-4">
        {credits.map((credit) => {
          const isBusy = busy === credit.creditId;
          return (
            <div key={credit.creditId} className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Droplets size={16} className="text-teal-400" />
                    <p className="font-semibold text-slate-100 text-sm">{fmtKL(credit.amountKiloLitres)}</p>
                    <span className="text-xs text-slate-500">DPAL Verified Water Impact</span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{credit.creditId}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide ${MARKETPLACE_STYLE[credit.marketplaceStatus] ?? MARKETPLACE_STYLE.not_listed}`}>
                  {statusLabel(credit.marketplaceStatus)}
                </span>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Issued</dt>
                  <dd className="text-slate-300">{new Date(credit.issuedAt).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Verification</dt>
                  <dd className="text-slate-300 capitalize">{credit.verificationStatus}</dd>
                </div>
                {credit.pricePerKL && (
                  <div>
                    <dt className="text-slate-500">Price / KL</dt>
                    <dd className="text-slate-300">${credit.pricePerKL}</dd>
                  </div>
                )}
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-slate-500">Blockchain Hash</dt>
                  <dd className="text-slate-300 font-mono text-[10px] truncate">{credit.blockchainHash}</dd>
                </div>
              </dl>

              {credit.marketplaceStatus === 'retired' && credit.retirementCertHash && (
                <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-xs">
                  <span className="text-violet-400 font-medium">Retirement Certificate: </span>
                  <span className="text-slate-400 font-mono">{credit.retirementCertHash}</span>
                </div>
              )}

              {/* Actions */}
              {credit.marketplaceStatus === 'not_listed' && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.001"
                    placeholder="Price / KL ($)"
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-200 w-32 focus:outline-none focus:border-teal-500"
                    value={priceInput[credit.creditId] ?? ''}
                    onChange={(e) => setPriceInput((p) => ({ ...p, [credit.creditId]: e.target.value }))}
                  />
                  <button
                    onClick={() => listCredit(credit.creditId)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-700/30 hover:bg-teal-700/50 border border-teal-600/40 text-teal-300 text-xs transition disabled:opacity-50"
                  >
                    <Globe size={12} />List on Marketplace
                  </button>
                  <button
                    onClick={() => retireCredit(credit.creditId)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-700/20 hover:bg-violet-700/40 border border-violet-600/30 text-violet-300 text-xs transition disabled:opacity-50"
                  >
                    <Award size={12} />Retire
                  </button>
                </div>
              )}
              {credit.marketplaceStatus === 'listed' && (
                <button
                  onClick={() => retireCredit(credit.creditId)}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-700/20 hover:bg-violet-700/40 border border-violet-600/30 text-violet-300 text-xs transition disabled:opacity-50"
                >
                  <Award size={12} />Retire Credit
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Activity feed */}
      {feed.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Transaction Feed</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {feed.slice(0, 15).map((tx) => (
              <div key={tx.txId} className="flex items-start gap-3 text-xs">
                <div className="shrink-0 mt-0.5">
                  {tx.txType === 'issue'  && <Zap size={11} className="text-teal-400" />}
                  {tx.txType === 'list'   && <Globe size={11} className="text-indigo-400" />}
                  {tx.txType === 'retire' && <Award size={11} className="text-violet-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 truncate">{tx.note}</p>
                  <p className="text-slate-500 font-mono text-[10px]">{tx.blockchainHash}</p>
                </div>
                <span className="text-slate-600 shrink-0 whitespace-nowrap">{relTime(tx.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SatelliteLiveFeed ──────────────────────────────────────────────────────────

interface SatellitePreview {
  capturedAt: string;
  adapters: {
    smap:      { ok: boolean; soilMoistureIndex?: number; confidenceScore?: number };
    swot:      { ok: boolean; surfaceWaterLevel?: number; waterExtentKm2?: number; confidenceScore?: number };
    grace:     { ok: boolean; waterStorageTrend?: number; confidenceScore?: number };
    gibs:      { ok: boolean; vegetationStress?: number; ndviIndex?: number; confidenceScore?: number };
    copernicus:{ ok: boolean; droughtRisk?: number; precipAnomalyMm?: number; confidenceScore?: number };
  };
  summary: {
    soilMoistureIndex: number;
    surfaceWaterLevel: number;
    waterStorageTrend: number;
    vegetationStress: number;
    droughtRisk: number;
    confidenceScore: number;
  };
}

function AdapterBadge({ name, ok, conf }: { name: string; ok: boolean; conf?: number }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wide
      ${ok ? 'bg-teal-500/10 text-teal-300 border-teal-500/30' : 'bg-slate-700/40 text-slate-500 border-slate-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-teal-400 animate-pulse' : 'bg-slate-600'}`} />
      {name}
      {ok && conf != null && <span className="text-teal-500/80">{Math.round(conf * 100)}%</span>}
    </div>
  );
}

function SatelliteLiveFeed() {
  const [data, setData] = useState<SatellitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const result = await apiFetch<{ ok: boolean } & SatellitePreview>(
        apiUrl(API_ROUTES.WATER_SATELLITE_PREVIEW)
      );
      setData(result);
      setLastRefresh(new Date());
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;

  return (
    <div className="bg-slate-900/80 border border-cyan-700/30 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Waves size={18} className="text-cyan-400" />
            {!loading && !err && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-cyan-300 uppercase tracking-widest">Live Satellite Readings</p>
            {lastRefresh && (
              <p className="text-[10px] text-slate-500">Updated {lastRefresh.toLocaleTimeString()}</p>
            )}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-800/20 hover:bg-cyan-700/30 border border-cyan-700/30 text-cyan-400 text-xs transition disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Fetching…' : 'Refresh'}
        </button>
      </div>

      {/* Adapter status badges */}
      <div className="flex flex-wrap gap-2">
        <AdapterBadge name="SMAP"       ok={data?.adapters.smap.ok ?? false}       conf={data?.adapters.smap.confidenceScore} />
        <AdapterBadge name="SWOT"       ok={data?.adapters.swot.ok ?? false}       conf={data?.adapters.swot.confidenceScore} />
        <AdapterBadge name="GRACE-FO"   ok={data?.adapters.grace.ok ?? false}      conf={data?.adapters.grace.confidenceScore} />
        <AdapterBadge name="NASA GIBS"  ok={data?.adapters.gibs.ok ?? false}       conf={data?.adapters.gibs.confidenceScore} />
        <AdapterBadge name="Copernicus" ok={data?.adapters.copernicus.ok ?? false} conf={data?.adapters.copernicus.confidenceScore} />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 text-slate-500 text-xs">
          <RefreshCw size={14} className="animate-spin text-teal-400" />
          Contacting satellites…
        </div>
      )}

      {err && !loading && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle size={12} />
          {err} — check Railway backend connection
        </div>
      )}

      {s && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricTile
            label="Soil Moisture Index"
            value={fmtPct(s.soilMoistureIndex)}
            sub="NASA SMAP"
            good={s.soilMoistureIndex >= 0.4}
            warn={s.soilMoistureIndex < 0.2}
          />
          <MetricTile
            label="Surface Water Level"
            value={`${s.surfaceWaterLevel.toFixed(2)} m`}
            sub="NASA SWOT"
          />
          <MetricTile
            label="Water Storage Trend"
            value={`${s.waterStorageTrend >= 0 ? '+' : ''}${s.waterStorageTrend.toFixed(1)} mm/mo`}
            sub="GRACE-FO"
            good={s.waterStorageTrend > 0}
            warn={s.waterStorageTrend < -3}
          />
          <MetricTile
            label="Drought Risk"
            value={fmtPct(s.droughtRisk)}
            sub="Copernicus"
            good={s.droughtRisk < 0.3}
            warn={s.droughtRisk > 0.6}
            invertColor
          />
          <MetricTile
            label="Vegetation Stress"
            value={fmtPct(s.vegetationStress)}
            sub="NASA GIBS"
            warn={s.vegetationStress > 0.6}
            invertColor
          />
          <MetricTile
            label="Avg Confidence"
            value={fmtPct(s.confidenceScore)}
            sub="5-adapter avg"
            good={s.confidenceScore >= 0.7}
          />
        </div>
      )}

      <p className="text-[10px] text-slate-600 border-t border-slate-800 pt-3">
        Demo readings · 5 NASA/ESA adapters · Los Angeles basin reference polygon · Real integrations pending
      </p>
    </div>
  );
}

// ── Dashboard (main view) ──────────────────────────────────────────────────────

function Dashboard({
  onViewProject,
  onCreateProject,
  onOpenValidator,
  onOpenCredits,
}: {
  onViewProject: (id: string) => void;
  onCreateProject: () => void;
  onOpenValidator: () => void;
  onOpenCredits: () => void;
}) {
  const [projects, setProjects] = useState<WaterProject[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [feed, setFeed] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showGlobe, setShowGlobe] = useState(true);

  // Convert WaterProject[] → WaterProjectPin[] for the globe
  const globePins = useMemo<WaterProjectPin[]>(() =>
    projects
      .filter((p) => p.location?.gpsCenter?.lat && p.location?.gpsCenter?.lng)
      .map((p) => ({
        projectId:   p.projectId,
        projectName: p.projectName,
        projectType: p.projectType,
        status:      p.status,
        country:     p.location.country,
        city:        p.location.city,
        totalAcres:  p.totalAcres,
        lat:         p.location.gpsCenter.lat,
        lng:         p.location.gpsCenter.lng,
      })),
    [projects]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [pd, sd, fd] = await Promise.all([
          apiFetch<{ ok: boolean; projects: WaterProject[] }>(apiUrl(API_ROUTES.WATER_PROJECTS)),
          apiFetch<{ ok: boolean; stats: PlatformStats }>(apiUrl(API_ROUTES.WATER_STATS)),
          apiFetch<{ ok: boolean; feed: TxRecord[] }>(apiUrl(API_ROUTES.WATER_ACTIVITY_FEED)),
        ]);
        setProjects(pd.projects);
        setStats(sd.stats);
        setFeed(fd.feed);
      } catch (ex: unknown) {
        setErr(ex instanceof Error ? ex.message : String(ex));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-900/80 via-slate-900 to-slate-900 border border-teal-700/30 p-6 sm:p-8">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #14b8a6 0%, transparent 60%), radial-gradient(circle at 80% 20%, #0ea5e9 0%, transparent 50%)' }}
        />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Waves size={22} className="text-teal-400" />
              <span className="text-xs font-semibold text-teal-400 uppercase tracking-widest">DPAL Water Monitor</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Verified Water Impact</h1>
            <p className="text-slate-400 text-sm max-w-md">
              Satellite-driven water conservation monitoring. Register projects, track soil moisture and drought indicators, generate impact reports, and issue DPAL Verified Water Impact Credits.
            </p>
          </div>
          <button
            onClick={onCreateProject}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm transition shadow-lg shadow-teal-900/40"
          >
            <Plus size={16} />Register Project
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-300">{err}</div>
      )}

      {/* Live Satellite Feed — always visible, no project needed */}
      <SatelliteLiveFeed />

      {/* Platform stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Projects',   value: String(stats.totalProjects),   icon: <Globe size={16} className="text-teal-400" /> },
            { label: 'Approved',         value: String(stats.approvedProjects), icon: <ShieldCheck size={16} className="text-emerald-400" /> },
            { label: 'Credits Issued',   value: fmtKL(stats.totalCreditsKL),   icon: <Award size={16} className="text-violet-400" /> },
            { label: 'Listed on Market', value: String(stats.listedCredits),   icon: <BarChart2 size={16} className="text-indigo-400" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              {icon}
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-bold text-slate-100">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* World Map */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Globe size={15} className="text-teal-400" />
            <span className="text-sm font-semibold text-slate-200">Project World Map</span>
            {globePins.length > 0 && (
              <span className="text-[10px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                {globePins.length} project{globePins.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowGlobe((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 transition px-2 py-1 rounded hover:bg-slate-800"
          >
            {showGlobe ? 'Hide' : 'Show'}
          </button>
        </div>
        {showGlobe && (
          <WaterGlobe
            projects={globePins}
            onSelectProject={onViewProject}
            height="h-[380px]"
          />
        )}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Validator Queue', icon: <ShieldCheck size={18} className="text-amber-400" />, desc: 'Review pending impact reports', onClick: onOpenValidator, accent: 'border-amber-700/40 hover:border-amber-500/60' },
          { label: 'Water Credits', icon: <Award size={18} className="text-violet-400" />, desc: 'Manage and trade impact credits', onClick: onOpenCredits, accent: 'border-violet-700/40 hover:border-violet-500/60' },
          { label: 'Register Project', icon: <Plus size={18} className="text-teal-400" />, desc: 'Start a new water project', onClick: onCreateProject, accent: 'border-teal-700/40 hover:border-teal-500/60' },
        ].map(({ label, icon, desc, onClick, accent }) => (
          <button
            key={label}
            onClick={onClick}
            className={`text-left bg-slate-900 border rounded-xl p-4 transition group ${accent}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {icon}
              <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition">{label}</span>
            </div>
            <p className="text-xs text-slate-500">{desc}</p>
          </button>
        ))}
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-200">Water Projects</h2>
          <button onClick={onCreateProject} className="text-xs text-teal-400 hover:text-teal-300 transition flex items-center gap-1">
            <Plus size={12} />Add
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
            <RefreshCw size={16} className="animate-spin" /> Loading…
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-dashed border-slate-700 rounded-xl">
            <Droplets size={36} className="mx-auto text-teal-500/30 mb-3" />
            <p className="text-slate-400 text-sm">No water projects registered yet.</p>
            <button onClick={onCreateProject} className="mt-3 text-teal-400 text-xs hover:underline">Register your first project →</button>
          </div>
        )}

        <div className="space-y-3">
          {projects.map((p) => (
            <ProjectCard key={p.projectId} project={p} onClick={() => onViewProject(p.projectId)} />
          ))}
        </div>
      </div>

      {/* Activity feed */}
      {feed.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {feed.slice(0, 8).map((tx) => (
              <div key={tx.txId} className="flex items-start gap-3 text-xs">
                <span className="shrink-0 mt-0.5">
                  {tx.txType === 'issue'  && <Zap size={11} className="text-teal-400" />}
                  {tx.txType === 'list'   && <Globe size={11} className="text-indigo-400" />}
                  {tx.txType === 'retire' && <Award size={11} className="text-violet-400" />}
                </span>
                <p className="text-slate-400 flex-1 truncate">{tx.note}</p>
                <span className="text-slate-600 shrink-0">{relTime(tx.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WaterMonitorView (root) ────────────────────────────────────────────────────

type SubView = 'dashboard' | 'create' | 'project' | 'validator' | 'credits';

export default function WaterMonitorView({ onReturn }: WaterMonitorViewProps) {
  const [subView, setSubView] = useState<SubView>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string>('');

  function goProject(id: string) {
    setActiveProjectId(id);
    setSubView('project');
  }

  function handleProjectCreated(p: WaterProject) {
    goProject(p.projectId);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={onReturn}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            aria-label="Return to main menu"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Waves size={18} className="text-teal-400" />
            <span className="text-sm font-semibold text-slate-100">Water Monitor</span>
          </div>

          {/* Nav tabs */}
          <nav className="ml-4 flex items-center gap-1">
            {([
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'validator', label: 'Validator' },
              { id: 'credits',   label: 'Credits' },
            ] as { id: SubView; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSubView(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  subView === id
                    ? 'bg-teal-700/30 text-teal-300'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {subView === 'dashboard' && (
          <Dashboard
            onViewProject={goProject}
            onCreateProject={() => setSubView('create')}
            onOpenValidator={() => setSubView('validator')}
            onOpenCredits={() => setSubView('credits')}
          />
        )}
        {subView === 'create' && (
          <CreateProjectForm
            onCreated={handleProjectCreated}
            onCancel={() => setSubView('dashboard')}
          />
        )}
        {subView === 'project' && activeProjectId && (
          <ProjectDetailView
            projectId={activeProjectId}
            onBack={() => setSubView('dashboard')}
          />
        )}
        {subView === 'validator' && (
          <ValidatorView onBack={() => setSubView('dashboard')} />
        )}
        {subView === 'credits' && (
          <CreditsView onBack={() => setSubView('dashboard')} />
        )}
      </div>
    </div>
  );
}
