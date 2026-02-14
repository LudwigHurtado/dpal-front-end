
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from '../i18n';
import { type Report, type Hero, Category } from '../types';
import { ArrowLeft, Database, Search, ShieldCheck, Loader, Zap, Sparkles, Filter, ListFilter, ChevronDown, Broadcast, Scale, AlertTriangle } from './icons';
import FilterPanel from './FilterPanel';
import ReportCard from './ReportCard';

interface TransparencyDatabaseViewProps {
  onReturn: () => void;
  hero: Hero;
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
}

const TransparencyDatabaseView: React.FC<TransparencyDatabaseViewProps> = ({ onReturn, hero, reports, filters, setFilters, onJoinReportChat }) => {
  const { t } = useTranslations();
  const [showIntro, setShowIntro] = useState(true);
  const [isQuerying, setIsQuerying] = useState(false);
  const [showOnlyActionable, setShowOnlyActionable] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredReports = useMemo(() => {
    let result = [...reports];
    if (showOnlyActionable) result = result.filter(r => r.isActionable);
    if (filters.keyword) {
      const q = filters.keyword.toLowerCase();
      result = result.filter(r =>
          (r.title || '').toString().toLowerCase().includes(q) ||
          (r.description || '').toString().toLowerCase().includes(q) ||
          (r.id || '').toString().toLowerCase() === q
      );
    }
    if (filters.selectedCategories.length > 0) {
      const set = new Set(filters.selectedCategories);
      result = result.filter(r => set.has(r.category));
    }
    if (filters.location) {
        const qLoc = filters.location.toLowerCase();
        result = result.filter(r => (r.location || '').toString().toLowerCase().includes(qLoc));
    }
    const toTime = (r: Report) => (r.timestamp instanceof Date ? r.timestamp : new Date((r as any).timestamp)).getTime();
    return result.sort((a, b) => toTime(b) - toTime(a));
  }, [reports, filters, showOnlyActionable]);

  const handleRunQuery = () => {
    setIsQuerying(true);
    setTimeout(() => setIsQuerying(false), 800);
  };

  return (
    <div className="relative flex flex-col min-h-[70vh] bg-zinc-950 text-white rounded-[2.5rem] border border-zinc-800 shadow-2xl font-mono overflow-hidden">
      {showIntro && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 rounded-[2.5rem]">
          <Database className="w-16 h-16 text-emerald-400 animate-pulse mb-4" />
          <p className="text-emerald-500 text-xs font-bold uppercase tracking-wider">Loading ledger...</p>
        </div>
      )}
      <div className={`flex flex-col flex-1 min-h-0 ${showIntro ? 'invisible' : ''}`}>
        <header className="bg-zinc-900/80 border-b border-zinc-800 px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 flex-shrink-0 z-10">
            <button onClick={onReturn} className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-cyan-400 transition-colors group">
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span>TERMINAL_RETURN</span>
            </button>
            <div className="flex items-center space-x-4 min-w-0">
                <Database className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                <h2 className="text-xl font-black uppercase tracking-tighter truncate">Transparency_Database_v4.2</h2>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <span className="bg-emerald-950/20 text-emerald-500 border border-emerald-900/40 px-4 py-1.5 rounded-full flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>AUTH_DB_READ_ACCESS</span>
                </span>
            </div>
        </header>

        <div className="flex-grow min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            <aside className="lg:col-span-3 border-r border-zinc-800 bg-black/40 overflow-y-auto custom-scrollbar p-8 min-h-0">
                <div className="space-y-10">
                    {/* ACTIONABLE FILTER */}
                    <div className="space-y-6">
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] ml-2">High_Stake_Oversight</label>
                        <button 
                            onClick={() => setShowOnlyActionable(!showOnlyActionable)}
                            className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between group ${showOnlyActionable ? 'bg-rose-600 border-rose-400 text-white shadow-2xl' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-rose-900'}`}
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
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] ml-2">String_Query</label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-cyan-500 transition-colors" />
                            <input 
                                value={filters.keyword}
                                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                                placeholder="Search IDs, Hashes..."
                                className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-[11px] font-black uppercase text-white outline-none focus:border-cyan-500 transition-all placeholder:text-zinc-900"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] ml-2">Domain_Focus</label>
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
                                        className={`p-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all text-left ${isSel ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-black border-zinc-900 text-zinc-600 hover:border-zinc-700'}`}
                                    >
                                        {cat}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </aside>

            <main className="lg:col-span-9 bg-black overflow-y-auto custom-scrollbar p-8 lg:p-12 min-h-0">
                <div className="max-w-4xl mx-auto space-y-10">
                    <div className="flex justify-between items-end border-b border-zinc-900 pb-10">
                        <div>
                            <h3 className="text-4xl font-black uppercase tracking-tighter text-white">QueryResult_Set</h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-4">Database: PROD_LEDGER // Cluster: STABLE</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 px-6 py-2 rounded-2xl">
                            <span className="text-[10px] font-black text-emerald-500">{filteredReports.length} Records In Sync</span>
                        </div>
                    </div>

                    <div className="space-y-10 pb-20">
                        {filteredReports.length > 0 ? (
                            filteredReports.map(report => (
                                /* FIX: Changed onJoinReportChat to onJoinChat to satisfy ReportCardProps interface */
                                <ReportCard key={report.id} report={report} onAddImage={() => {}} onJoinChat={onJoinReportChat} />
                            ))
                        ) : (
                            <div className="py-40 text-center border-4 border-dashed border-zinc-900 rounded-[4rem] bg-zinc-950/40">
                                <AlertTriangle className="w-20 h-20 text-zinc-900 mx-auto mb-8" />
                                <p className="text-xs font-black uppercase text-zinc-700 tracking-[0.6em]">Null_Set_Returned</p>
                                <button onClick={() => { setFilters({keyword: '', selectedCategories: [], location: ''}); setShowOnlyActionable(false); }} className="mt-8 text-[10px] font-black text-cyan-500 hover:underline">Reset Protocols</button>
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
