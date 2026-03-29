import React, { useEffect, useMemo, useState } from 'react';
import { Category, type Hero } from '../types';
import {
  Search,
  ArrowLeft,
  ShieldCheck,
  Filter,
  Info,
  User as UserIcon,
  FileText,
  Upload,
  CheckCircle,
  Coins,
  ExternalLink,
  Zap,
  Clock,
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

const HERO_TAGS = ['Said vs Did', 'Submit Proof', 'Track the Record', 'Verify Public Claims', 'Evidence Beats Spin'];

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
    <div className="animate-fade-in min-h-screen bg-[#070708] pb-32 font-mono text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.12),transparent),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(245,158,11,0.06),transparent)]" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 pt-6 md:px-8">
        <button
          type="button"
          onClick={onReturn}
          className="mb-8 inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 transition-colors hover:text-cyan-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return</span>
        </button>

        {/* —— Hero: Said vs Did —— */}
        <section className="relative mb-12 overflow-hidden rounded-[2rem] border border-zinc-800/80 bg-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] md:rounded-[2.5rem]">
          <div className="grid min-h-[340px] md:min-h-[420px] md:grid-cols-2">
            <div className="relative flex flex-col justify-end border-b border-cyan-500/20 bg-gradient-to-br from-cyan-950/80 via-zinc-950 to-black p-6 md:border-b-0 md:border-r md:p-10">
              <div className="absolute inset-0 bg-[url('/politician-viewpoints/decentralized-window.png')] bg-cover bg-center opacity-25 mix-blend-luminosity" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-lg border border-cyan-500/40 bg-black/50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-300 backdrop-blur-sm">
                  Public Record
                </span>
                <span className="rounded-lg border border-violet-500/30 bg-violet-950/40 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-violet-200 backdrop-blur-sm">
                  Source Links
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/90">What they said</p>
                <p className="mt-2 max-w-md text-sm font-bold leading-relaxed text-zinc-200">
                  Speech, promise, press line — captured with date and primary source.
                </p>
              </div>
            </div>
            <div className="relative flex flex-col justify-end border-t border-rose-500/20 bg-gradient-to-bl from-rose-950/70 via-zinc-950 to-black p-6 md:border-t-0 md:border-l md:p-10">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
                <span className="rounded-lg border border-rose-500/40 bg-black/50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-rose-300 backdrop-blur-sm">
                  Timeline
                </span>
                <span className="rounded-lg border border-amber-500/35 bg-amber-950/35 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-200 backdrop-blur-sm">
                  Contradiction
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400/90">What happened</p>
                <p className="mt-2 max-w-md text-sm font-bold leading-relaxed text-zinc-200">
                  Vote, contract, outcome, harm — verified with evidence you attach.
                </p>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 w-[min(92%,480px)] -translate-x-1/2 -translate-y-1/2">
            <div className="pointer-events-auto rounded-2xl border border-white/10 bg-zinc-950/90 p-5 shadow-[0_0_60px_rgba(6,182,212,0.15)] backdrop-blur-xl md:p-7">
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                {HERO_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-700/80 bg-black/40 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-center text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
                DPAL · Politician Accountability
              </h1>
              <p className="mt-2 text-center text-[11px] uppercase tracking-[0.28em] text-zinc-500">
                Neutral ledger · Statement vs vote · Public proof
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollTo('evidence-lab')}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-200 transition hover:border-amber-400"
                >
                  Submit Proof
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('intel-search')}
                  className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-cyan-200 transition hover:border-cyan-400"
                >
                  Track the Record
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('evidence-feed')}
                  className="rounded-xl border border-zinc-600 bg-zinc-900/80 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:border-zinc-500"
                >
                  Open Registry
                </button>
                {createdReportId && (
                  <button
                    type="button"
                    onClick={() => setShowQr(true)}
                    className="rounded-xl border border-violet-500/40 bg-violet-950/40 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-violet-200 transition hover:border-violet-400"
                  >
                    QR trace
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 bg-black/30 px-4 py-3 md:px-8">
            <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              <span className="flex items-center gap-1 text-emerald-400/90">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified systems
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-cyan-500/80">Upload Proof</span>
              <span className="text-zinc-600">·</span>
              <span className="text-amber-500/80">Civic Mission</span>
            </div>
            <a
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-cyan-400"
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
          <div className="rounded-[2rem] border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 via-zinc-950/80 to-zinc-950 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500/80">Politician search & discovery</p>
                <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white md:text-2xl">Intelligence console</h2>
                <p className="mt-2 max-w-2xl text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Search officials, bills, votes, donors, contracts, quotes — then cross-link into your evidence packet.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="shrink-0 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-600"
                title="Coming soon"
              >
                Scan quote · soon
              </button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-500/60" />
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Name, office, state, bill, vote, donor, contract, statement, topic…"
                  className="w-full rounded-2xl border border-zinc-700 bg-black/50 py-4 pl-12 pr-4 text-sm text-white shadow-inner placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {ISSUE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setAiQuery((prev) => (prev ? `${prev} ${chip}` : chip))}
                    className="rounded-full border border-zinc-700/90 bg-zinc-900/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:border-cyan-500/50 hover:text-cyan-300"
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
                  className="rounded-2xl bg-cyan-600 px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-900/30 transition hover:bg-cyan-500"
                >
                  {webLoading ? 'Searching…' : 'Run search'}
                </button>
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">Public sources · best-effort results</p>
              </div>
            </div>

            {(webError || webResults.length > 0) && (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Source Links</p>
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
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-200 hover:border-emerald-400"
                  >
                    Share / Copy
                  </button>
                </div>
                {webError && <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-rose-300">{webError}</div>}
                {webResults.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {webResults.map((r) => (
                      <a
                        key={r.url}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl border border-zinc-800/90 bg-zinc-950/50 p-3 transition hover:border-cyan-500/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-black text-white">{r.title}</p>
                            {r.snippet && <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{r.snippet}</p>}
                            <p className="mt-2 truncate text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                              {r.source ? `${r.source} · ` : ''}
                              {r.url}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 shrink-0 text-zinc-600" />
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
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-5 shadow-xl md:p-8">
              <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/90">Said vs Did · evidence submission</p>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">Evidence lab</h2>
                </div>
                <span
                  className={`w-fit rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                    proofSubmitted ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300' : 'border-zinc-600 text-zinc-500'
                  }`}
                >
                  {proofSubmitted ? 'Evidence Submitted' : 'Draft'}
                </span>
              </div>

              <div className="mt-6">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Subject / office (optional)</label>
                <input
                  value={subjectName}
                  onChange={(e) => {
                    setSubjectName(e.target.value);
                    setProofSubmitted(false);
                  }}
                  placeholder="Politician, agency, or public figure"
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none"
                />
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-950/20 to-black/20 p-5">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <MegaphoneMini />
                    <p className="text-[10px] font-black uppercase tracking-[0.35em]">What they said</p>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">Quote, promise, speech, or press release.</p>
                  <textarea
                    value={saidText}
                    onChange={(e) => {
                      setSaidText(e.target.value);
                      setProofSubmitted(false);
                    }}
                    placeholder='"We will protect this community and deliver clean water."'
                    className="mt-4 min-h-[128px] w-full rounded-xl border border-zinc-800 bg-black/40 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none"
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Source link</label>
                      <input
                        value={saidSourceUrl}
                        onChange={(e) => {
                          setSaidSourceUrl(e.target.value);
                          setProofSubmitted(false);
                        }}
                        placeholder="https://…"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Date</label>
                      <input
                        type="date"
                        value={saidDate}
                        onChange={(e) => {
                          setSaidDate(e.target.value);
                          setProofSubmitted(false);
                        }}
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500/50 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Event type</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-cyan-500/50 focus:outline-none"
                    >
                      {EVENT_TYPES.map((et) => (
                        <option key={et} value={et}>
                          {et}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-500/25 bg-gradient-to-b from-rose-950/20 to-black/20 p-5">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Scale className="h-4 w-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.35em]">What they did</p>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">Vote, contract, funding, neglect, or real-world outcome.</p>
                  <textarea
                    value={didText}
                    onChange={(e) => {
                      setDidText(e.target.value);
                      setProofSubmitted(false);
                    }}
                    placeholder="Describe the action with enough detail to verify."
                    className="mt-4 min-h-[128px] w-full rounded-xl border border-zinc-800 bg-black/40 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-rose-500/40 focus:outline-none"
                  />
                  <div className="mt-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Evidence link</label>
                    <input
                      value={didSourceUrl}
                      onChange={(e) => {
                        setDidSourceUrl(e.target.value);
                        setProofSubmitted(false);
                      }}
                      placeholder="https://…"
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-rose-500/40 focus:outline-none"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Mark contradiction type</label>
                    <select
                      value={contradictionType}
                      onChange={(e) => setContradictionType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500/40 focus:outline-none"
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
                <div className="rounded-2xl border border-zinc-800 bg-black/30 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Context & cross-links</p>
                  <textarea
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    placeholder="Who, what, when, where — add reference notes."
                    className="mt-3 min-h-[88px] w-full rounded-xl border border-zinc-800 bg-black/40 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none"
                  />
                  <div className="mt-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Timeline connection</label>
                    <input
                      value={timelineNote}
                      onChange={(e) => setTimelineNote(e.target.value)}
                      placeholder="Add timeline event — e.g. “30 days before vote X”"
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                    />
                  </div>
                  <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-200 transition hover:border-amber-400">
                    <Upload className="h-4 w-4" />
                    Upload Proof
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
                  <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    {proofFiles.length ? `${proofFiles.length} file(s)` : 'PDF, screenshots, records'}
                  </p>
                  {proofFiles.length > 0 && (
                    <div className="mt-3 space-y-2 rounded-xl border border-zinc-800 p-3">
                      {proofFiles.map((f, idx) => (
                        <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2 text-xs text-zinc-300">
                          <span className="truncate">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setProofFiles((prev) => prev.filter((_, i) => i !== idx));
                              setProofSubmitted(false);
                            }}
                            className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-300"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {lastDraftSavedAt && !proofSubmitted && (
                    <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                      Draft saved {new Date(lastDraftSavedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-zinc-950 to-zinc-950 p-5">
                  <div>
                    <div className="flex items-center gap-2 text-amber-300">
                      <Award className="h-5 w-5" />
                      <p className="text-[10px] font-black uppercase tracking-[0.35em]">DPAL Reward · Civic Mission</p>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-amber-100/90">
                      Verified evidence can earn DPAL rewards, Trust Score impact, and investigator rank — public service, not gambling.
                    </p>
                    <ul className="mt-4 space-y-2 text-[11px] text-zinc-400">
                      <li className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-amber-400" /> Potential +120 DPAL on verification
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-cyan-400" /> Verification XP toward badges
                      </li>
                      <li className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-400" /> Impact score & registry credit
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={submitEvidence}
                    disabled={!canSubmit}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-amber-900/30 transition hover:from-amber-400 hover:to-amber-500 disabled:from-zinc-700 disabled:to-zinc-800 disabled:text-zinc-500"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Seal evidence packet
                  </button>
                  {submitError && <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-rose-300">{submitError}</p>}
                  <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-amber-200/70">
                    Status: {proofSubmitted ? 'Under Review' : 'Not submitted'}
                  </p>
                  {createdReportId && (
                    <button
                      type="button"
                      onClick={() => setShowQr(true)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-2.5 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:border-cyan-400"
                    >
                      <QrCode className="h-4 w-4" />
                      QR traceable report ID
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reward + operator rail */}
          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-[2rem] border border-violet-500/20 bg-gradient-to-b from-violet-950/30 to-zinc-950 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-400/90">Trust Score · Node</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Operative</p>
                  <p className="text-lg font-black uppercase text-white">{hero.name}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">{civicRank}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Wallet</p>
                  <p className="text-xl font-black text-amber-400">{hero.heroCredits.toLocaleString()} HC</p>
                  <p className="text-[10px] text-cyan-400/80">Streak {hero.streak ?? 0} · L{hero.level}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Impact score</p>
                  <p className="mt-1 text-lg font-black text-emerald-400">{hero.stats?.impactScore ?? '—'}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Verification XP</p>
                  <p className="mt-1 text-lg font-black text-cyan-400">{hero.xp ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Public verification layer</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Community review, dispute, and consensus — evidence stays on the public record with chain-of-proof depth.
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/30 px-3 py-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Source quality</span>
                  <span className="text-xs font-bold text-cyan-400">Strong</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/30 px-3 py-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Consensus</span>
                  <span className="text-xs font-bold text-amber-300">Building</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300"
                  >
                    Support
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-[10px] font-black uppercase tracking-widest text-rose-300"
                  >
                    Dispute
                  </button>
                </div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-600">Wireframe — ties to future review queue</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-950/10 p-6">
              <div className="flex items-center gap-2 text-emerald-400">
                <Database className="h-5 w-5" />
                <p className="text-[10px] font-black uppercase tracking-[0.35em]">Ledger · Registry</p>
              </div>
              <p className="mt-2 text-xs text-zinc-400">Submissions register as durable reports — QR traceable, shareable, disputable.</p>
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-black/40 p-3 font-mono text-[10px] text-emerald-300/90">
                <p className="flex items-center gap-2 text-zinc-500">
                  <Hash className="h-3.5 w-3.5" />
                  {createdReportId ? pseudoLedgerHash(createdReportId) : '— pending packet —'}
                </p>
                <p className="mt-2 text-[9px] uppercase tracking-widest text-zinc-600">Registered to public ledger (preview)</p>
              </div>
            </div>
          </aside>
        </div>

        {/* —— Feed —— */}
        <section id="evidence-feed" className="mb-10 scroll-mt-24">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Recent evidence logs</p>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Public feed</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-600">
                  Civic newsroom · blockchain evidence board · case timeline
                </p>
              </div>
              {createdReportId && (
                <span className="w-fit rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
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
                    <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 py-14 text-center">
                      <Eye className="mx-auto mb-4 h-10 w-10 text-zinc-700" />
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500">No evidence logs yet</p>
                      <p className="mx-auto mt-2 max-w-md text-xs uppercase tracking-[0.2em] text-zinc-600">
                        Submit a Said vs Did packet — it becomes a QR-tracked public record.
                      </p>
                    </div>
                  );
                }

                const statusStyle: Record<string, string> = {
                  Unverified: 'border-zinc-600 text-zinc-400',
                  'Under Review': 'border-amber-500/50 text-amber-300 bg-amber-500/5',
                  'Community Supported': 'border-cyan-500/50 text-cyan-300',
                  Disputed: 'border-rose-500/50 text-rose-300',
                  Verified: 'border-emerald-500/50 text-emerald-300',
                  'Archived to Ledger': 'border-violet-500/50 text-violet-300',
                };

                return entries.slice(0, 8).map((e) => {
                  const st = (e.status as EvidenceStatus) || 'Unverified';
                  return (
                    <article
                      key={e.reportId}
                      className="rounded-2xl border border-zinc-800/90 bg-gradient-to-r from-zinc-950/80 to-black/40 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black uppercase text-white">{e.subjectName?.trim() || 'Public subject'}</p>
                            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                              {e.contradictionType || 'Statement vs Vote'}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            {new Date(e.createdAtIso).toLocaleString()} · {e.refs ?? 0} refs
                          </p>
                          <p className="mt-3 line-clamp-2 text-xs text-zinc-300">
                            <span className="font-black text-cyan-500/90">SAID</span> · {String(e.saidText || '').slice(0, 160)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-300">
                            <span className="font-black text-rose-500/90">DID</span> · {String(e.didText || '').slice(0, 160)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                          <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${statusStyle[st] || statusStyle.Unverified}`}>
                            {st}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[9px] font-black uppercase text-amber-200">
                              {e.rewardHint || 'DPAL Reward'}
                            </span>
                            <span className="rounded-lg border border-emerald-500/30 px-2 py-1 text-[9px] font-black uppercase text-emerald-300">
                              Trust {e.trustDelta || '+0'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCreatedReportId(e.reportId);
                              setShowQr(true);
                            }}
                            className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:border-cyan-400"
                          >
                            QR · ID
                          </button>
                        </div>
                      </div>
                      {e.ledgerHash && (
                        <p className="mt-4 flex items-center gap-2 border-t border-zinc-800/80 pt-3 font-mono text-[9px] text-violet-400/80">
                          <Link className="h-3 w-3" /> Archived to Ledger · {e.ledgerHash}
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
              icon: <Globe className="h-6 w-6 text-cyan-400" />,
              title: 'Public Record',
              body: 'Compare statements, votes, donors, and outcomes with clear source links.',
            },
            {
              icon: <ShieldCheck className="h-6 w-6 text-emerald-400" />,
              title: 'Verification',
              body: 'Community support, dispute, and ledger anchoring — not a campaign site.',
            },
            {
              icon: <FileText className="h-6 w-6 text-amber-400" />,
              title: 'Open Registry',
              body: 'Evidence packets are revisit-able, shareable, and built for scale.',
            },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="flex items-start gap-3">
                {card.icon}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">{card.title}</p>
                  <p className="mt-2 text-sm text-zinc-300">{card.body}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* —— Registry search (mock politicians) —— */}
        <section className="mb-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-5 py-4">
              <Search className="h-5 w-5 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter pre-commitment registry: name, office, measure…"
                className="flex-1 border-none bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
              <Filter className="h-5 w-5 text-zinc-600" />
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                  !selectedTopic ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
                }`}
              >
                All
              </button>
              {allTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic === selectedTopic ? null : topic)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                    topic === selectedTopic ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/40 py-16 text-center">
              <Info className="mx-auto mb-4 h-10 w-10 text-zinc-700" />
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-500">No matching commitments</p>
              <p className="mx-auto mt-2 max-w-md text-xs text-zinc-600">
                As officials publish pre-commitments, they will appear in this neutral registry.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filtered.map((pol) => (
                <article key={pol.id} className="rounded-3xl border border-zinc-800/90 bg-zinc-950/60 p-6 md:p-7">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-white">{pol.name}</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                        {pol.office} · {pol.jurisdiction}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-zinc-600">Term {pol.term}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pol.focusAreas.map((fa) => (
                        <span key={fa} className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {fa}
                        </span>
                      ))}
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          pol.transparencyStatus === 'Full'
                            ? 'border-emerald-500 text-emerald-400'
                            : pol.transparencyStatus === 'Partial'
                              ? 'border-amber-500 text-amber-400'
                              : 'border-zinc-700 text-zinc-500'
                        }`}
                      >
                        Transparency: {pol.transparencyStatus}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 border-t border-zinc-900 pt-4">
                    {pol.positions.map((pos) => (
                      <div key={pos.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-white">{pos.measureTitle}</span>
                            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                              {pos.measureType}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300">{pos.rationale}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {pos.topics.map((topic) => (
                              <span key={topic} className="rounded-full border border-zinc-800 bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-[0.25em] text-zinc-500">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-1 md:items-end">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
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
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
      <path d="m3 11 18-5v12L3 13v-2Z" />
    </svg>
  );
}

export default PoliticianTransparencyView;
