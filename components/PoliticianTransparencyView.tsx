import React, { useEffect, useMemo, useState } from 'react';
import { Category, type Hero } from '../types';
import {
  Search,
  ArrowLeft,
  ShieldCheck,
  Filter,
  Info,
  FileText,
  Upload,
  CheckCircle,
  Coins,
  ExternalLink,
  Hash,
  Database,
  Eye,
  Award,
  Activity,
  QrCode,
  Link,
  Globe,
  Scale,
  Sparkles,
} from './icons';
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
  saidDate: string;
  didText: string;
  didSourceUrl: string;
  note: string;
  timelineNote: string;
  subjectName: string;
  eventType: string;
  contradictionType: string;
  createdAtIso: string;
};

type EvidenceStatus =
  | 'Unverified'
  | 'Under Review'
  | 'Community Supported'
  | 'Disputed'
  | 'Verified'
  | 'Archived to Ledger';

const PROOF_DRAFT_STORAGE_KEY = 'dpal-politician-proof-draft-v2';
const PROOF_LOG_STORAGE_KEY = 'dpal-politician-proof-log-v1';

const ISSUE_CHIPS = [
  'Statement vs Vote',
  'Donations',
  'Conflict of Interest',
  'Public Contracts',
  'Environmental Violations',
  'Community Harm',
  'Budget Contradictions',
  'Lobbying Links',
  'Promise Tracker',
] as const;

const CONTRADICTION_TYPES = [
  'Broken Promise',
  'Opposite Vote',
  'Donor Influence',
  'Conflict of Interest',
  'Policy Reversal',
  'Hidden Contract',
  'Public Misinformation',
  'Harmful Outcome',
  'Community Neglect',
] as const;

const EVENT_TYPES = [
  'Speech / press conference',
  'Campaign promise',
  'Official statement',
  'Social post',
  'Interview',
  'Legislative vote',
  'Executive action',
  'Contract / award',
  'Other',
] as const;

const HERO_TAGS = ['Said vs Did', 'Shared Record', 'Track the Truth', 'Verify Together', 'Hope & Accountability'];

function pseudoLedgerHash(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `0x${h.toString(16).padStart(8, '0')}${h.toString(16).padStart(8, '4')}`;
}

