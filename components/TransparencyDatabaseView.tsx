
import React, { useState, useEffect, useMemo } from 'react';
import { type Report, Category } from '../types';
import { reportMatchesKeywordFilter } from '../utils/reportSearch';
import { ArrowLeft, Database, Search, ShieldCheck, Scale, AlertTriangle } from './icons';
import ReportCard from './ReportCard';
import OperationalConfidencePanel from './OperationalConfidencePanel';
import LiveTransparencyMetricsCard from './LiveTransparencyMetricsCard';
import VerifierConfidenceCard from './VerifierConfidenceCard';

interface TransparencyDatabaseViewProps {
  onReturn: () => void;
  reports: Report[];
  filters: {
    keyword: string;
    selectedCategories: Category[];
    location: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    keyword: string;
    selectedCategories: Category[];
    location: string;
  }>>;
  onJoinReportChat: (report: Report) => void;
  onEnterMissionV2?: (report: Report) => void;
}

const TransparencyDatabaseView: React.FC<TransparencyDatabaseViewProps> = ({ onReturn, reports, filters, setFilters, onJoinReportChat, onEnterMissionV2 }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [showOnlyActionable, setShowOnlyActionable] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredReports = useMemo(() => {
    let result = [...reports];
    if (showOnlyActionable) result = result.filter(r => r.isActionable);
    if (filters.keyword?.trim()) {
      result = result.filter((r) => reportMatchesKeywordFilter(r, filters.keyword));
    }
    if (filters.selectedCategories.length > 0) {
      const set = new Set(filters.selectedCategories);
      result = result.filter(r => set.has(r.category));
    }
    // Do not force a hidden location constraint in this view.
    // Transparency search should behave like a global ledger lookup.
    const toTime = (r: Report) => (r.timestamp instanceof Date ? r.timestamp : new Date((r as any).timestamp)).getTime();
    return result.sort((a, b) => toTime(b) - toTime(a));
  }, [reports, filters, showOnlyActionable]);

  return (
    <div className="relative flex flex-col min-h-[70vh] bg-[var(--dpal-surface)] text-[var(--dpal-text-primary)] rounded-[2.5rem] border border-[var(--dpal-border)] shadow-xl font-sans overflow-hidden">
      {showIntro && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--dpal-background)] z-10 rounded-[2.5rem]">
          <Database className="w-16 h-16 text-[var(--dpal-accent)] animate-pulse mb-4" />
          <p className="text-[var(--dpal-text-secondary)] text-xs font-bold uppercase tracking-wider">Loading public records…</p>
        </div>
      )}
      <div className={`flex flex-col flex-1 min-h-0 ${showIntro ? 'invisible' : ''}`}>
        <header className="bg-[var(--dpal-panel)] border-b border-[var(--dpal-border)] px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 flex-shrink-0 z-10">
            <button onClick={onReturn} className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest text-[var(--dpal-text-muted)] hover:text-[var(--dpal-accent)] transition-colors group">
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span>Back</span>
            </button>
            <div className="flex items-center space-x-4 min-w-0">
                <Database className="w-6 h-6 text-[var(--dpal-accent)] flex-shrink-0" />
                <h2 className="text-xl font-black uppercase tracking-tighter truncate">Public record</h2>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-[10px] font-black text-[var(--dpal-text-muted)] uppercase tracking-widest">
                <span className="dpal-badge-success px-4 py-1.5 rounded-full flex items-center space-x-2 border">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Blockchain-linked index</span>
                </span>
            </div>
        </header>

        <div className="flex-grow min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Mobile: results first (order-1); desktop: sidebar left (lg:order-1) */}
            <aside className="order-2 lg:order-1 lg:col-span-3 border-r border-[var(--dpal-border)] border-t lg:border-t-0 bg-[var(--dpal-background-secondary)] overflow-y-auto custom-scrollbar p-4 sm:p-8 min-h-0">
                <div className="space-y-6">
                    <OperationalConfidencePanel />
                    <LiveTransparencyMetricsCard />
                    <VerifierConfidenceCard />
                    {/* ACTIONABLE FILTER */}
                    <div className="space-y-6">
                        <label className="text-[10px] font-black uppercase text-[var(--dpal-text-muted)] tracking-[0.3em] ml-2">Serious cases</label>
                        <button 
                            onClick={() => setShowOnlyActionable(!showOnlyActionable)}
                            className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between group ${showOnlyActionable ? 'bg-rose-700 border-rose-500 text-white shadow-lg' : 'bg-[var(--dpal-card)] border-[var(--dpal-border)] text-[var(--dpal-text-secondary)] hover:border-rose-500/50'}`}
                        >
                            <div className="flex items-center space-x-4">
                                <Scale className={`w-6 h-6 transition-transform group-hover:scale-110 ${showOnlyActionable ? 'text-white' : 'text-rose-500'}`} />
                                <div className="text-left">
                                    <p className="text-xs font-black uppercase tracking-widest">Actionable Only</p>
                                    <p className="text-[8px] font-bold uppercase opacity-60">Surfacing Serious Shards</p>
                                </div>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${showOnlyActionable ? 'bg-white animate-pulse' : 'bg-zinc-800'}`}></div>
                        </button>
                    </div>

                    <div className="space-y-6">
                        <label className="text-[10px] font-black uppercase text-[var(--dpal-text-muted)] tracking-[0.3em] ml-2">Search</label>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dpal-text-muted)] group-focus-within:text-[var(--dpal-accent)] transition-colors pointer-events-none" />
                            <input 
                                value={filters.keyword}
                                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                                placeholder="ID, block #, transaction, title…"
                                className="dpal-input w-full border-2 pr-4 py-4 text-[11px] font-semibold placeholder:normal-case"
                                style={{ paddingLeft: '2.75rem' }}
                                aria-label="Search public records by ID, block number, or transaction"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-[var(--dpal-text-muted)] tracking-[0.3em] ml-2">Category</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {[...Object.values(Category)].sort((a: any, b: any) => a.localeCompare(b)).map(cat => {
                                const isSel = filters.selectedCategories.includes(cat);
                                return (
                                    <button 
                                        key={cat}
                                        onClick={() => setFilters(prev => ({
                                            ...prev,
                                            selectedCategories: isSel ? prev.selectedCategories.filter(c => c !== cat) : [...prev.selectedCategories, cat]
                                        }))}
                                        className={`p-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all text-left ${isSel ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : 'bg-[var(--dpal-card)] border-[var(--dpal-border)] text-[var(--dpal-text-secondary)] hover:border-[var(--dpal-border-strong)]'}`}
                                    >
                                        {cat}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </aside>

            <main className="order-1 lg:order-2 lg:col-span-9 bg-[var(--dpal-background)] overflow-y-auto custom-scrollbar p-4 pt-4 sm:p-8 lg:p-12 min-h-0">
                <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10">

                    {/* ── DPAL Library / Ledger Video ── */}
                    <div style={{ borderRadius: '1.2rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.45)', background: '#000', lineHeight: 0 }}>
                        <video
                            src="/dpal-ledger-hero.mp4"
                            autoPlay
                            muted
                            loop
                            playsInline
                            controls
                            style={{ width: '100%', display: 'block', maxHeight: '340px', objectFit: 'cover' }}
                        />
                    </div>

                    <div className="space-y-4">
                        <label htmlFor="public-record-search" className="sr-only">
                            Search by report ID, block number, transaction hash, or keywords
                        </label>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--dpal-text-muted)] group-focus-within:text-[var(--dpal-accent)] transition-colors pointer-events-none" />
                            <input
                                id="public-record-search"
                                type="search"
                                value={filters.keyword}
                                onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                                placeholder="Search by report ID, block number, or transaction…"
                                className="dpal-input w-full py-4 pr-4 text-sm font-medium shadow-sm"
                                style={{ paddingLeft: '2.75rem' }}
                                autoComplete="off"
                            />
                        </div>
                        <p className="text-xs text-[var(--dpal-text-muted)]">
                            Every submission receives a ledger reference (transaction ID). Look up any record by its report ID, block height, or hash.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end border-b border-[var(--dpal-border)] pb-4 sm:pb-10">
                        <div className="min-w-0">
                            <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--dpal-text-primary)]">Search results</h3>
                            <p className="mt-2 text-sm text-[var(--dpal-text-muted)] sm:mt-3">Public, blockchain-anchored accountability reports.</p>
                        </div>
                        <div className="dpal-badge-success px-4 py-2 sm:px-6 rounded-2xl shrink-0 self-start sm:self-auto border">
                            <span className="text-[10px] font-black text-emerald-300">{filteredReports.length} matching {filteredReports.length === 1 ? 'record' : 'records'}</span>
                        </div>
                    </div>

                    <div className="space-y-6 sm:space-y-10 pb-12 sm:pb-20">
                        {filteredReports.length > 0 ? (
                            filteredReports.map(report => (
                                /* FIX: Changed onJoinReportChat to onJoinChat to satisfy ReportCardProps interface */
                                <ReportCard key={report.id} report={report} onAddImage={() => {}} onJoinChat={onJoinReportChat} onEnterMissionV2={onEnterMissionV2} />
                            ))
                        ) : (
                            <div className="py-14 text-center border-2 border-dashed border-[var(--dpal-border)] rounded-3xl bg-[var(--dpal-surface)]">
                                <AlertTriangle className="w-12 h-12 text-[var(--dpal-text-muted)] mx-auto mb-4" />
                                <p className="text-sm font-semibold text-[var(--dpal-text-secondary)]">No matching records</p>
                                <p className="mt-2 text-xs text-[var(--dpal-text-muted)]">Try another ID, block number, transaction, or keyword.</p>
                                <button type="button" onClick={() => { setFilters({keyword: '', selectedCategories: [], location: ''}); setShowOnlyActionable(false); }} className="mt-4 text-sm font-semibold text-[var(--dpal-accent)] hover:underline">Clear filters</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
      </div>
    </div>
  );
};

export default TransparencyDatabaseView;
