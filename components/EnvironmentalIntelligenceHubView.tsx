import React from 'react';
import { ArrowRight, Activity, Globe, ShieldCheck, Waves, Database } from './icons';
import type { View } from '../App';

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
          <div className={`w-1.5 h-1.5 rounded-full bg-${colorClass}-500 animate-pulse`} />
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

const EnvironmentalIntelligenceHubView: React.FC<EnvironmentalIntelligenceHubViewProps> = ({ onReturn, onNavigate }) => {
  const ENTRY_MODAL_STORAGE_KEY = 'dpal-environmental-hub-entry-seen';
  const [showEntryModal, setShowEntryModal] = React.useState(() => {
    try {
      return localStorage.getItem(ENTRY_MODAL_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [liveMockMode, setLiveMockMode] = React.useState(true);
  const [lastRefreshed, setLastRefreshed] = React.useState(() => new Date());
  const [refreshTick, setRefreshTick] = React.useState(0);
  const [dynamicMetrics, setDynamicMetrics] = React.useState({
    monitoredSites: 1248,
    activeAlerts: 37,
    highRiskFacilities: 9,
    evidencePacketsReady: 28,
    importedDatasets: 54,
    evidencePacketsTotal: 216,
  });

  React.useEffect(() => {
    if (!liveMockMode) return;
    const nextMs = 10000 + Math.floor(Math.random() * 5000);
    const timer = window.setTimeout(() => {
      setDynamicMetrics((prev) => {
        const nextAlerts = Math.max(0, prev.activeAlerts + (Math.random() < 0.5 ? -1 : 1));
        const nextEvidenceReady = Math.max(0, prev.evidencePacketsReady + (Math.random() < 0.5 ? -1 : 1));
        const highRiskDeltaRoll = Math.random();
        const highRiskDelta = highRiskDeltaRoll < 0.2 ? -1 : highRiskDeltaRoll > 0.8 ? 1 : 0;
        const nextHighRisk = Math.max(0, prev.highRiskFacilities + highRiskDelta);
        return {
          ...prev,
          activeAlerts: nextAlerts,
          highRiskFacilities: nextHighRisk,
          evidencePacketsReady: nextEvidenceReady,
          evidencePacketsTotal: Math.max(0, prev.evidencePacketsTotal + (Math.random() < 0.35 ? 1 : 0)),
        };
      });
      setLastRefreshed(new Date());
      setRefreshTick((v) => v + 1);
    }, nextMs);
    return () => window.clearTimeout(timer);
  }, [liveMockMode, refreshTick]);

  const refreshedTime = lastRefreshed.toLocaleTimeString([], { hour12: false });

  const dismissEntryModal = React.useCallback(() => {
    setShowEntryModal(false);
    try {
      localStorage.setItem(ENTRY_MODAL_STORAGE_KEY, '1');
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const commandStripLive = [
    {
      label: 'Monitored Sites',
      value: dynamicMetrics.monitoredSites.toLocaleString(),
      delta: '+24',
      status: 'Live Sync',
      tone: 'neutral' as const,
    },
    {
      label: 'Active Alerts',
      value: String(dynamicMetrics.activeAlerts),
      delta: dynamicMetrics.activeAlerts >= 37 ? '+1' : '-1',
      status: 'Queue Active',
      tone: 'warn' as const,
    },
    {
      label: 'High Risk Facilities',
      value: String(dynamicMetrics.highRiskFacilities),
      delta: dynamicMetrics.highRiskFacilities > 9 ? '+1' : dynamicMetrics.highRiskFacilities < 9 ? '-1' : '0',
      status: 'Escalated',
      tone: 'warn' as const,
    },
    {
      label: 'Evidence Packets',
      value: String(dynamicMetrics.evidencePacketsTotal),
      delta: dynamicMetrics.evidencePacketsReady >= 28 ? '+1' : '-1',
      status: 'Ready',
      tone: 'ok' as const,
    },
    {
      label: 'Imported Datasets',
      value: String(dynamicMetrics.importedDatasets),
      delta: '+0',
      status: 'Validated',
      tone: 'neutral' as const,
    },
  ];

  const livePanelDynamic = [
    { label: 'High Risk Facilities', value: String(dynamicMetrics.highRiskFacilities), tone: 'text-amber-300' },
    { label: 'Active Alerts', value: String(dynamicMetrics.activeAlerts), tone: 'text-rose-300' },
    { label: 'Evidence Packets Ready', value: String(dynamicMetrics.evidencePacketsReady), tone: 'text-emerald-300' },
    { label: 'Dataset Status', value: `${dynamicMetrics.importedDatasets} / ${dynamicMetrics.importedDatasets} Online`, tone: 'text-cyan-300' },
  ];

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
        <h2 className="text-base md:text-lg font-bold text-cyan-200">Monitoring &amp; Remote Sensing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard icon={<Globe className="w-8 h-8" />} label="Earth Observation" subLabel="LEO satellite analysis for environment and civic signals." status="Monitoring" colorClass="sky" bgImageUrl="/environmental-intelligence/water-satellite-monitor-main.png" onClick={() => onNavigate('earthObservation')} />
          <HubCard icon={<Waves className="w-8 h-8" />} label="Water Satellite Monitor" subLabel="Live SMAP, SWOT, GRACE-FO, GIBS, and Copernicus readings." status="Monitoring" colorClass="sky" bgImageUrl="/environmental-intelligence/water-satellite-monitor-main.png" onClick={() => onNavigate('waterMonitor')} />
          <HubCard icon={<Activity className="w-8 h-8" />} label="Air Quality Control" subLabel="OpenAQ-based CO2, CH4, NO2, and AQI live readings." status="Monitoring" colorClass="sky" bgImageUrl="/environmental-intelligence/air-quality-control-main.png" onClick={() => onNavigate('airQualityMonitor')} />
          <HubCard icon={<ShieldCheck className="w-8 h-8" />} label="Forest Integrity" subLabel="AFOLU projects, monitoring, mission evidence, and buyer-grade reports." status="Monitoring" colorClass="emerald" bgImageUrl="/environmental-intelligence/forest-integrity-main.png" onClick={() => onNavigate('afoluEngine')} />
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
            <button type="button" onClick={() => onNavigate('emissionsIntegrityAudit')} className="rounded-md border border-slate-500/60 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-slate-100">General</button>
            <button type="button" onClick={() => onNavigate('carbEmissionsAudit')} className="rounded-md border border-slate-500/60 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-slate-100">CARB California</button>
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

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {commandStripLive.map((item) => (
          <article key={item.label} className="rounded-2xl border dpal-border-subtle dpal-bg-panel-soft p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-300">{item.label}</p>
            <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className={`text-xs font-semibold ${
                item.tone === 'ok' ? 'text-emerald-300' : item.tone === 'warn' ? 'text-amber-300' : 'text-slate-300'
              }`}>{item.delta}</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-500/60 bg-black/25 px-2 py-0.5 text-[10px] text-slate-200">
                <span className={`w-1.5 h-1.5 rounded-full ${liveMockMode ? 'bg-cyan-300 animate-pulse' : 'bg-slate-500'}`} />
                {item.status}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="mb-8 rounded-3xl border dpal-border-subtle dpal-bg-panel-soft p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-base md:text-lg font-bold text-slate-100">Latest Evidence Packets</h2>
          <button type="button" onClick={() => onNavigate('previewEvidencePacket')} className="rounded-lg border border-slate-500/60 bg-black/30 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-black/50">
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

        <section className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {livePanelDynamic.map((item) => (
            <article key={item.label} className="rounded-xl border dpal-border-subtle bg-black/30 px-3 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-300">{item.label}</p>
              <p className={`mt-1 text-sm md:text-base font-bold ${item.tone}`}>{item.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 rounded-xl border dpal-border-subtle bg-black/25 p-3">
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
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-500/60 bg-black/35 px-3 py-2 text-xs text-slate-200">
            <span className={`w-2 h-2 rounded-full ${liveMockMode ? 'bg-emerald-300 animate-pulse' : 'bg-slate-500'}`} />
            Live Mock Mode
            <button
              type="button"
              onClick={() => setLiveMockMode((v) => !v)}
              className={`rounded-md border px-2 py-0.5 font-semibold ${liveMockMode ? 'border-emerald-500/60 bg-emerald-900/25 text-emerald-100' : 'border-slate-500/60 bg-slate-800/40 text-slate-200'}`}
            >
              {liveMockMode ? 'On' : 'Off'}
            </button>
          </div>
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
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
            Live mock refresh · {liveMockMode ? 'updated just now' : 'paused'}
          </div>
          <div>Last refreshed: {refreshedTime}</div>
          <div className="text-slate-400">Preview data — not connected to live backend.</div>
        </section>
      </section>
    </div>
  );
};

export default EnvironmentalIntelligenceHubView;