const PoliticianTransparencyView: React.FC<PoliticianTransparencyViewProps> = ({ hero, onReturn, createReport }) => {
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [proofNote, setProofNote] = useState('');
  const [timelineNote, setTimelineNote] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[0]);
  const [contradictionType, setContradictionType] = useState<string>(CONTRADICTION_TYPES[0]);
  const [saidDate, setSaidDate] = useState('');
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
    politicians.forEach((p) => p.positions.forEach((pos) => pos.topics.forEach((x) => set.add(x))));
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
      if (typeof parsed?.saidDate === 'string') setSaidDate(parsed.saidDate);
      if (typeof parsed?.didText === 'string') setDidText(parsed.didText);
      if (typeof parsed?.didSourceUrl === 'string') setDidSourceUrl(parsed.didSourceUrl);
      if (typeof parsed?.note === 'string') setProofNote(parsed.note);
      if (typeof parsed?.timelineNote === 'string') setTimelineNote(parsed.timelineNote);
      if (typeof parsed?.subjectName === 'string') setSubjectName(parsed.subjectName);
      if (typeof parsed?.eventType === 'string') setEventType(parsed.eventType);
      if (typeof parsed?.contradictionType === 'string') setContradictionType(parsed.contradictionType);
      if (typeof parsed?.createdAtIso === 'string') setLastDraftSavedAt(parsed.createdAtIso);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const draft: ProofDraft = {
      saidText,
      saidSourceUrl,
      saidDate,
      didText,
      didSourceUrl,
      note: proofNote,
      timelineNote,
      subjectName,
      eventType,
      contradictionType,
      createdAtIso: new Date().toISOString(),
    };
    window.localStorage.setItem(PROOF_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setLastDraftSavedAt(draft.createdAtIso);
  }, [saidText, saidSourceUrl, saidDate, didText, didSourceUrl, proofNote, timelineNote, subjectName, eventType, contradictionType]);

  const canSubmit = useMemo(() => {
    const hasSaid = saidText.trim().length >= 10;
    const hasDid = didText.trim().length >= 10;
    const hasAnyProof =
      proofFiles.length > 0 || proofNote.trim().length > 0 || saidSourceUrl.trim().length > 0 || didSourceUrl.trim().length > 0;
    return hasSaid && hasDid && hasAnyProof;
  }, [saidText, didText, proofFiles.length, proofNote, saidSourceUrl, didSourceUrl]);

  const submitEvidence = () => {
    setSubmitError(null);
    if (!canSubmit) {
      setSubmitError('Add SAID + DID (10+ chars each) and at least one proof item (file, note, or link).');
      return;
    }

    const reportId = `pv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = `Politician Proof: SAID vs DID — ${contradictionType}`;
    const description = [
      subjectName.trim() ? `SUBJECT: ${subjectName.trim()}` : null,
      `SAID: ${saidText.trim()}`,
      saidDate.trim() ? `SAID_DATE: ${saidDate.trim()}` : null,
      saidSourceUrl.trim() ? `SAID_SOURCE: ${saidSourceUrl.trim()}` : null,
      `EVENT_TYPE: ${eventType}`,
      `CONTRADICTION: ${contradictionType}`,
      `DID: ${didText.trim()}`,
      didSourceUrl.trim() ? `DID_SOURCE: ${didSourceUrl.trim()}` : null,
      timelineNote.trim() ? `TIMELINE: ${timelineNote.trim()}` : null,
      proofNote.trim() ? `NOTES: ${proofNote.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

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
          saidDate,
          didText,
          didSourceUrl,
          contradictionType,
          eventType,
          timelineNote,
          subjectName,
        },
      },
      {
        navigateAfterSubmit: false,
        reportIdOverride: reportId,
        blockchainAnchorRequested: true,
      }
    );

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
          timelineNote,
          subjectName,
          contradictionType,
          eventType,
          saidDate,
          files: proofFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
          status: 'Under Review' as EvidenceStatus,
          ledgerHash: pseudoLedgerHash(reportId),
          trustDelta: '+12',
          rewardHint: '120 DPAL',
          refs: (saidSourceUrl ? 1 : 0) + (didSourceUrl ? 1 : 0) + proofFiles.length,
        };
        window.localStorage.setItem(PROOF_LOG_STORAGE_KEY, JSON.stringify([entry, ...prev].slice(0, 25)));
        window.localStorage.removeItem(PROOF_DRAFT_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }

    setProofSubmitted(true);
    setCreatedReportId(reportId);
    setShowQr(true);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const civicRank = useMemo(() => {
    const m = hero.civicMastery ?? 0;
    if (m >= 70) return 'Verified investigator';
    if (m >= 40) return 'Record-builder';
    if (m >= 15) return 'Civic scout';
    return 'Observer';
  }, [hero.civicMastery]);

  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50/40 pb-32 font-sans text-slate-800 antialiased">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(56,189,248,0.14),transparent),radial-gradient(ellipse_70%_50%_at_100%_20%,rgba(16,185,129,0.08),transparent)]" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 pt-6 md:px-8">
        <button
          type="button"
          onClick={onReturn}
          className="mb-8 inline-flex items-center space-x-2 text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 transition-colors hover:text-sky-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return</span>
        </button>

        {/* —— Hero: constructive accountability —— */}
        <section className="relative mb-12 overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50 md:rounded-[2.5rem]">
          <div className="grid min-h-[340px] md:min-h-[420px] md:grid-cols-2">
            <div className="relative flex flex-col justify-end border-b border-sky-200/80 bg-gradient-to-br from-sky-100/90 via-white to-sky-50/50 p-6 md:border-b-0 md:border-r md:p-10">
              <div className="absolute inset-0 bg-[url('/politician-viewpoints/decentralized-window.png')] bg-cover bg-center opacity-[0.12] mix-blend-multiply" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-lg border border-sky-200 bg-white/90 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-sky-700 shadow-sm backdrop-blur-sm">
                  Public truth
                </span>
                <span className="rounded-lg border border-indigo-200 bg-indigo-50/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-indigo-700 shadow-sm backdrop-blur-sm">
                  Source links
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sky-700">What was said</p>
                <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-700">
                  Public statements and promises — dated, sourced, preserved for the community record.
                </p>
              </div>
            </div>
            <div className="relative flex flex-col justify-end border-t border-emerald-200/80 bg-gradient-to-bl from-emerald-50/95 via-white to-teal-50/40 p-6 md:border-t-0 md:border-l md:p-10">
              <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent" />
              <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
                <span className="rounded-lg border border-teal-200 bg-white/90 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-teal-800 shadow-sm backdrop-blur-sm">
                  Timeline
                </span>
                <span className="rounded-lg border border-amber-200 bg-amber-50/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-900 shadow-sm backdrop-blur-sm">
                  Compare & verify
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-teal-800">What the record shows</p>
                <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-700">
                  Votes, actions, and outcomes — documented with care so we can improve accountability together.
                </p>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 w-[min(92%,480px)] -translate-x-1/2 -translate-y-1/2">
            <div className="pointer-events-auto rounded-2xl border border-white/80 bg-white/95 p-5 shadow-xl shadow-sky-200/40 ring-1 ring-sky-100 backdrop-blur-md md:p-7">
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                {HERO_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-center text-2xl font-extrabold uppercase tracking-tight text-slate-900 md:text-3xl">
                DPAL · Public accountability
              </h1>
              <p className="mt-2 text-center text-[12px] font-medium leading-relaxed text-slate-600">
                A civic space for transparency, dignity, and a better shared record — not attacks, hope together.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollTo('evidence-lab')}
                  className="rounded-xl bg-amber-500 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-md shadow-amber-200/60 transition hover:bg-amber-600"
                >
                  Add evidence
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('intel-search')}
                  className="rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-sky-800 transition hover:border-sky-400 hover:bg-sky-100"
                >
                  Explore sources
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('evidence-feed')}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                >
                  Open registry
                </button>
                {createdReportId && (
                  <button
                    type="button"
                    onClick={() => setShowQr(true)}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-indigo-800 transition hover:bg-indigo-100"
                  >
                    Share QR
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 md:px-8">
            <div className="flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" /> Shared responsibility
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-sky-700">Constructive accountability</span>
              <span className="text-slate-300">·</span>
              <span className="text-teal-700">Civic healing</span>
            </div>
            <a
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-sky-600"
              href="https://ballotpedia.org/"
              target="_blank"
              rel="noreferrer"
            >
              Ballotpedia <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* —— Search console —— */}
        <section id="intel-search" className="mb-10 scroll-mt-24">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/40 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sky-600">Community truth engine</p>
                <h2 className="mt-1 text-xl font-extrabold uppercase tracking-tight text-slate-900 md:text-2xl">Search & discover</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Find officials, bills, votes, and public sources — then connect what you find to a transparent evidence packet.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="shrink-0 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                title="Coming soon"
              >
                Scan quote · soon
              </button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sky-500" />
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Name, office, state, bill, vote, donor, contract, statement, topic…"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-4 pl-12 pr-4 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {ISSUE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setAiQuery((prev) => (prev ? `${prev} ${chip}` : chip))}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-800"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
                        const addTopic = (x: any) => {
                          if (!x) return;
                          if (typeof x?.FirstURL === 'string' && typeof x?.Text === 'string') {
                            out.push({ title: x.Text, url: x.FirstURL, source: 'DuckDuckGo' });
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
                  className="rounded-2xl bg-sky-600 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md shadow-sky-200/60 transition hover:bg-sky-700"
                >
                  {webLoading ? 'Searching…' : 'Run search'}
                </button>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Public sources · best-effort results</p>
              </div>
            </div>

            {(webError || webResults.length > 0) && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-600">Source links</p>
                  <button
                    type="button"
                    onClick={async () => {
                      const lines = [`DPAL Politician Search`, `Query: ${aiQuery.trim()}`, ...webResults.map((r) => `- ${r.title}\n  ${r.url}`)].join('\n');
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: 'DPAL Politician Search', text: lines });
                          return;
                        }
                      } catch {
                        /* ignore */
                      }
                      try {
                        await navigator.clipboard.writeText(lines);
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-800 hover:bg-emerald-100"
                  >
                    Share / Copy
                  </button>
                </div>
                {webError && <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-amber-800">{webError}</div>}
                {webResults.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {webResults.map((r) => (
                      <a
                        key={r.url}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-sky-300 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-bold text-slate-900">{r.title}</p>
                            {r.snippet && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.snippet}</p>}
                            <p className="mt-2 truncate text-[10px] uppercase tracking-[0.15em] text-slate-500">
                              {r.source ? `${r.source} · ` : ''}
                              {r.url}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* —— Evidence lab + Reward rail —— */}
        <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div id="evidence-lab" className="scroll-mt-24 lg:col-span-8">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 md:p-8">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-teal-700">Build the record together</p>
                  <h2 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900">Evidence workspace</h2>
                  <p className="mt-1 text-sm text-slate-600">Pair what was said with what the public record shows — clearly, respectfully, verifiably.</p>
                </div>
                <span
                  className={`w-fit rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                    proofSubmitted ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  {proofSubmitted ? 'Submitted — thank you' : 'Draft'}
                </span>
              </div>

              <div className="mt-6">
                <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Subject / office (optional)</label>
                <input
                  value={subjectName}
                  onChange={(e) => {
                    setSubjectName(e.target.value);
                    setProofSubmitted(false);
                  }}
                  placeholder="Official, agency, or public figure"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50/80 to-white p-5">
                  <div className="flex items-center gap-2 text-sky-800">
                    <MegaphoneMini />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Public statement</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Quote, promise, speech, or press release.</p>
                  <textarea
                    value={saidText}
                    onChange={(e) => {
                      setSaidText(e.target.value);
                      setProofSubmitted(false);
                    }}
                    placeholder='"We will protect this community and deliver clean water."'
                    className="mt-4 min-h-[128px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Source link</label>
                      <input
                        value={saidSourceUrl}
                        onChange={(e) => {
                          setSaidSourceUrl(e.target.value);
                          setProofSubmitted(false);
                        }}
                        placeholder="https://…"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Date</label>
                      <input
                        type="date"
                        value={saidDate}
                        onChange={(e) => {
                          setSaidDate(e.target.value);
                          setProofSubmitted(false);
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Event type</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
                    >
                      {EVENT_TYPES.map((et) => (
                        <option key={et} value={et}>
                          {et}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50/80 to-white p-5">
                  <div className="flex items-center gap-2 text-teal-900">
                    <Scale className="h-4 w-4" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em]">On the record</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Documented vote, action, funding, or outcome — for clarity, not blame.</p>
                  <textarea
                    value={didText}
                    onChange={(e) => {
                      setDidText(e.target.value);
                      setProofSubmitted(false);
                    }}
                    placeholder="Describe what happened with enough detail for others to verify."
                    className="mt-4 min-h-[128px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                  <div className="mt-3">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Evidence link</label>
                    <input
                      value={didSourceUrl}
                      onChange={(e) => {
                        setDidSourceUrl(e.target.value);
                        setProofSubmitted(false);
                      }}
                      placeholder="https://…"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Accountability category</label>
                    <select
                      value={contradictionType}
                      onChange={(e) => setContradictionType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-400 focus:outline-none"
                    >
                      {CONTRADICTION_TYPES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">Context & community notes</p>
                  <textarea
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    placeholder="Who, what, when, where — additional respectful context."
                    className="mt-3 min-h-[88px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50"
                  />
                  <div className="mt-3">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Timeline</label>
                    <input
                      value={timelineNote}
                      onChange={(e) => setTimelineNote(e.target.value)}
                      placeholder="e.g. “30 days before vote X”"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-amber-900 transition hover:bg-amber-100">
                    <Upload className="h-4 w-4" />
                    Upload files
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        setProofFiles(Array.from(e.target.files || []));
                        setProofSubmitted(false);
                      }}
                    />
                  </label>
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">
                    {proofFiles.length ? `${proofFiles.length} file(s)` : 'PDF, screenshots, public records'}
                  </p>
                  {proofFiles.length > 0 && (
                    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                      {proofFiles.map((f, idx) => (
                        <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2 text-xs text-slate-700">
                          <span className="truncate">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setProofFiles((prev) => prev.filter((_, i) => i !== idx));
                              setProofSubmitted(false);
                            }}
                            className="text-[10px] font-bold uppercase text-slate-500 hover:text-rose-600"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {lastDraftSavedAt && !proofSubmitted && (
                    <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">
                      Draft saved {new Date(lastDraftSavedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50/50 p-5">
                  <div>
                    <div className="flex items-center gap-2 text-amber-900">
                      <Award className="h-5 w-5 text-amber-600" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Recognition · civic contribution</p>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      Quality contributions can earn DPAL recognition and trust impact — rewarding public service, not gambling.
                    </p>
                    <ul className="mt-4 space-y-2 text-[11px] text-slate-600">
                      <li className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-amber-600" /> Up to +120 DPAL when verified
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-sky-600" /> XP toward civic badges
                      </li>
                      <li className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-600" /> Impact on your public profile
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={submitEvidence}
                    disabled={!canSubmit}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-md shadow-teal-200/50 transition hover:from-teal-700 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-600"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Submit to shared registry
                  </button>
                  {submitError && <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-rose-700">{submitError}</p>}
                  <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600">
                    Status: {proofSubmitted ? 'Under review' : 'Not submitted'}
                  </p>
                  {createdReportId && (
                    <button
                      type="button"
                      onClick={() => setShowQr(true)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 py-2.5 text-[10px] font-bold uppercase tracking-widest text-sky-900 hover:bg-sky-100"
                    >
                      <QrCode className="h-4 w-4" />
                      View QR · report ID
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reward + operator rail */}
          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-[2rem] border border-indigo-200 bg-gradient-to-b from-indigo-50/90 to-white p-6 shadow-md shadow-slate-200/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-indigo-800">Your civic profile</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Contributor</p>
                  <p className="text-lg font-extrabold uppercase text-slate-900">{hero.name}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-500">{civicRank}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Wallet</p>
                  <p className="text-xl font-extrabold text-amber-700">{hero.heroCredits.toLocaleString()} HC</p>
                  <p className="text-[10px] font-medium text-sky-700">Streak {hero.streak ?? 0} · L{hero.level}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Impact</p>
                  <p className="mt-1 text-lg font-extrabold text-emerald-700">{hero.stats?.impactScore ?? '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">XP</p>
                  <p className="mt-1 text-lg font-extrabold text-sky-700">{hero.xp ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-600">Community review</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Others can strengthen or question entries — always with sources. The goal is clarity, not pile-ons.
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Source quality</span>
                  <span className="text-xs font-bold text-sky-700">—</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Community signal</span>
                  <span className="text-xs font-bold text-teal-700">Open</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-900"
                  >
                    Agree
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-amber-200 bg-amber-50 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-900"
                  >
                    Discuss
                  </button>
                </div>
                <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-slate-400">Preview — future review tools</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-6 shadow-md shadow-emerald-100/40">
              <div className="flex items-center gap-2 text-emerald-800">
                <Database className="h-5 w-5" />
                <p className="text-[10px] font-bold uppercase tracking-[0.35em]">Public ledger</p>
              </div>
              <p className="mt-2 text-xs text-slate-600">Entries become durable, shareable records — transparent, revisitable, accountable.</p>
              <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 font-mono text-[10px] text-emerald-900">
                <p className="flex items-center gap-2 text-slate-500">
                  <Hash className="h-3.5 w-3.5" />
                  {createdReportId ? pseudoLedgerHash(createdReportId) : '— after you submit —'}
                </p>
                <p className="mt-2 text-[9px] font-medium uppercase tracking-widest text-slate-500">Anchored reference (preview)</p>
              </div>
            </div>
          </aside>
        </div>

        {/* —— Feed —— */}
        <section id="evidence-feed" className="mb-10 scroll-mt-24">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Recent contributions</p>
                <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">Shared record feed</h2>
                <p className="mt-1 text-sm text-slate-600">
                  A living timeline of community-sourced accountability — verified step by step.
                </p>
              </div>
              {createdReportId && (
                <span className="w-fit rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-800">
                  Latest: {createdReportId.slice(0, 18)}…
                </span>
              )}
            </div>

            <div className="mt-6 space-y-4">
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
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 py-14 text-center">
                      <Eye className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                      <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-600">No entries yet</p>
                      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                        When you submit a packet, it appears here as a QR-tracked, shareable public record.
                      </p>
                    </div>
                  );
                }

                const statusStyle: Record<string, string> = {
                  Unverified: 'border-slate-200 bg-slate-50 text-slate-600',
                  'Under Review': 'border-amber-200 bg-amber-50 text-amber-900',
                  'Community Supported': 'border-sky-200 bg-sky-50 text-sky-900',
                  Disputed: 'border-orange-200 bg-orange-50 text-orange-900',
                  Verified: 'border-emerald-200 bg-emerald-50 text-emerald-900',
                  'Archived to Ledger': 'border-indigo-200 bg-indigo-50 text-indigo-900',
                };

                return entries.slice(0, 8).map((e) => {
                  const st = (e.status as EvidenceStatus) || 'Unverified';
                  return (
                    <article
                      key={e.reportId}
                      className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50/80 p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-extrabold uppercase text-slate-900">{e.subjectName?.trim() || 'Public subject'}</p>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              {e.contradictionType || 'Statement vs Vote'}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                            {new Date(e.createdAtIso).toLocaleString()} · {e.refs ?? 0} refs
                          </p>
                          <p className="mt-3 line-clamp-2 text-xs text-slate-700">
                            <span className="font-bold text-sky-700">Said</span> · {String(e.saidText || '').slice(0, 160)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-700">
                            <span className="font-bold text-teal-800">Record</span> · {String(e.didText || '').slice(0, 160)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                          <span className={`rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${statusStyle[st] || statusStyle.Unverified}`}>
                            {st}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase text-amber-900">
                              {e.rewardHint || 'DPAL recognition'}
                            </span>
                            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase text-emerald-900">
                              Trust {e.trustDelta || '+0'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCreatedReportId(e.reportId);
                              setShowQr(true);
                            }}
                            className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-sky-900 hover:bg-sky-100"
                          >
                            QR · ID
                          </button>
                        </div>
                      </div>
                      {e.ledgerHash && (
                        <p className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 font-mono text-[9px] text-indigo-700">
                          <Link className="h-3 w-3" /> On ledger · {e.ledgerHash}
                        </p>
                      )}
                    </article>
                  );
                });
              })()}
            </div>
          </div>
        </section>

        {/* —— Principles strip —— */}
        <section className="mb-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Globe className="h-6 w-6 text-sky-600" />,
              title: 'Unity in transparency',
              body: 'We compare statements and outcomes with sources — so everyone can see the same facts.',
            },
            {
              icon: <ShieldCheck className="h-6 w-6 text-emerald-600" />,
              title: 'Trust through verification',
              body: 'Community checks strengthen the record. This is public interest work — not a campaign.',
            },
            {
              icon: <FileText className="h-6 w-6 text-amber-600" />,
              title: 'Hope in the archive',
              body: 'Every packet helps build a clearer tomorrow — revisit-able, shareable, accountable.',
            },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                {card.icon}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">{card.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{card.body}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* —— Registry search (mock politicians) —— */}
        <section className="mb-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter registry: name, office, measure…"
                className="flex-1 border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Filter className="h-5 w-5 text-slate-400" />
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  !selectedTopic ? 'border-sky-400 bg-sky-50 text-sky-900' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                All
              </button>
              {allTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic === selectedTopic ? null : topic)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    topic === selectedTopic ? 'border-sky-400 bg-sky-50 text-sky-900' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 py-16 text-center">
              <Info className="mx-auto mb-4 h-10 w-10 text-slate-400" />
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-600">No matching entries</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                When officials publish commitments, they will appear in this open, neutral registry.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filtered.map((pol) => (
                <article key={pol.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/40 md:p-7">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">{pol.name}</h3>
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                        {pol.office} · {pol.jurisdiction}
                      </p>
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">Term {pol.term}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pol.focusAreas.map((fa) => (
                        <span key={fa} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          {fa}
                        </span>
                      ))}
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          pol.transparencyStatus === 'Full'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                            : pol.transparencyStatus === 'Partial'
                              ? 'border-amber-300 bg-amber-50 text-amber-900'
                              : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        Transparency: {pol.transparencyStatus}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    {pol.positions.map((pos) => (
                      <div key={pos.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{pos.measureTitle}</span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                              {pos.measureType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{pos.rationale}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {pos.topics.map((topic) => (
                              <span key={topic} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-slate-500">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-1 md:items-end">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                              pos.verification === 'Official'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                : pos.verification === 'Community-Verified'
                                  ? 'border-sky-300 bg-sky-50 text-sky-900'
                                  : 'border-slate-200 text-slate-500'
                            }`}
                          >
                            {pos.verification}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(pos.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {showQr && createdReportId && (
        <QrCodeDisplay type="report" id={createdReportId} onClose={() => setShowQr(false)} />
      )}
    </div>
  );
};

/** Small megaphone mark for column header (avoids importing Megaphone if tree-shaken oddly) */
function MegaphoneMini() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-600">
      <path d="m3 11 18-5v12L3 13v-2Z" />
    </svg>
  );
}

export default PoliticianTransparencyView;
