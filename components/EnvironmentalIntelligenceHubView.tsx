import React from 'react';
import { ArrowRight, Activity, Globe, ShieldCheck, Database, Layout, Sparkles } from './icons';
import type { View } from '../App';
import { FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY } from '../utils/appRoutes';
import { DPAL_INFOGRAPHIC_CATEGORY } from '../data/dpalInfographics';
import DpalIntegrationCommandCenter from '../src/components/DpalIntegrationCommandCenter';
import {
  runEnvironmentalHubProbes,
  getHubConnectivityLoadingRows,
  HUB_AUTO_REFRESH_MS,
  type HubConnectivityRow,
} from '../src/services/environmentalHubConnectivity';
import EnvironmentalServiceCard from '../src/features/environmentalIntelligence/shared/EnvironmentalServiceCard';
import type { HubServiceBadge } from '../src/features/environmentalIntelligence/shared/environmentalServiceStatus';

type ProbeToneLevel = HubConnectivityRow['status'];

const HubCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  status: string;
  colorClass: 'sky' | 'emerald' | 'teal' | 'amber';
  bgImageUrl: string;
  onClick: () => void;
  children?: React.ReactNode;
  ctaLabel?: string;
}> = ({ icon, label, subLabel, status, colorClass, bgImageUrl, onClick, children, ctaLabel = 'Open' }) => {
  return (
    <article className="relative flex flex-col items-start p-6 rounded-[1.8rem] dpal-bg-panel border-2 dpal-border-subtle hover:border-[var(--dpal-border-strong)] transition-all group overflow-hidden h-full text-left shadow-xl">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/10 blur-3xl group-hover:bg-${colorClass}-500/20 transition-colors`} />
      <img
        src={encodeURI(bgImageUrl)}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain object-center opacity-100 dpal-bg-deep"
      />

      <div className="relative w-full flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl dpal-bg-deep border dpal-border-emphasis group-hover:border-${colorClass}-500/50 transition-all shadow-lg`}>
          <div className={`text-${colorClass}-400`}>{icon}</div>
        </div>
        <div className="flex items-center space-x-2 bg-[var(--dpal-overlay-soft)] px-3 py-1 rounded-lg border dpal-border-subtle">
          <div className={`w-1.5 h-1.5 rounded-full bg-${colorClass}-500`} />
          <span className={`text-[8px] font-semibold tracking-wide text-${colorClass}-400`}>{status}</span>
        </div>
      </div>

      <h3 className="relative translate-y-2 text-lg font-bold leading-snug tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
        {label}
      </h3>
      <p className="relative mt-5 text-xs leading-relaxed text-slate-200/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">{subLabel}</p>
      {children ? <div className="relative mt-3 flex flex-wrap gap-2">{children}</div> : null}

      <button
        type="button"
        onClick={onClick}
        className="relative mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-500/60 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/55"
      >
        {ctaLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </article>
  );
};

interface EnvironmentalIntelligenceHubViewProps {
  onReturn: () => void;
  onNavigate: (view: View) => void;
}

const latestPackets = [
  { id: 'EP-2049', module: 'Emissions Audit', site: 'Richmond, CA', status: 'Ready to Export' },
  { id: 'EP-2048', module: 'Hazardous Waste Audit', site: 'Portland, OR', status: 'Verification Pending' },
  { id: 'EP-2047', module: 'Fuel Storage Audit', site: 'Long Beach, CA', status: 'Analyst Review' },
];

const workflowSteps = ['Monitor', 'Analyze', 'Audit', 'Verify', 'Export'];

function probeTone(level: ProbeToneLevel): { chip: string; dot: string } {
  if (level === 'ok') return { chip: 'border-emerald-500/40 bg-emerald-900/20 text-emerald-200', dot: 'bg-emerald-400' };
  if (level === 'degraded') return { chip: 'border-amber-500/40 bg-amber-900/20 text-amber-200', dot: 'bg-amber-400' };
  if (level === 'rate_limited')
    return { chip: 'border-violet-500/45 bg-violet-950/35 text-violet-200', dot: 'bg-violet-400 animate-pulse' };
  if (level === 'offline') return { chip: 'border-rose-500/40 bg-rose-900/20 text-rose-200', dot: 'bg-rose-400' };
  return { chip: 'border-slate-500/40 bg-slate-800/40 text-slate-200', dot: 'bg-slate-400 animate-pulse' };
}

