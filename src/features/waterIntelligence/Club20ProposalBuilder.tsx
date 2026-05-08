import React, { useMemo } from 'react';
import Club20SectionCard from './components/Club20SectionCard';
import { buildClub20ProposalDraft } from './services/club20ProposalService';
import RussWaterMarketAssistant from './RussWaterMarketAssistant';
import RouteBreadcrumbHeader from './components/RouteBreadcrumbHeader';

export default function Club20ProposalBuilder(): React.ReactElement {
  const draft = useMemo(() => buildClub20ProposalDraft(), []);
  return (
    <div className="space-y-4">
      <RouteBreadcrumbHeader title="Club 20 / stakeholder proposal builder" currentPageLabel="Club 20" />
      <div className="rounded-xl p-3 border dpal-border-subtle" style={{ background: 'var(--dpal-card)' }}>
        <div className="text-[11px] font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
          Club 20 Review Draft — Pilot / Demonstration
        </div>
        <p className="text-[11px] dpal-text-secondary mt-1">
          Stakeholder memo preview for discussion. This is not a legal filing or approved authority instrument.
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" className="rounded-lg px-3 py-1.5 text-[11px] font-semibold border dpal-border-subtle" disabled>
            Copy Proposal Draft
          </button>
          <button type="button" className="rounded-lg px-3 py-1.5 text-[11px] font-semibold border dpal-border-subtle" disabled>
            Export PDF Placeholder
          </button>
        </div>
      </div>
      <p className="text-[11px] dpal-text-secondary">Pilot / Demonstration Mode · editable-looking preview panels.</p>

      <Club20SectionCard title="Russ concept summary" body={draft.russConceptSummary} />

      <div className="grid gap-3 md:grid-cols-2">
        <Club20SectionCard title="Problem" body={draft.problem} />
        <Club20SectionCard title="Opportunity" body={draft.opportunity} />
        <Club20SectionCard title="Agriculture protection" body={draft.agricultureProtection} />
        <Club20SectionCard title="Conservation measurement" body={draft.conservationMeasurement} />
        <Club20SectionCard title="Transaction categories" body={draft.transactionCategories} />
        <Club20SectionCard title="State / USBR exchange concept" body={draft.stateUsbrExchange} />
        <Club20SectionCard title="Pilot geography" body={draft.pilotGeography} />
        <Club20SectionCard title="DPAL technology role" body={draft.dpalTechnologyRole} />
        <Club20SectionCard title="Stakeholders" body={draft.stakeholders} />
        <Club20SectionCard title="Next steps" body={draft.nextSteps} />
      </div>

      <RussWaterMarketAssistant context={{ screen: 'launcher' }} />
    </div>
  );
}
