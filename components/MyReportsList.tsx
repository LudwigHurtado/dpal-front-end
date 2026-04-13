import React, { useMemo, useState } from 'react';
import type { Report } from '../types';
import { Category } from '../types';
import MyReportCard from './MyReportCard';
import { useTranslations } from '../i18n';
import {
  Activity,
  ArrowRight,
  Award,
  Book,
  CheckCircle,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  Database,
  FileText,
  Globe,
  Heart,
  Home,
  Layout,
  Megaphone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Zap,
} from './icons';

export interface MyReportsListProps {
  reports: Report[];
  onJoinReportChat: (report: Report) => void;
  onAddNewReport: () => void;
  /** Back to main menu / home */
  onReturnHome?: () => void;
  /** Switch hub to community feed */
  onOpenCommunityFeed?: () => void;
}

type StatusFilter = 'all' | 'drafts' | 'submitted' | 'in_review' | 'verified' | 'resolved';
type TopicFilter =
  | 'all'
  | 'family_safety'
  | 'accountability'
  | 'environment'
  | 'education'
  | 'help';

function reportTime(r: Report): number {
  const d = r.timestamp instanceof Date ? r.timestamp : new Date((r as { timestamp?: unknown }).timestamp as string);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function isVerifiedReport(r: Report): boolean {
  return Boolean(r.earnedNft) || r.trustScore >= 78;
}

function matchesTopic(r: Report, topic: TopicFilter): boolean {
  if (topic === 'all') return true;
  const c = r.category;
  switch (topic) {
    case 'family_safety':
      return [
        Category.PublicSafetyAlerts,
        Category.HousingIssues,
        Category.AccidentsRoadHazards,
        Category.ElderlyCare,
        Category.Allergies,
      ].includes(c);
    case 'accountability':
      return [Category.PoliceMisconduct, Category.CivicDuty, Category.WorkplaceIssues, Category.ConsumerScams].includes(c);
    case 'environment':
      return [Category.Environment, Category.WaterViolations, Category.FireEnvironmentalHazards, Category.Infrastructure].includes(c);
    case 'education':
      return c === Category.Education;
    case 'help':
      return c === Category.DpalHelp;
    default:
      return true;
  }
}

function matchesStatusFilter(r: Report, f: StatusFilter): boolean {
  if (f === 'all') return true;
  if (f === 'drafts') return false;
  if (f === 'verified') return isVerifiedReport(r);
  if (f === 'submitted') return r.status === 'Submitted';
  if (f === 'in_review') return r.status === 'In Review';
  if (f === 'resolved') return r.status === 'Resolved';
  return true;
}

const CREATE_OPTIONS: { label: string; hint: string }[] = [
  { label: 'Safety Report', hint: 'Protect neighbors & families' },
  { label: 'Community Concern', hint: 'Local issues that matter' },
  { label: 'Public Accountability Report', hint: 'Constructive transparency' },
  { label: 'Help Request', hint: 'Get support from the network' },
  { label: 'Evidence Submission', hint: 'Photos, docs, sources' },
  { label: 'Family / Local Issue', hint: 'Home, school, block' },
  { label: 'Environmental Concern', hint: 'Air, water, places' },
  { label: 'Lost & Found / Protection', hint: 'Recover & safeguard' },
  { label: 'Education or Health Related', hint: 'Schools & wellbeing' },
];

const NAV_LINKS: {
  label: string;
  action: 'home' | 'report' | 'community' | 'ledger' | 'help' | 'missions' | 'rewards' | 'profile' | 'my_reports';
  active?: boolean;
}[] = [
  { label: 'Home', action: 'home' },
  { label: 'Report', action: 'report' },
  { label: 'Public feed', action: 'community' },
  { label: 'Public Record', action: 'ledger' },
  { label: 'Help Center', action: 'help' },
  { label: 'Missions', action: 'missions' },
  { label: 'Rewards', action: 'rewards' },
  { label: 'My Contributions', action: 'my_reports', active: true },
  { label: 'Profile', action: 'profile' },
];

const MyReportsList: React.FC<MyReportsListProps> = ({
  reports,
  onJoinReportChat,
  onAddNewReport,
  onReturnHome,
  onOpenCommunityFeed,
}) => {
  const { t } = useTranslations();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [topicFilter, setTopicFilter] = useState<TopicFilter>('all');

  const myReports = useMemo(() => {
    return reports.filter((r) => r.isAuthor).sort((a, b) => reportTime(b) - reportTime(a));
  }, [reports]);

  const stats = useMemo(() => {
    const total = myReports.length;
    const drafts = 0;
    const submitted = myReports.filter((r) => r.status === 'Submitted').length;
    const underReview = myReports.filter((r) => r.status === 'In Review').length;
    const verified = myReports.filter(isVerifiedReport).length;
    const resolved = myReports.filter((r) => r.status === 'Resolved').length;
    const communityHelped = resolved * 4 + submitted * 2 + Math.min(total * 3, 48);
    const avgTrust =
      total > 0 ? Math.round(myReports.reduce((s, r) => s + r.trustScore, 0) / total) : 72;
    const impactScore = Math.min(100, Math.round(avgTrust * 0.85 + resolved * 4));
    return {
      total,
      drafts,
      submitted,
      underReview,
      verified,
      resolved,
      communityHelped,
      impactScore,
      trustScore: avgTrust,
    };
  }, [myReports]);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myReports.filter((r) => {
      if (!matchesStatusFilter(r, statusFilter)) return false;
      if (!matchesTopic(r, topicFilter)) return false;
      if (!q) return true;
      const blob = `${r.title} ${r.description} ${r.category} ${r.location}`.toLowerCase();
      return blob.includes(q);
    });
  }, [myReports, search, statusFilter, topicFilter]);

  const registryRef = useMemo(() => {
    const h = myReports[0]?.hash ?? myReports[0]?.txHash ?? 'local';
    return `DPAL-REG-${String(h).slice(0, 8).toUpperCase()}`;
  }, [myReports]);

  const handleNav = (action: (typeof NAV_LINKS)[number]['action']) => {
    if (action === 'home' && onReturnHome) onReturnHome();
    if (action === 'community' && onOpenCommunityFeed) onOpenCommunityFeed();
    if (action === 'report') onAddNewReport();
  };

  return (
    <div className="animate-fade-in overflow-hidden rounded-[1.75rem] border border-[color:var(--dpal-border)] bg-gradient-to-b from-[var(--dpal-surface)] via-[var(--dpal-background-secondary)] to-[var(--dpal-surface)] font-sans antialiased text-[var(--dpal-text-primary)] shadow-[var(--dpal-shadow-lg)]">
      {/* In-page app chrome: premium civic header */}
      <header className="border-b border-[color:var(--dpal-border)] bg-[color-mix(in_srgb,var(--dpal-panel)_92%,transparent)] backdrop-blur-md">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-lg font-bold text-white shadow-md shadow-sky-500/25">
              D
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--dpal-text-muted)]">DPAL</p>
              <p className="text-sm font-semibold text-[var(--dpal-text-primary)]">Decentralized Public Accountability Ledger</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {NAV_LINKS.map((link) =>
              link.active ? (
                <span
                  key={link.label}
                  className="rounded-full bg-[color-mix(in_srgb,var(--dpal-primary)_18%,transparent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--dpal-accent)] ring-1 ring-[color:color-mix(in_srgb,var(--dpal-primary)_35%,transparent)]"
                  aria-current="page"
                >
                  {link.label}
                </span>
              ) : (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => {
                    if (link.action === 'home' || link.action === 'community' || link.action === 'report') {
                      handleNav(link.action);
                    }
                  }}
                  className="rounded-full px-2.5 py-1.5 text-[11px] font-medium text-[var(--dpal-text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--dpal-border)_22%,transparent)] hover:text-[var(--dpal-text-primary)]"
                >
                  {link.label}
                </button>
              ),
            )}
            <span className="mx-1 hidden h-4 w-px bg-[var(--dpal-border-strong)] sm:inline" aria-hidden />
            <button
              type="button"
              className="rounded-full p-2 text-[var(--dpal-text-muted)] hover:bg-[color-mix(in_srgb,var(--dpal-border)_22%,transparent)]"
              aria-label="Notifications"
            >
              <Activity className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-full p-2 text-[var(--dpal-text-muted)] hover:bg-[color-mix(in_srgb,var(--dpal-border)_22%,transparent)]" aria-label="Wallet">
              <CreditCard className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-full p-2 text-[var(--dpal-text-muted)] hover:bg-[color-mix(in_srgb,var(--dpal-border)_22%,transparent)]" aria-label="Account">
              <User className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-full p-2 text-[var(--dpal-text-muted)] hover:bg-[color-mix(in_srgb,var(--dpal-border)_22%,transparent)]" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_min(320px,36%)] lg:gap-8 lg:p-8">
        {/* Main column */}
        <div className="min-w-0 space-y-8">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-[color:color-mix(in_srgb,var(--dpal-primary)_22%,transparent)] bg-gradient-to-br from-[var(--dpal-panel)] via-[var(--dpal-surface)] to-[color-mix(in_srgb,var(--dpal-primary)_12%,var(--dpal-background-secondary))] p-6 shadow-[var(--dpal-shadow-md)] sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="relative">
              <div className="mb-4 flex flex-wrap gap-2">
                {['Private Drafts', 'Verified Records', 'Family Safe', 'Community Tools', 'Positive Impact'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/80 bg-[color-mix(in_srgb,var(--dpal-card)_70%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--dpal-text-secondary)] shadow-sm backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--dpal-text-primary)] sm:text-3xl">My Reports</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--dpal-text-secondary)] sm:text-base">
                Track your contributions, follow progress, and help create safer communities.
              </p>
              <p className="mt-2 text-xs font-medium text-[var(--dpal-accent)]">Trusted Record Builder</p>

              {/* Mini visual banner */}
              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[color:color-mix(in_srgb,var(--dpal-primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--dpal-card)_85%,transparent)] p-4 shadow-inner">
                <div className="flex -space-x-2">
                  {['👨‍👩‍👧', '🏘️', '🛡️', '🌱', '🤝'].map((emoji, i) => (
                    <span
                      key={i}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-b from-[color-mix(in_srgb,var(--dpal-background-secondary)_55%,#fff)] to-[color-mix(in_srgb,var(--dpal-surface)_35%,#fff)] text-lg shadow-sm"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--dpal-text-primary)]">Safer together · Shared truth · Better records</p>
                  <p className="text-xs text-[var(--dpal-text-muted)]">Your dashboard for community care and constructive accountability.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onAddNewReport}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--dpal-primary)] to-cyan-600 px-4 py-2.5 text-sm font-semibold text-[#042f2e] shadow-md shadow-[color-mix(in_srgb,var(--dpal-primary)_40%,transparent)] transition hover:brightness-105"
                >
                  <Plus className="h-4 w-4" />
                  Start a New Report
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCommunityFeed?.()}
                  className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-card)] px-4 py-2.5 text-sm font-semibold text-[var(--dpal-text-secondary)] shadow-sm hover:bg-[var(--dpal-surface-alt)]"
                >
                  <Heart className="h-4 w-4 text-rose-400" />
                  View Community Impact
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-card)] px-4 py-2.5 text-sm font-semibold text-[var(--dpal-text-secondary)] shadow-sm hover:bg-[var(--dpal-surface-alt)]"
                >
                  <Clock className="h-4 w-4 text-[var(--dpal-info)]" />
                  Open My Timeline
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-[color:color-mix(in_srgb,var(--dpal-warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--dpal-warning)_12%,transparent)] px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-[color-mix(in_srgb,var(--dpal-warning)_18%,transparent)]"
                >
                  Continue Draft
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Summary metrics */}
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--dpal-text-muted)]">Report Progress</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-4">
              <SummaryCard label="Total Reports" value={stats.total} accent="sky" icon={<FileText className="h-4 w-4" />} />
              <SummaryCard label="Drafts" value={stats.drafts} accent="slate" icon={<Layout className="h-4 w-4" />} />
              <SummaryCard label="Under Review" value={stats.underReview} accent="coral" icon={<Clock className="h-4 w-4" />} />
              <SummaryCard label="Verified" value={stats.verified} accent="green" icon={<ShieldCheck className="h-4 w-4" />} />
              <SummaryCard label="Resolved" value={stats.resolved} accent="green" icon={<CheckCircle className="h-4 w-4" />} />
              <SummaryCard label="Community Helped" value={stats.communityHelped} accent="cyan" icon={<Heart className="h-4 w-4" />} />
              <SummaryCard label="Impact Score" value={`${stats.impactScore}`} accent="gold" icon={<Zap className="h-4 w-4" />} />
              <SummaryCard label="Trust Score" value={`${stats.trustScore}`} accent="sky" icon={<Star className="h-4 w-4" />} />
            </div>
          </section>

          {/* Reward / encouragement strip */}
          <section className="rounded-2xl border border-[color:color-mix(in_srgb,var(--dpal-warning)_28%,transparent)] bg-gradient-to-r from-[color-mix(in_srgb,var(--dpal-warning)_8%,var(--dpal-panel))] via-[var(--dpal-surface)] to-[color-mix(in_srgb,var(--dpal-success)_8%,var(--dpal-panel))] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 rounded-xl bg-[var(--dpal-card)] px-3 py-2 shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--dpal-warning)_35%,transparent)]">
                <Coins className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200">DPAL coins</p>
                  <p className="text-lg font-bold text-[var(--dpal-text-primary)]">{(stats.resolved * 120 + stats.verified * 40).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--dpal-text-muted)]">Community trust points</p>
                <p className="text-sm font-semibold text-[var(--dpal-text-primary)]">{stats.trustScore * 12 + stats.resolved * 25} pts</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--dpal-text-muted)]">Helpful streak</p>
                <p className="text-sm font-semibold text-emerald-400">{Math.min(14, stats.total + 3)} days</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--dpal-text-muted)] sm:mt-0 sm:max-w-xs sm:text-right">
              Recognition for civic contribution — not a game, a thank-you for showing up for your community.
            </p>
          </section>

          {/* Start a new report */}
          <section className="rounded-3xl border border-[color:color-mix(in_srgb,var(--dpal-success)_25%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--dpal-success)_8%,var(--dpal-surface))] via-[var(--dpal-panel)] to-[var(--dpal-surface)] p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--dpal-text-primary)]">Start a New Report</h2>
                <p className="mt-1 text-sm text-[var(--dpal-text-secondary)]">
                  Start with what you know. Add details, photos, and sources to help create a better record.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--dpal-success)_15%,transparent)] px-3 py-1 text-[11px] font-semibold text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Public good tools
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CREATE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={onAddNewReport}
                  className="group flex flex-col rounded-2xl border border-[color:var(--dpal-border)] bg-[var(--dpal-card)] p-4 text-left shadow-sm transition hover:border-[color:color-mix(in_srgb,var(--dpal-primary)_45%,transparent)] hover:shadow-md"
                >
                  <span className="font-semibold text-[var(--dpal-text-primary)] group-hover:text-[var(--dpal-accent)]">{opt.label}</span>
                  <span className="mt-0.5 text-xs text-[var(--dpal-text-muted)]">{opt.hint}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--dpal-primary-hover)]">
                    Begin <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Search & filters */}
          <section>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dpal-text-muted)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your reports, categories, places, or keywords…"
                  className="w-full rounded-2xl border border-[color:var(--dpal-border)] bg-[var(--dpal-input-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--dpal-text-primary)] shadow-inner placeholder:text-[var(--dpal-placeholder)] focus:border-[var(--dpal-accent)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--dpal-primary)_35%,transparent)]"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'All Reports'],
                  ['drafts', 'Drafts'],
                  ['submitted', 'Submitted'],
                  ['in_review', 'In Review'],
                  ['verified', 'Verified'],
                  ['resolved', 'Resolved'],
                ] as const
              ).map(([id, label]) => (
                <FilterChip key={id} active={statusFilter === id} onClick={() => setStatusFilter(id)} label={label} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="mr-1 self-center text-[10px] font-bold uppercase tracking-wide text-[var(--dpal-text-muted)]">Topics</span>
              {(
                [
                  ['all', 'All'],
                  ['family_safety', 'Family / Safety'],
                  ['accountability', 'Public Accountability'],
                  ['environment', 'Environment'],
                  ['education', 'Education'],
                  ['help', 'Help Requests'],
                ] as const
              ).map(([id, label]) => (
                <FilterChip key={id} active={topicFilter === id} onClick={() => setTopicFilter(id)} label={label} variant="topic" />
              ))}
            </div>
          </section>

          {/* Main list */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[var(--dpal-text-primary)]">Your reports</h2>
              <span className="text-xs font-medium text-[var(--dpal-text-muted)]">{filteredReports.length} shown</span>
            </div>
            {filteredReports.length > 0 ? (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <MyReportCard key={report.id} report={report} onJoinChat={() => onJoinReportChat(report)} variant="civic" />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[var(--dpal-border)] bg-[color-mix(in_srgb,var(--dpal-background-secondary)_50%,transparent)] py-16 text-center">
                <Megaphone className="mx-auto mb-3 h-12 w-12 text-[var(--dpal-text-muted)]" />
                <h3 className="text-lg font-semibold text-[var(--dpal-text-secondary)]">{t('mainContent.noReports')}</h3>
                <p className="mt-2 text-sm text-[var(--dpal-text-muted)]">{t('mainContent.beTheFirst')}</p>
                <p className="mt-4 text-xs text-[var(--dpal-text-muted)]">
                  {statusFilter === 'drafts'
                    ? 'No drafts yet — start a report and save progress anytime.'
                    : search || statusFilter !== 'all' || topicFilter !== 'all'
                      ? 'Try adjusting filters or search.'
                      : 'Your meaningful civic records will appear here.'}
                </p>
              </div>
            )}
          </section>

          {/* Community impact */}
          <section className="rounded-3xl border border-[color:color-mix(in_srgb,var(--dpal-primary)_22%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--dpal-primary)_10%,var(--dpal-surface))] via-[var(--dpal-panel)] to-[var(--dpal-background-secondary)] p-6">
            <h2 className="text-base font-bold text-[var(--dpal-text-primary)]">Positive Impact</h2>
            <p className="mt-1 text-sm text-[var(--dpal-text-secondary)]">Your contributions are part of something bigger — progress we make together.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ImpactRow label="People helped (est.)" value={`${stats.communityHelped}+`} icon={<Heart className="h-4 w-4 text-rose-400" />} />
              <ImpactRow label="Cases resolved" value={String(stats.resolved)} icon={<CheckCircle className="h-4 w-4 text-emerald-500" />} />
              <ImpactRow label="Safer places identified" value={String(Math.max(1, stats.submitted + 2))} icon={<ShieldCheck className="h-4 w-4 text-[var(--dpal-info)]" />} />
              <ImpactRow label="Trends discovered" value={String(Math.max(0, stats.underReview))} icon={<Activity className="h-4 w-4 text-violet-500" />} />
              <ImpactRow label="Local improvements" value={String(stats.resolved * 2 + 1)} icon={<Globe className="h-4 w-4 text-cyan-600" />} />
              <ImpactRow label="Timeline records" value={String(stats.total)} icon={<Database className="h-4 w-4 text-[var(--dpal-text-muted)]" />} />
            </div>
          </section>

          {/* Footer registry */}
          <footer className="rounded-2xl border border-[color-mix(in_srgb,var(--dpal-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--dpal-background-secondary)_75%,transparent)] px-4 py-3 text-[11px] text-[var(--dpal-text-muted)]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                <span className="font-semibold text-[var(--dpal-text-secondary)]">Record trace:</span> {registryRef}
              </span>
              <span className="hidden sm:inline">·</span>
              <span>Timeline marker: {new Date().getFullYear()}-Q{Math.ceil((new Date().getMonth() + 1) / 3)}</span>
              <span className="hidden sm:inline">·</span>
              <span>Visibility: private workspace · verification history preserved</span>
            </div>
            <p className="mt-1 text-[10px] text-[var(--dpal-text-muted)]">
              Sources and updates stay connected to your record for transparent, safe review.
            </p>
          </footer>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <SideCard title="How reporting helps" icon={<Heart className="h-4 w-4 text-rose-400" />}>
            <p className="text-sm leading-relaxed text-[var(--dpal-text-secondary)]">
              Clear records help neighbors, families, and officials respond with care. Truth can protect people — and spark real solutions.
            </p>
          </SideCard>
          <SideCard title="My contribution this month" icon={<Award className="h-4 w-4 text-amber-600" />}>
            <ul className="space-y-2 text-sm text-[var(--dpal-text-secondary)]">
              <li className="flex justify-between">
                <span>Reports filed</span>
                <span className="font-semibold text-[var(--dpal-text-primary)]">{stats.total}</span>
              </li>
              <li className="flex justify-between">
                <span>Verified steps</span>
                <span className="font-semibold text-emerald-400">{stats.verified}</span>
              </li>
            </ul>
          </SideCard>
          <SideCard title="Family & community impact" icon={<Home className="h-4 w-4 text-[var(--dpal-info)]" />}>
            <p className="text-sm text-[var(--dpal-text-secondary)]">Safer together — your updates support prevention and healing, not fear.</p>
          </SideCard>
          <SideCard title="Quick tips for strong reports" icon={<Book className="h-4 w-4 text-indigo-500" />}>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--dpal-text-secondary)]">
              <li>What happened, when, and where</li>
              <li>Photos or documents when safe to share</li>
              <li>Links to trusted public sources</li>
            </ul>
          </SideCard>
          <SideCard title="Trusted sources checklist" icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}>
            <ul className="space-y-1.5 text-sm text-[var(--dpal-text-secondary)]">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Official notices & dates
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Independent corroboration
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--dpal-text-muted)]">○</span> Redact personal data you do not want public
              </li>
            </ul>
          </SideCard>
          <SideCard title="Rewards pending" icon={<Coins className="h-4 w-4 text-amber-600" />}>
            <p className="text-sm text-[var(--dpal-text-secondary)]">
              <span className="font-semibold text-[var(--dpal-text-primary)]">{Math.max(0, 3 - stats.resolved)}</span> milestones close to unlocking — keep going.
            </p>
          </SideCard>
          <SideCard title="Community milestones" icon={<Star className="h-4 w-4 text-amber-500" />}>
            <p className="text-sm text-[var(--dpal-text-secondary)]">Next: &ldquo;Trusted contributor&rdquo; when {Math.max(0, 5 - stats.verified)} more verifications land.</p>
          </SideCard>
          <SideCard title="My badges" icon={<Award className="h-4 w-4 text-violet-500" />}>
            <div className="flex flex-wrap gap-2">
              {['Neighbor', 'Recorder', 'Hope Builder'].map((b) => (
                <span key={b} className="rounded-full bg-[color-mix(in_srgb,#a855f7_12%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-violet-300 ring-1 ring-[color-mix(in_srgb,#a855f7_35%,transparent)]">
                  {b}
                </span>
              ))}
            </div>
          </SideCard>
          <SideCard title="My trust growth" icon={<ShieldCheck className="h-4 w-4 text-[var(--dpal-primary-hover)]" />}>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--dpal-border-strong)]">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--dpal-primary)] to-cyan-500" style={{ width: `${Math.min(100, stats.trustScore)}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--dpal-text-muted)]">Constructive accountability builds confidence over time.</p>
          </SideCard>
        </aside>
      </div>
      <style>{`
        .animate-fade-in { animation: myReportsFade 0.45s ease-out forwards; }
        @keyframes myReportsFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: number | string;
  accent: 'sky' | 'slate' | 'coral' | 'green' | 'cyan' | 'gold';
  icon: React.ReactNode;
}> = ({ label, value, accent, icon }) => {
  const ring =
    accent === 'sky'
      ? 'ring-[color:color-mix(in_srgb,var(--dpal-info)_30%,transparent)]'
      : accent === 'coral'
        ? 'ring-[color:color-mix(in_srgb,#f97316_30%,transparent)]'
        : accent === 'green'
          ? 'ring-[color:color-mix(in_srgb,var(--dpal-success)_30%,transparent)]'
          : accent === 'gold'
            ? 'ring-[color:color-mix(in_srgb,var(--dpal-warning)_30%,transparent)]'
            : accent === 'cyan'
              ? 'ring-[color:color-mix(in_srgb,var(--dpal-primary)_30%,transparent)]'
              : 'ring-[color-mix(in_srgb,var(--dpal-border)_65%,transparent)]';
  return (
    <div className={`rounded-2xl border border-[color-mix(in_srgb,var(--dpal-border)_80%,transparent)] bg-[var(--dpal-card)] p-4 shadow-sm ring-1 ${ring} backdrop-blur-sm`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--dpal-text-muted)]">{label}</span>
        <span className="text-[var(--dpal-text-muted)]">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--dpal-text-primary)]">{value}</p>
    </div>
  );
};

const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: 'status' | 'topic';
}> = ({ label, active, onClick, variant = 'status' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
      active
        ? variant === 'topic'
          ? 'bg-cyan-600 text-white shadow-sm'
          : 'bg-[var(--dpal-info)] text-white shadow-sm'
        : 'bg-[var(--dpal-background-secondary)] text-[var(--dpal-text-secondary)] hover:bg-[var(--dpal-surface-alt)]'
    }`}
  >
    {label}
  </button>
);

const ImpactRow: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--dpal-border)] bg-[var(--dpal-card)] px-4 py-3 shadow-sm">
    <div className="flex items-center gap-2 text-sm text-[var(--dpal-text-secondary)]">
      {icon}
      {label}
    </div>
    <span className="text-lg font-bold text-[var(--dpal-text-primary)]">{value}</span>
  </div>
);

const SideCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="rounded-2xl border border-[color-mix(in_srgb,var(--dpal-border)_90%,transparent)] bg-[var(--dpal-card)] p-4 shadow-sm backdrop-blur-sm">
    <div className="mb-2 flex items-center gap-2">
      {icon}
      <h3 className="text-sm font-bold text-[var(--dpal-text-primary)]">{title}</h3>
    </div>
    {children}
  </div>
);

export default MyReportsList;
