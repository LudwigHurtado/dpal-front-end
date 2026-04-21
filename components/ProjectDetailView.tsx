import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Award, Camera, CheckCircle, Cloud, Database, FileText, Globe, MapPin,
  ShieldCheck, Upload,
} from './icons';

interface EvidenceImage {
  id: string;
  url: string;
  title: string;
  capturedAt: string;
}

interface CarbonTimelineEntry {
  id: string;
  date: string;
  activity: string;
  carbonImpact: string;
}

interface BuyerActivityEntry {
  id: string;
  buyer: string;
  offer: string;
  status: string;
}

interface MvrSummary {
  confidenceScore: string;
  satelliteValidation: string;
  riskFlags: string;
  aiNote: string;
}

interface CreditPackageSummary {
  creditsAvailable: string;
  priceRange: string;
  totalValue: string;
  status: string;
}

interface ProjectDetailViewProps {
  projectName: string;
  status: string;
  hectares: string;
  treesRegistered: string;
  estimatedTco2e: string;
  creditsReady: string;
  survivalRate: string;
  verificationConfidence: string;
  mapLabel: string;
  metadata: Array<{ label: string; value: string }>;
  carbonTimeline: CarbonTimelineEntry[];
  evidence: EvidenceImage[];
  mrvSummary: MvrSummary;
  creditPackage: CreditPackageSummary;
  buyerActivity: BuyerActivityEntry[];
  onBack: () => void;
  onUploadProof: () => void;
  onRunMrv: () => void;
  onPrepareCredits: () => void;
}

const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <section className={`rounded-xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_0_24px_rgba(16,185,129,0.07)] ${className}`}>
    {title && <h2 className="text-lg font-black text-white">{title}</h2>}
    {children}
  </section>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls = status.toLowerCase().includes('buyer')
    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
    : status.toLowerCase().includes('monitor')
      ? 'border-sky-400/30 bg-sky-500/10 text-sky-200'
      : 'border-amber-400/30 bg-amber-500/10 text-amber-200';
  return <span className={`rounded-lg border px-3 py-1 text-xs font-bold ${cls}`}>{status}</span>;
};

const HeaderSection: React.FC<{
  projectName: string;
  status: string;
  onBack: () => void;
  onUploadProof: () => void;
  onRunMrv: () => void;
  onPrepareCredits: () => void;
}> = ({ projectName, status, onBack, onUploadProof, onRunMrv, onPrepareCredits }) => (
  <SectionCard className="border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-slate-300 transition hover:border-emerald-500 hover:text-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Project Detail</p>
          <h1 className="mt-1 text-3xl font-black text-white">{projectName}</h1>
          <div className="mt-3">
            <StatusBadge status={status} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={onUploadProof} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-100 transition hover:border-emerald-500">
          Upload Proof
        </button>
        <button onClick={onRunMrv} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-100 transition hover:border-sky-500">
          Run MRV
        </button>
        <button onClick={onPrepareCredits} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500">
          Prepare Credits
        </button>
      </div>
    </div>
  </SectionCard>
);

const MetricsGrid: React.FC<{
  metrics: Array<{ label: string; value: string; icon: React.ReactNode; tone: string }>;
}> = ({ metrics }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {metrics.map((metric) => (
      <SectionCard key={metric.label}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{metric.label}</p>
            <p className="mt-1 text-2xl font-black text-white">{metric.value}</p>
          </div>
          <div className={`rounded-lg border border-current/20 bg-white/5 p-2 ${metric.tone}`}>{metric.icon}</div>
        </div>
      </SectionCard>
    ))}
  </div>
);

