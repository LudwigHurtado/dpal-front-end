import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ArrowLeft, MapPin, CheckCircle, Search, ChevronDown, ChevronUp, Loader, Sparkles, Users, Zap, Award, ShieldCheck, Activity } from './icons';
import { API_ROUTES, apiUrl, OFFSETS_PORTFOLIO, OFFSETS_COALITION } from '../constants';
import { isAiEnabled } from '../services/geminiService';
import type { Hero } from '../types';

const SUSTAINABILITY_COLLAGE = '/main-screen/Offset-Marketplace/hero-dpal-sustainability-collage.png';

// ── Types ──────────────────────────────────────────────────────────────────────

type ParcelStatus = 'Verified' | 'In Progress' | 'Needs Review';

interface OffsetProject {
  _id: string;
  projectId: string;
  name: string;
  location: string;
  address: string;
  siteUrl: string;
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

interface OffsetMarketplaceViewProps {
  onReturn: () => void;
  hero?: Hero;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const statusColor: Record<ParcelStatus, string> = {
  Verified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'In Progress': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Needs Review': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

function relTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ── Mini price sparkline ───────────────────────────────────────────────────────

function Sparkline({ data }: { data: { date: number; priceUsd: number }[] }) {
  if (!data.length) return null;
  const prices = data.map((d) => d.priceUsd);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 120, H = 36;
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

// ── Main component ─────────────────────────────────────────────────────────────

const OffsetMarketplaceView: React.FC<OffsetMarketplaceViewProps> = ({ onReturn, hero }) => {
  // Data state
  const [projects, setProjects] = useState<OffsetProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<Purchase[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  // UI state
  const [query, setQuery] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio' | 'feed'>('market');

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
      // server unavailable — keep empty state
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

  useEffect(() => { void fetchAll(); }, []);
  useEffect(() => { void fetchPortfolio(); }, [userId]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      `${p.name} ${p.projectId} ${p.location} ${p.mission} ${p.status}`.toLowerCase().includes(q)
    );
  }, [projects, query]);

  const activeProject = useMemo(
    () => projects.find((p) => p.projectId === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const networkTotals = useMemo(() => ({
    projects: projects.length,
    units: projects.reduce((s, p) => s + p.totalUnits, 0),
    verified: projects.filter((p) => p.status === 'Verified').length,
    retired: projects.reduce((s, p) => s + p.retiredUnits, 0),
  }), [projects]);

  const portfolioTotals = useMemo(() => ({
    total: portfolio.reduce((s, p) => s + p.units, 0),
    retired: portfolio.filter((p) => p.retired).reduce((s, p) => s + p.units, 0),
    active: portfolio.filter((p) => !p.retired).reduce((s, p) => s + p.units, 0),
  }), [portfolio]);

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
          userId,
          userName,
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
        body: JSON.stringify({ projectId: activeProject.projectId, userId, userName, summary: verifyNotes, proofImageUrls: [] }),
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
          <button onClick={onReturn} className="absolute top-4 left-4 p-2 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400 mb-1">DPAL Green Network</p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Carbon Credit Market</h1>
          <p className="text-sm text-slate-300 mt-1">Buy, retire, and verify real carbon offsets. Join coalitions. Earn impact.</p>
        </div>
      </div>

      {/* Network stats */}
      <div className="grid grid-cols-4 gap-px bg-slate-800/50 border-y border-slate-800">
        {[
          { label: 'Projects', value: networkTotals.projects },
          { label: 'Verified', value: networkTotals.verified },
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
      <div className="flex border-b border-slate-800 shrink-0">
        {(['market', 'portfolio', 'feed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-bold capitalize transition-all border-b-2 ${activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            {tab === 'portfolio' ? `My Credits${portfolioTotals.total ? ` (${portfolioTotals.total})` : ''}` : tab === 'feed' ? 'Impact Feed' : 'Market'}
          </button>
        ))}
      </div>

      {/* ── MARKET TAB ── */}
      {activeTab === 'market' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

          {/* Left: project list */}
          <div className="lg:w-[360px] shrink-0 border-r border-slate-800 flex flex-col">
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <Loader className="w-5 h-5 animate-spin mr-2" /> Loading projects…
                </div>
              ) : visible.map((p) => (
                <button
                  key={p.projectId}
                  onClick={() => setActiveProjectId(p.projectId)}
                  className={`w-full text-left p-4 border-b border-slate-800 transition-all ${activeProjectId === p.projectId ? 'bg-emerald-900/20 border-l-2 border-l-emerald-500' : 'hover:bg-slate-900'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 shrink-0 overflow-hidden">
                      <img src={SUSTAINABILITY_COLLAGE} alt="" className="w-full h-full object-cover opacity-70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">{p.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor[p.status]}`}>{p.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-emerald-400 font-bold">{p.availableUnits.toLocaleString()} tCO2e</span>
                        <span className="text-xs text-amber-400 font-bold">${p.pricePerTonne}/t</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" />{p.coalitionCount}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: project detail */}
          {activeProject ? (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColor[activeProject.status]}`}>{activeProject.status}</span>
                  <h2 className="text-xl font-black mt-1">{activeProject.name}</h2>
                  <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" />{activeProject.location}</p>
                  <p className="text-sm text-slate-300 mt-2">{activeProject.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAiScore(activeProject)}
                    disabled={scoringId === activeProject.projectId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition-all disabled:opacity-50"
                  >
                    {scoringId === activeProject.projectId ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI Score
                  </button>
                  <button
                    onClick={() => handleJoin(activeProject.projectId)}
                    disabled={joiningId === activeProject.projectId || joinedIds.has(activeProject.projectId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 transition-all disabled:opacity-50"
                  >
                    {joiningId === activeProject.projectId ? <Loader className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
                    {joinedIds.has(activeProject.projectId) ? 'Joined ✓' : 'Join Coalition'}
                  </button>
                </div>
              </div>

              {/* AI credibility score */}
              {activeProject.credibilityScore > 0 && (
                <div className="rounded-2xl bg-violet-900/20 border border-violet-500/25 p-4">
                  <p className="text-[10px] font-black uppercase text-violet-400 mb-1">AI Credibility Score</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-black ${scoreColor(activeProject.credibilityScore)}`}>{activeProject.credibilityScore}</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all" style={{ width: `${activeProject.credibilityScore}%` }} />
                    </div>
                    <span className="text-xs text-slate-400">/100</span>
                  </div>
                  {activeProject.credibilityNote && <p className="text-xs text-slate-300 mt-2">{activeProject.credibilityNote}</p>}
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total tCO2e', value: activeProject.totalUnits.toLocaleString(), color: 'text-white' },
                  { label: 'Available', value: activeProject.availableUnits.toLocaleString(), color: 'text-emerald-400' },
                  { label: 'Retired', value: activeProject.retiredUnits.toLocaleString(), color: 'text-cyan-400' },
                  { label: 'Price / tonne', value: `$${activeProject.pricePerTonne}`, color: 'text-amber-400' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-slate-900 border border-slate-700 p-3">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{s.label}</p>
                    <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Price sparkline */}
              {activeProject.priceHistory.length > 1 && (
                <div className="rounded-2xl bg-slate-900 border border-slate-700 p-4">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-3">Price History (7d)</p>
                  <div className="flex items-end gap-4">
                    <Sparkline data={activeProject.priceHistory} />
                    <div>
                      <p className="text-xs text-slate-400">Current</p>
                      <p className="text-lg font-black text-white">${activeProject.pricePerTonne}/t</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Group purchase */}
              {activeProject.groupTarget > 0 && (
                <div className="rounded-2xl bg-cyan-900/20 border border-cyan-500/25 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-cyan-300">Community Group Buy</p>
                    <span className="text-xs text-slate-400">{activeProject.groupFunded} / {activeProject.groupTarget} tCO2e funded</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (activeProject.groupFunded / activeProject.groupTarget) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">Pool your purchase with the community to hit the group target and unlock bonus retirement certificates.</p>
                </div>
              )}

              {/* Buy flow */}
              <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5 space-y-4">
                <p className="text-sm font-black uppercase tracking-wide text-slate-300">Purchase Credits</p>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-400 font-bold">Quantity (tCO2e)</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setBuyQty((q) => Math.max(1, q - 1))} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-600 text-lg font-bold flex items-center justify-center hover:bg-slate-700 transition-all">−</button>
                    <span className="text-lg font-black w-8 text-center">{buyQty}</span>
                    <button onClick={() => setBuyQty((q) => q + 1)} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-600 text-lg font-bold flex items-center justify-center hover:bg-slate-700 transition-all">+</button>
                  </div>
                  <span className="text-sm text-amber-400 font-bold ml-auto">${(buyQty * activeProject.pricePerTonne).toFixed(2)}</span>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" checked={buyGroup} onChange={(e) => setBuyGroup(e.target.checked)} className="w-4 h-4 accent-cyan-500" />
                  Contribute to community group buy
                </label>
                {buySuccess && <p className="text-sm text-emerald-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" />{buySuccess}</p>}
                {buyError && <p className="text-sm text-rose-400">{buyError}</p>}
                <button
                  onClick={handleBuy}
                  disabled={buying || activeProject.availableUnits < 1}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-4px_rgba(52,211,153,0.6)]"
                >
                  {buying ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {buying ? 'Processing…' : `Buy ${buyQty} tCO2e`}
                </button>
              </div>

              {/* Coalition */}
              <div className="rounded-2xl bg-slate-900 border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-slate-300">Coalition Members</p>
                  <span className="text-xs text-cyan-400 font-bold">{activeProject.coalitionCount} joined</span>
                </div>
                <p className="text-xs text-slate-400">Coalition members steward this project — verifying progress, submitting field reports, and pledging community support.</p>
              </div>

              {/* Verification */}
              <div className="rounded-2xl bg-slate-900 border border-slate-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-slate-300">Submit Verification</p>
                  <button onClick={() => setVerifyOpen((v) => !v)} className="text-xs text-amber-400">
                    {verifyOpen ? 'Cancel' : 'Open'}
                  </button>
                </div>
                {verifyOpen && !verifyDone && (
                  <>
                    <textarea
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      placeholder="Describe what you observed on site — tree cover, water levels, equipment, etc."
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 resize-none outline-none focus:border-amber-500 transition-all"
                    />
                    <button
                      onClick={handleVerify}
                      disabled={verifying || !verifyNotes.trim()}
                      className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm disabled:opacity-50 transition-all"
                    >
                      {verifying ? 'Submitting…' : 'Submit to Validator Node'}
                    </button>
                  </>
                )}
                {verifyDone && <p className="text-sm text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Verification submitted to validator queue.</p>}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Select a project'}
            </div>
          )}
        </div>
      )}

      {/* ── PORTFOLIO TAB ── */}
      {activeTab === 'portfolio' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Owned', value: `${portfolioTotals.total} tCO2e`, color: 'text-white' },
              { label: 'Active', value: `${portfolioTotals.active} tCO2e`, color: 'text-emerald-400' },
              { label: 'Retired', value: `${portfolioTotals.retired} tCO2e`, color: 'text-cyan-400' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-900 border border-slate-700 p-4 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-bold">{s.label}</p>
                <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {portfolio.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Award className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-bold">No credits yet</p>
              <p className="text-sm mt-1">Buy credits from the Market tab to build your portfolio.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {portfolio.map((p) => (
                <div key={p.purchaseId} className="rounded-2xl bg-slate-900 border border-slate-700 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-bold text-white">{p.projectName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.units} tCO2e · ${p.pricePerTonne}/t · ${p.totalUsd.toFixed(2)} total</p>
                      {p.retired && (
                        <div className="mt-1">
                          <span className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-full px-2 py-0.5 font-bold">Retired</span>
                          {p.certificateHash && (
                            <p className="text-[10px] text-slate-500 mt-1 font-mono break-all">cert: {p.certificateHash.slice(0, 24)}…</p>
                          )}
                        </div>
                      )}
                    </div>
                    {!p.retired && (
                      <button
                        onClick={() => handleRetire(p)}
                        disabled={retiringId === p.purchaseId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 transition-all disabled:opacity-50"
                      >
                        {retiringId === p.purchaseId ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Retire & Certify
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── IMPACT FEED TAB ── */}
      {activeTab === 'feed' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
          <p className="text-sm font-black uppercase text-slate-400 tracking-wide">Live Network Activity</p>
          {feed.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-bold">No activity yet</p>
              <p className="text-sm mt-1">Purchases and coalition joins will appear here.</p>
            </div>
          ) : feed.map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm ${item.type === 'purchase' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                {item.type === 'purchase' ? '🌱' : '🤝'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">
                  <span className="font-bold">{item.userName}</span>{' '}
                  {item.type === 'purchase'
                    ? <>{item.retired ? 'retired' : 'purchased'} <span className="text-emerald-400 font-bold">{item.units} tCO2e</span> from {item.projectName}</>
                    : <>joined <span className="text-cyan-400 font-bold">{item.projectId}</span> as {item.role}</>
                  }
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{relTime(item.ts)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default OffsetMarketplaceView;
