import React from 'react';
import PreviewShell from './components/PreviewShell';
import FacilitySearchPanel from './components/FacilitySearchPanel';
import MapPlaceholder from './components/MapPlaceholder';
import MetricCard from './components/MetricCard';
import RiskScoreCard from './components/RiskScoreCard';
import VerificationSummaryPanel from './components/VerificationSummaryPanel';
import ClaimAnalyzerPanel from './components/ClaimAnalyzerPanel';
import EvidencePacketPreview from './components/EvidencePacketPreview';
import DataSourcesPanel from './components/DataSourcesPanel';
import { mockDataSources } from './mockData';

interface GenericEnvironmentalModuleProps {
  activePath: string;
  moduleType: string;
  onNavigatePath: (path: string) => void;
}

const GenericEnvironmentalModule: React.FC<GenericEnvironmentalModuleProps> = ({ activePath, moduleType, onNavigatePath }) => {
  return (
    <PreviewShell
      title={`Module Preview: ${moduleType}`}
      subtitle="Reusable audit and monitoring workspace layout (preview only)."
      activePath={activePath}
      onNavigatePath={onNavigatePath}
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <section className="xl:col-span-4 space-y-4 xl:sticky xl:top-6">
          <FacilitySearchPanel />
          <MapPlaceholder title="Location Panel" subtitle="Facility geospatial context" />
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-900">Facility / Project Identity</h3>
            <p className="text-sm text-slate-600 mt-2 leading-6">Mock identity card for selected facility, permit profile, ownership metadata, and historical compliance flags.</p>
          </section>
        </section>

        <section className="xl:col-span-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            <MetricCard label="Active Claims" value="14" trend="3 flagged for review" />
            <MetricCard label="Evidence Items" value="57" trend="8 added in last scan" />
            <MetricCard label="Integrity Checks" value="26" trend="2 pending rerun" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RiskScoreCard title="Risk / Integrity Score" score={68} />
            <VerificationSummaryPanel summary="Signals indicate moderate inconsistencies between declared activity and independent evidence streams." />
          </div>
          <ClaimAnalyzerPanel />
          <EvidencePacketPreview />
          <DataSourcesPanel sources={mockDataSources} />
        </section>
      </div>
    </PreviewShell>
  );
};

export default GenericEnvironmentalModule;
