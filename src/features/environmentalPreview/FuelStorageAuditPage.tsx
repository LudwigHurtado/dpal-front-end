import React from 'react';
import PreviewShell from './components/PreviewShell';
import FacilitySearchPanel from './components/FacilitySearchPanel';
import MapPlaceholder from './components/MapPlaceholder';
import RiskScoreCard from './components/RiskScoreCard';
import VerificationSummaryPanel from './components/VerificationSummaryPanel';
import EvidencePacketPreview from './components/EvidencePacketPreview';
import DataSourcesPanel from './components/DataSourcesPanel';
import { mockDataSources } from './mockData';

interface FuelStorageAuditPageProps {
  activePath: string;
  onNavigatePath: (path: string) => void;
}

const panel = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-5';

const FuelStorageAuditPage: React.FC<FuelStorageAuditPageProps> = ({ activePath, onNavigatePath }) => {
  return (
    <PreviewShell
      title="Fuel Storage Integrity Audit"
      subtitle="Preview-only layout for future audit workflow."
      activePath={activePath}
      onNavigatePath={onNavigatePath}
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <section className="xl:col-span-4 space-y-4 xl:sticky xl:top-6">
          <FacilitySearchPanel />
          <MapPlaceholder title="Tank / Storage Map" subtitle="Mock facility storage layer" />
          <section className={panel}>
            <h3 className="font-semibold text-slate-900">Facility Identity</h3>
            <p className="text-sm text-slate-600 mt-2 leading-6">Facility: Delta West Terminal 14, Permit: CA-FS-2198, Region: Bay Area.</p>
          </section>
        </section>

        <section className="xl:col-span-8 space-y-4">
          <section className={panel}>
            <h3 className="font-semibold text-slate-900">Storage Capacity vs Reported Activity</h3>
            <p className="mt-2 text-sm text-slate-600">Compare declared throughput against estimated storage movement and refill cycles.</p>
          </section>
          <section className={panel}>
            <h3 className="font-semibold text-slate-900">Thermal Activity Signals</h3>
            <p className="mt-2 text-sm text-slate-600">Thermal signatures suggest elevated nighttime transfer activity for two storage clusters.</p>
          </section>
          <section className={panel}>
            <h3 className="font-semibold text-slate-900">Transport Flow Indicators</h3>
            <p className="mt-2 text-sm text-slate-600">Inbound and outbound flow indicators are partially inconsistent in one reporting window.</p>
          </section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RiskScoreCard title="Leak Risk Score" score={74} />
            <RiskScoreCard title="Storage Integrity Score" score={58} />
          </div>
          <VerificationSummaryPanel summary="Cross-check indicates partial mismatch in activity declaration windows; recommend secondary document request." />
          <EvidencePacketPreview />
          <DataSourcesPanel sources={mockDataSources} />
        </section>
      </div>
    </PreviewShell>
  );
};

export default FuelStorageAuditPage;
