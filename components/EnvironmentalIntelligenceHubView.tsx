import React from 'react';
import { ArrowRight, Activity, Globe, ShieldCheck, Waves, Database, Layout, Sparkles } from './icons';
import type { View } from '../App';
import { API_ROUTES, apiUrl } from '../constants';
import { FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY } from '../utils/appRoutes';
import { DPAL_INFOGRAPHIC_CATEGORY } from '../data/dpalInfographics';
import DpalIntegrationCommandCenter from '../src/components/DpalIntegrationCommandCenter';

const CONNECTIVITY_REFRESH_MS = 60_000;

type ProbeLevel = 'loading' | 'ok' | 'degraded' | 'offline';

type ConnectivityProbe = {
  id: string;
  label: string;
  level: ProbeLevel;
  detail: string;
};

async function readJsonUnknown(res: Response): Promise<unknown | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

const HubCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  status: string;
  colorClass: 'sky' | 'emerald' | 'teal' | 'amber';
  bgImageUrl: string;
  onClick: () => void;
  children?: React.ReactNode;
}> = ({ icon, label, subLabel, status, colorClass, bgImageUrl, onClick, children }) => {
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
        Open
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

function probeTone(level: ProbeLevel): { chip: string; dot: string } {
  if (level === 'ok') return { chip: 'border-emerald-500/40 bg-emerald-900/20 text-emerald-200', dot: 'bg-emerald-400' };
  if (level === 'degraded') return { chip: 'border-amber-500/40 bg-amber-900/20 text-amber-200', dot: 'bg-amber-400' };
  if (level === 'offline') return { chip: 'border-rose-500/40 bg-rose-900/20 text-rose-200', dot: 'bg-rose-400' };
  return { chip: 'border-slate-500/40 bg-slate-800/40 text-slate-200', dot: 'bg-slate-400 animate-pulse' };
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

  const [connectivity, setConnectivity] = React.useState<ConnectivityProbe[]>(() => [
    { id: 'health', label: 'API host', level: 'loading', detail: 'Checking…' },
    { id: 'copernicus', label: 'Copernicus proxy', level: 'loading', detail: 'Checking…' },
    { id: 'carb', label: 'CARB data module', level: 'loading', detail: 'Checking…' },
    { id: 'signals', label: 'Global signals API', level: 'loading', detail: 'Checking…' },
    { id: 'ai', label: 'Server AI', level: 'loading', detail: 'Checking…' },
  ]);
  const [lastProbeAt, setLastProbeAt] = React.useState<Date | null>(null);

  const runConnectivityProbes = React.useCallback(async () => {
    const labels: Record<string, string> = {
      health: 'API host',
      copernicus: 'Copernicus proxy',
      carb: 'CARB data module',
      signals: 'Global signals API',
      ai: 'Server AI',
    };

    async function probeOne(
      id: keyof typeof labels,
      url: string,
      interpret: (res: Response, json: unknown) => Pick<ConnectivityProbe, 'level' | 'detail'>,
    ): Promise<ConnectivityProbe> {
      const label = labels[id];
      try {
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 14_000);
        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
        window.clearTimeout(timer);
        const json = await readJsonUnknown(res);
        const { level, detail } = interpret(res, json);
        return { id, label, level, detail };
      } catch {
        return { id, label, level: 'offline', detail: 'Unreachable or timed out' };
      }
    }

    const rows = await Promise.all([
      probeOne('health', apiUrl('/health'), (res, json) => {
        if (!res.ok) return { level: 'offline', detail: `HTTP ${res.status}` };
        const o = json as { ok?: boolean } | null;
        if (o?.ok === false) return { level: 'degraded', detail: 'Host responded but reports not ready' };
        return { level: 'ok', detail: 'Reachable' };
      }),
      probeOne('copernicus', apiUrl(API_ROUTES.COPERNICUS_STATUS), (res, json) => {
        if (!res.ok) return { level: 'offline', detail: `HTTP ${res.status}` };
        const o = json as { ok?: boolean; configured?: boolean; message?: string } | null;
        if (o?.ok === false) return { level: 'degraded', detail: o.message ?? 'Proxy error' };
        if (o?.configured === false) {
          return {
            level: 'degraded',
            detail: 'Proxy up — add Copernicus OAuth credentials on the API server for live Sentinel compares',
          };
        }
        return { level: 'ok', detail: o?.message ?? 'Reachable' };
      }),
      probeOne('carb', apiUrl(API_ROUTES.CARB_DATA_HEALTH), (res, json) => {
        if (!res.ok) return { level: 'offline', detail: `HTTP ${res.status}` };
        const o = json as { ok?: boolean } | null;
        if (o?.ok === false) return { level: 'degraded', detail: 'Module reachable but not healthy' };
        return { level: 'ok', detail: 'Reachable' };
      }),
      probeOne('signals', apiUrl(API_ROUTES.SIGNALS_STATS), (res, json) => {
        if (!res.ok) return { level: 'offline', detail: `HTTP ${res.status}` };
        const o = json as { ok?: boolean; mode?: string } | null;
        if (o?.ok === false) return { level: 'degraded', detail: 'Signals route error' };
        const stub = o?.mode === 'in_memory_stub';
        return {
          level: 'ok',
          detail: stub ? 'Reachable (demo seed — wire feeds for production)' : 'Reachable',
        };
      }),
      probeOne('ai', apiUrl(API_ROUTES.AI_STATUS), (res, json) => {
        if (!res.ok) return { level: 'offline', detail: `HTTP ${res.status}` };
        const o = json as { ok?: boolean; gemini?: boolean } | null;
        if (o?.ok === false) return { level: 'degraded', detail: 'AI status unavailable' };
        if (o?.gemini === false) return { level: 'degraded', detail: 'Reachable — GEMINI_API_KEY not set on server' };
        return { level: 'ok', detail: 'Gemini proxy ready' };
      }),
    ]);

    setConnectivity(rows);
    setLastProbeAt(new Date());
  }, []);

  React.useEffect(() => {
    void runConnectivityProbes();
    const interval = window.setInterval(() => void runConnectivityProbes(), CONNECTIVITY_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [runConnectivityProbes]);

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

  const okCount = connectivity.filter((c) => c.level === 'ok').length;
  const degradedCount = connectivity.filter((c) => c.level === 'degraded').length;
  const offlineCount = connectivity.filter((c) => c.level === 'offline').length;

  return (
    <div className="animate-fade-in max-w-[1400px] mx-auto px-4 pb-24 font-mono">
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
          className="mb-4 rounded-lg border dpal-border-subtle bg-black/20 px-3 py-1.5 text-xs text-slate-200 hover:bg-black/35"
        >
          Back to Home
        </button>
      </div>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-cyan-200">{DPAL_INFOGRAPHIC_CATEGORY}</h2>
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

      <section className="mb-8 rounded-3xl border dpal-border-subtle dpal-bg-panel-soft p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base md:text-lg font-bold text-cyan-200">API connectivity</h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Uses your configured API base (<span className="text-slate-300">VITE_DPAL_API_BASE_URL</span> /{' '}
              <span className="text-slate-300">VITE_API_BASE</span>). Refreshes about every minute.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runConnectivityProbes()}
            className="rounded-lg border border-slate-500/60 bg-black/30 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-black/50 shrink-0"
          >
            Refresh now
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          {connectivity.map((row) => {
            const tone = probeTone(row.level);
            const levelLabel =
              row.level === 'ok' ? 'OK' : row.level === 'degraded' ? 'Degraded' : row.level === 'offline' ? 'Offline' : '…';
            return (
              <article key={row.id} className={`rounded-xl border px-3 py-3 ${tone.chip}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold">{row.label}</p>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`} />
                </div>
                <p className="mt-2 text-xs font-black">{levelLabel}</p>
                <p className="mt-1 text-[10px] leading-snug opacity-90">{row.detail}</p>
              </article>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 border-t dpal-border-subtle pt-3">
          <span>
            Summary: <span className="text-emerald-300">{okCount} OK</span>
            {degradedCount ? (
              <>
                {' · '}
                <span className="text-amber-300">{degradedCount} degraded</span>
              </>
            ) : null}
            {offlineCount ? (
              <>
                {' · '}
                <span className="text-rose-300">{offlineCount} offline</span>
              </>
            ) : null}
          </span>
          <span className="text-slate-500">Last check: {refreshedLabel}</span>
        </div>
      </section>

      <section className="mb-10 rounded-3xl border dpal-border-subtle dpal-bg-panel-soft p-5 md:p-6">
        <div className="mb-4">
          <h2 className="text-base md:text-lg font-bold text-cyan-200">Public API Intelligence Layer</h2>
          <p className="mt-1 text-[11px] text-slate-400 max-w-5xl">
            Connect weather, radar, air quality, geocoding, carbon estimates, blockchain verification, and evidence packet previews into DPAL&apos;s live accountability system.
          </p>
        </div>
        <DpalIntegrationCommandCenter />
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-cyan-200">Agentic investigations</h2>
        <p className="mt-1 max-w-3xl text-[11px] text-slate-400">
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

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-cyan-200">Monitoring &amp; Remote Sensing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard icon={<Globe className="w-8 h-8" />} label="Earth Observation" subLabel="LEO satellite analysis for environment and civic signals." status="Workspace" colorClass="sky" bgImageUrl="/environmental-intelligence/water-satellite-monitor-main.png" onClick={() => onNavigate('earthObservation')} />
          <HubCard
            icon={<Waves className="w-8 h-8" />}
            label="DPAL Water Command Center"
            subLabel="Satellite MRV, water evidence packets, validator review, and operations dashboard."
            status="Workspace"
            colorClass="sky"
            bgImageUrl="/environmental-intelligence/water-satellite-monitor-main.png"
            onClick={() => onNavigate('waterMonitor')}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('aquaScanWater');
              }}
              className="rounded-md border border-slate-500/60 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-slate-100"
            >
              Open AquaScan MRV
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('waterOperationsEngine');
              }}
              className="rounded-md border border-slate-500/60 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-slate-100"
            >
              Open Water Operations Engine
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('aqualandWell');
              }}
              className="rounded-md border border-cyan-400/60 bg-cyan-950/35 px-2.5 py-1 text-[10px] font-semibold text-cyan-100"
            >
              Open Aqualand Well
            </button>
          </HubCard>
          <HubCard icon={<Activity className="w-8 h-8" />} label="Air Quality Control" subLabel="OpenAQ-based CO2, CH4, NO2, and AQI live readings." status="Workspace" colorClass="sky" bgImageUrl="/environmental-intelligence/air-quality-control-main.png" onClick={() => onNavigate('airQualityMonitor')} />
          <HubCard icon={<ShieldCheck className="w-8 h-8" />} label="Forest Integrity" subLabel="AFOLU projects, monitoring, mission evidence, and buyer-grade reports." status="Workspace" colorClass="emerald" bgImageUrl="/environmental-intelligence/forest-integrity-main.png" onClick={() => onNavigate('afoluEngine')} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-emerald-200">Carbon &amp; MRV</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard icon={<Globe className="w-8 h-8" />} label="Carbon Intelligence & MRV" subLabel="Includes Carbon Overview, MRV Calculations, Verification, and VIU / Impact Units." status="MRV" colorClass="teal" bgImageUrl="/environmental-intelligence/carbon-intelligence-mrv-main.png" onClick={() => onNavigate('dpalCarbon')} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-emerald-200">Compliance &amp; Audits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard
            icon={<Database className="w-8 h-8" />}
            label="EPA Live GHG Intelligence"
            subLabel="Official U.S. EPA Envirofacts / GHGRP reported facility data baseline for DPAL investigations."
            status="Official Data"
            colorClass="sky"
            bgImageUrl="/environmental-intelligence/carbon-intelligence-mrv-main.png"
            onClick={() => onNavigate('epaGhgLive')}
          />
          <HubCard
            icon={<Database className="w-8 h-8" />}
            label="Envirofacts Geo Intelligence"
            subLabel="Live EPA Envirofacts geographic search and map dashboard for public-data baseline investigations."
            status="Official Data"
            colorClass="sky"
            bgImageUrl="/environmental-intelligence/air-quality-control-main.png"
            onClick={() => onNavigate('envirofactsGeoIntelligence')}
          />
          <HubCard
            icon={<ShieldCheck className="w-8 h-8" />}
            label="Emissions Audit"
            subLabel="General emissions integrity checks with CARB California deep-link mode."
            status="Audit"
            colorClass="emerald"
            bgImageUrl="/environmental-intelligence/emissions-audit-main.png"
            onClick={() => onNavigate('emissionsIntegrityAudit')}
          >
            <button type="button" onClick={(e) => { e.stopPropagation(); onNavigate('emissionsIntegrityAudit'); }} className="rounded-md border border-slate-500/60 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-slate-100">General</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onNavigate('carbEmissionsAudit'); }} className="rounded-md border border-slate-500/60 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-slate-100">CARB California</button>
          </HubCard>
          <HubCard icon={<ShieldCheck className="w-8 h-8" />} label="Hazardous Waste Integrity Audit" subLabel="RCRA facility reporting, permit, compliance, and waste activity review." status="Audit" colorClass="emerald" bgImageUrl="/environmental-intelligence/emissions-audit-carb-main.png" onClick={() => onNavigate('hazardousWasteAudit')} />
          <HubCard icon={<Database className="w-8 h-8" />} label="Fuel Storage Integrity Audit" subLabel="Preview workspace for storage-throughput reconciliation and leak risk signals." status="Preview" colorClass="amber" bgImageUrl="/environmental-intelligence/emissions-audit-carb-main.png" onClick={() => onNavigate('previewFuelStorageAudit')} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-emerald-200">Ecosystem &amp; Impact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard icon={<Globe className="w-8 h-8" />} label="Ecological Conservation" subLabel="Landsat 9 OLI-2 foliage and habitat monitoring." status="Impact" colorClass="emerald" bgImageUrl="/environmental-intelligence/forest-integrity-main.png" onClick={() => onNavigate('ecologicalConservation')} />
          <HubCard icon={<Globe className="w-8 h-8" />} label="Impact Dashboard" subLabel="Climate projects and outcomes you can follow with confidence." status="Impact" colorClass="emerald" bgImageUrl="/environmental-intelligence/carbon-intelligence-mrv-main.png" onClick={() => onNavigate('offsetMarketplace')} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-amber-200">Signals &amp; Intelligence</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard icon={<Activity className="w-8 h-8" />} label="Global Environmental Signals" subLabel="USGS, NASA EONET, OpenAQ, live hazard feeds, and mission conversion." status="Signals" colorClass="amber" bgImageUrl="/environmental-intelligence/air-quality-control-main.png" onClick={() => onNavigate('globalSignals')} />
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
