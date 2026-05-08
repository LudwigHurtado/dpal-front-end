import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Club20SectionCard from './components/Club20SectionCard';
import { buildClub20ProposalDraft } from './services/club20ProposalService';
import RussWaterMarketAssistant from './RussWaterMarketAssistant';

export default function Club20ProposalBuilder(): React.ReactElement {
  const draft = useMemo(() => buildClub20ProposalDraft(), []);
  return (
    <div className="space-y-4">
      <div className="flex justify-between flex-wrap gap-2">
        <h1 className="text-lg font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
          Club 20 / stakeholder proposal builder
        </h1>
        <Link to="/water-intelligence" className="text-[11px] font-semibold text-cyan-300 hover:underline">
          Home
        </Link>
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
