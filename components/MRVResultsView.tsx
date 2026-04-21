import React from 'react';
import {
  AlertTriangle, ArrowLeft, Award, CheckCircle, Cloud, Database, FileText, Globe,
  MapPin, ShieldCheck,
} from './icons';

interface MRVResultsViewProps {
  projectName: string;
  runDate: string;
  estimatedTco2e: string;
  creditsGenerated: string;
  confidenceScore: string;
  riskScore: string;
  vegetationChange: string;
  deforestationDetection: string;
  gpsMatchPercentage: string;
  boundaryAccuracy: string;
  outlierDetection: string;
  photoCount: string;
  coveragePercent: string;
  consistencyRating: string;
  fireRisk: string;
  fraudFlags: string;
  missingData: string;
  aiSummary: string;
  verifiedCarbonOutput: string;
  finalCreditsGenerated: string;
  finalConfidence: string;
  onBack: () => void;
  onApproveCredits: () => void;
  onRequestMoreEvidence: () => void;
  onFlagForReview: () => void;
}

const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <section className={`rounded-xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_0_24px_rgba(14,165,233,0.07)] ${className}`}>
    {title && <h2 className="text-lg font-black text-white">{title}</h2>}
    {children}
  </section>
);

const MetricCard: React.FC<{ label: string; value: string; icon: React.ReactNode; tone: string }> = ({ label, value, icon, tone }) => (
  <SectionCard>
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-white">{value}</p>
      </div>
      <div className={`rounded-lg border border-current/20 bg-white/5 p-2 ${tone}`}>{icon}</div>
    </div>
  </SectionCard>
);

const HeaderSection: React.FC<{ projectName: string; runDate: string; onBack: () => void }> = ({ projectName, runDate, onBack }) => (
  <SectionCard className="border-sky-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/30">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-slate-300 transition hover:border-sky-500 hover:text-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">MRV Review Results</p>
          <h1 className="mt-1 text-3xl font-black text-white">{projectName}</h1>
          <p className="mt-2 text-sm text-slate-400">Run date: {runDate}</p>
        </div>
      </div>
    </div>
  </SectionCard>
);

const SatelliteValidationSection: React.FC<{ vegetationChange: string; deforestationDetection: string }> = ({ vegetationChange, deforestationDetection }) => (
  <SectionCard title="Satellite Validation">
    <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Vegetation Change</p>
          <p className="mt-1 text-lg font-black text-white">{vegetationChange}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Deforestation Detection</p>
          <p className="mt-1 text-lg font-black text-white">{deforestationDetection}</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-sky-500/30 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_rgba(2,6,23,0.92))] p-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">NDVI Trend</p>
        <div className="mt-4 h-40 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex h-full items-end gap-2">
            {[40, 55, 50, 68, 72, 78, 81].map((value, index) => (
              <div key={index} className="flex-1 rounded-t bg-sky-400/70" style={{ height: `${value}%` }} />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">Placeholder graph for NDVI trend over recent monitoring windows.</p>
        </div>
      </div>
    </div>
  </SectionCard>
);

const GeoValidationSection: React.FC<{ gpsMatchPercentage: string; boundaryAccuracy: string; outlierDetection: string }> = ({
  gpsMatchPercentage,
  boundaryAccuracy,
  outlierDetection,
}) => (
  <SectionCard title="Geo Validation">
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {[
        ['GPS Match Percentage', gpsMatchPercentage],
        ['Boundary Accuracy', boundaryAccuracy],
        ['Outlier Detection', outlierDetection],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-black text-white">{value}</p>
        </div>
      ))}
    </div>
  </SectionCard>
);

const EvidenceQualitySection: React.FC<{ photoCount: string; coveragePercent: string; consistencyRating: string }> = ({
  photoCount,
  coveragePercent,
  consistencyRating,
}) => (
  <SectionCard title="Evidence Quality">
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {[
        ['Number of Photos', photoCount],
        ['Coverage %', coveragePercent],
        ['Consistency Rating', consistencyRating],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-black text-white">{value}</p>
        </div>
      ))}
    </div>
  </SectionCard>
);

