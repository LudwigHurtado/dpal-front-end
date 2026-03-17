import React, { useMemo, useState } from 'react';
import { useTranslations } from '../i18n';
import type { Hero } from '../types';
import { Search, ArrowLeft, ShieldCheck, Map, Filter, Info, User as UserIcon, FileText } from './icons';

export interface PoliticianPosition {
  id: string;
  measureTitle: string;
  measureType: 'Law' | 'Proposition' | 'Charter' | 'Resolution';
  topics: string[];
  position: 'Support' | 'Oppose' | 'Undecided' | 'Needs Revision';
  rationale: string;
  timestamp: string;
  verification: 'Official' | 'Community-Verified' | 'Unverified';
}

export interface PoliticianProfile {
  id: string;
  name: string;
  office: string;
  jurisdiction: string;
  term: string;
  focusAreas: string[];
  transparencyStatus: 'Full' | 'Partial' | 'None';
  positions: PoliticianPosition[];
}

const MOCK_POLITICIANS: PoliticianProfile[] = [
  {
    id: 'pol-001',
    name: 'Jordan Reyes',
    office: 'City Council Member',
    jurisdiction: 'District 7',
    term: '2024–2028',
    focusAreas: ['Housing', 'Police Oversight', 'Climate'],
    transparencyStatus: 'Full',
    positions: [
      {
        id: 'pos-1',
        measureTitle: 'Community Safety Charter Update',
        measureType: 'Charter',
        topics: ['Police Oversight'],
        position: 'Support',
        rationale: 'Supports independent civilian review with public reporting requirements.',
        timestamp: '2026-02-01T10:00:00Z',
        verification: 'Official',
      },
      {
        id: 'pos-2',
        measureTitle: 'Municipal Green Building Standard',
        measureType: 'Law',
        topics: ['Climate'],
        position: 'Needs Revision',
        rationale: 'Wants stronger tenant protections before full adoption.',
        timestamp: '2026-01-20T15:30:00Z',
        verification: 'Official',
      },
    ],
  },
];

interface PoliticianTransparencyViewProps {
  hero: Hero;
  onReturn: () => void;
}

const PoliticianTransparencyView: React.FC<PoliticianTransparencyViewProps> = ({ hero, onReturn }) => {
  const { t } = useTranslations();
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const politicians = MOCK_POLITICIANS;

  const allTopics = useMemo(() => {
    const set = new Set<string>();
    politicians.forEach((p) => p.positions.forEach((pos) => pos.topics.forEach((t) => set.add(t))));
    return Array.from(set).sort();
  }, [politicians]);

  const filtered = useMemo(() => {
    return politicians
      .map((p) => {
        const matchesName =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.office.toLowerCase().includes(search.toLowerCase()) ||
          p.jurisdiction.toLowerCase().includes(search.toLowerCase());

        const filteredPositions = p.positions.filter((pos) => {
          const matchesTopic = !selectedTopic || pos.topics.includes(selectedTopic);
          const matchesMeasure =
            !search ||
            pos.measureTitle.toLowerCase().includes(search.toLowerCase()) ||
            pos.measureType.toLowerCase().includes(search.toLowerCase());
          return matchesTopic && matchesMeasure;
        });

        return {
          ...p,
          positions: matchesName ? filteredPositions : filteredPositions,
        };
      })
      .filter((p) => p.positions.length > 0);
  }, [politicians, search, selectedTopic]);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-24 font-mono">
      <button
        onClick={onReturn}
        className="inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-cyan-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return</span>
      </button>

      <header className="mb-10 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-tight">
          Politician Transparency Registry
        </h1>
        <p className="text-xs md:text-sm text-zinc-400 font-semibold uppercase tracking-[0.35em] max-w-3xl mx-auto">
          One clean pane to see what leaders say they will support—before charters, laws, and propositions are enacted.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl px-5 py-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, office, measure..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-3xl px-5 py-4">
          <Filter className="w-5 h-5 text-zinc-600" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTopic(null)}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                !selectedTopic
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              All Topics
            </button>
            {allTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic === selectedTopic ? null : topic)}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  topic === selectedTopic
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl px-6 py-5 flex items-start gap-3">
          <UserIcon className="w-6 h-6 text-cyan-400 mt-1" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 mb-1">
              Transparency Principle
            </p>
            <p className="text-sm text-zinc-200">
              Every elected official publishes a pre-commitment on key measures in their jurisdiction.
            </p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl px-6 py-5 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 mt-1" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 mb-1">
              Verification Layer
            </p>
            <p className="text-sm text-zinc-200">
              Positions are tagged as Official, Community-Verified, or Unverified to show confidence clearly.
            </p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl px-6 py-5 flex items-start gap-3">
          <FileText className="w-6 h-6 text-amber-400 mt-1" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 mb-1">
              Future Integrity
            </p>
            <p className="text-sm text-zinc-200">
              Later, vote records can be matched against these commitments to build a consistency score.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        {filtered.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-3xl py-16 text-center bg-zinc-950/40">
            <Info className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-[0.35em]">
              No matching commitments yet
            </p>
            <p className="mt-2 text-xs text-zinc-600 max-w-md mx-auto">
              As politicians publish pre-commitments on charter changes, laws, and propositions, they will appear
              here in a single, clean registry.
            </p>
          </div>
        ) : (
          filtered.map((pol) => (
            <article
              key={pol.id}
              className="bg-zinc-950/60 border border-zinc-900 rounded-3xl p-6 md:p-7 flex flex-col gap-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">{pol.name}</h2>
                  <p className="text-xs text-zinc-400 uppercase tracking-[0.3em]">
                    {pol.office} · {pol.jurisdiction}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500 uppercase tracking-[0.25em]">Term {pol.term}</p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2">
                  <div className="flex flex-wrap gap-2">
                    {pol.focusAreas.map((fa) => (
                      <span
                        key={fa}
                        className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400"
                      >
                        {fa}
                      </span>
                    ))}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      pol.transparencyStatus === 'Full'
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                        : pol.transparencyStatus === 'Partial'
                        ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                        : 'border-zinc-700 text-zinc-500'
                    }`}
                  >
                    Transparency: {pol.transparencyStatus}
                  </span>
                </div>
              </div>

              <div className="border-t border-zinc-900 pt-4 mt-2 space-y-3">
                {pol.positions.map((pos) => (
                  <div
                    key={pos.id}
                    className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-white">{pos.measureTitle}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400">
                          {pos.measureType}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300">
                        <span className="font-semibold text-zinc-400 uppercase tracking-[0.25em] mr-2">Position</span>
                        {pos.position === 'Support' && (
                          <span className="text-emerald-400 font-semibold">Support</span>
                        )}
                        {pos.position === 'Oppose' && <span className="text-rose-400 font-semibold">Oppose</span>}
                        {pos.position === 'Undecided' && (
                          <span className="text-amber-300 font-semibold">Undecided</span>
                        )}
                        {pos.position === 'Needs Revision' && (
                          <span className="text-sky-300 font-semibold">Needs Revision</span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">{pos.rationale}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pos.topics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-[9px] uppercase tracking-[0.25em] text-zinc-500"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-1 min-w-[120px]">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          pos.verification === 'Official'
                            ? 'border-emerald-500 text-emerald-400'
                            : pos.verification === 'Community-Verified'
                            ? 'border-sky-500 text-sky-400'
                            : 'border-zinc-700 text-zinc-500'
                        }`}
                      >
                        {pos.verification}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(pos.timestamp).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default PoliticianTransparencyView;

