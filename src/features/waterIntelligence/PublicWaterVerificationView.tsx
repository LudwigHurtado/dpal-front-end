import React from 'react';
import { Link, useParams } from 'react-router-dom';
import DataSourceBadge from './components/DataSourceBadge';
import { formatTransactionCategory } from './services/waterIntelligenceLabels';
import { waterIntelligenceService } from './services/waterIntelligenceService';
import RouteBreadcrumbHeader from './components/RouteBreadcrumbHeader';

export default function PublicWaterVerificationView(): React.ReactElement {
  const { recordId = '' } = useParams();
  const rec = waterIntelligenceService.getPublicRecord(decodeURIComponent(recordId));

  if (!rec) {
    return (
      <div className="rounded-xl p-6 border dpal-border-subtle text-center" style={{ background: 'var(--dpal-card)' }}>
        <p className="text-sm dpal-text-secondary">Public record not found (demo catalog).</p>
        <Link to="/water-intelligence" className="text-[11px] text-cyan-300 mt-2 inline-block">
          Water Intelligence home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <RouteBreadcrumbHeader title="Public water verification" currentPageLabel="Public Verification" />
      <div className="rounded-xl p-3 border border-amber-400/30 bg-amber-500/10 text-[11px] text-amber-100">
        Public-safe view — no private water-right documents, party contacts, confidential terms, or internal validator
        notes unless explicitly marked public elsewhere.
      </div>
      <header className="rounded-2xl p-5 border dpal-border-subtle space-y-2" style={{ background: 'var(--dpal-card)' }}>
        <div className="text-[10px] font-mono font-bold text-cyan-200/90">{rec.recordId}</div>
        <h1 className="text-xl font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
          {rec.projectName}
        </h1>
        <p className="text-[11px] dpal-text-secondary">{rec.locationSummary}</p>
      </header>

      <section className="rounded-2xl p-4 border dpal-border-subtle space-y-2 text-[11px]" style={{ background: 'var(--dpal-card)' }}>
        <div>
          <span className="dpal-text-muted font-semibold">Claimed conservation:</span>{' '}
          <span style={{ color: 'var(--dpal-text-primary)' }}>{rec.claimedConservationAF.toLocaleString()} AF (demo)</span>
        </div>
        {rec.netVerifiedConservationAF != null && (
          <div>
            <span className="dpal-text-muted font-semibold">Net verified conservation:</span>{' '}
            <span style={{ color: 'var(--dpal-text-primary)' }}>{rec.netVerifiedConservationAF.toLocaleString()} AF</span>
          </div>
        )}
        <div className="font-mono text-[10px] break-all">
          <span className="dpal-text-muted font-semibold font-sans">Evidence hash (demo):</span> {rec.evidenceHash}
        </div>
        <div>
          <span className="dpal-text-muted font-semibold">Status:</span> {rec.status.replace(/_/g, ' ')}
        </div>
        {rec.transactionCategory && (
          <div>
            <span className="dpal-text-muted font-semibold">Transaction category:</span>{' '}
            {formatTransactionCategory(rec.transactionCategory)}
          </div>
        )}
      </section>

      <section className="rounded-2xl p-4 border dpal-border-subtle" style={{ background: 'var(--dpal-card)' }}>
        <h2 className="text-xs font-bold uppercase dpal-text-muted mb-2">Public timeline</h2>
        <ul className="space-y-2 text-[11px]">
          {rec.timeline.map((t) => (
            <li key={`${t.at}-${t.label}`} className="flex gap-2">
              <span className="font-mono text-cyan-200/80 shrink-0">{t.at}</span>
              <span className="dpal-text-secondary">{t.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-1">
        {rec.dataSourceLabels.map((l) => (
          <DataSourceBadge key={l} label={l} />
        ))}
      </div>

      <p className="text-[11px] dpal-text-muted leading-relaxed">
        Claim-safety: This public page summarizes demonstration records only. It does not imply government approval,
        legal certification, or operational exchange authority.
      </p>

      <Link to="/water-intelligence/colorado-river" className="text-[11px] font-semibold text-cyan-300 hover:underline inline-block">
        Return to Colorado pilot
      </Link>
    </div>
  );
}
