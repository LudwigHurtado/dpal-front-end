import React from 'react';
import PreviewShell from './components/PreviewShell';
import RiskScoreCard from './components/RiskScoreCard';
import VerificationSummaryPanel from './components/VerificationSummaryPanel';
import DataSourcesPanel from './components/DataSourcesPanel';
import { mockDataSources } from './mockData';

interface EvidencePacketViewerProps {
  activePath: string;
  onNavigatePath: (path: string) => void;
}

const card = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-5';

const EvidencePacketViewer: React.FC<EvidencePacketViewerProps> = ({ activePath, onNavigatePath }) => {
  return (
    <PreviewShell
      title="Evidence Packet Viewer"
      subtitle="Regulatory packet assembly preview (mock data only)."
      activePath={activePath}
      onNavigatePath={onNavigatePath}
    >
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <section className={card}>
          <h3 className="font-semibold text-slate-900">Packet Summary</h3>
          <p className="text-sm text-slate-600 mt-2 leading-6">Packet ID: PKT-ENV-2049 | Module: Fuel Storage Integrity Audit | Created: 2026-04-25.</p>
        </section>
        <section className={card}>
          <h3 className="font-semibold text-slate-900">Facility / Project Identity</h3>
          <p className="text-sm text-slate-600 mt-2 leading-6">Delta West Terminal 14, Bay Area Region, Permit CA-FS-2198.</p>
        </section>
      </section>

      <DataSourcesPanel sources={mockDataSources} />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <VerificationSummaryPanel summary="Verification confidence is 87% with one unresolved discrepancy requiring operator clarification." />
        <RiskScoreCard title="Risk Score" score={72} />
      </section>

      <section className={card}>
        <h3 className="font-semibold text-slate-900">Event Trail</h3>
        <ul className="mt-2 text-sm text-slate-600 space-y-1 list-disc pl-5">
          <li>2026-04-21: Initial anomaly detected from thermal stream.</li>
          <li>2026-04-22: Transport log mismatch cross-check triggered.</li>
          <li>2026-04-23: Analyst requested supporting declarations.</li>
          <li>2026-04-24: Packet assembled for review committee.</li>
        </ul>
      </section>

      <section className={card}>
        <h3 className="font-semibold text-slate-900">Export Actions</h3>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {['Export JSON', 'Export PDF', 'Save Audit', 'Create Case'].map((label) => (
            <button key={label} type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white hover:bg-slate-50">
              {label}
            </button>
          ))}
        </div>
      </section>
    </PreviewShell>
  );
};

export default EvidencePacketViewer;
