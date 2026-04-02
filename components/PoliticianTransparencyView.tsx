import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Category, type Hero } from '../types';
import {
  Search,
  ArrowLeft,
  ShieldCheck,
  Filter,
  Info,
  FileText,
  Upload,
  Coins,
  ExternalLink,
  Hash,
  Database,
  Eye,
  Award,
  Activity,
  Link,
  Globe,
  Scale,
  Sparkles,
  User,
} from './icons';
import { MdOutlinedSelectSync, MdOutlinedTextFieldSync } from './MaterialWebEvidenceFields';
import {
  isPoliticianOpenAiConfigured,
  refinePoliticianSearchQuery,
  suggestEvidenceDraftFromNotes,
} from '../services/politicianOpenAiService';
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

/** Selectable investigation modes for DuckDuckGo + UI (ids stable for state). */
const ACCOUNTABILITY_FOCUS: { id: string; label: string }[] = [
  { id: 'promise-vs-vote', label: 'Promise vs Vote' },
  { id: 'statement-vs-action', label: 'Statement vs Action' },
  { id: 'budget-contradiction', label: 'Budget Contradiction' },
  { id: 'conflict-of-interest', label: 'Conflict of Interest' },
  { id: 'campaign-finance', label: 'Campaign Finance' },
  { id: 'lobbying-links', label: 'Lobbying Links' },
  { id: 'public-contracts', label: 'Public Contracts' },
  { id: 'community-harm', label: 'Community Harm' },
  { id: 'environmental-harm', label: 'Environmental Harm' },
  { id: 'abuse-of-office', label: 'Abuse of Office' },
  { id: 'ethics-violation', label: 'Ethics Violation' },
  { id: 'oversight-investigation', label: 'Oversight Investigation' },
];

const SOURCE_FILTERS: { id: string; label: string; hint: string }[] = [
  { id: 'news', label: 'News', hint: 'news' },
  { id: 'public-records', label: 'Public Records', hint: 'public records site:.gov' },
  { id: 'voting-records', label: 'Voting Records', hint: 'vote record roll call' },
  { id: 'court-complaints', label: 'Court / Complaints', hint: 'complaint lawsuit ethics' },
  { id: 'contracts', label: 'Contracts', hint: 'contract award RFP' },
  { id: 'donations', label: 'Donations', hint: 'campaign finance donation FEC' },
  { id: 'ethics-reports', label: 'Ethics Reports', hint: 'ethics disclosure oversight' },
];

const DEFAULT_SOURCE_FILTER_IDS = new Set(['public-records', 'news', 'ethics-reports']);

function buildFreePoliticianSearchQuery(raw: string, focusLabels: string[] = []): string {
  const q = raw.trim();
  if (!q) return '';
  const lower = q.toLowerCase();
  const misconductIntent =
    /\b(misconduct|ethics|bribe|corruption|violation|complaint|abuse|fraud|scandal|fec|lobby|oversight|investigation|malfeasance)\b/i.test(q) ||
    focusLabels.some((l) => lower.includes(l.toLowerCase()));
  const politicianIntent =
    /\b(senator|representative|mayor|council|governor|congress|legislature|politician|official|candidate)\b/i.test(q);

  const parts = [
    q,
    'statement',
    'quote',
    'campaign promise',
    'vote record',
    'source',
    misconductIntent ? 'ethics oversight investigation complaint news' : '',
    politicianIntent ? 'public office elected' : '',
    'site:ballotpedia.org OR site:opensecrets.org OR site:fec.gov OR site:.gov',
  ].filter(Boolean);

  return parts.join(' ');
}

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

