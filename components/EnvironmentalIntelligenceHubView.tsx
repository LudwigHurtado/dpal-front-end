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

const commandStrip = [
  { label: 'Monitored Sites', value: '1,248' },
  { label: 'Active Alerts', value: '37' },
  { label: 'High Risk Facilities', value: '9' },
  { label: 'Evidence Packets', value: '216' },
  { label: 'Imported Datasets', value: '54' },
];

const EnvironmentalIntelligenceHubView: React.FC<EnvironmentalIntelligenceHubViewProps> = ({ onReturn, onNavigate }) => {
  return (
    <div className="animate-fade-in max-w-[1400px] mx-auto px-4 pb-24 font-mono">
      <div className="mb-6">
        <button
          type="button"
          onClick={onReturn}
          className="mb-4 rounded-lg border dpal-border-subtle bg-black/20 px-3 py-1.5 text-xs text-slate-200 hover:bg-black/35"
        >
          Back to Home
        </button>
        <div className="rounded-3xl border dpal-border-subtle dpal-bg-panel-soft p-5 md:p-7">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Environmental Intelligence Hub</p>
          <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white">Environmental Intelligence Hub</h1>
          <p className="mt-2 text-sm md:text-base text-slate-200">
            Monitor conditions, verify claims, run audits, and generate evidence-backed environmental reports.
          </p>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {commandStrip.map((item) => (
          <article key={item.label} className="rounded-2xl border dpal-border-subtle dpal-bg-panel-soft p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-300">{item.label}</p>
            <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-cyan-200">Monitoring &amp; Remote Sensing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard icon={<Globe className="w-8 h-8" />} label="Earth Observation" subLabel="LEO satellite analysis for environment and civic signals." status="Monitoring" colorClass="sky" bgImageUrl="/main-screen/satellite-water-analysis.png" onClick={() => onNavigate('earthObservation')} />
          <HubCard icon={<Waves className="w-8 h-8" />} label="Water Satellite Monitor" subLabel="Live SMAP, SWOT, GRACE-FO, GIBS, and Copernicus readings." status="Monitoring" colorClass="sky" bgImageUrl="/main-screen/water-project-monitoring.png" onClick={() => onNavigate('waterMonitor')} />
          <HubCard icon={<Activity className="w-8 h-8" />} label="Air Quality Control" subLabel="OpenAQ-based CO2, CH4, NO2, and AQI live readings." status="Monitoring" colorClass="sky" bgImageUrl="/main-screen/satellite-water-analysis.png" onClick={() => onNavigate('airQualityMonitor')} />
          <HubCard icon={<ShieldCheck className="w-8 h-8" />} label="Forest Integrity" subLabel="AFOLU projects, monitoring, mission evidence, and buyer-grade reports." status="Monitoring" colorClass="emerald" bgImageUrl="/main-screen/land-mineral-monitoring.png" onClick={() => onNavigate('afoluEngine')} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-emerald-200">Carbon &amp; MRV</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard icon={<Globe className="w-8 h-8" />} label="Carbon Intelligence & MRV" subLabel="Includes Carbon Overview, MRV Calculations, Verification, and VIU / Impact Units." status="MRV" colorClass="teal" bgImageUrl="/main-screen/land-mineral-monitoring.png" onClick={() => onNavigate('dpalCarbon')} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-emerald-200">Compliance &amp; Audits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard
            icon={<ShieldCheck className="w-8 h-8" />}
            label="Emissions Audit"
            subLabel="General emissions integrity checks with CARB California deep-link mode."
            status="Audit"
            colorClass="emerald"
            bgImageUrl="/main-screen/land-mineral-monitoring.png"
            onClick={() => onNavigate('emissionsIntegrityAudit')}
          >
            <button type="button" onClick={() => onNavigate('emissionsIntegrityAudit')} className="rounded-md border border-slate-500/60 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-slate-100">General</button>
            <button type="button" onClick={() => onNavigate('carbEmissionsAudit')} className="rounded-md border border-slate-500/60 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-slate-100">CARB California</button>
          </HubCard>
          <HubCard icon={<ShieldCheck className="w-8 h-8" />} label="Hazardous Waste Integrity Audit" subLabel="RCRA facility reporting, permit, compliance, and waste activity review." status="Audit" colorClass="emerald" bgImageUrl="/main-screen/land-mineral-monitoring.png" onClick={() => onNavigate('hazardousWasteAudit')} />
          <HubCard icon={<Database className="w-8 h-8" />} label="Fuel Storage Integrity Audit" subLabel="Preview workspace for storage-throughput reconciliation and leak risk signals." status="Preview" colorClass="amber" bgImageUrl="/main-screen/water-project-monitoring.png" onClick={() => onNavigate('previewFuelStorageAudit')} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-emerald-200">Ecosystem &amp; Impact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard icon={<Globe className="w-8 h-8" />} label="Ecological Conservation" subLabel="Landsat 9 OLI-2 foliage and habitat monitoring." status="Impact" colorClass="emerald" bgImageUrl="/main-screen/land-mineral-monitoring.png" onClick={() => onNavigate('ecologicalConservation')} />
          <HubCard icon={<Globe className="w-8 h-8" />} label="Impact Dashboard" subLabel="Climate projects and outcomes you can follow with confidence." status="Impact" colorClass="emerald" bgImageUrl="/main-screen/Offset-Marketplace/hero-dpal-sustainability-collage.png" onClick={() => onNavigate('offsetMarketplace')} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base md:text-lg font-bold text-amber-200">Signals &amp; Intelligence</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
          <HubCard icon={<Activity className="w-8 h-8" />} label="Global Environmental Signals" subLabel="USGS, NASA EONET, OpenAQ, live hazard feeds, and mission conversion." status="Signals" colorClass="amber" bgImageUrl="/main-screen/Offset-Marketplace/hero-dpal-sustainability-collage.png" onClick={() => onNavigate('globalSignals')} />
        </div>
      </section>
    </div>
  );
};

export default EnvironmentalIntelligenceHubView;
