import React from 'react';
import type { EpaFacilityProfile } from '../../types/epa';

type Props = {
  profile: EpaFacilityProfile | null;
  onReturn: () => void;
};

const liveTabs = [
  'Official EPA Profile',
  'Reported Emissions',
  'Gas Breakdown',
  'Parent Company',
  'Map / Nearby Communities',
  'DPAL Evidence Packet',
] as const;

const nextTabs = ['Satellite Comparison', 'Permit / Inspection Search', 'Investigation Timeline'] as const;

const EpaFacilityEvidencePage: React.FC<Props> = ({ profile, onReturn }) => {
  const [activeTab, setActiveTab] = React.useState<(typeof liveTabs)[number]>('Official EPA Profile');
  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <button type="button" onClick={onReturn} className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200">Back</button>
        <p className="mt-4 text-sm text-slate-300">Facility not found in current dataset. Return to dashboard and search again.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <button type="button" onClick={onReturn} className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200">Back to EPA Live Dashboard</button>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Official EPA Data Layer</p>
      <h1 className="text-2xl font-black text-white">{profile.facility.facilityName}</h1>
      <p className="mt-1 text-sm text-slate-300">Status: Official reported data, not an independent DPAL accusation.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {liveTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded border px-3 py-1 text-xs font-semibold ${
              activeTab === tab ? 'border-cyan-500/70 bg-cyan-900/40 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
        {nextTabs.map((tab) => (
          <span key={tab} className="rounded border border-amber-600/60 bg-amber-900/20 px-3 py-1 text-xs text-amber-100">
            {tab} · Coming next
          </span>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-200">
        {activeTab === 'Official EPA Profile' ? (
          <>
            <p><strong>EPA Facility ID:</strong> {profile.facility.facilityId}</p>
            <p><strong>FRS ID:</strong> {profile.facility.frsId || 'Not reported'}</p>
            <p><strong>Industry:</strong> {profile.facility.reportedIndustryTypes || 'Not reported'}</p>
            <p><strong>Facility Type:</strong> {profile.facility.facilityTypes || 'Not reported'}</p>
          </>
        ) : null}
        {activeTab === 'Reported Emissions' ? <p><strong>Total CO2e:</strong> {profile.emissions.totalCo2e?.toLocaleString() ?? 'Not available'}</p> : null}
        {activeTab === 'Gas Breakdown' ? (
          <div className="space-y-1">
            {profile.emissions.byGas.map((gas) => (
              <p key={gas.gasId}>{gas.gasCode || gas.gasName}: {gas.co2eEmission?.toLocaleString() ?? 'N/A'}</p>
            ))}
          </div>
        ) : null}
        {activeTab === 'Parent Company' ? <p><strong>Parent Company:</strong> {profile.facility.parentCompany || 'Not reported'}</p> : null}
        {activeTab === 'Map / Nearby Communities' ? (
          <p>Coordinates: {profile.facility.latitude ?? 'N/A'}, {profile.facility.longitude ?? 'N/A'} (community overlays coming in next phase).</p>
        ) : null}
        {activeTab === 'DPAL Evidence Packet' ? (
          <>
            <p>DPAL Status: Official EPA Record Imported</p>
            <p>DPAL Risk Flags are analytical indicators only and require verification before public accusation or enforcement referral.</p>
          </>
        ) : null}
      </section>
    </div>
  );
};

export default EpaFacilityEvidencePage;
