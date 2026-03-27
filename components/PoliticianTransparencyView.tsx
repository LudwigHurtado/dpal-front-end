import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from '../i18n';
import { Category, type Hero } from '../types';
import { Search, ArrowLeft, ShieldCheck, Filter, Info, User as UserIcon, FileText, Upload, CheckCircle, Coins, ExternalLink } from './icons';
import QrCodeDisplay from './QrCodeDisplay';

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
  createReport: (
    rep: any,
    opts?: {
      navigateAfterSubmit?: boolean;
      reportIdOverride?: string;
      blockchainAnchorRequested?: boolean;
    }
  ) => void;
}

type ProofDraft = {
  saidText: string;
  saidSourceUrl: string;
  didText: string;
  didSourceUrl: string;
  note: string;
  createdAtIso: string;
};

const PROOF_DRAFT_STORAGE_KEY = 'dpal-politician-proof-draft-v1';
const PROOF_LOG_STORAGE_KEY = 'dpal-politician-proof-log-v1';

const PoliticianTransparencyView: React.FC<PoliticianTransparencyViewProps> = ({ hero, onReturn, createReport }) => {
  const { t } = useTranslations();
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [proofNote, setProofNote] = useState('');
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [saidText, setSaidText] = useState('');
  const [saidSourceUrl, setSaidSourceUrl] = useState('');
  const [didText, setDidText] = useState('');
  const [didSourceUrl, setDidSourceUrl] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webResults, setWebResults] = useState<Array<{ title: string; url: string; snippet?: string; source?: string }>>([]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(PROOF_DRAFT_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ProofDraft;
      if (typeof parsed?.saidText === 'string') setSaidText(parsed.saidText);
      if (typeof parsed?.saidSourceUrl === 'string') setSaidSourceUrl(parsed.saidSourceUrl);
      if (typeof parsed?.didText === 'string') setDidText(parsed.didText);
      if (typeof parsed?.didSourceUrl === 'string') setDidSourceUrl(parsed.didSourceUrl);
      if (typeof parsed?.note === 'string') setProofNote(parsed.note);
      if (typeof parsed?.createdAtIso === 'string') setLastDraftSavedAt(parsed.createdAtIso);
    } catch {
      // ignore bad drafts
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const draft: ProofDraft = {
      saidText,
      saidSourceUrl,
      didText,
      didSourceUrl,
      note: proofNote,
      createdAtIso: new Date().toISOString(),
    };
    window.localStorage.setItem(PROOF_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setLastDraftSavedAt(draft.createdAtIso);
  }, [saidText, saidSourceUrl, didText, didSourceUrl, proofNote]);

  const canSubmit = useMemo(() => {
    const hasSaid = saidText.trim().length >= 10;
    const hasDid = didText.trim().length >= 10;
    const hasAnyProof = proofFiles.length > 0 || proofNote.trim().length > 0 || saidSourceUrl.trim().length > 0 || didSourceUrl.trim().length > 0;
    return hasSaid && hasDid && hasAnyProof;
  }, [saidText, didText, proofFiles.length, proofNote, saidSourceUrl, didSourceUrl]);

  const submitEvidence = () => {
    setSubmitError(null);
    if (!canSubmit) {
      setSubmitError('Add SAID + DID (10+ chars each) and at least one proof item (file, note, or link).');
      return;
    }

    const reportId = `pv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = `Politician Proof: SAID vs DID`;
    const description = [
      `SAID: ${saidText.trim()}`,
      saidSourceUrl.trim() ? `SAID_SOURCE: ${saidSourceUrl.trim()}` : null,
      `DID: ${didText.trim()}`,
      didSourceUrl.trim() ? `DID_SOURCE: ${didSourceUrl.trim()}` : null,
      proofNote.trim() ? `NOTES: ${proofNote.trim()}` : null,
    ].filter(Boolean).join('\n\n');

    // Log a real DPAL report (trackable via reportId deep link + QR).
    createReport(
      {
        title,
        description,
        location: 'Politician Viewpoints',
        category: Category.CivicDuty,
        severity: 'Standard',
        trustScore: 70,
        isActionable: false,
        attachments: proofFiles,
        structuredData: {
          kind: 'politician_proof',
          saidText,
          saidSourceUrl,
          didText,
          didSourceUrl,
        },
      },
      {
        navigateAfterSubmit: false,
        reportIdOverride: reportId,
        blockchainAnchorRequested: true,
      }
    );

    // Local log (so the page can show a “Recent submissions” feed without backend work).
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(PROOF_LOG_STORAGE_KEY);
        const prev = raw ? (JSON.parse(raw) as any[]) : [];
        const entry = {
          reportId,
          createdAtIso: new Date().toISOString(),
          saidText,
          didText,
          saidSourceUrl,
          didSourceUrl,
          note: proofNote,
          files: proofFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        };
        window.localStorage.setItem(PROOF_LOG_STORAGE_KEY, JSON.stringify([entry, ...prev].slice(0, 25)));
        window.localStorage.removeItem(PROOF_DRAFT_STORAGE_KEY);
      } catch {
        // ignore local log errors
      }
    }

    setProofSubmitted(true);
    setCreatedReportId(reportId);
    setShowQr(true);
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-24 font-mono">
      <button
        onClick={onReturn}
        className="inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-cyan-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return</span>
      </button>

      <header className="mb-10 space-y-5">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-950 min-h-[320px] md:min-h-[440px]">
          <img
            src="/politician-viewpoints/decentralized-window.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-100"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/15" />
          <div className="relative h-full w-full" />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/10 bg-zinc-900/70 hover:bg-zinc-900 transition-colors text-white font-black uppercase tracking-wider text-xs"
            >
              Submit Proof
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 900, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:border-cyan-400 transition-colors text-cyan-200 font-black uppercase tracking-wider text-xs"
            >
              Open Registry
            </button>
            {createdReportId && (
              <button
                type="button"
                onClick={() => setShowQr(true)}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:border-amber-400 transition-colors text-amber-200 font-black uppercase tracking-wider text-xs"
              >
                QR Tracking
              </button>
            )}
            <a
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-400 transition-colors text-emerald-200 font-black uppercase tracking-wider text-xs"
              href="https://ballotpedia.org/"
              target="_blank"
              rel="noreferrer"
            >
              Ballotpedia <ExternalLink className="w-4 h-4" />
            </a>
            <a
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 hover:border-sky-400 transition-colors text-sky-200 font-black uppercase tracking-wider text-xs"
              href="https://www.opensecrets.org/"
              target="_blank"
              rel="noreferrer"
            >
              OpenSecrets <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="rounded-3xl border border-amber-500/25 bg-gradient-to-b from-amber-500/15 via-amber-500/10 to-zinc-900/60 p-5 md:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-white">Politician Statements Finder</h2>
                <p className="mt-2 text-xs text-zinc-400 uppercase tracking-[0.25em] max-w-3xl">
                  No API key required. Searches public sources and shows results here so you can share them.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Search a politician, bill, vote record, donation, or quote…"
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/60 pl-9 pr-3 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const q = aiQuery.trim();
                  if (!q) return;
                  const smart = [
                    q,
                    'statement',
                    'quote',
                    'campaign promise',
                    'vote record',
                    'source',
                    'site:ballotpedia.org OR site:opensecrets.org OR site:.gov',
                  ].join(' ');

                  setWebError(null);
                  setWebLoading(true);
                  setWebResults([]);

                  // DuckDuckGo Instant Answer API (free, no key). Note: returns best-effort “topics/results”.
                  fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(smart)}&format=json&no_redirect=1&no_html=1`)
                    .then((r) => r.json())
                    .then((data) => {
                      const out: Array<{ title: string; url: string; snippet?: string; source?: string }> = [];
                      if (data?.AbstractURL && data?.AbstractText) {
                        out.push({
                          title: data.Heading || 'Overview',
                          url: data.AbstractURL,
                          snippet: data.AbstractText,
                          source: data.AbstractSource || 'DuckDuckGo',
                        });
                      }

                      const addTopic = (t: any) => {
                        if (!t) return;
                        if (typeof t?.FirstURL === 'string' && typeof t?.Text === 'string') {
                          out.push({
                            title: t.Text,
                            url: t.FirstURL,
                            source: 'DuckDuckGo',
                          });
                        }
                      };

                      const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
                      related.forEach((rt: any) => {
                        if (Array.isArray(rt?.Topics)) rt.Topics.forEach(addTopic);
                        else addTopic(rt);
                      });

                      setWebResults(out.slice(0, 12));
                      if (out.length === 0) setWebError('No results returned. Try a more specific name + city/state.');
                    })
                    .catch(() => setWebError('Search failed. Check your connection and try again.'))
                    .finally(() => setWebLoading(false));
                }}
                className="rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider text-xs px-6 py-3 transition-colors"
              >
                {webLoading ? 'Searching…' : 'Search'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                'statement vs vote',
                'donations',
                'conflict of interest',
                'contract awards',
                'environmental violations',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setAiQuery((prev) => (prev ? `${prev} ${chip}` : chip))}
                  className="px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-950/40 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:border-zinc-500"
                >
                  {chip}
                </button>
              ))}
            </div>

            {(webError || webResults.length > 0) && (
              <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Results</p>
                  <button
                    type="button"
                    onClick={async () => {
                      const lines = [
                        `DPAL Politician Search`,
                        `Query: ${aiQuery.trim()}`,
                        ...webResults.map((r) => `- ${r.title}\n  ${r.url}`),
                      ].join('\n');

                      const shareData = { title: 'DPAL Politician Search', text: lines };
                      try {
                        // Prefer native share if available
                        // @ts-ignore
                        if (navigator.share) {
                          // @ts-ignore
                          await navigator.share(shareData);
                          return;
                        }
                      } catch {
                        // ignore
                      }

                      try {
                        await navigator.clipboard.writeText(lines);
                      } catch {
                        // ignore
                      }
                    }}
                    className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-[10px] font-black uppercase tracking-wider hover:border-emerald-400 transition-colors"
                  >
                    Share / Copy
                  </button>
                </div>

                {webError && (
                  <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-rose-200">
                    {webError}
                  </div>
                )}

                {webResults.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {webResults.map((r) => (
                      <a
                        key={r.url}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl border border-zinc-800 bg-black/25 hover:border-cyan-500/40 transition-colors p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white line-clamp-2">{r.title}</p>
                            {r.snippet && (
                              <p className="mt-1 text-xs text-zinc-300 line-clamp-2">{r.snippet}</p>
                            )}
                            <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500 truncate">
                              {r.source ? `${r.source} · ` : ''}{r.url}
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Submit Proof</p>
              <h2 className="text-xl font-black uppercase tracking-tight">Said vs Did Evidence</h2>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                proofSubmitted ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-zinc-700 text-zinc-400'
              }`}
            >
              {proofSubmitted ? 'Evidence Submitted' : 'Ready'}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300 mb-2">This is what they SAID</p>
              <p className="text-sm text-zinc-200">Paste the statement, campaign promise, quote, or policy commitment.</p>
              <textarea
                value={saidText}
                onChange={(e) => { setSaidText(e.target.value); setProofSubmitted(false); }}
                placeholder='Example: "We will create new jobs & clean communities."'
                className="mt-3 w-full min-h-[120px] rounded-xl border border-zinc-800 bg-black/30 p-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
              />
              <input
                value={saidSourceUrl}
                onChange={(e) => { setSaidSourceUrl(e.target.value); setProofSubmitted(false); }}
                placeholder="Source link (optional) — https://..."
                className="mt-3 w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
              />
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-300 mb-2">This is what they DID</p>
              <p className="text-sm text-zinc-200">Describe the action/outcome with links, documents, or uploads.</p>
              <textarea
                value={didText}
                onChange={(e) => { setDidText(e.target.value); setProofSubmitted(false); }}
                placeholder='Example: "Facility closed" with receipts, reports, or vote record.'
                className="mt-3 w-full min-h-[120px] rounded-xl border border-zinc-800 bg-black/30 p-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-rose-400"
              />
              <input
                value={didSourceUrl}
                onChange={(e) => { setDidSourceUrl(e.target.value); setProofSubmitted(false); }}
                placeholder="Action link (optional) — https://..."
                className="mt-3 w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] items-start">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Evidence Notes</p>
              <textarea
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder="Add context: who, what, when, where, and links…"
                className="w-full min-h-[96px] rounded-xl border border-zinc-800 bg-black/30 p-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:border-zinc-500 transition-colors cursor-pointer text-xs font-black uppercase tracking-[0.2em] text-zinc-200">
                  <Upload className="w-4 h-4" />
                  Upload Proof
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const next = Array.from(e.target.files || []);
                      setProofFiles(next);
                      setProofSubmitted(false);
                    }}
                  />
                </label>
                <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                  {proofFiles.length ? `${proofFiles.length} file(s) selected` : 'No files selected'}
                </span>
              </div>

              {proofFiles.length > 0 && (
                <div className="mt-3 rounded-xl border border-zinc-800 bg-black/25 p-3 space-y-2">
                  {proofFiles.map((f, idx) => (
                    <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-3 text-xs text-zinc-200">
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setProofFiles((prev) => prev.filter((_, i) => i !== idx));
                          setProofSubmitted(false);
                        }}
                        className="px-2 py-1 rounded-lg border border-zinc-700 text-zinc-300 hover:border-rose-500/60 hover:text-rose-300 transition-colors text-[10px] font-black uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {lastDraftSavedAt && !proofSubmitted && (
                <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                  Draft saved {new Date(lastDraftSavedAt).toLocaleTimeString()}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-200">Reward Engine</p>
              <p className="mt-2 text-sm text-amber-100">
                Verified evidence earns DPAL coins and boosts civic trust scoring.
              </p>
              <button
                type="button"
                onClick={submitEvidence}
                disabled={!canSubmit}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black font-black uppercase tracking-wider hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Submit Evidence
              </button>
              {submitError && (
                <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-rose-200">
                  {submitError}
                </div>
              )}
              <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-amber-200/80">
                Status: {proofSubmitted ? 'Pending verification' : 'Not submitted'}
              </div>

              {createdReportId && (
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 font-black uppercase tracking-wider hover:border-cyan-400 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Open QR Tracking
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 mb-2">Your Node</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">Operative</p>
              <p className="text-lg font-black uppercase tracking-tight text-white">{hero.name}</p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Wallet</p>
              <p className="text-sm font-black text-amber-300">{hero.heroCredits.toLocaleString()} HC</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">How it works</p>
            <div className="mt-3 space-y-2 text-sm text-zinc-200">
              <div className="flex items-start gap-2"><span className="text-emerald-300">1.</span><span>Submit evidence that connects promises to outcomes.</span></div>
              <div className="flex items-start gap-2"><span className="text-sky-300">2.</span><span>Community verifies or disputes with additional proof.</span></div>
              <div className="flex items-start gap-2"><span className="text-amber-300">3.</span><span>Verified entries earn rewards and feed the registry below.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Tracking</p>
              <h2 className="text-lg font-black uppercase tracking-tight text-white">Recent Evidence Logs</h2>
            </div>
            {createdReportId && (
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-500/40 text-cyan-200 bg-cyan-500/10">
                Latest: {createdReportId}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-zinc-400 uppercase tracking-[0.25em]">
            Each submission creates a reportId deep link (QR) that can be tracked and revisited.
          </p>

          <div className="mt-4 space-y-2">
            {(() => {
              if (typeof window === 'undefined') return null;
              let entries: any[] = [];
              try {
                const raw = window.localStorage.getItem(PROOF_LOG_STORAGE_KEY);
                entries = raw ? JSON.parse(raw) : [];
              } catch {
                entries = [];
              }

              if (!entries.length) {
                return (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-6 text-center text-xs text-zinc-500 uppercase tracking-[0.25em]">
                    No logged evidence yet. Submit SAID vs DID proof to generate a QR-tracked report.
                  </div>
                );
              }

              return entries.slice(0, 5).map((e) => (
                <div key={e.reportId} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">ReportId: {e.reportId}</p>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                      {new Date(e.createdAtIso).toLocaleString()}
                      {e.files?.length ? ` · ${e.files.length} file(s)` : ''}
                    </p>
                    <p className="mt-2 text-xs text-zinc-300 line-clamp-2">
                      <span className="text-amber-200 font-black">SAID</span>: {String(e.saidText || '').slice(0, 140)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-300 line-clamp-2">
                      <span className="text-rose-200 font-black">DID</span>: {String(e.didText || '').slice(0, 140)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => { setCreatedReportId(e.reportId); setShowQr(true); }}
                      className="px-4 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 text-[10px] font-black uppercase tracking-wider hover:border-cyan-400 transition-colors"
                    >
                      QR
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </section>

      {showQr && createdReportId && (
        <QrCodeDisplay
          type="report"
          id={createdReportId}
          onClose={() => setShowQr(false)}
        />
      )}

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