const RiskAnalysisSection: React.FC<{ fireRisk: string; fraudFlags: string; missingData: string }> = ({ fireRisk, fraudFlags, missingData }) => (
  <SectionCard title="Risk Analysis">
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {[
        ['Fire Risk', fireRisk],
        ['Fraud / Anomaly Flags', fraudFlags],
        ['Missing Data', missingData],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-black text-white">{value}</p>
        </div>
      ))}
    </div>
  </SectionCard>
);

const SummarySection: React.FC<{ aiSummary: string }> = ({ aiSummary }) => (
  <SectionCard title="AI Summary Note">
    <p className="mt-4 text-sm leading-7 text-slate-200">{aiSummary}</p>
  </SectionCard>
);

const FinalOutputCard: React.FC<{ verifiedCarbonOutput: string; finalCreditsGenerated: string; finalConfidence: string }> = ({
  verifiedCarbonOutput,
  finalCreditsGenerated,
  finalConfidence,
}) => (
  <SectionCard title="Final Output" className="border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950/20">
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {[
        ['Verified Carbon Output', verifiedCarbonOutput],
        ['Credits Generated', finalCreditsGenerated],
        ['Confidence %', finalConfidence],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-black text-white">{value}</p>
        </div>
      ))}
    </div>
  </SectionCard>
);

const ActionBar: React.FC<{
  onApproveCredits: () => void;
  onRequestMoreEvidence: () => void;
  onFlagForReview: () => void;
}> = ({ onApproveCredits, onRequestMoreEvidence, onFlagForReview }) => (
  <div className="flex flex-wrap gap-3">
    <button onClick={onApproveCredits} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500">
      Approve Credits
    </button>
    <button onClick={onRequestMoreEvidence} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-100 transition hover:border-sky-500">
      Request More Evidence
    </button>
    <button onClick={onFlagForReview} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-100 transition hover:border-rose-500">
      Flag for Review
    </button>
  </div>
);

const MRVResultsView: React.FC<MRVResultsViewProps> = ({
  projectName,
  runDate,
  estimatedTco2e,
  creditsGenerated,
  confidenceScore,
  riskScore,
  vegetationChange,
  deforestationDetection,
  gpsMatchPercentage,
  boundaryAccuracy,
  outlierDetection,
  photoCount,
  coveragePercent,
  consistencyRating,
  fireRisk,
  fraudFlags,
  missingData,
  aiSummary,
  verifiedCarbonOutput,
  finalCreditsGenerated,
  finalConfidence,
  onBack,
  onApproveCredits,
  onRequestMoreEvidence,
  onFlagForReview,
}) => {
  const metrics = [
    { label: 'Estimated tCO2e', value: estimatedTco2e, icon: <Cloud className="h-5 w-5" />, tone: 'text-sky-300' },
    { label: 'Credits Generated', value: creditsGenerated, icon: <Award className="h-5 w-5" />, tone: 'text-emerald-300' },
    { label: 'Confidence Score', value: confidenceScore, icon: <ShieldCheck className="h-5 w-5" />, tone: 'text-fuchsia-300' },
    { label: 'Risk Score', value: riskScore, icon: <AlertTriangle className="h-5 w-5" />, tone: 'text-amber-300' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <HeaderSection projectName={projectName} runDate={runDate} onBack={onBack} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
        <SatelliteValidationSection vegetationChange={vegetationChange} deforestationDetection={deforestationDetection} />
        <GeoValidationSection
          gpsMatchPercentage={gpsMatchPercentage}
          boundaryAccuracy={boundaryAccuracy}
          outlierDetection={outlierDetection}
        />
        <EvidenceQualitySection
          photoCount={photoCount}
          coveragePercent={coveragePercent}
          consistencyRating={consistencyRating}
        />
        <RiskAnalysisSection fireRisk={fireRisk} fraudFlags={fraudFlags} missingData={missingData} />
        <SummarySection aiSummary={aiSummary} />
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <FinalOutputCard
            verifiedCarbonOutput={verifiedCarbonOutput}
            finalCreditsGenerated={finalCreditsGenerated}
            finalConfidence={finalConfidence}
          />
          <ActionBar
            onApproveCredits={onApproveCredits}
            onRequestMoreEvidence={onRequestMoreEvidence}
            onFlagForReview={onFlagForReview}
          />
        </div>
      </div>
    </div>
  );
};

export default MRVResultsView;