function formatProbeDetail(row: HubConnectivityRow): string {
  if (row.status === 'rate_limited' && row.nextRetryAt) {
    const rem = Math.max(0, Math.ceil((row.nextRetryAt.getTime() - Date.now()) / 1000));
    const cacheNote = row.usingCachedResult ? ' Using cached result.' : '';
    const lastOk =
      row.lastSuccessfulAt != null ? ` Last successful check: ${row.lastSuccessfulAt.toLocaleString()}.` : '';
    return `Rate limited HTTP 429 — Retry after: ${rem}s.${cacheNote}${lastOk}`;
  }
  if (row.usingCachedResult && row.lastSuccessfulAt) {
    return `${row.detail} Last successful check: ${row.lastSuccessfulAt.toLocaleString()}.`;
  }
  return row.detail;
}

function levelLabel(row: HubConnectivityRow): string {
  if (row.status === 'ok') return 'OK';
  if (row.status === 'degraded') return 'Degraded';
  if (row.status === 'rate_limited') return 'Rate limited';
  if (row.status === 'offline') return 'Offline';
  return '…';
}

const EnvironmentalIntelligenceHubView: React.FC<EnvironmentalIntelligenceHubViewProps> = ({ onReturn, onNavigate }) => {
  const ENTRY_MODAL_STORAGE_KEY = 'dpal-environmental-hub-entry-seen';
  const [showEntryModal, setShowEntryModal] = React.useState(() => {
    try {
      return localStorage.getItem(ENTRY_MODAL_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const [connectivity, setConnectivity] = React.useState<HubConnectivityRow[]>(() => getHubConnectivityLoadingRows());
  const [lastProbeAt, setLastProbeAt] = React.useState<Date | null>(null);
  const [refreshNotice, setRefreshNotice] = React.useState<string | null>(null);
  const [, setCooldownTick] = React.useState(0);

  const runConnectivityProbes = React.useCallback(async (opts?: { bypassCache?: boolean; bypassCooldown?: boolean }) => {
    const { rows, meta } = await runEnvironmentalHubProbes({
      bypassCache: opts?.bypassCache ?? false,
      bypassCooldown: opts?.bypassCooldown ?? false,
    });
    setConnectivity(rows);
    setRefreshNotice(meta.refreshNotice);
    setLastProbeAt(new Date());
  }, []);

  React.useEffect(() => {
    void runConnectivityProbes({ bypassCache: false });
    const interval = window.setInterval(() => void runConnectivityProbes({ bypassCache: false }), HUB_AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [runConnectivityProbes]);

  React.useEffect(() => {
    const active = connectivity.some((r) => r.status === 'rate_limited' && r.nextRetryAt);
    if (!active) return;
    const id = window.setInterval(() => setCooldownTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [connectivity]);

  const dismissEntryModal = React.useCallback(() => {
    setShowEntryModal(false);
    try {
      localStorage.setItem(ENTRY_MODAL_STORAGE_KEY, '1');
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const refreshedLabel = lastProbeAt
    ? lastProbeAt.toLocaleTimeString([], { hour12: false })
    : '—';

  const okCount = connectivity.filter((c) => c.status === 'ok').length;
  const degradedCount = connectivity.filter((c) => c.status === 'degraded').length;
  const offlineCount = connectivity.filter((c) => c.status === 'offline').length;
  const rateLimitedCount = connectivity.filter((c) => c.status === 'rate_limited').length;

  const hubCop = connectivity.find((c) => c.id === 'copernicus');
  const hubCarb = connectivity.find((c) => c.id === 'carb');
  const hubHealth = connectivity.find((c) => c.id === 'health');
  const lineOk = (row: HubConnectivityRow | undefined) => row?.status === 'ok';
  const lineLabel = (row: HubConnectivityRow | undefined) =>
    !row ? 'Probe pending' : row.status === 'ok' ? 'API path responding' : row.detail;

  const earthObsBadge: HubServiceBadge = lineOk(hubHealth) ? 'Live' : 'Partial';
  const aquaScanBadge: HubServiceBadge = lineOk(hubCop) ? 'Live' : 'Partial';
  const carbAuditBadge: HubServiceBadge = lineOk(hubCarb) ? 'Live' : 'Partial';

  return (
    <div className="animate-fade-in max-w-[1400px] mx-auto px-4 pb-24 font-sans text-slate-900">
      {showEntryModal ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 p-4">
          <div className="w-full max-w-5xl rounded-3xl border dpal-border-subtle dpal-bg-panel-soft p-3 md:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300 mb-2">Environmental Intelligence Hub</p>
            <div className="relative rounded-2xl overflow-hidden border dpal-border-subtle">
              <img
                src="/environmental-intelligence/aqua-scan-hero.png"
                alt="Environmental Intelligence Hub entry visual"
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  dismissEntryModal();
                  onNavigate('environmentalIntelligenceHub');
                }}
                className="rounded-lg border border-cyan-400/60 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-slate-900/85"
              >
                Open Hub Link
              </button>
              <button
                type="button"
                onClick={dismissEntryModal}
                className="rounded-lg border border-emerald-500/60 bg-emerald-900/25 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40"
              >
                Enter Hub
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-6">
        <button
          type="button"
          onClick={onReturn}
          className="mb-4 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back to Home
        </button>
      </div>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-slate-800">{DPAL_INFOGRAPHIC_CATEGORY}</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <HubCard
            icon={<Layout className="w-8 h-8" />}
            label="DPAL story & service maps"
            subLabel="Open the full gallery of DPAL one-pagers: AquaScan, Earth Observation, missions, accountability, enterprise APIs, and more — ready to share with a link."
            status="Shareables"
            colorClass="teal"
            bgImageUrl="/dpal-infographics/environmental-scan-suite.png"
            onClick={() => onNavigate('dpalInfographicsGallery')}
          />
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-800">API connectivity</h2>
            <p className="text-[11px] text-slate-600 mt-1">
              Uses your configured API base (VITE_DPAL_API_BASE_URL / VITE_API_BASE). Staggered probes; cache TTL (host 2m, adapters 10m).
              Auto-refresh every 5 minutes — skips adapters in cooldown.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setRefreshNotice(null);
                void runConnectivityProbes({ bypassCache: true });
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
            >
              Refresh now
            </button>
            {import.meta.env.DEV ? (
              <button
                type="button"
                title="Bypass cooldown and cache (development only)"
                onClick={() => {
                  setRefreshNotice(null);
                  void runConnectivityProbes({ bypassCache: true, bypassCooldown: true });
                }}
                className="rounded-lg border border-amber-600/50 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-950/60"
              >
                Dev: force probes
              </button>
            ) : null}
          </div>
        </div>
        {refreshNotice ? (
          <p className="mb-3 rounded-lg border border-violet-600/40 bg-violet-950/30 px-3 py-2 text-[11px] text-violet-100">
            {refreshNotice}
          </p>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          {connectivity.map((row) => {
            const tone = probeTone(row.status);
            return (
              <article key={row.id} className={`rounded-xl border px-3 py-3 ${tone.chip}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold">{row.label}</p>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`} />
                </div>
                <p className="mt-2 text-xs font-black">{levelLabel(row)}</p>
                <p className="mt-1 text-[10px] leading-snug opacity-90">{formatProbeDetail(row)}</p>
              </article>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 border-t border-slate-200 pt-3">
          <span>
            Summary: <span className="text-emerald-700 font-semibold">{okCount} OK</span>
            {degradedCount ? (
              <>
                {' · '}
                <span className="text-amber-700 font-semibold">{degradedCount} degraded</span>
              </>
            ) : null}
            {rateLimitedCount ? (
              <>
                {' · '}
                <span className="text-violet-700 font-semibold">{rateLimitedCount} rate limited</span>
              </>
            ) : null}
            {offlineCount ? (
              <>
                {' · '}
                <span className="text-rose-700 font-semibold">{offlineCount} offline</span>
              </>
            ) : null}
          </span>
          <span className="text-slate-500">Last check: {refreshedLabel}</span>
        </div>
      </section>

      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base md:text-lg font-bold text-slate-800">Public API Intelligence Layer</h2>
          <p className="mt-1 text-[11px] text-slate-600 max-w-5xl">
            Connect weather, radar, air quality, geocoding, carbon estimates, blockchain verification, and evidence packet previews into DPAL&apos;s live accountability system.
          </p>
        </div>
        <DpalIntegrationCommandCenter hubConnectivityRows={connectivity} />
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-slate-800">Agentic investigations</h2>
        <p className="mt-1 max-w-3xl text-[11px] text-slate-600">
          One place to describe an environmental accountability goal, get a multi-tool plan (water, Earth Observation,
          CARB, evidence), run previews, and queue review — without hunting through the workflow list first.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-3">
          <HubCard
            icon={<Sparkles className="w-8 h-8" />}
            label="Super Agent (Field OS)"
            subLabel="Goal-driven Super Agent planning on top of Field OS workflows — Dry Run friendly, live when adapters are connected."
            status="Command"
            colorClass="teal"
            bgImageUrl="/main-screen/dpal-mission-control-hero.png"
            onClick={() => {
              try {
                sessionStorage.setItem(FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY, '1');
              } catch {
                /* ignore */
              }
              onNavigate('fieldOS');
            }}
          />
        </div>
      </section>

      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">A · Monitoring &amp; Remote Sensing</h2>
        <p className="mt-1 text-xs text-slate-600 max-w-4xl">
          Satellite lanes, water intelligence, forest-risk evidence, and spectral screening — provider summaries reflect hub probes and configured routes (never fabricated counts).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <EnvironmentalServiceCard
            title="Earth Observation"
            subtitle="LEO screening workspace for AOI metrics, comparison basis, limitations, and situation-room handoff."
            badge={earthObsBadge}
            providerSummary={lineLabel(hubHealth)}
            accent="sky"
            watchHint="Watch-style automation runs only after you open the workspace and start a flow."
            onOpenWorkspace={() => onNavigate('earthObservation')}
          />
          <EnvironmentalServiceCard
            title="AquaScan Water Intelligence"
            subtitle="Water extent, flood-risk context, Copernicus MRV compare, and evidence-packet monitoring."
            badge={aquaScanBadge}
            providerSummary={lineLabel(hubCop)}
            accent="sky"
            onOpenWorkspace={() => onNavigate('aquaScanWater')}
          >
            <button
              type="button"
              onClick={() => onNavigate('waterMonitor')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-800 hover:bg-slate-100"
            >
              Water Command Center
            </button>
            <button
              type="button"
              onClick={() => onNavigate('waterOperationsEngine')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-800 hover:bg-slate-100"
            >
              Water Operations Engine
            </button>
            <button
              type="button"
              onClick={() => onNavigate('aqualandWell')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-800 hover:bg-slate-100"
            >
              Aqualand Well
            </button>
          </EnvironmentalServiceCard>
          <EnvironmentalServiceCard
            title="Forest Integrity"
            subtitle="Live GFW + FIRMS + satellite monitoring for forest-risk evidence packets."
            badge="Live"
            providerSummary="Watch DPAL Work available inside — honest GFW / FIRMS / Landsat / GEDI lane states."
            accent="emerald"
            watchHint="Watch DPAL Work runs only on click inside the workspace."
            onOpenWorkspace={() => onNavigate('forestIntegrity')}
            openWorkspaceLabel="Open Forest Integrity"
          >
            <button
              type="button"
              onClick={() => onNavigate('afoluEngine')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-800 hover:bg-slate-100"
            >
              AFOLU / Forest Carbon
            </button>
          </EnvironmentalServiceCard>
          <EnvironmentalServiceCard
            title="Hyperspectral Plastic Watch"
            subtitle="EMIT + PACE-ready workflow for possible plastic-risk anomaly review."
            badge="Preview"
            providerSummary="PACE/EMIT lanes remain preview until narrow-band products are wired; no plastic detection claims."
            accent="sky"
            watchHint="Evidence-support only — field validation required."
            onOpenWorkspace={() => onNavigate('hyperspectralPlasticWatch')}
            openWorkspaceLabel="Open Plastic Watch"
          />
          <EnvironmentalServiceCard
            title="Air Quality Control"
            subtitle="OpenAQ-based CO₂, CH₄, NO₂, and AQI readings for regional context."
            badge="Partial"
            providerSummary="OpenAQ availability varies by region and upstream health."
            accent="sky"
            onOpenWorkspace={() => onNavigate('airQualityMonitor')}
          />
          <EnvironmentalServiceCard
            title="Ecological Conservation"
            subtitle="Landsat 9 OLI-2 foliage and habitat monitoring with explicit demo/live labeling."
            badge="Partial"
            providerSummary="Uses /api/ecology when available on your configured API host."
            accent="emerald"
            onOpenWorkspace={() => onNavigate('ecologicalConservation')}
          />
          <EnvironmentalServiceCard
            title="Global Environmental Signals"
            subtitle="USGS, NASA EONET, OpenAQ, hazard feeds, and mission conversion entry points."
            badge="Partial"
            providerSummary={lineLabel(connectivity.find((c) => c.id === 'signals'))}
            accent="amber"
            onOpenWorkspace={() => onNavigate('globalSignals')}
          />
        </div>
      </section>

      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">B · Carbon &amp; MRV</h2>
        <p className="mt-1 text-xs text-slate-600 max-w-4xl">Carbon intelligence, AFOLU workflows, impact units, and AOI tools — each module keeps its own validator gates.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <EnvironmentalServiceCard
            title="Carbon Intelligence &amp; MRV"
            subtitle="Carbon overview, satellite reads, validator queue, and marketplace handoff when live."
            badge="Partial"
            providerSummary="Requires live /api/carbon routes on your configured API host for full depth."
            accent="teal"
            onOpenWorkspace={() => onNavigate('dpalCarbon')}
          />
          <EnvironmentalServiceCard
            title="AFOLU / Forest Carbon"
            subtitle="Investor-facing forest carbon command center and mission launch flows (local-first drafts)."
            badge="Partial"
            providerSummary="Project records may be browser-local until synced to a configured backend."
            accent="emerald"
            onOpenWorkspace={() => onNavigate('afoluEngine')}
          />
          <EnvironmentalServiceCard
            title="Verified Impact Units · VIU readiness"
            subtitle="Offsets, retirement flows, and buyer education — demo-safe when APIs are cold."
            badge="Partial"
            providerSummary="Portfolio views may combine API + local demo purchases per module rules."
            accent="teal"
            onOpenWorkspace={() => onNavigate('offsetMarketplace')}
          />
          <EnvironmentalServiceCard
            title="Project boundary / baseline tools"
            subtitle="Earth Observation AOI presets, date windows, and scan status for boundary context."
            badge={earthObsBadge}
            providerSummary="Use the Earth Observation workspace for geospatial baseline framing."
            accent="sky"
            onOpenWorkspace={() => onNavigate('earthObservation')}
            openWorkspaceLabel="Open Earth Observation"
          />
        </div>
      </section>

      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">C · Compliance &amp; Audits</h2>
        <p className="mt-1 text-xs text-slate-600 max-w-4xl">Regulatory-grade audit workspaces — always disclose dataset mode (live vs imported vs preview).</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <EnvironmentalServiceCard
            title="CARB Emissions Audit"
            subtitle="Facility emissions comparison, pollutant reconciliation, and audit packet drafting."
            badge={carbAuditBadge}
            providerSummary={lineLabel(hubCarb)}
            accent="emerald"
            onOpenWorkspace={() => onNavigate('carbEmissionsAudit')}
          />
          <EnvironmentalServiceCard
            title="Emissions Integrity Audit (EIAS)"
            subtitle="Facility intake, scope periods, ADI, and evidence packet with Prisma-backed save when deployed."
            badge="Partial"
            providerSummary="Save/list requires /api/emissions-audit on a host with DpalUser JWT unless ported."
            accent="emerald"
            onOpenWorkspace={() => onNavigate('emissionsIntegrityAudit')}
          />
          <EnvironmentalServiceCard
            title="Hazardous Waste Integrity Audit"
            subtitle="EPA/RCRA-linked compliance audit and discrepancy evidence."
            badge="Partial"
            providerSummary="Dataset readiness depends on imported or live hazardous-waste adapters."
            accent="emerald"
            onOpenWorkspace={() => onNavigate('hazardousWasteAudit')}
          />
          <EnvironmentalServiceCard
            title="EPA Live GHG Intelligence"
            subtitle="Official U.S. EPA Envirofacts / GHGRP facility baselines for investigations."
            badge="Live"
            providerSummary="Public EPA feeds — not DPAL-authored facility claims."
            accent="sky"
            onOpenWorkspace={() => onNavigate('epaGhgLive')}
          />
          <EnvironmentalServiceCard
            title="EPA / Envirofacts Geo Intelligence"
            subtitle="Geographic search and map dashboard for public-data baselines."
            badge="Live"
            providerSummary="Envirofacts queries are rate-sensitive; respect upstream limits."
            accent="sky"
            onOpenWorkspace={() => onNavigate('envirofactsGeoIntelligence')}
          />
          <EnvironmentalServiceCard
            title="Fuel Storage Integrity Audit"
            subtitle="Preview workspace for storage-throughput reconciliation and leak-risk signals."
            badge="Preview"
            providerSummary="Preview-safe — not a certified tank inspection."
            accent="amber"
            onOpenWorkspace={() => onNavigate('previewFuelStorageAudit')}
          />
        </div>
      </section>

      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">D · Evidence &amp; Response</h2>
        <p className="mt-1 text-xs text-slate-600 max-w-4xl">Export, anchor, and operationalize environmental evidence without bypassing human review gates.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <EnvironmentalServiceCard
            title="Evidence Packets"
            subtitle="Structured exports, hashes, and preview viewers for audit-ready bundles."
            badge="Partial"
            providerSummary="Open the packet viewer or finish packets inside each environmental workspace."
            accent="teal"
            onOpenWorkspace={() => onNavigate('previewEvidencePacket')}
            openWorkspaceLabel="Open packet viewer"
          />
          <EnvironmentalServiceCard
            title="Situation Room"
            subtitle="Collaborative incident rooms with media controls and handoff from Earth Observation and water flows."
            badge="Live"
            providerSummary="Uses your configured filing API for authenticated rooms."
            accent="sky"
            onOpenWorkspace={() => onNavigate('situationRoom')}
          />
          <EnvironmentalServiceCard
            title="Field Validation · Field OS"
            subtitle="Super Agent planning, dry runs, and field workflows with explicit safe-automation limits."
            badge="Partial"
            providerSummary="Navigator + Field OS — no auto-publish or auto-verify."
            accent="emerald"
            onOpenWorkspace={() => {
              try {
                sessionStorage.setItem(FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY, '1');
              } catch {
                /* ignore */
              }
              onNavigate('fieldOS');
            }}
            openWorkspaceLabel="Open Field OS"
          />
          <EnvironmentalServiceCard
            title="Cleanup / Mission Creation"
            subtitle="Missions hub for marketplace, emergency, and validator-aligned work."
            badge="Partial"
            providerSummary="Missions V2 routes — separate from live filing API unless bridged."
            accent="amber"
            onOpenWorkspace={() => onNavigate('missionMarketplace')}
            openWorkspaceLabel="Open missions hub"
          />
        </div>
      </section>
      <section className="mb-8 rounded-3xl border dpal-border-subtle dpal-bg-panel-soft p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-100">Example evidence packets</h2>
            <p className="text-[10px] text-slate-500 mt-1">Illustrative samples — open audits above to work with real data.</p>
          </div>
          <button type="button" onClick={() => onNavigate('previewEvidencePacket')} className="rounded-lg border border-slate-500/60 bg-black/30 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-black/50 shrink-0">
            Open Packet Viewer
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {latestPackets.map((packet) => (
            <article key={packet.id} className="rounded-xl border dpal-border-subtle bg-black/25 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-white">{packet.id}</p>
                <span className={`text-[10px] rounded-full px-2 py-0.5 border ${
                  packet.status === 'Ready to Export'
                    ? 'text-emerald-200 border-emerald-500/50 bg-emerald-900/20'
                    : packet.status === 'Verification Pending'
                    ? 'text-amber-200 border-amber-500/50 bg-amber-900/20'
                    : 'text-cyan-200 border-cyan-500/50 bg-cyan-900/20'
                }`}>
                  {packet.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-300">{packet.module}</p>
              <p className="mt-1 text-xs text-slate-400">{packet.site}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border dpal-border-subtle dpal-bg-panel-soft p-5 md:p-7">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Environmental Intelligence Hub</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white">Environmental Intelligence Hub</h1>
        <p className="mt-2 text-sm md:text-base text-slate-200">
          Monitor conditions, verify claims, run audits, and generate evidence-backed environmental reports.
        </p>

        <section className="mt-5 rounded-xl border dpal-border-subtle bg-black/25 p-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-300 mb-2">Workflow</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {workflowSteps.map((step, idx) => (
              <React.Fragment key={step}>
                <span className="rounded-md border border-slate-500/60 bg-black/35 px-2.5 py-1 text-slate-100">{step}</span>
                {idx < workflowSteps.length - 1 ? <span className="text-slate-400">→</span> : null}
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate('emissionsIntegrityAudit')} className="rounded-lg border border-emerald-500/60 bg-emerald-900/25 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40">
            Start Audit
          </button>
          <button type="button" onClick={() => onNavigate('earthObservation')} className="rounded-lg border border-cyan-500/60 bg-cyan-900/25 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-900/40">
            Run Monitoring
          </button>
          <button type="button" onClick={() => onNavigate('globalSignals')} className="rounded-lg border border-amber-500/60 bg-amber-900/25 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-900/40">
            View Alerts
          </button>
        </section>

        <section className="mt-4 rounded-xl border dpal-border-subtle bg-black/25 px-3 py-2.5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Connectivity strip above reflects your current API base — not simulated totals.
          </div>
          <div className="text-slate-500">Last probe: {refreshedLabel}</div>
        </section>
      </section>
    </div>
  );
};

export default EnvironmentalIntelligenceHubView;