const MapSection: React.FC<{ mapLabel: string; metadata: Array<{ label: string; value: string }> }> = ({ mapLabel, metadata }) => (
  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
    <SectionCard title="Project Map">
      <div className="mt-4 flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-emerald-500/30 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_rgba(2,6,23,0.9))] text-center">
        <div>
          <MapPin className="mx-auto h-8 w-8 text-emerald-300" />
          <p className="mt-3 text-lg font-black text-white">{mapLabel}</p>
          <p className="mt-2 max-w-md text-sm text-slate-300">Interactive boundary map placeholder for project polygon, checkpoints, and monitoring overlays.</p>
        </div>
      </div>
    </SectionCard>
    <SectionCard title="Project Metadata">
      <div className="mt-4 grid gap-3">
        {metadata.map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  </div>
);

const CarbonTimelineSection: React.FC<{ entries: CarbonTimelineEntry[] }> = ({ entries }) => (
  <SectionCard title="Carbon Timeline">
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-950/70 text-left text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Activity</th>
            <th className="px-4 py-3 font-semibold">Carbon Impact</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/40">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="px-4 py-3 text-slate-300">{entry.date}</td>
              <td className="px-4 py-3 text-white">{entry.activity}</td>
              <td className="px-4 py-3 font-bold text-emerald-200">{entry.carbonImpact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </SectionCard>
);

const EvidenceSection: React.FC<{ evidence: EvidenceImage[] }> = ({ evidence }) => {
  const [previewId, setPreviewId] = useState<string | null>(evidence[0]?.id || null);
  const preview = useMemo(() => evidence.find((item) => item.id === previewId) || null, [evidence, previewId]);

  return (
    <>
      <SectionCard title="Evidence">
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {evidence.map((item) => (
            <button
              key={item.id}
              onClick={() => setPreviewId(item.id)}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-left transition hover:border-emerald-500 hover:shadow-[0_0_18px_rgba(16,185,129,0.18)]"
            >
              <img src={item.url} alt={item.title} className="h-40 w-full object-cover" />
              <div className="p-3">
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">{item.capturedAt}</p>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {preview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
              <div>
                <p className="text-sm font-bold text-white">{preview.title}</p>
                <p className="text-xs text-slate-400">{preview.capturedAt}</p>
              </div>
              <button onClick={() => setPreviewId(null)} className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-bold text-slate-200 hover:border-slate-500">
                Close
              </button>
            </div>
            <img src={preview.url} alt={preview.title} className="max-h-[70vh] w-full object-cover" />
          </div>
        </div>
      )}
    </>
  );
};

const MvrSummarySection: React.FC<{ summary: MvrSummary }> = ({ summary }) => (
  <SectionCard title="MRV Summary">
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Confidence Score</p>
        <p className="mt-1 text-3xl font-black text-white">{summary.confidenceScore}</p>
      </div>
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Satellite Validation</p>
        <p className="mt-1 text-3xl font-black text-white">{summary.satelliteValidation}</p>
      </div>
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Risk Flags</p>
        <p className="mt-1 text-lg font-black text-white">{summary.riskFlags}</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">AI Note</p>
        <p className="mt-2 text-sm text-slate-200">{summary.aiNote}</p>
      </div>
    </div>
  </SectionCard>
);

const CreditPackageSection: React.FC<{ creditPackage: CreditPackageSummary }> = ({ creditPackage }) => (
  <SectionCard title="Credit Package">
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Credits Available', creditPackage.creditsAvailable],
        ['Price Range', creditPackage.priceRange],
        ['Total Value', creditPackage.totalValue],
        ['Status', creditPackage.status],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-black text-white">{value}</p>
        </div>
      ))}
    </div>
  </SectionCard>
);

const BuyerActivitySection: React.FC<{ buyers: BuyerActivityEntry[] }> = ({ buyers }) => (
  <SectionCard title="Buyer Activity">
    <div className="mt-4 space-y-3">
      {buyers.map((buyer) => (
        <div key={buyer.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-white">{buyer.buyer}</p>
            <p className="mt-1 text-xs text-slate-400">{buyer.offer}</p>
          </div>
          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-100">{buyer.status}</span>
        </div>
      ))}
    </div>
  </SectionCard>
);

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectName,
  status,
  hectares,
  treesRegistered,
  estimatedTco2e,
  creditsReady,
  survivalRate,
  verificationConfidence,
  mapLabel,
  metadata,
  carbonTimeline,
  evidence,
  mrvSummary,
  creditPackage,
  buyerActivity,
  onBack,
  onUploadProof,
  onRunMrv,
  onPrepareCredits,
}) => {
  const metrics = [
    { label: 'Hectares', value: hectares, icon: <MapPin className="h-5 w-5" />, tone: 'text-cyan-300' },
    { label: 'Trees Registered', value: treesRegistered, icon: <Globe className="h-5 w-5" />, tone: 'text-lime-300' },
    { label: 'Estimated tCO2e', value: estimatedTco2e, icon: <Cloud className="h-5 w-5" />, tone: 'text-sky-300' },
    { label: 'Credits Ready', value: creditsReady, icon: <Award className="h-5 w-5" />, tone: 'text-emerald-300' },
    { label: 'Survival Rate', value: survivalRate, icon: <CheckCircle className="h-5 w-5" />, tone: 'text-amber-300' },
    { label: 'Verification Confidence', value: verificationConfidence, icon: <ShieldCheck className="h-5 w-5" />, tone: 'text-fuchsia-300' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <HeaderSection
          projectName={projectName}
          status={status}
          onBack={onBack}
          onUploadProof={onUploadProof}
          onRunMrv={onRunMrv}
          onPrepareCredits={onPrepareCredits}
        />
        <MetricsGrid metrics={metrics} />
        <MapSection mapLabel={mapLabel} metadata={metadata} />
        <CarbonTimelineSection entries={carbonTimeline} />
        <EvidenceSection evidence={evidence} />
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <MvrSummarySection summary={mrvSummary} />
          <CreditPackageSection creditPackage={creditPackage} />
        </div>
        <BuyerActivitySection buyers={buyerActivity} />
      </div>
    </div>
  );
};

export default ProjectDetailView;
