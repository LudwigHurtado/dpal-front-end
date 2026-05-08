import React from 'react';
import { Link } from 'react-router-dom';
import { listEvidencePackets } from './services/waterEvidencePacketService';
import RouteBreadcrumbHeader from './components/RouteBreadcrumbHeader';

export default function WaterEvidencePacketView(): React.ReactElement {
  const packets = listEvidencePackets();
  return (
    <div className="space-y-4">
      <RouteBreadcrumbHeader title="Water conservation evidence packets" currentPageLabel="Evidence" />
      <p className="text-[11px] dpal-text-secondary">Pilot / Demonstration Mode · placeholder actions only.</p>
      <div className="space-y-3">
        {packets.map((p) => (
          <article key={p.id} className="rounded-2xl p-4 border dpal-border-subtle space-y-2" style={{ background: 'var(--dpal-card)' }}>
            <div className="text-[10px] font-mono font-bold text-cyan-200/90">{p.id}</div>
            <div className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
              {p.projectSummary}
            </div>
            <div className="text-[11px] dpal-text-secondary">Location: {p.locationSummary}</div>
            <div className="text-[11px] dpal-text-secondary">Water-right ref (demo): {p.waterRightReference}</div>
            <div className="text-[11px] dpal-text-muted">Confidence: {(p.confidenceScore * 100).toFixed(0)}% (demo)</div>
            <div className="text-[11px] font-mono break-all dpal-text-muted">Hash placeholder: {p.evidenceHashPlaceholder}</div>
            <div className="text-[11px] dpal-text-secondary">Public-safe summary: {p.publicSafeSummary}</div>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg px-3 py-2 text-[11px] font-semibold border dpal-border-subtle" disabled>
          Generate Evidence Packet Placeholder
        </button>
        <button type="button" className="rounded-lg px-3 py-2 text-[11px] font-semibold border dpal-border-subtle" disabled>
          Export PDF Placeholder
        </button>
        <button type="button" className="rounded-lg px-3 py-2 text-[11px] font-semibold border dpal-border-subtle" disabled>
          Create QR Placeholder
        </button>
        <button type="button" className="rounded-lg px-3 py-2 text-[11px] font-semibold border dpal-border-subtle" disabled>
          Submit for Review Placeholder
        </button>
        <Link
          to="/water-intelligence/situation/WI-DEMO"
          className="rounded-lg px-3 py-2 text-[11px] font-semibold border dpal-border-subtle inline-flex items-center"
          style={{ color: 'var(--dpal-primary)' }}
        >
          Open Situation Room Placeholder
        </Link>
      </div>
    </div>
  );
}
