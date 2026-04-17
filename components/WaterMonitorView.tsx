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

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadGoogleMaps } from '../services/googleMapsLoader';
import { WaterGlobe, type WaterProjectPin, type WaterAlertPin, type WaterAlertType } from './WaterGlobe';
import { GibsTileViewer } from './GibsTileViewer';
import { SatelliteAiInsight } from './SatelliteAiInsight';
import { isAiEnabled, runGeminiPrompt } from '../services/geminiService';
import { apiUrl as buildApiUrl, API_ROUTES as ALL_ROUTES } from '../constants';
import {
  ArrowLeft, MapPin, CheckCircle, AlertTriangle, Activity,
  ShieldCheck, Award, Zap, Plus, RefreshCw, Eye,
  Droplets, Waves, TrendingUp, TrendingDown, Globe, ChevronRight,
  FileText, BarChart2, Star, Clock, Filter, Sparkles, X, Bot, Send,
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

type WaterImpactAidMessage = { role: 'assistant' | 'user'; text: string };

interface WaterImpactAidChatProps {
  data: Record<string, unknown> | null;
  project?: {
    name?: string;
    type?: string;
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
    goal?: string;
  } | null;
}

function buildWaterImpactAidPrompt({
  data,
  project,
  question,
}: WaterImpactAidChatProps & { question: string }): string {
  const location = [project?.city, project?.country].filter(Boolean).join(', ') || 'the monitored area';
  const projectContext = [
    project?.name ? `Project: ${project.name}.` : 'Project: no registered water project selected.',
    project?.type ? `Project type: ${project.type.replace(/_/g, ' ')}.` : '',
    project?.goal ? `Improvement goal: ${project.goal}.` : '',
    project?.lat != null && project?.lng != null ? `Coordinates: ${project.lat.toFixed(5)}, ${project.lng.toFixed(5)}.` : '',
  ].filter(Boolean).join(' ');

  return `You are DPAL's water impact assistant. Help a non-expert understand water satellite readings and turn them into practical support for a person, community, farm, school, watershed, or project.

Location: ${location}
${projectContext}

Latest available water data:
${JSON.stringify(data || {}, null, 2)}

User question:
${question}

Answer in plain English. Be honest about missing or low-confidence data; never invent values. Organize the answer into:
1. What might be happening
2. What issues or risks to check first
3. What can be done to fix or reduce harm
4. How DPAL users could help the person, community, or project

Focus on water access, drought risk, irrigation waste, flooding/pooling, leaks, vegetation stress, proof to collect, and near-term help. Keep it specific, compassionate, and action-oriented.`;
}

function WaterImpactAidChat({ data, project }: WaterImpactAidChatProps) {
  const [messages, setMessages] = useState<WaterImpactAidMessage[]>([]);
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
      const prompt = buildWaterImpactAidPrompt({ data, project, question: trimmed });
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

  return (
    <div className="rounded-xl border border-cyan-700/30 bg-cyan-950/10 p-4 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Water Impact Helper</p>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Ask what the water readings could mean, what needs verification, what fixes are realistic, and how DPAL can organize help.
            </p>
          </div>
        </div>
        <button
          onClick={() => askImpactAid(defaultQuestion)}
          disabled={!aiReady || loadingImpactAid}
          className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition-colors"
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
                  : 'bg-cyan-700/20 border border-cyan-600/30 text-cyan-100 ml-8'
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
          placeholder="Ask: who needs help, what should we verify, or what water fix should come first?"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500 disabled:opacity-50"
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
  sarWaterFraction?: number;
  sarVvDb?: number;
  sarFloodRisk?: number;
  sarCaptureDate?: string;
  sarSource?: string;
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

// ── Satellite imagery map for project detail view (Google Maps) ───────────────

function WaterSnapshotMap({ lat, lng, projectName, totalAcres, soilMoisture }: {
  lat: number; lng: number; projectName: string; totalAcres: number; soilMoisture?: number;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapErr, setMapErr]     = useState(false);

  const hasCoords = lat && lng && (lat !== 0 || lng !== 0);

  useEffect(() => {
    if (!hasCoords || !mapDivRef.current) return;
    let cancelled = false;
    const ringColor = soilMoisture != null
      ? (soilMoisture >= 0.4 ? '#14b8a6' : soilMoisture >= 0.25 ? '#f59e0b' : '#f43f5e')
      : '#14b8a6';
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
        strokeColor: ringColor,
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        fillColor: ringColor,
        fillOpacity: 0.07,
      });
      new g.maps.InfoWindow({
        content: `<div style="font-family:monospace;font-size:11px;padding:6px 8px;background:#0f172a;color:#e2e8f0;border-radius:6px">
          <strong>${projectName}</strong><br/>
          ${totalAcres.toLocaleString()} acres
          ${soilMoisture != null ? `<br/><span style="color:${ringColor}">Soil moisture ${(soilMoisture * 100).toFixed(0)}%</span>` : ''}
        </div>`,
        position: { lat, lng },
      }).open(map);
      setMapReady(true);
    }).catch(() => { if (!cancelled) setMapErr(true); });

    return () => { cancelled = true; };
  }, [lat, lng, totalAcres, soilMoisture, hasCoords]);

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
          <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
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

// ── AI suggestion types ────────────────────────────────────────────────────────

interface AiProjectSuggestion {
  description: string;
  improvementGoal: string;
  challenges: string[];
  approach: string;
}

const PROJECT_TYPE_CONTEXT: Record<string, string> = {
  farm_irrigation:           'agricultural irrigation efficiency and crop water management',
  reservoir_monitoring:      'reservoir level tracking, evaporation losses, and water storage capacity',
  wetland_restoration:       'wetland ecosystem recovery, biodiversity, and natural water filtration',
  leak_reduction:            'infrastructure leak detection, pipeline integrity, and water loss prevention',
  community_conservation:    'community water access, equitable distribution, and local stewardship',
  drought_response:          'drought resilience, emergency water supply, and demand management',
  school_or_facility_savings:'institutional water efficiency, fixture upgrades, and behavioral conservation',
  other:                     'water conservation and sustainable water management',
};

