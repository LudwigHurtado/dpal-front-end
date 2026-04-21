import React from 'react';
import {
  AlertTriangle, ArrowLeft, Award, CheckCircle, Cloud, FileText, Globe, MapPin, ShieldCheck,
} from './icons';

interface ReviewMetric {
  label: string;
  value: string;
  detail?: string;
}

interface ReviewFinding {
  title: string;
  status: 'positive' | 'watch' | 'warning';
  detail: string;
}

interface ReviewFact {
  label: string;
  value: string;
}

interface MRVResultsViewProps {
  projectName: string;
  runDate: string;
  reviewScope: string;
  evidenceBatch: string;
  satelliteWindow: string;
  boundaryReview: string;
  reviewResult: string;
  approvalRecommendation: string;
  creditPackageState: string;
  estimatedTco2e: string;
  supportedCredits: string;
  confidenceScore: string;
  carbonModelStatus: string;
  fieldEvidenceFacts: ReviewFact[];
  geoValidationFacts: ReviewFact[];
  satelliteFacts: ReviewFact[];
  riskFacts: ReviewFact[];
  findings: ReviewFinding[];
  commercialReadout: ReviewMetric[];
  dataProvenanceLabel: string;
  dataProvenanceNote: string;
  nextActionLabel: string;
  nextActionNote: string;
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

const toneClasses: Record<ReviewFinding['status'], string> = {
  positive: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
  warning: 'border-rose-500/20 bg-rose-500/10 text-rose-100',
};

const resultTone = (value: string): string => {
  const normalized = value.toLowerCase();
  if (normalized.includes('approve') || normalized.includes('ready') || normalized.includes('supported')) {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100';
  }
  if (normalized.includes('review') || normalized.includes('format') || normalized.includes('conditional')) {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-100';
  }
  return 'border-rose-500/20 bg-rose-500/10 text-rose-100';
};

const HeaderSection: React.FC<{
  projectName: string;
  runDate: string;
  reviewScope: string;
  onBack: () => void;
}> = ({ projectName, runDate, reviewScope, onBack }) => (
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
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">MRV Review Record</p>
          <h1 className="mt-1 text-3xl font-black text-white">{projectName}</h1>
          <p className="mt-2 text-sm text-slate-300">Review date: {runDate}</p>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">Review scope: {reviewScope}</p>
        </div>
      </div>
    </div>
  </SectionCard>
);

const DecisionSummary: React.FC<{
  reviewResult: string;
  approvalRecommendation: string;
  creditPackageState: string;
  confidenceScore: string;
}> = ({ reviewResult, approvalRecommendation, creditPackageState, confidenceScore }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {[
      ['Review Result', reviewResult, <CheckCircle className="h-5 w-5" />],
      ['Confidence Score', confidenceScore, <ShieldCheck className="h-5 w-5" />],
      ['Recommendation', approvalRecommendation, <Award className="h-5 w-5" />],
      ['Credit Package State', creditPackageState, <FileText className="h-5 w-5" />],
    ].map(([label, value, icon]) => (
      <SectionCard key={label}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
            <div className={`mt-2 inline-flex rounded-lg border px-3 py-2 text-sm font-bold ${resultTone(String(value))}`}>
              {value}
            </div>
          </div>
          <div className="rounded-lg border border-current/20 bg-white/5 p-2 text-sky-300">{icon}</div>
        </div>
      </SectionCard>
    ))}
  </div>
);

const FactsGrid: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  facts: ReviewFact[];
}> = ({ title, subtitle, icon, facts }) => (
  <SectionCard title={title}>
    <div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
      <span className="text-sky-300">{icon}</span>
      <span>{subtitle}</span>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {facts.map((fact) => (
        <div key={fact.label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{fact.label}</p>
          <p className="mt-1 text-sm font-bold text-white">{fact.value}</p>
        </div>
      ))}
    </div>
  </SectionCard>
);

const FindingsSection: React.FC<{ findings: ReviewFinding[] }> = ({ findings }) => (
  <SectionCard title="What The Engine Found">
    <div className="mt-4 grid gap-3">
      {findings.map((finding) => (
        <div key={finding.title} className={`rounded-xl border p-4 ${toneClasses[finding.status]}`}>
          <p className="text-sm font-black text-white">{finding.title}</p>
          <p className="mt-1 text-sm leading-6 text-current">{finding.detail}</p>
        </div>
      ))}
    </div>
  </SectionCard>
);

const CommercialReadoutSection: React.FC<{
  estimatedTco2e: string;
  supportedCredits: string;
  carbonModelStatus: string;
  commercialReadout: ReviewMetric[];
}> = ({ estimatedTco2e, supportedCredits, carbonModelStatus, commercialReadout }) => (
  <SectionCard title="Commercial Meaning" className="border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950/20">
    <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-3">
        {[
          { label: 'Estimated tCO2e', value: estimatedTco2e, detail: 'Modeled carbon output currently supported by the review package.' },
          { label: 'Supported Credits', value: supportedCredits, detail: 'Credits the engine believes can move forward based on current proof.' },
          { label: 'Carbon Modeling', value: carbonModelStatus, detail: 'How the modeled output should be treated before packaging or issuance.' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-xl font-black text-white">{item.value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3">
        {commercialReadout.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-lg font-black text-white">{item.value}</p>
            {item.detail && <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>}
          </div>
        ))}
      </div>
    </div>
  </SectionCard>
);

const ProvenanceSection: React.FC<{
  evidenceBatch: string;
  satelliteWindow: string;
  boundaryReview: string;
  dataProvenanceLabel: string;
  dataProvenanceNote: string;
}> = ({ evidenceBatch, satelliteWindow, boundaryReview, dataProvenanceLabel, dataProvenanceNote }) => (
  <SectionCard title="What Was Reviewed">
    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        {[
          ['Evidence batch', evidenceBatch],
          ['Satellite window', satelliteWindow],
          ['Boundary validation', boundaryReview],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-bold text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Data provenance</p>
        <p className={`mt-2 inline-flex rounded-lg border px-3 py-2 text-sm font-bold ${resultTone(dataProvenanceLabel)}`}>
          {dataProvenanceLabel}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-300">{dataProvenanceNote}</p>
      </div>
    </div>
  </SectionCard>
);

const NextActionSection: React.FC<{ nextActionLabel: string; nextActionNote: string }> = ({ nextActionLabel, nextActionNote }) => (
  <SectionCard title="What Happens Next">
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">Next action</p>
      <p className="mt-1 text-lg font-black text-white">{nextActionLabel}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{nextActionNote}</p>
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
      Approve Credit Package
    </button>
    <button onClick={onRequestMoreEvidence} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-100 transition hover:border-sky-500">
      Request More Evidence
    </button>
    <button onClick={onFlagForReview} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-100 transition hover:border-rose-500">
      Escalate Review
    </button>
  </div>
);

const MRVResultsView: React.FC<MRVResultsViewProps> = ({
  projectName,
  runDate,
  reviewScope,
  evidenceBatch,
  satelliteWindow,
  boundaryReview,
  reviewResult,
  approvalRecommendation,
  creditPackageState,
  estimatedTco2e,
  supportedCredits,
  confidenceScore,
  carbonModelStatus,
  fieldEvidenceFacts,
  geoValidationFacts,
  satelliteFacts,
  riskFacts,
  findings,
  commercialReadout,
  dataProvenanceLabel,
  dataProvenanceNote,
  nextActionLabel,
  nextActionNote,
  onBack,
  onApproveCredits,
  onRequestMoreEvidence,
  onFlagForReview,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <HeaderSection projectName={projectName} runDate={runDate} reviewScope={reviewScope} onBack={onBack} />
        <DecisionSummary
          reviewResult={reviewResult}
          approvalRecommendation={approvalRecommendation}
          creditPackageState={creditPackageState}
          confidenceScore={confidenceScore}
        />
        <ProvenanceSection
          evidenceBatch={evidenceBatch}
          satelliteWindow={satelliteWindow}
          boundaryReview={boundaryReview}
          dataProvenanceLabel={dataProvenanceLabel}
          dataProvenanceNote={dataProvenanceNote}
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <FactsGrid
            title="Field Evidence"
            subtitle="Photos, timestamps, GPS, plot checks, and logs"
            icon={<FileText className="h-4 w-4" />}
            facts={fieldEvidenceFacts}
          />
          <FactsGrid
            title="Geospatial Validation"
            subtitle="Boundary fit, coordinate match, and outlier review"
            icon={<MapPin className="h-4 w-4" />}
            facts={geoValidationFacts}
          />
          <FactsGrid
            title="Satellite / Remote Sensing Review"
            subtitle="Vegetation, disturbance, fire, and canopy context"
            icon={<Globe className="h-4 w-4" />}
            facts={satelliteFacts}
          />
          <FactsGrid
            title="Risk Checks"
            subtitle="Fraud flags, data gaps, and anomaly review"
            icon={<AlertTriangle className="h-4 w-4" />}
            facts={riskFacts}
          />
        </div>
        <FindingsSection findings={findings} />
        <CommercialReadoutSection
          estimatedTco2e={estimatedTco2e}
          supportedCredits={supportedCredits}
          carbonModelStatus={carbonModelStatus}
          commercialReadout={commercialReadout}
        />
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <NextActionSection nextActionLabel={nextActionLabel} nextActionNote={nextActionNote} />
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