/** Section art (user-provided banners) — see public/politician-viewpoints/ */
const SECTION_IMG = {
  intelSearch: '/politician-viewpoints/banner-intel-search.png',
  evidenceLab: '/politician-viewpoints/banner-evidence-lab.png',
  communityReview: '/politician-viewpoints/banner-community-review.png',
  emptySearch: '/politician-viewpoints/illustration-empty-search.png',
  sharedFeed: '/politician-viewpoints/banner-shared-feed.png',
} as const;

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 32);
  }
}

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
  const [aiQuery, setAiQuery] = useState('');
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webResults, setWebResults] = useState<Array<{ title: string; url: string; snippet?: string; source?: string }>>([]);
  const [targetOfficialName, setTargetOfficialName] = useState('');
  const [targetOfficeRole, setTargetOfficeRole] = useState('');
  const [targetJurisdiction, setTargetJurisdiction] = useState('');
  const [selectedFocus, setSelectedFocus] = useState<Set<string>>(new Set());
  const [selectedSourceFilters, setSelectedSourceFilters] = useState<Set<string>>(() => new Set(DEFAULT_SOURCE_FILTER_IDS));
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searchNetworkFailed, setSearchNetworkFailed] = useState(false);
  const [openAiSearchBusy, setOpenAiSearchBusy] = useState(false);
  const [openAiSearchErr, setOpenAiSearchErr] = useState<string | null>(null);
  const [openAiEvidenceBusy, setOpenAiEvidenceBusy] = useState(false);
  const [openAiEvidenceErr, setOpenAiEvidenceErr] = useState<string | null>(null);
  const [aiDraftHint, setAiDraftHint] = useState('');

  const politicians = MOCK_POLITICIANS;
  const openAiEnabled = isPoliticianOpenAiConfigured();

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

  /** Debounced so we do not call setState on every keystroke (was flashing “Draft saved” and re-rendering constantly). */
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      const iso = new Date().toISOString();
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
        createdAtIso: iso,
      };
      try {
        window.localStorage.setItem(PROOF_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setLastDraftSavedAt(iso);
      } catch {
        /* ignore */
      }
    }, 550);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [saidText, saidSourceUrl, saidDate, didText, didSourceUrl, proofNote, timelineNote, subjectName, eventType, contradictionType]);

  const canSubmit = useMemo(() => {
    const hasSaid = saidText.trim().length >= 10;
    const hasDid = didText.trim().length >= 10;
    const hasAnyProof =
      proofFiles.length > 0 || proofNote.trim().length > 0 || saidSourceUrl.trim().length > 0 || didSourceUrl.trim().length > 0;
    return hasSaid && hasDid && hasAnyProof;
  }, [saidText, didText, proofFiles.length, proofNote, saidSourceUrl, didSourceUrl]);

  const investigationFocusLabels = useMemo(
    () => ACCOUNTABILITY_FOCUS.filter((f) => selectedFocus.has(f.id)).map((f) => f.label),
    [selectedFocus]
  );

  const investigationSourceHints = useMemo(
    () =>
      SOURCE_FILTERS.filter((s) => selectedSourceFilters.has(s.id))
        .map((s) => s.hint)
        .join(' '),
    [selectedSourceFilters]
  );

  const investigationQueryLine = useMemo(() => {
    const parts = [
      targetOfficialName.trim(),
      targetOfficeRole.trim(),
      targetJurisdiction.trim(),
      aiQuery.trim(),
      investigationFocusLabels.join(' '),
      investigationSourceHints.trim(),
    ].filter(Boolean);
    return parts.join(' ');
  }, [
    targetOfficialName,
    targetOfficeRole,
    targetJurisdiction,
    aiQuery,
    investigationFocusLabels,
    investigationSourceHints,
  ]);

  const canRunInvestigation = useMemo(
    () =>
      targetOfficialName.trim().length > 0 ||
      targetOfficeRole.trim().length > 0 ||
      targetJurisdiction.trim().length > 0 ||
      aiQuery.trim().length > 0 ||
      selectedFocus.size > 0,
    [targetOfficialName, targetOfficeRole, targetJurisdiction, aiQuery, selectedFocus]
  );

  const toggleFocus = (id: string) => {
    setSelectedFocus((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSourceFilter = (id: string) => {
    setSelectedSourceFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetInvestigationFilters = () => {
    setTargetOfficialName('');
    setTargetOfficeRole('');
    setTargetJurisdiction('');
    setAiQuery('');
    setSelectedFocus(new Set());
    setSelectedSourceFilters(new Set(DEFAULT_SOURCE_FILTER_IDS));
  };

  const handleBuildEvidencePacket = () => {
    const name = targetOfficialName.trim();
    if (name && !subjectName.trim()) {
      setSubjectName(name);
    }
    scrollTo('evidence-lab');
  };

  const handleCompareStatementVsRecord = () => {
    scrollTo('evidence-lab');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dirty =
      !proofSubmitted &&
      (saidText.trim().length > 0 ||
        didText.trim().length > 0 ||
        proofNote.trim().length > 0 ||
        saidSourceUrl.trim().length > 0 ||
        didSourceUrl.trim().length > 0 ||
        proofFiles.length > 0);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saidText, didText, proofNote, saidSourceUrl, didSourceUrl, proofFiles.length, proofSubmitted]);

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
    window.setTimeout(() => document.getElementById('report-qr-inline')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
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

  const reportDeepLink = useMemo(() => {
    if (!createdReportId || typeof window === 'undefined') return '';
    return `${window.location.origin}/?reportId=${encodeURIComponent(createdReportId)}&situationRoom=1`;
  }, [createdReportId]);

  const reportQrImageUrl = useMemo(() => {
    if (!reportDeepLink) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reportDeepLink)}&bgcolor=ffffff&color=0f172a&margin=12`;
  }, [reportDeepLink]);

  const runPublicSearch = () => {
    const q = investigationQueryLine;
    if (!q.trim()) return;

    const smart = buildFreePoliticianSearchQuery(q, investigationFocusLabels);

    setWebError(null);
    setSearchNetworkFailed(false);
    setSearchAttempted(true);
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
        const sliced = out.slice(0, 12);
        setWebResults(sliced);
        if (sliced.length === 0) {
          setWebError('empty');
        }
      })
      .catch(() => {
        setSearchNetworkFailed(true);
        setWebError('network');
      })
      .finally(() => setWebLoading(false));
  };

  const handleRefineSearchWithAi = async () => {
    if (!openAiEnabled) return;
    setOpenAiSearchErr(null);
    setOpenAiSearchBusy(true);
    try {
      const targetLine = [targetOfficialName.trim(), targetOfficeRole.trim(), targetJurisdiction.trim()]
        .filter(Boolean)
        .join(' · ');
      const q = await refinePoliticianSearchQuery({
        query: aiQuery,
        targetLine,
        focusLabels: investigationFocusLabels,
        sourceHints: investigationSourceHints,
      });
      setAiQuery(q);
    } catch (e: unknown) {
      setOpenAiSearchErr(e instanceof Error ? e.message : 'OpenAI request failed');
    } finally {
      setOpenAiSearchBusy(false);
    }
  };

  const handleSuggestEvidenceWithAi = async () => {
    if (!openAiEnabled) return;
    setOpenAiEvidenceErr(null);
    setOpenAiEvidenceBusy(true);
    try {
      const d = await suggestEvidenceDraftFromNotes({
        subjectName,
        proofNote,
        timelineNote,
        userHint: aiDraftHint,
      });
      setSaidText(d.saidText);
      setDidText(d.didText);
      setProofNote(d.proofNote);
      setProofSubmitted(false);
    } catch (e: unknown) {
      setOpenAiEvidenceErr(e instanceof Error ? e.message : 'OpenAI request failed');
    } finally {
      setOpenAiEvidenceBusy(false);
    }
  };

  return (
    <div
      data-dpal-theme="light"
      className="animate-fade-in min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50/40 pb-32 font-sans text-[var(--dpal-text-secondary)] antialiased"
    >
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
        <section className="mb-12 overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50 md:rounded-[2.5rem]">
          <div className="grid md:grid-cols-2 md:items-stretch">
            {/* Shared frame: both hero images use identical box size so neither column dominates */}
            <div className="relative flex flex-col border-b border-sky-200/80 bg-gradient-to-br from-sky-100/90 via-white to-sky-50/50 p-6 md:border-b-0 md:border-r md:p-8">
              <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
                <span className="rounded-lg border border-sky-200 bg-white/90 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-sky-700 shadow-sm">
                  Public truth
                </span>
                <span className="rounded-lg border border-indigo-200 bg-indigo-50/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-indigo-700 shadow-sm">
                  Source links
                </span>
              </div>
              <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-10">
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sky-700">Said this</p>
                  <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-700">
                    Public statements and promises — dated, sourced, preserved for the community record.
                  </p>
                </div>
                <div className="mt-auto flex w-full flex-col gap-2">
                  <div className="flex h-[220px] w-full items-center justify-center overflow-hidden rounded-2xl border border-sky-200/90 bg-slate-900/5 shadow-md ring-1 ring-sky-100 sm:h-[240px] md:h-[280px] lg:h-[300px]">
                    <img
                      src="/politician-viewpoints/said-this.png"
                      alt="Said this — public statements, speeches, and archived quotes"
                      className="h-full w-full object-cover object-top"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <p className="text-center text-[9px] font-medium text-slate-500">Rhetoric &amp; promises</p>
                </div>
              </div>
            </div>
            <div className="relative flex flex-col border-t border-emerald-200/80 bg-gradient-to-bl from-emerald-50/95 via-white to-teal-50/40 p-6 md:border-t-0 md:border-l md:p-8">
              <div className="absolute right-4 top-4 z-20 flex flex-wrap justify-end gap-2">
                <span className="rounded-lg border border-teal-200 bg-white/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-teal-800 shadow-sm">
                  Timeline
                </span>
                <span className="rounded-lg border border-amber-200 bg-amber-50/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-900 shadow-sm">
                  Compare & verify
                </span>
              </div>
              <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-10">
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-teal-800">Did this</p>
                  <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-slate-700">
                    Votes, actions, and outcomes — documented with care so we can improve accountability together.
                  </p>
                </div>
                <div className="mt-auto flex w-full flex-col gap-2">
                  <div className="flex h-[220px] w-full items-center justify-center overflow-hidden rounded-2xl border border-teal-200/90 bg-slate-900/5 shadow-md ring-1 ring-teal-100 sm:h-[240px] md:h-[280px] lg:h-[300px]">
                    <img
                      src="/politician-viewpoints/did-this.png"
                      alt="Did this — evidence, outcomes, and what the record shows"
                      className="h-full w-full object-cover object-top"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <p className="text-center text-[9px] font-medium text-slate-500">Record &amp; outcomes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Flow stepper — orient users: search → draft → submit */}
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:px-8">
            <ol className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              <li className="flex items-center gap-2 text-sky-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm">1</span>
                <span>Search sources</span>
              </li>
              <span className="hidden text-slate-300 sm:inline" aria-hidden>
                →
              </span>
              <li className="flex items-center gap-2 text-teal-800">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-teal-500 bg-white text-teal-700 shadow-sm">2</span>
                <span>Draft evidence</span>
              </li>
              <span className="hidden text-slate-300 sm:inline" aria-hidden>
                →
              </span>
              <li className="flex items-center gap-2 text-amber-900">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 text-amber-800 shadow-sm">3</span>
                <span>Submit to registry</span>
              </li>
            </ol>
          </div>

          <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-4 py-8 md:px-10 md:py-10">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                {HERO_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-600 shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900 md:text-3xl">DPAL · Public accountability</h1>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                A civic space for transparency, dignity, and a better shared record — built into the app, not in a separate window.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
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
                    onClick={() => scrollTo('report-qr-inline')}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-indigo-800 transition hover:bg-indigo-100"
                  >
                    Track link & QR
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

        {/* —— Public accountability search —— */}
        <section id="intel-search" className="mb-10 scroll-mt-24">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50">
            <div className="relative border-b border-slate-100">
              <img
                src={SECTION_IMG.intelSearch}
                alt=""
                className="h-32 w-full object-cover object-top sm:h-40 md:h-44"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="space-y-6 p-6 md:p-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-700">Public Accountability Engine</p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                      Investigate Officials, Claims, and Public Harm
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-[15px]">
                      Search public records, ethics findings, campaign finance, votes, contracts, and documented community impact. Select an accountability focus
                      and build an evidence-backed packet in the workspace below.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                    <span className="inline-flex items-center rounded-lg border border-sky-200 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-sky-800">
                      Evidence-Based Search
                    </span>
                    <button
                      type="button"
                      onClick={() => scrollTo('evidence-lab')}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      Open existing packet
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-8">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                        <User className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">1. Identify the target</h3>
                        <p className="mt-1 text-xs text-slate-600">Who are you investigating? Start with the person, office, or public body.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Official / name</label>
                        <input
                          value={targetOfficialName}
                          onChange={(e) => setTargetOfficialName(e.target.value)}
                          placeholder="e.g. Senator Jane Doe"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Office / role</label>
                        <input
                          value={targetOfficeRole}
                          onChange={(e) => setTargetOfficeRole(e.target.value)}
                          placeholder="Mayor, School Board, Sheriff…"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">State / city / agency</label>
                        <input
                          value={targetJurisdiction}
                          onChange={(e) => setTargetJurisdiction(e.target.value)}
                          placeholder="Arizona, Maricopa County, Phoenix…"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                        <Scale className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">2. Accountability focus</h3>
                        <p className="mt-1 text-xs text-slate-600">Choose one or more investigation modes (not casual tags).</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {ACCOUNTABILITY_FOCUS.map((opt) => {
                        const on = selectedFocus.has(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleFocus(opt.id)}
                            className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-left text-[11px] font-bold leading-snug text-slate-800 transition md:text-xs ${
                              on
                                ? 'border-sky-600 bg-sky-600 text-white shadow-sm'
                                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">3. Evidence query</h3>
                        <p className="mt-1 text-xs text-slate-600">What claim, issue, or conduct should be examined?</p>
                      </div>
                    </div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Investigation query</label>
                    <textarea
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      rows={4}
                      placeholder="Enter statement, controversy, policy action, donor link, contract issue, or misconduct allegation…"
                      className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Source filters</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SOURCE_FILTERS.map((opt) => {
                        const on = selectedSourceFilters.has(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleSourceFilter(opt.id)}
                            className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition ${
                              on
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {openAiEnabled && (
                      <p className="mt-4 text-[10px] leading-relaxed text-indigo-900/85">
                        <span className="font-semibold text-indigo-950">OpenAI</span> can tighten the investigation query before DuckDuckGo (dev:{' '}
                        <code className="rounded bg-indigo-50 px-1">VITE_OPENAI_API_KEY</code> via Vite proxy).
                      </p>
                    )}
                    {!openAiEnabled && (
                      <p className="mt-4 text-[10px] text-slate-400">
                        Set <code className="rounded bg-slate-100 px-1">VITE_OPENAI_API_KEY</code> in <code className="rounded bg-slate-100 px-1">.env.local</code> for AI query refine and evidence draft.
                      </p>
                    )}

                    <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={runPublicSearch}
                        disabled={!canRunInvestigation || webLoading}
                        className={`inline-flex min-h-[48px] items-center justify-center rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest shadow-md transition ${
                          canRunInvestigation && !webLoading
                            ? 'bg-sky-700 text-white shadow-sky-200/50 hover:bg-sky-800'
                            : 'cursor-not-allowed bg-slate-200 text-slate-400'
                        }`}
                      >
                        {webLoading ? 'Searching…' : 'Run investigation'}
                      </button>
                      <button
                        type="button"
                        onClick={handleBuildEvidencePacket}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-800 transition hover:bg-slate-50"
                      >
                        Build evidence packet
                      </button>
                      <button
                        type="button"
                        onClick={handleCompareStatementVsRecord}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-100"
                      >
                        Compare statement vs record
                      </button>
                      {openAiEnabled && (
                        <button
                          type="button"
                          onClick={() => void handleRefineSearchWithAi()}
                          disabled={openAiSearchBusy}
                          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-xs font-bold uppercase tracking-widest text-indigo-900 transition hover:bg-indigo-100 disabled:opacity-50"
                        >
                          <Sparkles className="h-4 w-4 shrink-0" />
                          {openAiSearchBusy ? 'Refining…' : 'Refine query (AI)'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={resetInvestigationFilters}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-dashed border-slate-300 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:border-slate-400 hover:text-slate-700"
                      >
                        Reset filters
                      </button>
                    </div>
                    <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">DuckDuckGo · free · best-effort public web</p>
                    {openAiSearchErr && <p className="mt-2 text-xs font-medium text-rose-600">{openAiSearchErr}</p>}
                  </div>
                </div>

                <aside className="space-y-4 xl:col-span-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-extrabold text-slate-900">Investigation results</h3>
                    <p className="mt-1 text-xs text-slate-600">What you get after running a search — structured for packet-ready review.</p>
                    <ul className="mt-4 space-y-3">
                      {[
                        { t: 'Official profile', d: 'Role, jurisdiction, and public-office context when identifiable from the open web.' },
                        { t: 'Key findings', d: 'Leads on contradictions, ethics issues, votes, contracts, and flags to verify.' },
                        { t: 'Evidence timeline', d: 'Documents, votes, reports, and events to order in your packet.' },
                        { t: 'Contracts / donations', d: 'Financial and award links to cross-check in primary sources.' },
                        { t: 'Statement vs action', d: 'Compare speeches and promises with votes and official actions.' },
                      ].map((row) => (
                        <li key={row.t} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-800">{row.t}</p>
                          <p className="mt-1 text-xs text-slate-600">{row.d}</p>
                        </li>
                      ))}
                      <li className="rounded-xl border border-dashed border-sky-300 bg-sky-50/90 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-900">Add to packet</p>
                        <p className="mt-1 text-xs text-sky-900/90">Save verified items in the evidence workspace and registry below.</p>
                      </li>
                    </ul>
                  </div>
                </aside>
              </div>
            </div>

            {searchAttempted && !webLoading && (
              <div className="space-y-4 border-t border-slate-100 bg-slate-50/30 px-6 py-6 md:px-8 md:pb-8">
                {searchNetworkFailed && (
                  <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-rose-900">Connection issue</p>
                    <p className="mt-2 text-sm leading-relaxed text-rose-900/90">
                      Search could not reach DuckDuckGo. Check your network and try again.
                    </p>
                  </div>
                )}

                {!searchNetworkFailed && webError === 'empty' && webResults.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 text-center shadow-sm">
                    <img
                      src={SECTION_IMG.emptySearch}
                      alt=""
                      className="mx-auto max-h-52 w-full max-w-lg rounded-xl object-contain"
                      loading="lazy"
                    />
                    <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-800">No matching sources</p>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                      Add target fields or a clearer investigation query, adjust accountability focus or source filters, then run the investigation again.
                    </p>
                  </div>
                )}

                {webResults.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-600">Source links</p>
                  <button
                    type="button"
                    onClick={async () => {
                      const qLine = investigationQueryLine;
                      const lines = [
                        `DPAL public accountability search`,
                        `Query: ${qLine}`,
                        ...webResults.map((r) => `- ${r.title}\n  ${r.url}`),
                      ].join('\n');
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: 'DPAL accountability search', text: lines });
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
                          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-800">{hostLabel(r.url)}</p>
                          <p className="line-clamp-2 text-sm font-bold text-slate-900">{r.title}</p>
                          {r.snippet && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.snippet}</p>}
                          <p className="mt-2 truncate text-[10px] text-slate-500">
                            {r.source ? `${r.source} · ` : ''}
                            {r.url}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                      </div>
                    </a>
                  ))}
                </div>
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

              {openAiEnabled && (
                <div className="politician-evidence-md mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 [&_md-outlined-text-field]:block [&_md-outlined-text-field]:w-full">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-900">OpenAI · evidence draft</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Uses your notes below (context, timeline) plus optional instructions. Always verify facts and add sources — AI may leave placeholders.
                  </p>
                  <MdOutlinedTextFieldSync
                    className="mt-3"
                    label="Instructions for AI (optional)"
                    value={aiDraftHint}
                    supportingText="e.g. “Emphasize the housing vote” or “Keep under 200 words per side”"
                    onValueChange={setAiDraftHint}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSuggestEvidenceWithAi()}
                    disabled={openAiEvidenceBusy}
                    className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-indigo-900 shadow-sm transition hover:bg-indigo-50 disabled:opacity-50 sm:w-auto"
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    {openAiEvidenceBusy ? 'Drafting…' : 'Suggest draft (AI)'}
                  </button>
                  {openAiEvidenceErr && <p className="mt-2 text-xs font-medium text-rose-600">{openAiEvidenceErr}</p>}
                </div>
              )}

              <div className="politician-evidence-md mt-6 [&_md-outlined-text-field]:block [&_md-outlined-text-field]:w-full [&_md-outlined-select]:block [&_md-outlined-select]:w-full">
                <MdOutlinedTextFieldSync
                  label="Subject / office (optional)"
                  value={subjectName}
                  supportingText="Official, agency, or public figure"
                  onValueChange={(v) => {
                    setSubjectName(v);
                    setProofSubmitted(false);
                  }}
                />
              </div>

              <div className="politician-evidence-md mt-8 grid gap-6 lg:grid-cols-2 [&_md-outlined-text-field]:block [&_md-outlined-text-field]:w-full [&_md-outlined-select]:block [&_md-outlined-select]:w-full">
                <div className="rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50/80 to-white p-5">
                  <div className="flex items-center gap-2 text-sky-800">
                    <MegaphoneMini />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Public statement</p>
                  </div>
                  <MdOutlinedTextFieldSync
                    className="mt-4"
                    label="What was said"
                    type="textarea"
                    rows={6}
                    supportingText="Quote, promise, speech, or press release."
                    value={saidText}
                    onValueChange={(v) => {
                      setSaidText(v);
                      setProofSubmitted(false);
                    }}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <MdOutlinedTextFieldSync
                      label="Source link"
                      type="url"
                      value={saidSourceUrl}
                      supportingText="https://…"
                      onValueChange={(v) => {
                        setSaidSourceUrl(v);
                        setProofSubmitted(false);
                      }}
                    />
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500" htmlFor="politician-said-date">
                        Date
                      </label>
                      <input
                        id="politician-said-date"
                        type="date"
                        value={saidDate}
                        onChange={(e) => {
                          setSaidDate(e.target.value);
                          setProofSubmitted(false);
                        }}
                        className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <MdOutlinedSelectSync
                      label="Event type"
                      value={eventType}
                      options={EVENT_TYPES}
                      onValueChange={(v) => {
                        setEventType(v);
                        setProofSubmitted(false);
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50/80 to-white p-5">
                  <div className="flex items-center gap-2 text-teal-900">
                    <Scale className="h-4 w-4" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em]">On the record</p>
                  </div>
                  <MdOutlinedTextFieldSync
                    className="mt-4"
                    label="What the record shows"
                    type="textarea"
                    rows={6}
                    supportingText="Documented vote, action, funding, or outcome — for clarity, not blame."
                    value={didText}
                    onValueChange={(v) => {
                      setDidText(v);
                      setProofSubmitted(false);
                    }}
                  />
                  <div className="mt-3">
                    <MdOutlinedTextFieldSync
                      label="Evidence link"
                      type="url"
                      value={didSourceUrl}
                      supportingText="https://…"
                      onValueChange={(v) => {
                        setDidSourceUrl(v);
                        setProofSubmitted(false);
                      }}
                    />
                  </div>
                  <div className="mt-3">
                    <MdOutlinedSelectSync
                      label="Accountability category"
                      value={contradictionType}
                      options={CONTRADICTION_TYPES}
                      onValueChange={(v) => {
                        setContradictionType(v);
                        setProofSubmitted(false);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="politician-evidence-md mt-6 grid gap-6 lg:grid-cols-2 [&_md-outlined-text-field]:block [&_md-outlined-text-field]:w-full">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">Context & community notes</p>
                  <MdOutlinedTextFieldSync
                    className="mt-3"
                    label="Context"
                    type="textarea"
                    rows={4}
                    supportingText="Who, what, when, where — additional respectful context."
                    value={proofNote}
                    onValueChange={setProofNote}
                  />
                  <div className="mt-3">
                    <MdOutlinedTextFieldSync
                      label="Timeline"
                      value={timelineNote}
                      supportingText='e.g. “30 days before vote X”'
                      onValueChange={(v) => setTimelineNote(v)}
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
                  <p className="mt-6 text-[10px] leading-relaxed text-slate-500">
                    This entry is community-sourced accountability, not legal advice. By submitting, you agree your summary is
                    accurate to the best of your knowledge and includes sources where possible.
                  </p>
                  <md-filled-button
                    type="button"
                    className="mt-3 w-full [&::part(container)]:min-h-[48px]"
                    disabled={!canSubmit}
                    onClick={submitEvidence}
                  >
                    Submit to shared registry
                  </md-filled-button>
                  {submitError && <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-rose-700">{submitError}</p>}
                  <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600">
                    Status: {proofSubmitted ? 'Under review' : 'Not submitted'}
                  </p>
                  {createdReportId && (
                    <md-outlined-button
                      type="button"
                      className="mt-3 w-full [&::part(container)]:min-h-[44px]"
                      onClick={() => scrollTo('report-qr-inline')}
                    >
                      Track link & QR (sidebar)
                    </md-outlined-button>
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

            <div
              id="report-qr-inline"
              className="scroll-mt-28 rounded-[2rem] border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-6 shadow-md shadow-emerald-100/40"
            >
              <div className="flex items-center gap-2 text-emerald-800">
                <Database className="h-5 w-5" />
                <p className="text-[10px] font-bold uppercase tracking-[0.35em]">Public ledger · track this report</p>
              </div>
              <p className="mt-2 text-xs text-slate-600">Shareable link and QR stay on this page — no pop-up window.</p>
              <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 font-mono text-[10px] text-emerald-900">
                <p className="flex items-center gap-2 text-slate-500">
                  <Hash className="h-3.5 w-3.5" />
                  {createdReportId ? pseudoLedgerHash(createdReportId) : '— after you submit —'}
                </p>
                <p className="mt-2 text-[9px] font-medium uppercase tracking-widest text-slate-500">Anchored reference (preview)</p>
              </div>
              {createdReportId && reportDeepLink && reportQrImageUrl && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Scan or copy</p>
                  <img src={reportQrImageUrl} alt="" className="mx-auto mt-3 h-[160px] w-[160px] rounded-lg border border-slate-100 bg-white object-contain p-2" />
                  <p className="mt-3 break-all text-left font-mono text-[10px] leading-relaxed text-slate-600">{reportDeepLink}</p>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(reportDeepLink)}
                    className="mt-3 w-full rounded-lg border border-emerald-300 bg-emerald-50 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-900 hover:bg-emerald-100"
                  >
                    Copy link
                  </button>
                  <p className="mt-2 font-mono text-[10px] text-slate-500">ID: {createdReportId}</p>
                </div>
              )}
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
                              window.setTimeout(() => document.getElementById('report-qr-inline')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
                            }}
                            className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-sky-900 hover:bg-sky-100"
                          >
                            Link & QR
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