async function generateWaterProjectSuggestions(
  form: CreateFormState
): Promise<AiProjectSuggestion[]> {
  const typeContext = PROJECT_TYPE_CONTEXT[form.projectType] || 'water conservation';
  const locationParts = [form.city, form.region, form.country].filter(Boolean).join(', ');
  const location = locationParts || 'the project area';
  const nameHint = form.projectName.trim() ? `named "${form.projectName.trim()}"` : '';
  const acresHint = form.totalAcres ? `covering approximately ${form.totalAcres} acres` : '';

  const prompt = `You are a water conservation and environmental monitoring expert. A user is registering a water project on the DPAL satellite monitoring platform.

Project context:
- Type: ${PROJECT_TYPES.find(t => t.key === form.projectType)?.label ?? form.projectType}
- Focus area: ${typeContext}
- Location: ${location}
- Project name: ${nameHint || '(not yet named)'}
- ${acresHint || ''}

Generate 3 different AI-assisted project descriptions tailored to this specific project type and location. Each must be grounded in real water challenges for this area.

Respond ONLY with a JSON array of exactly 3 objects, no extra text:
[
  {
    "description": "2-3 sentence project description mentioning specific local water challenges and the monitoring approach",
    "improvementGoal": "specific measurable goal with timeframe e.g. reduce irrigation by 25% in 12 months",
    "challenges": ["challenge 1", "challenge 2", "challenge 3"],
    "approach": "one-sentence monitoring strategy"
  },
  ...
]

Be specific to ${location}. If the location mentions Colorado River, reference over-allocation, drought, salinity, agricultural demand, or tribal water rights as relevant. If it mentions farms, reference irrigation efficiency and soil moisture targets. If it mentions leaks, reference loss percentages and detection methods.`;

  const res = await fetch(buildApiUrl(ALL_ROUTES.AI_GEMINI), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.7, maxOutputTokens: 1200 },
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const json = await res.json() as { text?: string; candidates?: { content: { parts: { text: string }[] } }[] };
  const raw = json.text ?? json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Extract JSON array from response
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI returned unexpected format');
  return JSON.parse(match[0]) as AiProjectSuggestion[];
}

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

  // AI suggestion state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const [suggestions, setSuggestions] = useState<AiProjectSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof CreateFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // Clear suggestions when type or location changes significantly
  const prevTypeRef = useRef(form.projectType);
  useEffect(() => {
    if (prevTypeRef.current !== form.projectType) {
      setSuggestions([]);
      setSelectedSuggestion(null);
      prevTypeRef.current = form.projectType;
    }
  }, [form.projectType]);

  async function handleAiSuggest() {
    setAiLoading(true);
    setAiErr('');
    setSuggestions([]);
    setSelectedSuggestion(null);
    try {
      const results = await generateWaterProjectSuggestions(form);
      setSuggestions(results);
      setTimeout(() => suggestionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    } catch (ex: unknown) {
      setAiErr(ex instanceof Error ? ex.message : 'AI suggestion failed. Check AI is enabled.');
    } finally {
      setAiLoading(false);
    }
  }

  function applySuggestion(idx: number) {
    const s = suggestions[idx];
    if (!s) return;
    setSelectedSuggestion(idx);
    setForm((f) => ({
      ...f,
      description: s.description,
      improvementGoal: s.improvementGoal,
    }));
  }

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
  const aiEnabled = isAiEnabled();
  const canSuggest = aiEnabled && (form.projectType || form.city || form.country || form.projectName);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft className="w-[18px] h-[18px]" />
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
              <input className={inputCls} placeholder="e.g. Colorado River Farm Conservation" value={form.projectName} onChange={set('projectName')} required />
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

            {/* Description with AI button */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + ' mb-0'}>Description</label>
                {aiEnabled ? (
                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={aiLoading || !canSuggest}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-700/25 hover:bg-violet-700/40 border border-violet-600/40 text-violet-300 text-[11px] font-semibold transition disabled:opacity-40"
                  >
                    <Sparkles className={`w-3 h-3 ${aiLoading ? 'animate-pulse' : ''}`} />
                    {aiLoading ? 'Generating…' : 'Suggest with AI'}
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-600">AI not configured</span>
                )}
              </div>
              <textarea
                className={inputCls}
                rows={3}
                placeholder="Describe the water source, current challenge, and conservation approach… or click 'Suggest with AI' above"
                value={form.description}
                onChange={set('description') as never}
              />
            </div>
          </div>

          {/* AI error */}
          {aiErr && (
            <div className="flex items-center gap-2 bg-rose-950/30 border border-rose-800/40 rounded-lg px-3 py-2 text-xs text-rose-400">
              <AlertTriangle className="w-3 h-3 shrink-0" />{aiErr}
            </div>
          )}

          {/* AI Suggestions panel */}
          {suggestions.length > 0 && (
            <div ref={suggestionsRef} className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <p className="text-xs font-semibold text-violet-300">AI Suggestions — click one to apply</p>
                <span className="text-[10px] text-slate-500 ml-auto">Based on your project type &amp; location</span>
              </div>

              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 cursor-pointer transition-all space-y-3 ${
                    selectedSuggestion === idx
                      ? 'border-violet-500/60 bg-violet-900/20 ring-1 ring-violet-500/30'
                      : 'border-slate-700 bg-slate-800/60 hover:border-violet-600/40 hover:bg-slate-800'
                  }`}
                  onClick={() => applySuggestion(idx)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                      Option {idx + 1}
                    </span>
                    {selectedSuggestion === idx ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                        <CheckCircle className="w-3 h-3" /> Applied
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Click to apply</span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-200 leading-relaxed">{s.description}</p>

                  {/* Goal */}
                  <div className="bg-teal-900/20 border border-teal-700/30 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-wide mb-0.5">Improvement Goal</p>
                    <p className="text-xs text-teal-200">{s.improvementGoal}</p>
                  </div>

                  {/* Challenges */}
                  {s.challenges?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Key challenges identified</p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.challenges.map((c, ci) => (
                          <span key={ci} className="text-[10px] bg-amber-900/20 border border-amber-700/30 text-amber-300 px-2 py-0.5 rounded-full">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approach */}
                  {s.approach && (
                    <p className="text-[10px] text-slate-400 italic border-t border-slate-700/50 pt-2">{s.approach}</p>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={aiLoading}
                className="w-full text-[10px] text-slate-500 hover:text-violet-400 transition py-1 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${aiLoading ? 'animate-spin' : ''}`} />
                Regenerate suggestions
              </button>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Country *</label>
              <input className={inputCls} placeholder="e.g. USA" value={form.country} onChange={set('country')} required />
            </div>
            <div>
              <label className={labelCls}>Region / State</label>
              <input className={inputCls} placeholder="e.g. Arizona" value={form.region} onChange={set('region')} />
            </div>
            <div>
              <label className={labelCls}>City / Area</label>
              <input className={inputCls} placeholder="e.g. Colorado River Basin" value={form.city} onChange={set('city')} />
            </div>
            <div>
              <label className={labelCls}>GPS Latitude</label>
              <input className={inputCls} type="number" step="any" placeholder="e.g. 36.1069" value={form.lat} onChange={set('lat')} />
            </div>
            <div>
              <label className={labelCls}>GPS Longitude</label>
              <input className={inputCls} type="number" step="any" placeholder="e.g. -114.0596" value={form.lng} onChange={set('lng')} />
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-slate-600 bg-slate-800/50 p-4 text-center">
            <MapPin className="w-5 h-5 mx-auto text-teal-500 mb-2" />
            <p className="text-xs text-slate-400 font-medium">GPS center coordinates are used for satellite data queries</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Interactive boundary drawing coming in a future update</p>
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
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + ' mb-0'}>Improvement Goal</label>
                {selectedSuggestion !== null && suggestions[selectedSuggestion]?.improvementGoal && (
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5" /> Filled by AI
                  </span>
                )}
              </div>
              <input
                className={inputCls}
                placeholder="e.g. Reduce Colorado River water usage by 30% within 18 months"
                value={form.improvementGoal}
                onChange={set('improvementGoal')}
              />
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
            {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
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
  onGpsSaved,
}: {
  project: WaterProject;
  onClick: () => void;
  onGpsSaved?: (projectId: string, lat: number, lng: number) => void;
}) {
  const { icon, label } = projectTypeInfo(project.projectType);
  const [editingGps, setEditingGps] = useState(false);
  const [latVal, setLatVal]         = useState(String(project.location.gpsCenter?.lat || ''));
  const [lngVal, setLngVal]         = useState(String(project.location.gpsCenter?.lng || ''));
  const [saving, setSaving]         = useState(false);
  const [gpsErr, setGpsErr]         = useState('');

  const hasGps = project.location.gpsCenter?.lat && project.location.gpsCenter?.lng;
  const gpsLabel = hasGps
    ? `${project.location.gpsCenter.lat.toFixed(4)}, ${project.location.gpsCenter.lng.toFixed(4)}`
    : 'No GPS set';

  async function saveGps(e: React.MouseEvent) {
    e.stopPropagation();
    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setGpsErr('Lat: −90–90 · Lng: −180–180. US locations need negative longitude.');
      return;
    }
    setSaving(true);
    setGpsErr('');
    try {
      await apiFetch(WATER_PROJECT_DETAIL(project.projectId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: { ...project.location, gpsCenter: { lat, lng } },
        }),
      });
      setEditingGps(false);
      onGpsSaved?.(project.projectId, lat, lng);
    } catch (ex: unknown) {
      setGpsErr(ex instanceof Error ? ex.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:border-teal-500/30 transition">
      {/* Main clickable row */}
      <button
        onClick={onClick}
        className="w-full text-left p-5 group"
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
          <span className="flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />
            {project.location.city || project.location.country}
          </span>
          {project.totalAcres > 0 && <span>{project.totalAcres.toLocaleString()} ac</span>}
          <span className="ml-auto flex items-center gap-1 text-teal-500 text-[10px] opacity-70 group-hover:opacity-100 transition">
            Open →
          </span>
        </div>
        {project.improvementGoal ? (
          <p className="text-xs text-slate-400 mt-2 leading-snug truncate">Goal: {project.improvementGoal}</p>
        ) : null}
      </button>

      {/* GPS row — always visible */}
      <div className="border-t border-slate-800 px-5 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
          <span className={`text-[11px] font-mono ${hasGps ? 'text-slate-400' : 'text-amber-400'}`}>
            {gpsLabel}
          </span>
          {!hasGps && (
            <span className="text-[10px] text-amber-500">— map pin & satellite data need coordinates</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); setEditingGps(v => !v); }}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-lg bg-teal-700/20 hover:bg-teal-700/40 border border-teal-600/40 text-teal-300 transition shrink-0"
          >
            <MapPin className="w-3 h-3" />
            {editingGps ? 'Cancel' : 'Edit GPS'}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition shrink-0"
          >
            <Eye className="w-3 h-3" />
            Project details
          </button>
        </div>
      </div>

      {/* Inline GPS edit form */}
      {editingGps && (
        <div className="border-t border-slate-700 bg-slate-800/60 px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 font-medium">Latitude <span className="text-slate-600">(−90 to 90)</span></label>
              <input
                type="number" step="any"
                placeholder="e.g. 37.5623"
                value={latVal}
                onClick={e => e.stopPropagation()}
                onChange={e => setLatVal(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 font-medium">Longitude <span className="text-slate-600">(−180 to 180)</span></label>
              <input
                type="number" step="any"
                placeholder="e.g. −118.9664"
                value={lngVal}
                onClick={e => e.stopPropagation()}
                onChange={e => setLngVal(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-lg px-3 py-2 text-[10px] text-slate-500">
            <span className="text-teal-400 font-semibold">Duck Lake Loop / Inyo NF CA:</span> lat 37.5623 · lng −118.9664
            {' · '}USA always needs <span className="text-amber-400">negative</span> longitude (West hemisphere)
          </div>
          {gpsErr && <p className="text-xs text-rose-400">{gpsErr}</p>}
          <button
            onClick={saveGps}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition disabled:opacity-50"
          >
            <MapPin className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save GPS Coordinates'}
          </button>
        </div>
      )}
    </div>
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
  const [editingProject, setEditingProject] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    projectName: string; projectType: string; description: string;
    country: string; region: string; city: string;
    lat: string; lng: string;
    totalAcres: string; improvementGoal: string;
  }>({ projectName: '', projectType: '', description: '', country: '', region: '', city: '', lat: '', lng: '', totalAcres: '', improvementGoal: '' });
  const [savingEdit, setSavingEdit] = useState(false);

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

  function openEdit() {
    if (!project) return;
    setEditDraft({
      projectName:    project.projectName,
      projectType:    project.projectType,
      description:    project.description || '',
      country:        project.location.country || '',
      region:         project.location.region || '',
      city:           project.location.city || '',
      lat:            project.location.gpsCenter?.lat ? String(project.location.gpsCenter.lat) : '',
      lng:            project.location.gpsCenter?.lng ? String(project.location.gpsCenter.lng) : '',
      totalAcres:     project.totalAcres > 0 ? String(project.totalAcres) : '',
      improvementGoal: project.improvementGoal || '',
    });
    setEditingProject(true);
  }

  async function saveEdit() {
    if (!project) return;
    const lat = editDraft.lat ? parseFloat(editDraft.lat) : 0;
    const lng = editDraft.lng ? parseFloat(editDraft.lng) : 0;
    if (editDraft.lat && (isNaN(lat) || lat < -90 || lat > 90)) {
      setErr('Latitude must be between −90 and 90.');
      return;
    }
    if (editDraft.lng && (isNaN(lng) || lng < -180 || lng > 180)) {
      setErr('Longitude must be between −180 and 180.');
      return;
    }
    if (!editDraft.projectName.trim()) {
      setErr('Project name cannot be empty.');
      return;
    }
    setSavingEdit(true);
    setErr('');
    try {
      await apiFetch(WATER_PROJECT_DETAIL(projectId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName:     editDraft.projectName.trim(),
          projectType:     editDraft.projectType,
          description:     editDraft.description,
          improvementGoal: editDraft.improvementGoal,
          totalAcres:      editDraft.totalAcres ? parseFloat(editDraft.totalAcres) : 0,
          location: {
            country: editDraft.country,
            region:  editDraft.region,
            city:    editDraft.city,
            gpsCenter: { lat: lat || 0, lng: lng || 0 },
            polygon: project.location.polygon ?? [],
          },
        }),
      });
      await load();
      setEditingProject(false);
      setNotice('Project updated successfully.');
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-5 h-5 animate-spin text-teal-400 mr-2" />
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
   ;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition mt-0.5">
          <ArrowLeft className="w-[18px] h-[18px]" />
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
          {/* GPS pill + Edit Project button */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
              <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
              {project.location.gpsCenter?.lat && project.location.gpsCenter.lat !== 0 ? (
                <span className="text-xs font-mono text-slate-300">
                  {project.location.gpsCenter.lat.toFixed(4)}, {project.location.gpsCenter.lng.toFixed(4)}
                </span>
              ) : (
                <span className="text-xs text-amber-400 italic">No GPS set</span>
              )}
            </div>
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {editingProject ? 'Cancel' : 'Edit Project'}
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg px-4 py-3 text-sm text-teal-300">
          <CheckCircle className="w-3.5 h-3.5 inline mr-2" />{notice}
        </div>
      )}
      {err && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-300">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-2" />{err}
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
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Pulling data…' : 'Pull Satellite Data'}
        </button>
        <button
          onClick={generateReport}
          disabled={generating || snapshots.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-700/30 hover:bg-indigo-700/50 border border-indigo-600/40 text-indigo-300 text-sm transition disabled:opacity-50"
          title={snapshots.length === 0 ? 'Pull satellite data first' : undefined}
        >
          <FileText className={`w-3.5 h-3.5 ${generating ? 'animate-pulse' : ''}`} />
          {generating ? 'Generating…' : 'Generate Impact Report'}
        </button>
        {canIssueCredits && (
          <button
            onClick={issueCredits}
            disabled={issuingCredits}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-600/40 text-emerald-300 text-sm transition disabled:opacity-50"
          >
            <Award className="w-3.5 h-3.5" />
            {issuingCredits ? 'Issuing…' : 'Issue Water Impact Credits'}
          </button>
        )}
      </div>

      {/* ── Full project edit panel ── */}
      {editingProject && (
        <div className="bg-slate-900 border border-teal-600/40 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Edit Project</h3>
              <p className="text-xs text-slate-500 mt-0.5">Update any project details — changes save immediately to the database</p>
            </div>
            <button onClick={() => setEditingProject(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Project name + type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Project Name <span className="text-rose-400">*</span></label>
              <input
                type="text"
                value={editDraft.projectName}
                onChange={e => setEditDraft(d => ({ ...d, projectName: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                placeholder="e.g. Amazon River Basin Wetland"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Project Type</label>
              <select
                value={editDraft.projectType}
                onChange={e => setEditDraft(d => ({ ...d, projectType: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-teal-500 transition"
              >
                {[
                  ['farm_irrigation',          '🌾 Farm Irrigation'],
                  ['reservoir_monitoring',      '🏞️ Reservoir Monitoring'],
                  ['wetland_restoration',       '🌿 Wetland Restoration'],
                  ['leak_reduction',            '🔧 Leak Reduction'],
                  ['community_conservation',    '🏘️ Community Conservation'],
                  ['drought_response',          '☀️ Drought Response'],
                  ['school_or_facility_savings','🏫 School / Facility Savings'],
                  ['other',                     '📋 Other'],
                ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={editDraft.description}
              onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition resize-none"
              placeholder="Brief description of the project goals and methods…"
            />
          </div>

          {/* Improvement goal */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Improvement Goal</label>
            <input
              type="text"
              value={editDraft.improvementGoal}
              onChange={e => setEditDraft(d => ({ ...d, improvementGoal: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
              placeholder="e.g. Reduce irrigation water use by 25% within 12 months"
            />
          </div>

          {/* Total acres */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Total Acres</label>
              <input
                type="number" min="0" step="0.1"
                value={editDraft.totalAcres}
                onChange={e => setEditDraft(d => ({ ...d, totalAcres: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                placeholder="e.g. 450"
              />
            </div>
          </div>

          {/* Location fields */}
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-3 pb-1 border-b border-slate-800">Location</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Country</label>
                <input
                  type="text"
                  value={editDraft.country}
                  onChange={e => setEditDraft(d => ({ ...d, country: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                  placeholder="e.g. Brazil"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Region / State</label>
                <input
                  type="text"
                  value={editDraft.region}
                  onChange={e => setEditDraft(d => ({ ...d, region: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                  placeholder="e.g. Amazonas"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">City / Area</label>
                <input
                  type="text"
                  value={editDraft.city}
                  onChange={e => setEditDraft(d => ({ ...d, city: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                  placeholder="e.g. Manaus"
                />
              </div>
            </div>
            {/* GPS coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  GPS Latitude <span className="text-slate-600 font-normal">(−90 to 90)</span>
                </label>
                <input
                  type="number" step="any"
                  value={editDraft.lat}
                  onChange={e => setEditDraft(d => ({ ...d, lat: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition font-mono"
                  placeholder="e.g. 36.0160"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  GPS Longitude <span className="text-slate-600 font-normal">(−180 to 180)</span>
                </label>
                <input
                  type="number" step="any"
                  value={editDraft.lng}
                  onChange={e => setEditDraft(d => ({ ...d, lng: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition font-mono"
                  placeholder="e.g. −114.7380"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
              GPS determines where satellite data is pulled from. Find coordinates at <span className="text-teal-500">maps.google.com</span> — right-click your location. USA always uses <span className="text-amber-400">negative</span> longitude.
            </p>
          </div>

          {/* Save / Cancel */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditingProject(false)}
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:text-slate-200 text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Satellite imagery map — always visible */}
      {project && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Project Location — Satellite View</span>
            <button
              onClick={openEdit}
              className="text-[10px] text-teal-400 hover:text-teal-300 underline underline-offset-2 transition"
            >
              {project.location.gpsCenter.lat
                ? `${project.location.gpsCenter.lat.toFixed(4)}, ${project.location.gpsCenter.lng.toFixed(4)}`
                : 'Set GPS coordinates'}
              {' '}· Edit
            </button>
          </div>

          <div className="p-3">
            <WaterSnapshotMap
              lat={project.location.gpsCenter.lat}
              lng={project.location.gpsCenter.lng}
              projectName={project.projectName}
              totalAcres={project.totalAcres}
              soilMoisture={latestSnap?.metrics.soilMoistureIndex}
            />
          </div>
        </div>
      )}

      {/* Latest metrics */}
      {latestSnap && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          {/* Reading context — what area is this data for */}
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800 flex-wrap">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">Reading for:</span>
            <span className="text-xs font-semibold text-teal-300">{project.projectName}</span>
            <span className="text-[10px] text-slate-500">·</span>
            <span className="text-xs text-slate-400">{project.location.city ? `${project.location.city}, ` : ''}{project.location.country}</span>
            {project.location.gpsCenter?.lat && project.location.gpsCenter.lat !== 0 ? (
              <span className="text-[10px] font-mono text-slate-500">{project.location.gpsCenter.lat.toFixed(4)}, {project.location.gpsCenter.lng.toFixed(4)}</span>
            ) : (
              <span className="text-[10px] text-amber-500 italic">⚠ No GPS — set coordinates for accurate readings</span>
            )}
          </div>
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
              sub={`NASA SMAP · ${latestSnap.metrics.soilMoistureIndex >= 0.4 ? 'Healthy' : latestSnap.metrics.soilMoistureIndex >= 0.25 ? 'Moderate' : 'Low'}`}
              good={latestSnap.metrics.soilMoistureIndex >= 0.4}
              warn={latestSnap.metrics.soilMoistureIndex < 0.2}
            />
            <MetricTile
              label="Surface Water Level"
              value={`${latestSnap.metrics.surfaceWaterLevel.toFixed(2)} m`}
              sub="NASA / ESA SWOT"
            />
            <MetricTile
              label="Water Storage Trend"
              value={`${latestSnap.metrics.waterStorageTrend >= 0 ? '+' : ''}${latestSnap.metrics.waterStorageTrend.toFixed(1)} mm/mo`}
              good={latestSnap.metrics.waterStorageTrend > 0}
              warn={latestSnap.metrics.waterStorageTrend < -3}
              sub="NASA GRACE-FO"
            />
            <MetricTile
              label="Drought Risk"
              value={fmtPct(latestSnap.metrics.droughtRisk)}
              sub={`Copernicus · ${latestSnap.metrics.droughtRisk < 0.3 ? 'Low' : latestSnap.metrics.droughtRisk < 0.6 ? 'Moderate' : 'High'}`}
              good={latestSnap.metrics.droughtRisk < 0.3}
              warn={latestSnap.metrics.droughtRisk > 0.6}
              invertColor
            />
            <MetricTile
              label="Vegetation Stress"
              value={fmtPct(latestSnap.metrics.vegetationStress)}
              sub="NASA GIBS / MODIS"
              warn={latestSnap.metrics.vegetationStress > 0.6}
              invertColor
            />
            <MetricTile
              label="Confidence Score"
              value={fmtPct(latestSnap.metrics.confidenceScore)}
              good={latestSnap.metrics.confidenceScore >= 0.7}
              sub="6-adapter average"
            />
            {latestSnap.sarSource === 'sentinel-1-sar' && latestSnap.sarWaterFraction != null && (
              <MetricTile
                label="SAR Water Coverage"
                value={`${Math.round(latestSnap.sarWaterFraction * 100)}%`}
                sub={`ESA Sentinel-1 · ${latestSnap.sarCaptureDate ?? ''}`}
                good={latestSnap.sarFloodRisk != null && latestSnap.sarFloodRisk < 0.25}
                warn={latestSnap.sarFloodRisk != null && latestSnap.sarFloodRisk > 0.5}
              />
            )}
          </div>

          {latestSnap.anomalyFlags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {latestSnap.anomalyFlags.map((flag) => (
                <span key={flag} className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  <AlertTriangle className="w-2 h-2 inline mr-1" />{flag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          <SatelliteAiInsight
            domain="water"
            data={{
              soilMoistureIndex: latestSnap.metrics.soilMoistureIndex,
              surfaceWaterLevel: `${latestSnap.metrics.surfaceWaterLevel.toFixed(2)} m`,
              waterStorageTrend: `${latestSnap.metrics.waterStorageTrend.toFixed(1)} mm/mo`,
              droughtRisk: `${Math.round(latestSnap.metrics.droughtRisk * 100)}%`,
              vegetationStress: `${Math.round(latestSnap.metrics.vegetationStress * 100)}%`,
              confidenceScore: `${Math.round(latestSnap.metrics.confidenceScore * 100)}%`,
              ...(latestSnap.sarSource === 'sentinel-1-sar' ? {
                sarWaterCoverage: `${Math.round((latestSnap.sarWaterFraction ?? 0) * 100)}%`,
                sarVvBackscatter: `${latestSnap.sarVvDb?.toFixed(1)} dB`,
                sarFloodRisk: `${Math.round((latestSnap.sarFloodRisk ?? 0) * 100)}%`,
                sarCaptureDate: latestSnap.sarCaptureDate,
              } : {}),
              anomalyFlags: latestSnap.anomalyFlags,
              captureDate: latestSnap.captureDate,
            }}
            project={{
              name: project.projectName,
              type: project.projectType,
              city: project.location.city,
              country: project.location.country,
              lat: project.location.gpsCenter?.lat,
              lng: project.location.gpsCenter?.lng,
            }}
          />
          <WaterImpactAidChat
            data={{
              soilMoistureIndex: latestSnap.metrics.soilMoistureIndex,
              surfaceWaterLevel: `${latestSnap.metrics.surfaceWaterLevel.toFixed(2)} m`,
              waterStorageTrend: `${latestSnap.metrics.waterStorageTrend.toFixed(1)} mm/mo`,
              droughtRisk: `${Math.round(latestSnap.metrics.droughtRisk * 100)}%`,
              vegetationStress: `${Math.round(latestSnap.metrics.vegetationStress * 100)}%`,
              confidenceScore: `${Math.round(latestSnap.metrics.confidenceScore * 100)}%`,
              usageReductionEstimate: `${Math.round(latestSnap.metrics.usageReductionEstimate * 100)}%`,
              anomalyFlags: latestSnap.anomalyFlags,
              captureDate: latestSnap.captureDate,
              ...(latestSnap.sarSource === 'sentinel-1-sar' ? {
                sarWaterCoverage: `${Math.round((latestSnap.sarWaterFraction ?? 0) * 100)}%`,
                sarFloodRisk: `${Math.round((latestSnap.sarFloodRisk ?? 0) * 100)}%`,
                sarCaptureDate: latestSnap.sarCaptureDate,
              } : {}),
            }}
            project={{
              name: project.projectName,
              type: project.projectType,
              city: project.location.city,
              country: project.location.country,
              lat: project.location.gpsCenter?.lat,
              lng: project.location.gpsCenter?.lng,
              goal: project.improvementGoal,
            }}
          />
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
                  <Activity className="w-3 h-3 text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">{snap.captureDate}</span>
                    {snap.isBaseline && <span className="text-[9px] bg-teal-500/15 text-teal-400 px-1.5 py-0.5 rounded uppercase">Baseline</span>}
                    {snap.anomalyFlags.length > 0 && (
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
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

      {/* NASA GIBS Satellite Imagery Viewer */}
      {project && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-300">NASA GIBS Satellite Imagery</span>
              <span className="ml-2 text-[10px] text-slate-600">18 products · MODIS · VIIRS · SMAP · daily</span>
            </div>
            <span className="text-[10px] text-teal-500 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded-full">Live NASA data</span>
          </div>
          <div className="p-3">
            <GibsTileViewer
              lat={project.location.gpsCenter.lat}
              lng={project.location.gpsCenter.lng}
              polygon={project.location.polygon}
              projectName={project.projectName}
              totalAcres={project.totalAcres}
              defaultLayerId="SMAP_L3_Passive_Day_SoilMoisture_Option1"
              height={340}
            />
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
          <div className="col-span-2 border-t border-slate-800 pt-3 mt-1">
            <dt className="text-slate-500 mb-1.5">GPS Coordinates <span className="text-slate-600">(used for satellite data + map pin)</span></dt>
            <dd className="flex items-center gap-3">
              {project.location.gpsCenter.lat && project.location.gpsCenter.lng
                ? (
                  <span className="font-mono text-slate-300">
                    {project.location.gpsCenter.lat.toFixed(4)}, {project.location.gpsCenter.lng.toFixed(4)}
                  </span>
                )
                : <span className="text-amber-400 italic">Not set — satellite data uses reference area</span>
              }
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-700/30 hover:bg-teal-700/50 border border-teal-600/40 text-teal-300 text-xs transition"
              >
                <MapPin className="w-3 h-3" />
                Edit Project
              </button>
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">Location</dt>
            <dd className="text-slate-300">
              {[project.location.city, project.location.region, project.location.country].filter(Boolean).join(', ') || '—'}
            </dd>
          </div>
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
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Validator Review Queue</h2>
          <p className="text-xs text-slate-400">Review water impact reports and approve or reject them</p>
        </div>
        <button onClick={loadQueue} className="ml-auto p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {notice && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg px-4 py-3 text-sm text-teal-300">
          <CheckCircle className="w-3.5 h-3.5 inline mr-2" />{notice}
        </div>
      )}
      {err && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-300">{err}</div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-10 justify-center text-slate-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading queue…
        </div>
      )}

      {!loading && queue.length === 0 && (
        <div className="text-center py-16">
          <ShieldCheck className="w-10 h-10 mx-auto text-teal-500/40 mb-3" />
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
              {item.eligibleForCredits ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
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
                <CheckCircle className="w-3.5 h-3.5" />Approve
              </button>
              <button
                onClick={() => decide(item.reportId, 'needs_evidence')}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-700/30 hover:bg-amber-700/50 border border-amber-600/40 text-amber-300 text-xs font-medium transition disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />Request Evidence
              </button>
              <button
                onClick={() => decide(item.reportId, 'rejected')}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-700/20 hover:bg-rose-700/40 border border-rose-600/30 text-rose-300 text-xs font-medium transition disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />Reject
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
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Water Impact Credits</h2>
          <p className="text-xs text-slate-400">DPAL Verified Water Impact Credits — internal system (pending third-party certification)</p>
        </div>
      </div>

      {notice && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg px-4 py-3 text-sm text-teal-300">
          <CheckCircle className="w-3.5 h-3.5 inline mr-2" />{notice}
        </div>
      )}
      {err && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-300">{err}</div>
      )}

      {/* Portfolio stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Credits', value: fmtKL(totalKL), icon: <Droplets className="w-4 h-4 text-teal-400" /> },
          { label: 'Verified', value: fmtKL(verifiedKL), icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
          { label: 'Listed', value: String(listedCount), icon: <Globe className="w-4 h-4 text-indigo-400" /> },
          { label: 'Retired', value: String(retiredCount), icon: <Award className="w-4 h-4 text-violet-400" /> },
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
        <AlertTriangle className="w-3 h-3 inline mr-1.5" />
        <strong>Internal Credits Only:</strong> DPAL Verified Water Impact Credits are an internal measurement and recognition system. They do not represent regulated environmental commodities. Third-party certification integration is planned for future releases.
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading credits…
        </div>
      )}

      {!loading && credits.length === 0 && (
        <div className="text-center py-16">
          <Award className="w-10 h-10 mx-auto text-teal-500/30 mb-3" />
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
                    <Droplets className="w-4 h-4 text-teal-400" />
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
                    <Globe className="w-3 h-3" />List on Marketplace
                  </button>
                  <button
                    onClick={() => retireCredit(credit.creditId)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-700/20 hover:bg-violet-700/40 border border-violet-600/30 text-violet-300 text-xs transition disabled:opacity-50"
                  >
                    <Award className="w-3 h-3" />Retire
                  </button>
                </div>
              )}
              {credit.marketplaceStatus === 'listed' && (
                <button
                  onClick={() => retireCredit(credit.creditId)}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-700/20 hover:bg-violet-700/40 border border-violet-600/30 text-violet-300 text-xs transition disabled:opacity-50"
                >
                  <Award className="w-3 h-3" />Retire Credit
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
                  {tx.txType === 'issue'  && <Zap className="w-3 h-3 text-teal-400" />}
                  {tx.txType === 'list'   && <Globe className="w-3 h-3 text-indigo-400" />}
                  {tx.txType === 'retire' && <Award className="w-3 h-3 text-violet-400" />}
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
  areaLabel?: string;
  centerLat?: number;
  centerLng?: number;
  adapters: {
    smap:      { ok: boolean; soilMoistureIndex?: number; confidenceScore?: number };
    swot:      { ok: boolean; surfaceWaterLevel?: number; waterExtentKm2?: number; confidenceScore?: number };
    grace:     { ok: boolean; waterStorageTrend?: number; confidenceScore?: number };
    gibs:      { ok: boolean; vegetationStress?: number; ndviIndex?: number; confidenceScore?: number };
    copernicus:{ ok: boolean; droughtRisk?: number; precipAnomalyMm?: number; ndviMean?: number; sentinel2Date?: string; source?: string; confidenceScore?: number };
    sentinel1?: { ok: boolean; waterFraction?: number; vvMeanDb?: number; floodRisk?: number; captureDate?: string; confidenceScore?: number };
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

function SatelliteLiveFeed({ monitoringProject }: {
  monitoringProject?: { projectName: string; city?: string; country?: string; lat: number; lng: number } | null;
}) {
  const [data, setData] = useState<SatellitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      let url = apiUrl(API_ROUTES.WATER_SATELLITE_PREVIEW);
      if (monitoringProject && monitoringProject.lat && monitoringProject.lng) {
        const label = encodeURIComponent(
          [monitoringProject.projectName, monitoringProject.city, monitoringProject.country]
            .filter(Boolean).join(' — ')
        );
        url += `?lat=${monitoringProject.lat}&lng=${monitoringProject.lng}&areaLabel=${label}`;
      }
      const result = await apiFetch<{ ok: boolean } & SatellitePreview>(url);
      setData(result);
      setLastRefresh(new Date());
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setLoading(false);
    }
  }, [monitoringProject]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;

  const projectLabel = monitoringProject
    ? [monitoringProject.projectName, monitoringProject.city, monitoringProject.country].filter(Boolean).join(' — ')
    : null;

  // Plain-English interpretation of each metric
  const interpretation = s ? [
    {
      icon: '💧',
      label: 'Soil Moisture',
      value: fmtPct(s.soilMoistureIndex),
      source: 'NASA SMAP satellite',
      what: `How wet the ground is at your project location right now.`,
      meaning: s.soilMoistureIndex >= 0.6
        ? 'Soil is well saturated — good water retention.'
        : s.soilMoistureIndex >= 0.4
        ? 'Adequate moisture. Normal conditions.'
        : s.soilMoistureIndex >= 0.2
        ? 'Soil is drying out. Monitor irrigation needs.'
        : 'Very dry soil. Risk of crop stress and water loss.',
      status: s.soilMoistureIndex >= 0.4 ? 'good' : s.soilMoistureIndex >= 0.2 ? 'warn' : 'bad',
    },
    {
      icon: '🌊',
      label: 'Surface Water Level',
      value: `${s.surfaceWaterLevel.toFixed(2)} m`,
      source: 'NASA SWOT satellite',
      what: 'Height of water in rivers, lakes, or reservoirs near your location.',
      meaning: s.surfaceWaterLevel > 3
        ? 'High water levels. Possible flood risk downstream.'
        : s.surfaceWaterLevel > 1.5
        ? 'Normal surface water levels for this region.'
        : 'Low surface water. Rivers or reservoirs may be depleted.',
      status: s.surfaceWaterLevel > 3 ? 'warn' : s.surfaceWaterLevel > 1 ? 'good' : 'warn',
    },
    {
      icon: '📉',
      label: 'Water Storage Trend',
      value: `${s.waterStorageTrend >= 0 ? '+' : ''}${s.waterStorageTrend.toFixed(1)} mm/mo`,
      source: 'GRACE-FO gravity satellite',
      what: 'Whether total water in the ground (including deep aquifers) is increasing or decreasing month over month.',
      meaning: s.waterStorageTrend > 2
        ? 'Groundwater is recovering. Good trend for long-term water security.'
        : s.waterStorageTrend > -2
        ? 'Groundwater storage is roughly stable.'
        : s.waterStorageTrend > -10
        ? 'Groundwater is declining. Conservation measures recommended.'
        : 'Rapid groundwater depletion detected. Urgent water management needed.',
      status: s.waterStorageTrend > 0 ? 'good' : s.waterStorageTrend > -5 ? 'warn' : 'bad',
    },
    {
      icon: '☀️',
      label: 'Drought Risk',
      value: fmtPct(s.droughtRisk),
      source: 'Copernicus Climate Change Service',
      what: 'Probability that this area is experiencing or heading toward drought conditions.',
      meaning: s.droughtRisk < 0.25
        ? 'Low drought risk. Conditions are normal.'
        : s.droughtRisk < 0.5
        ? 'Moderate drought risk. Watch for rainfall deficits.'
        : s.droughtRisk < 0.75
        ? 'High drought risk. Reduced water availability likely.'
        : 'Extreme drought conditions. Immediate water conservation critical.',
      status: s.droughtRisk < 0.3 ? 'good' : s.droughtRisk < 0.6 ? 'warn' : 'bad',
    },
    {
      icon: '🌿',
      label: 'Vegetation Stress',
      value: fmtPct(s.vegetationStress),
      source: 'NASA GIBS / MODIS NDVI',
      what: 'How stressed the plants and vegetation are at your project site — caused by lack of water or heat.',
      meaning: s.vegetationStress < 0.25
        ? 'Plants are healthy. Good vegetation water status.'
        : s.vegetationStress < 0.5
        ? 'Mild plant stress. Possible irrigation or rainfall deficit.'
        : s.vegetationStress < 0.75
        ? 'Significant vegetation stress. Plants showing water deficiency.'
        : 'Severe plant stress. Vegetation at risk of permanent damage.',
      status: s.vegetationStress < 0.3 ? 'good' : s.vegetationStress < 0.6 ? 'warn' : 'bad',
    },
  ] : [];

  const sar = data?.adapters?.sentinel1;
  const sarAvailable = sar?.ok && sar.waterFraction != null;

  const statusColor = (st: string) =>
    st === 'good' ? 'text-emerald-400' : st === 'warn' ? 'text-amber-400' : 'text-rose-400';
  const statusBg = (st: string) =>
    st === 'good' ? 'bg-emerald-500/10 border-emerald-500/20' : st === 'warn' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20';

  return (
    <div className="bg-slate-900/80 border border-cyan-700/30 rounded-2xl p-5 space-y-4">

      {/* ── What is this panel ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="relative mt-0.5">
            <Waves className="w-5 h-5 text-cyan-400" />
            {!loading && !err && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-cyan-200">Live Satellite Readings</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed max-w-lg">
              {monitoringProject
                ? <>6 NASA &amp; ESA satellites are scanning <span className="text-cyan-300 font-semibold">{monitoringProject.projectName}</span> right now. These numbers tell you the current water health of your land.</>
                : 'Satellite water health data. Register a project with GPS coordinates to see readings for your specific land.'}
            </p>
            {lastRefresh && <p className="text-[10px] text-slate-600 mt-1">Updated {lastRefresh.toLocaleTimeString()}</p>}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-800/20 hover:bg-cyan-700/30 border border-cyan-700/30 text-cyan-400 text-xs transition disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Fetching…' : 'Refresh'}
        </button>
      </div>

      {/* ── Project identity banner ── */}
      <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${monitoringProject ? 'bg-teal-900/20 border border-teal-700/30' : 'bg-slate-800/60 border border-slate-700/40'}`}>
        <MapPin className={`w-4 h-4 shrink-0 ${monitoringProject ? 'text-teal-400' : 'text-slate-500'}`} />
        <div className="flex-1 min-w-0">
          {monitoringProject ? (
            <>
              <p className="text-xs font-bold text-teal-200">Reading for: {projectLabel}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Coordinates: {monitoringProject.lat.toFixed(4)}, {monitoringProject.lng.toFixed(4)} · All metrics below apply to this exact location
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-slate-400">No project GPS set — showing reference area</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Add GPS to your project card to see readings for your land</p>
            </>
          )}
        </div>
        {data?.centerLat != null && (
          <span className="text-[10px] text-slate-600 font-mono shrink-0">{data.centerLat.toFixed(3)}, {data.centerLng?.toFixed(3)}</span>
        )}
      </div>

      {/* ── LOCATION MAP — shows exactly what area is being read ── */}
      {monitoringProject && (
        <div className="rounded-xl overflow-hidden border border-slate-700/60" style={{ height: 200 }}>
          <style>{`
            .sat-map-pin { background: none; border: none; }
          `}</style>
          <MapContainer
            key={`sat-map-${monitoringProject.lat.toFixed(3)}-${monitoringProject.lng.toFixed(3)}`}
            center={[monitoringProject.lat, monitoringProject.lng]}
            zoom={10}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={false}
            doubleClickZoom={false}
            style={{ height: '100%', width: '100%', background: '#0f172a' }}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              maxZoom={20}
            />
            {/* Satellite reading radius — ~50km bounding box shown as circle */}
            <Circle
              center={[monitoringProject.lat, monitoringProject.lng]}
              radius={50000}
              pathOptions={{ color: '#14b8a6', weight: 1.5, fillColor: '#14b8a6', fillOpacity: 0.06, dashArray: '4 6' }}
            />
            {/* Inner project area */}
            <Circle
              center={[monitoringProject.lat, monitoringProject.lng]}
              radius={8000}
              pathOptions={{ color: '#22d3ee', weight: 2, fillColor: '#22d3ee', fillOpacity: 0.12 }}
            />
            {/* Project pin */}
            <Marker
              position={[monitoringProject.lat, monitoringProject.lng]}
              icon={L.divIcon({
                className: 'sat-map-pin',
                html: `<div style="
                  width:14px;height:14px;border-radius:50%;
                  background:#14b8a6;border:3px solid #fff;
                  box-shadow:0 0 0 4px rgba(20,184,166,0.35),0 0 16px rgba(20,184,166,0.6);
                "></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
              })}
            >
              <Popup>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#0f172a', padding: 4 }}>
                  <strong>{monitoringProject.projectName}</strong><br />
                  {[monitoringProject.city, monitoringProject.country].filter(Boolean).join(', ')}<br />
                  <span style={{ color: '#0e7490' }}>{monitoringProject.lat.toFixed(4)}, {monitoringProject.lng.toFixed(4)}</span>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
          {/* Map label overlay */}
          <div className="relative -mt-7 mx-2 mb-1 z-[500] flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-sm border border-slate-700/50 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">Satellite Reading Area</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {monitoringProject.projectName}{[monitoringProject.city, monitoringProject.country].filter(Boolean).length > 0 ? ' · ' + [monitoringProject.city, monitoringProject.country].filter(Boolean).join(', ') : ''}
            </span>
          </div>
        </div>
      )}

      {!monitoringProject && (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 flex items-center justify-center gap-3 px-4 py-6 text-center">
          <MapPin className="w-5 h-5 text-slate-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-400">No location set</p>
            <p className="text-xs text-slate-600 mt-0.5">Add GPS coordinates to your project card to see a map of what the satellites are reading</p>
          </div>
        </div>
      )}

      {/* Adapter status badges */}
      <div className="flex flex-wrap gap-2">
        <AdapterBadge name="SMAP"        ok={data?.adapters.smap.ok ?? false}            conf={data?.adapters.smap.confidenceScore} />
        <AdapterBadge name="SWOT"        ok={data?.adapters.swot.ok ?? false}            conf={data?.adapters.swot.confidenceScore} />
        <AdapterBadge name="GRACE-FO"    ok={data?.adapters.grace.ok ?? false}           conf={data?.adapters.grace.confidenceScore} />
        <AdapterBadge name="NASA GIBS"   ok={data?.adapters.gibs.ok ?? false}            conf={data?.adapters.gibs.confidenceScore} />
        <AdapterBadge name="Copernicus"  ok={data?.adapters.copernicus.ok ?? false}      conf={data?.adapters.copernicus.confidenceScore} />
        <AdapterBadge name="Sentinel-1 SAR" ok={data?.adapters.sentinel1?.ok ?? false}  conf={data?.adapters.sentinel1?.confidenceScore} />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-slate-500 text-xs">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
          Contacting satellites…
        </div>
      )}

      {err && !loading && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-3 h-3" />
          {err} — check Railway backend connection
        </div>
      )}

      {/* ── Metric cards with plain-English explanations ── */}
      {s && !loading && (
        <div className="space-y-3">
          {interpretation.map((item) => (
            <div key={item.label} className={`rounded-xl border p-4 ${statusBg(item.status)}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-200 uppercase tracking-wide">{item.label}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-black tabular-nums ${statusColor(item.status)}`}>{item.value}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    <span className="text-slate-500">What this is: </span>{item.what}
                  </p>
                  <p className={`text-[11px] font-semibold mt-1.5 leading-relaxed ${statusColor(item.status)}`}>
                    → {item.meaning}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">Source: {item.source}</p>
                </div>
              </div>
            </div>
          ))}

          {/* ── Sentinel-1 SAR Water Detection card ── */}
          {sarAvailable ? (
            <div className={`rounded-xl border p-4 ${
              (sar!.floodRisk ?? 0) > 0.5 ? 'bg-rose-500/10 border-rose-500/20'
              : (sar!.floodRisk ?? 0) > 0.25 ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-cyan-500/10 border-cyan-500/20'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5">📡</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-200 uppercase tracking-wide">SAR Water Detection</p>
                    <span className={`text-xl font-black tabular-nums ${
                      (sar!.floodRisk ?? 0) > 0.5 ? 'text-rose-400'
                      : (sar!.floodRisk ?? 0) > 0.25 ? 'text-amber-400'
                      : 'text-cyan-400'
                    }`}>
                      {Math.round((sar!.waterFraction ?? 0) * 100)}% water
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    <span className="text-slate-500">What this is: </span>
                    Sentinel-1 C-band radar (SAR) sees through clouds 24/7 and measures how much of your project area is covered by open water right now. Water returns a very dark radar signal (VV &lt; −15 dB).
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <p className="text-[11px] text-slate-400">
                      <span className="text-slate-500">Water coverage:</span>{' '}
                      <span className="font-semibold text-cyan-300">{Math.round((sar!.waterFraction ?? 0) * 100)}%</span> of AOI
                    </p>
                    <p className="text-[11px] text-slate-400">
                      <span className="text-slate-500">VV backscatter:</span>{' '}
                      <span className="font-semibold text-slate-200">{sar!.vvMeanDb?.toFixed(1)} dB</span>
                      <span className="text-slate-600"> (open water ≈ −15 to −25 dB)</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      <span className="text-slate-500">Flood / pooling risk:</span>{' '}
                      <span className={`font-semibold ${(sar!.floodRisk ?? 0) > 0.5 ? 'text-rose-400' : (sar!.floodRisk ?? 0) > 0.25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {fmtPct(sar!.floodRisk ?? 0)}
                      </span>
                    </p>
                    {sar!.captureDate && (
                      <p className="text-[11px] text-slate-400">
                        <span className="text-slate-500">SAR capture:</span>{' '}
                        <span className="font-mono text-slate-300">{sar!.captureDate}</span>
                      </p>
                    )}
                  </div>
                  <p className={`text-[11px] font-semibold mt-1.5 leading-relaxed ${
                    (sar!.floodRisk ?? 0) > 0.5 ? 'text-rose-400'
                    : (sar!.floodRisk ?? 0) > 0.25 ? 'text-amber-400'
                    : 'text-cyan-400'
                  }`}>
                    → {
                      (sar!.floodRisk ?? 0) > 0.5
                        ? 'Elevated flood / pooling detected. Unexpected water present — investigate for leaks, overflow, or seepage.'
                        : (sar!.floodRisk ?? 0) > 0.25
                        ? 'Some water pooling visible. Monitor if levels are rising.'
                        : 'Normal water signal. No unexpected flooding or pooling detected.'
                    }
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">Source: ESA Copernicus Sentinel-1 GRD (C-band SAR, IW mode)</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-800/30 px-4 py-3 flex items-center gap-3">
              <span className="text-lg shrink-0">📡</span>
              <div>
                <p className="text-xs font-semibold text-slate-400">SAR Water Detection (Sentinel-1)</p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {data?.adapters?.sentinel1
                    ? 'Sentinel-1 credentials not configured — set COPERNICUS_CLIENT_ID + COPERNICUS_CLIENT_SECRET on Railway.'
                    : 'Loading SAR data…'}
                </p>
              </div>
            </div>
          )}

          {/* Overall confidence */}
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-300">Overall Data Confidence</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Average reliability across all 6 satellite sources</p>
            </div>
            <span className={`text-2xl font-black tabular-nums ${s.confidenceScore >= 0.7 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {fmtPct(s.confidenceScore)}
            </span>
          </div>
        </div>
      )}

      {/* ── AI Satellite Analyst ── */}
      {s && !loading && (
        <SatelliteAiInsight
          domain="water"
          data={{
            soilMoisture: `${(s.soilMoistureIndex * 100).toFixed(0)}%`,
            surfaceWaterLevel: `${s.surfaceWaterLevel.toFixed(2)} m`,
            waterStorageTrend: `${s.waterStorageTrend >= 0 ? '+' : ''}${s.waterStorageTrend.toFixed(1)} mm/month`,
            vegetationStress: `${(s.vegetationStress * 100).toFixed(0)}%`,
            droughtRisk: `${(s.droughtRisk * 100).toFixed(0)}%`,
            overallConfidence: `${(s.confidenceScore * 100).toFixed(0)}%`,
            ...(sarAvailable ? {
              sarWaterCoverage: `${Math.round((sar!.waterFraction ?? 0) * 100)}%`,
              sarBackscatter_dB: sar!.vvMeanDb?.toFixed(1),
              sarFloodRisk: `${(sar!.floodRisk ?? 0) * 100 < 1 ? '<1' : Math.round((sar!.floodRisk ?? 0) * 100)}%`,
            } : {}),
          }}
          project={monitoringProject ? {
            name: monitoringProject.projectName,
            city: monitoringProject.city,
            country: monitoringProject.country,
            lat: monitoringProject.lat,
            lng: monitoringProject.lng,
          } : null}
        />
      )}
      {s && !loading && (
        <WaterImpactAidChat
          data={{
            soilMoisture: `${(s.soilMoistureIndex * 100).toFixed(0)}%`,
            surfaceWaterLevel: `${s.surfaceWaterLevel.toFixed(2)} m`,
            waterStorageTrend: `${s.waterStorageTrend >= 0 ? '+' : ''}${s.waterStorageTrend.toFixed(1)} mm/month`,
            vegetationStress: `${(s.vegetationStress * 100).toFixed(0)}%`,
            droughtRisk: `${(s.droughtRisk * 100).toFixed(0)}%`,
            overallConfidence: `${(s.confidenceScore * 100).toFixed(0)}%`,
            ...(sarAvailable ? {
              sarWaterCoverage: `${Math.round((sar!.waterFraction ?? 0) * 100)}%`,
              sarBackscatter_dB: sar!.vvMeanDb?.toFixed(1),
              sarFloodRisk: `${(sar!.floodRisk ?? 0) * 100 < 1 ? '<1' : Math.round((sar!.floodRisk ?? 0) * 100)}%`,
            } : {}),
          }}
          project={monitoringProject ? {
            name: monitoringProject.projectName,
            city: monitoringProject.city,
            country: monitoringProject.country,
            lat: monitoringProject.lat,
            lng: monitoringProject.lng,
          } : null}
        />
      )}

      <p className="text-[10px] text-slate-600 border-t border-slate-800 pt-3">
        Data from 6 NASA/ESA satellites: SMAP · SWOT · GRACE-FO · NASA GIBS · Copernicus · Sentinel-1 SAR ·{' '}
        {monitoringProject ? `readings for ${monitoringProject.projectName}` : 'register a project to monitor your specific land'}
      </p>
    </div>
  );
}

// ── Global reference water monitoring stations (always shown as base layer) ────
// These are real-world water stress hotspots used as reference markers when
// no registered projects are present, ensuring the map is never empty.

// ── Demo showcase projects (shown when API is unavailable / no registered projects) ──

const DEMO_WATER_PROJECTS: WaterProject[] = [
  {
    projectId: 'demo-wp-001', ownerId: 'demo', ownerName: 'DPAL Showcase',
    projectName: 'Indus Valley Irrigation Efficiency',
    projectType: 'farm_irrigation',
    description: 'Satellite-monitored drip-irrigation rollout across 4,200 acres in Punjab province. Targets 35% water savings vs. flood irrigation baseline through SMAP-guided scheduling.',
    location: { country: 'Pakistan', region: 'Punjab', city: 'Lahore', gpsCenter: { lat: 30.5, lng: 72.5 }, polygon: [] },
    totalAcres: 4200, baselineDate: '2024-03-01', baselineWaterIndex: 0.38,
    improvementGoal: 'Reduce irrigation draw by 35% within 18 months',
    status: 'monitoring', evidenceUrls: [], adminNotes: '', createdAt: '2024-03-01T00:00:00Z',
  },
  {
    projectId: 'demo-wp-002', ownerId: 'demo', ownerName: 'DPAL Showcase',
    projectName: 'Lake Victoria Wetland Restoration',
    projectType: 'wetland_restoration',
    description: 'Ecological recovery of 1,800 acres of degraded papyrus wetlands along the Kenyan shoreline. GRACE telemetry tracks groundwater recharge and biodiversity recovery index.',
    location: { country: 'Kenya', region: 'Kisumu', city: 'Kisumu', gpsCenter: { lat: -0.5, lng: 33.5 }, polygon: [] },
    totalAcres: 1800, baselineDate: '2024-01-15', baselineWaterIndex: 0.22,
    improvementGoal: 'Restore 70% wetland function and increase groundwater recharge by 20%',
    status: 'approved', evidenceUrls: [], adminNotes: '', createdAt: '2024-01-15T00:00:00Z',
  },
  {
    projectId: 'demo-wp-003', ownerId: 'demo', ownerName: 'DPAL Showcase',
    projectName: 'Colorado River Drought Response',
    projectType: 'drought_response',
    description: 'Emergency conservation program across Lake Mead tributary agriculture zone. SWOT satellite monitors surface water drawdown; growers receive alerts to pause irrigation during critical periods.',
    location: { country: 'United States', region: 'Nevada', city: 'Las Vegas', gpsCenter: { lat: 36.2, lng: -115.0 }, polygon: [] },
    totalAcres: 9800, baselineDate: '2023-09-01', baselineWaterIndex: 0.15,
    improvementGoal: 'Cut agricultural water demand by 40% during Tier 2 shortage',
    status: 'credited', evidenceUrls: [], adminNotes: '', createdAt: '2023-09-01T00:00:00Z',
  },
  {
    projectId: 'demo-wp-004', ownerId: 'demo', ownerName: 'DPAL Showcase',
    projectName: 'Mekong Delta Community Conservation',
    projectType: 'community_conservation',
    description: 'Smart water-sharing network serving 48 farming villages in the Mekong delta. Copernicus Sentinel-2 tracks salinity intrusion and river flow to optimise community storage rotation.',
    location: { country: 'Vietnam', region: 'Can Tho', city: 'Can Tho', gpsCenter: { lat: 10.2, lng: 105.8 }, polygon: [] },
    totalAcres: 3100, baselineDate: '2024-05-10', baselineWaterIndex: 0.44,
    improvementGoal: 'Achieve equitable 7-day storage rotation for all 48 villages',
    status: 'monitoring', evidenceUrls: [], adminNotes: '', createdAt: '2024-05-10T00:00:00Z',
  },
  {
    projectId: 'demo-wp-005', ownerId: 'demo', ownerName: 'DPAL Showcase',
    projectName: 'Amsterdam Canal Leak Reduction',
    projectType: 'leak_reduction',
    description: 'IoT pressure-sensor network across 620 km of water mains in greater Amsterdam. SMAP moisture mapping identifies subsurface leaks; autonomous shut-off valves reduce loss by 28%.',
    location: { country: 'Netherlands', region: 'North Holland', city: 'Amsterdam', gpsCenter: { lat: 52.37, lng: 4.9 }, polygon: [] },
    totalAcres: 480, baselineDate: '2024-02-20', baselineWaterIndex: 0.62,
    improvementGoal: 'Reduce non-revenue water losses by 30% within 12 months',
    status: 'approved', evidenceUrls: [], adminNotes: '', createdAt: '2024-02-20T00:00:00Z',
  },
  {
    projectId: 'demo-wp-006', ownerId: 'demo', ownerName: 'DPAL Showcase',
    projectName: 'Murray-Darling Basin Smart Irrigation',
    projectType: 'farm_irrigation',
    description: 'Precision soil-moisture scheduling across three pastoral stations in New South Wales. SMAP and GRACE data feed automated drip control, eliminating over-irrigation during cool periods.',
    location: { country: 'Australia', region: 'New South Wales', city: 'Dubbo', gpsCenter: { lat: -32.3, lng: 148.6 }, polygon: [] },
    totalAcres: 6700, baselineDate: '2024-04-01', baselineWaterIndex: 0.29,
    improvementGoal: 'Reduce irrigation volume by 25% and maintain yields across 3 seasons',
    status: 'under_review', evidenceUrls: [], adminNotes: '', createdAt: '2024-04-01T00:00:00Z',
  },
  {
    projectId: 'demo-wp-007', ownerId: 'demo', ownerName: 'DPAL Showcase',
    projectName: 'São Francisco Reservoir Monitoring',
    projectType: 'reservoir_monitoring',
    description: 'Continuous SWOT + GRACE monitoring of the Sobradinho reservoir, one of Brazil\'s largest. Tracks evaporation losses and inflow trends to support downstream allocation decisions.',
    location: { country: 'Brazil', region: 'Bahia', city: 'Juazeiro', gpsCenter: { lat: -9.4, lng: -40.5 }, polygon: [] },
    totalAcres: 14000, baselineDate: '2023-11-01', baselineWaterIndex: 0.51,
    improvementGoal: 'Improve forecast accuracy to reduce emergency spill events by 50%',
    status: 'monitoring', evidenceUrls: [], adminNotes: '', createdAt: '2023-11-01T00:00:00Z',
  },
  {
    projectId: 'demo-wp-008', ownerId: 'demo', ownerName: 'DPAL Showcase',
    projectName: 'Rajasthan School Water Initiative',
    projectType: 'school_or_facility_savings',
    description: 'Low-cost rainwater harvesting and greywater reuse across 220 rural schools in Rajasthan. Sensor-equipped tanks report daily usage; AI alerts flag leaks and over-consumption.',
    location: { country: 'India', region: 'Rajasthan', city: 'Jaipur', gpsCenter: { lat: 26.9, lng: 75.8 }, polygon: [] },
    totalAcres: 95, baselineDate: '2024-06-01', baselineWaterIndex: 0.18,
    improvementGoal: 'Cut per-student water use by 45% across 220 schools by end of monsoon season',
    status: 'submitted', evidenceUrls: [], adminNotes: '', createdAt: '2024-06-01T00:00:00Z',
  },
];

// Map Global Signals API category strings → WaterAlertType icons
function signalCategoryToType(category: string): WaterAlertType {
  if (category === 'fire_smoke' || category === 'wildfire') return 'fire';
  if (category === 'flood' || category === 'storm_surge')   return 'flood';
  if (category === 'drought' || category === 'heat_wave')   return 'drought';
  if (category === 'pollution' || category === 'air_quality') return 'pollution';
  if (category === 'climate_risk' || category === 'extreme_weather') return 'climate_risk';
  if (category === 'earthquake' || category === 'seismic')  return 'earthquake';
  if (category === 'water_scarcity' || category === 'water_stress') return 'water_scarcity';
  if (category === 'infrastructure')                         return 'infrastructure';
  return 'hazard';
}

// soilMoisture values for demo globe pins (separate from full project data)
const DEMO_GLOBE_SOIL_MOISTURE: Record<string, number> = {
  'demo-wp-001': 0.42,
  'demo-wp-002': 0.19, // drought stress → pulsing ring
  'demo-wp-003': 0.12, // drought stress → pulsing ring
  'demo-wp-004': 0.55,
  'demo-wp-005': 0.68,
  'demo-wp-006': 0.33,
  'demo-wp-007': 0.57,
  'demo-wp-008': 0.14, // drought stress → pulsing ring
};

const REFERENCE_STATIONS: WaterAlertPin[] = [
  { id: 'ref-colorado',   title: 'Colorado River Basin — Chronic over-allocation drought stress',       description: 'Lake Mead & Lake Powell at historic lows. Critical water supply for 40M people.',    lat: 36.0,   lng: -114.7,  severity: 'critical', source: 'USGS Reference', isReference: true, type: 'drought'        },
  { id: 'ref-lakeChad',   title: 'Lake Chad Basin — 90% shrinkage since 1960',                          description: 'Severe desertification affecting Nigeria, Niger, Chad and Cameroon.',               lat: 13.3,   lng: 14.0,    severity: 'critical', source: 'FAO Reference',  isReference: true, type: 'water_scarcity' },
  { id: 'ref-aral',       title: 'Aral Sea Region — Near-total desiccation',                            description: 'Once the 4th largest lake; now 10% of original volume. Central Asia crisis.',       lat: 44.5,   lng: 59.5,    severity: 'high',     source: 'NASA Reference', isReference: true, type: 'drought'        },
  { id: 'ref-ganges',     title: 'Ganges-Brahmaputra Delta — Seasonal flood & drought cycle',           description: 'Groundwater depletion + monsoon flooding affects 500M people in South Asia.',       lat: 24.0,   lng: 88.0,    severity: 'high',     source: 'FAO Reference',  isReference: true, type: 'flood'          },
  { id: 'ref-mekong',     title: 'Mekong River Delta — Upstream dam impacts + saltwater intrusion',     description: 'Vietnam delta facing salinization; 20M farmers dependent on water flow.',           lat: 10.5,   lng: 105.5,   severity: 'high',     source: 'EONET Reference',isReference: true, type: 'pollution'      },
  { id: 'ref-murray',     title: 'Murray-Darling Basin — Australia drought & over-extraction',          description: 'Prolonged drought; river flow reduced >50%. Threatens agricultural output.',         lat: -34.0,  lng: 142.0,   severity: 'moderate', source: 'BOM Reference',  isReference: true, type: 'drought'        },
  { id: 'ref-nile',       title: 'Nile Delta — Freshwater scarcity & GERD dam dispute',                 description: 'Egypt, Ethiopia and Sudan in dispute over Grand Ethiopian Renaissance Dam.',         lat: 30.5,   lng: 31.2,    severity: 'moderate', source: 'FAO Reference',  isReference: true, type: 'water_scarcity' },
  { id: 'ref-indus',      title: 'Indus Basin — Glacial melt acceleration + political tension',         description: 'Pakistan & India share the Indus; 270M depend on glacially-fed rivers.',            lat: 30.0,   lng: 71.0,    severity: 'moderate', source: 'FAO Reference',  isReference: true, type: 'climate_risk'   },
  { id: 'ref-amazon',     title: 'Amazon River — Record 2023-2024 drought + fire season',               description: 'Drought cut off river communities; 50M+ people and global carbon sink at risk.',    lat: -3.5,   lng: -62.0,   severity: 'high',     source: 'INPE Reference', isReference: true, type: 'fire'           },
  { id: 'ref-yellowRiver',title: 'Yellow River — Seasonal dry-out reaching sea stopped 200+ days/yr',  description: 'Heavy extraction and climate shifts; drying episodes increasing in northern China.',  lat: 35.5,   lng: 109.0,   severity: 'moderate', source: 'CWR Reference',  isReference: true, type: 'drought'        },
];

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
  const [projects, setProjects]       = useState<WaterProject[]>([]);
  const [stats, setStats]             = useState<PlatformStats | null>(null);
  const [feed, setFeed]               = useState<TxRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [err, setErr]                 = useState('');
  const [showGlobe, setShowGlobe]     = useState(true);
  const [hazardSignals, setHazardSignals] = useState<WaterAlertPin[]>([]);
  const [isDemoMode, setIsDemoMode]   = useState(false);

  // Fix: exclude 0,0 default coords — only include projects with real GPS
  const globePins = useMemo<WaterProjectPin[]>(() =>
    projects
      .filter((p) => {
        const lat = p.location?.gpsCenter?.lat;
        const lng = p.location?.gpsCenter?.lng;
        return lat != null && lng != null && (lat !== 0 || lng !== 0);
      })
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .map((p) => ({
        projectId:    p.projectId,
        projectName:  p.projectName,
        projectType:  p.projectType,
        status:       p.status,
        country:      p.location.country,
        city:         p.location.city,
        totalAcres:   p.totalAcres,
        lat:          p.location.gpsCenter.lat,
        lng:          p.location.gpsCenter.lng,
        soilMoisture: DEMO_GLOBE_SOIL_MOISTURE[p.projectId],
      })),
    [projects]
  );

  // Alert pins = hazard signals from GlobalSignals API + reference stations when no user projects
  const alertPins = useMemo<WaterAlertPin[]>(() => {
    const base = globePins.length === 0 ? REFERENCE_STATIONS : [];
    return [...base, ...hazardSignals];
  }, [globePins.length, hazardSignals]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [pd, sd, fd] = await Promise.all([
          apiFetch<{ ok: boolean; projects: WaterProject[] }>(apiUrl(API_ROUTES.WATER_PROJECTS)),
          apiFetch<{ ok: boolean; stats: PlatformStats }>(apiUrl(API_ROUTES.WATER_STATS)),
          apiFetch<{ ok: boolean; feed: TxRecord[] }>(apiUrl(API_ROUTES.WATER_ACTIVITY_FEED)),
        ]);
        const liveProjects = pd.projects ?? [];
        if (liveProjects.length === 0) {
          setProjects(DEMO_WATER_PROJECTS);
          setIsDemoMode(true);
        } else {
          setProjects(liveProjects);
          setIsDemoMode(false);
        }
        setStats(sd.stats);
        setFeed(fd.feed ?? []);
      } catch (ex: unknown) {
        // API unavailable — show demo showcase projects
        setProjects(DEMO_WATER_PROJECTS);
        setIsDemoMode(true);
        setErr('');
      } finally {
        setLoading(false);
      }
    }
    load();

    // Pull environmental hazard + pollution signals to show on map
    async function loadSignals() {
      try {
        const url = apiUrl('/api/signals') + '?riskLevel=high&limit=30';
        const data = await apiFetch<{ ok: boolean; signals: Array<{ signalId: string; title: string; description: string; category: string; riskLevel: string; latitude?: number; longitude?: number; sourceName: string }> }>(url);
        const pins: WaterAlertPin[] = (data.signals ?? [])
          .filter((s) => s.latitude != null && s.longitude != null && s.latitude !== 0 && s.longitude !== 0)
          .filter((s) => ['environmental_hazard', 'pollution', 'climate_risk', 'fire_smoke'].includes(s.category))
          .map((s) => ({
            id: s.signalId,
            title: s.title,
            description: s.description,
            lat: s.latitude!,
            lng: s.longitude!,
            severity: s.riskLevel as WaterAlertPin['severity'],
            source: s.sourceName,
            isReference: false,
            type: signalCategoryToType(s.category),
          }));
        setHazardSignals(pins);
      } catch {
        // signals not critical — fail silently
      }
    }
    loadSignals();
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
              <Waves className="w-5 h-5 text-teal-400" />
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
            <Plus className="w-4 h-4" />Register Project
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-300">{err}</div>
      )}

      {isDemoMode && (
        <div className="flex items-center gap-3 bg-teal-500/10 border border-teal-500/30 rounded-lg px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 bg-teal-500/20 border border-teal-500/40 px-2 py-0.5 rounded-full shrink-0">Showcase Mode</span>
          <span className="text-xs text-slate-400">Displaying 8 global water projects · Register your own project to add live monitoring data</span>
        </div>
      )}

      {/* Live Satellite Feed — uses first project with valid GPS (including demo projects) */}
      <SatelliteLiveFeed monitoringProject={(() => {
        const liveProject = projects.find(p => p.location?.gpsCenter?.lat && p.location?.gpsCenter?.lng && p.location.gpsCenter.lat !== 0 && p.location.gpsCenter.lng !== 0);
        if (!liveProject) return null;
        return {
          projectName: liveProject.projectName,
          city: liveProject.location.city,
          country: liveProject.location.country,
          lat: liveProject.location.gpsCenter.lat,
          lng: liveProject.location.gpsCenter.lng,
        };
      })()} />

      {/* Platform stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Projects',   value: String(stats.totalProjects),   icon: <Globe className="w-4 h-4 text-teal-400" /> },
            { label: 'Approved',         value: String(stats.approvedProjects), icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
            { label: 'Credits Issued',   value: fmtKL(stats.totalCreditsKL),   icon: <Award className="w-4 h-4 text-violet-400" /> },
            { label: 'Listed on Market', value: String(stats.listedCredits),   icon: <BarChart2 className="w-4 h-4 text-indigo-400" /> },
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
          <div className="flex items-center gap-2 flex-wrap">
            <Globe className="w-[15px] h-[15px] text-teal-400" />
            <span className="text-sm font-semibold text-slate-200">Project World Map</span>
            {globePins.length > 0 && (
              <span className="text-[10px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                {globePins.length} project{globePins.length !== 1 ? 's' : ''}{isDemoMode ? ' · showcase' : ''}
              </span>
            )}
            {alertPins.length > 0 && (
              <span className="text-[10px] bg-orange-500/15 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full">
                {alertPins.filter(a => !a.isReference).length > 0
                  ? `${alertPins.filter(a => !a.isReference).length} hazard signal${alertPins.filter(a => !a.isReference).length !== 1 ? 's' : ''}`
                  : `${alertPins.length} reference station${alertPins.length !== 1 ? 's' : ''}`}
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
            alertPins={alertPins}
            onSelectProject={onViewProject}
            height="h-[440px]"
          />
        )}
        {showGlobe && (
          <p className="px-4 py-2 text-[10px] text-slate-600 border-t border-slate-800">
            {isDemoMode
              ? '8 showcase projects · 10 global water stress reference stations · Register a project to add live monitoring pins'
              : 'Showing your registered projects · Reference water stress stations shown when no projects are registered'}
          </p>
        )}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Validator Queue', icon: <ShieldCheck className="w-[18px] h-[18px] text-amber-400" />, desc: 'Review pending impact reports', onClick: onOpenValidator, accent: 'border-amber-700/40 hover:border-amber-500/60' },
          { label: 'Water Credits', icon: <Award className="w-[18px] h-[18px] text-violet-400" />, desc: 'Manage and trade impact credits', onClick: onOpenCredits, accent: 'border-violet-700/40 hover:border-violet-500/60' },
          { label: 'Register Project', icon: <Plus className="w-[18px] h-[18px] text-teal-400" />, desc: 'Start a new water project', onClick: onCreateProject, accent: 'border-teal-700/40 hover:border-teal-500/60' },
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
            <Plus className="w-3 h-3" />Add
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-dashed border-slate-700 rounded-xl">
            <Droplets className="w-9 h-9 mx-auto text-teal-500/30 mb-3" />
            <p className="text-slate-400 text-sm">No water projects registered yet.</p>
            <button onClick={onCreateProject} className="mt-3 text-teal-400 text-xs hover:underline">Register your first project →</button>
          </div>
        )}

        <div className="space-y-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.projectId}
              project={p}
              onClick={() => onViewProject(p.projectId)}
              onGpsSaved={(id, lat, lng) => {
                setProjects(prev => prev.map(proj =>
                  proj.projectId === id
                    ? { ...proj, location: { ...proj.location, gpsCenter: { lat, lng } } }
                    : proj
                ));
              }}
            />
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
                  {tx.txType === 'issue'  && <Zap className="w-3 h-3 text-teal-400" />}
                  {tx.txType === 'list'   && <Globe className="w-3 h-3 text-indigo-400" />}
                  {tx.txType === 'retire' && <Award className="w-3 h-3 text-violet-400" />}
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
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
          <div className="flex items-center gap-2">
            <Waves className="w-[18px] h-[18px] text-teal-400" />
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
