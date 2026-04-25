import React from 'react';
import type { EpaFacilityProfile } from '../../types/epa';

type Props = {
  open: boolean;
  profile: EpaFacilityProfile | null;
  onClose: () => void;
  onOpenFacilityPage: (facilityId: string) => void;
};

const tabs = [
  'EPA Facility Profile',
  'Reported Emissions',
  'Gas Breakdown',
  'Parent Company',
  'Location',
  'DPAL Evidence Packet',
] as const;

const EpaFacilityDetailDrawer: React.FC<Props> = ({ open, profile, onClose, onOpenFacilityPage }) => {
  const [activeTab, setActiveTab] = React.useState<(typeof tabs)[number]>('EPA Facility Profile');

  React.useEffect(() => {
    if (!open) setActiveTab('EPA Facility Profile');
  }, [open]);

  if (!open || !profile) return null;

  const fullAddress = [profile.facility.address1, profile.facility.address2, profile.facility.city, profile.facility.state, profile.facility.zip]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/60 p-2 md:p-4">
      <aside className="h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Official EPA Record</p>
            <h3 className="text-xl font-black text-white">{profile.facility.facilityName}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200">
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                activeTab === tab ? 'border-cyan-500/70 bg-cyan-900/40 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-200">
          {activeTab === 'EPA Facility Profile' ? (
            <>
              <p><strong>EPA Facility ID:</strong> {profile.facility.facilityId}</p>
              <p><strong>FRS ID:</strong> {profile.facility.frsId || 'Not reported'}</p>
              <p><strong>Industry Type:</strong> {profile.facility.reportedIndustryTypes || 'Not reported'}</p>
              <p><strong>Facility Type:</strong> {profile.facility.facilityTypes || 'Not reported'}</p>
            </>
          ) : null}
          {activeTab === 'Reported Emissions' ? (
            <>
              <p><strong>Total CO2e:</strong> {profile.emissions.totalCo2e?.toLocaleString() ?? 'Not available'}</p>
              <p><strong>Reporting Years:</strong> {profile.emissions.reportingYears.join(', ') || 'Not reported'}</p>
            </>
          ) : null}
          {activeTab === 'Gas Breakdown' ? (
            <div className="space-y-1">
              {profile.emissions.byGas.length === 0 ? <p>No gas breakdown available.</p> : null}
              {profile.emissions.byGas.map((gas) => (
                <p key={gas.gasId}>
                  <strong>{gas.gasCode || gas.gasName}:</strong> {gas.co2eEmission?.toLocaleString() ?? 'N/A'}
                </p>
              ))}
            </div>
          ) : null}
          {activeTab === 'Parent Company' ? <p><strong>Parent Company:</strong> {profile.facility.parentCompany || 'Not reported'}</p> : null}
          {activeTab === 'Location' ? <p><strong>Address:</strong> {fullAddress || 'Not reported'}</p> : null}
          {activeTab === 'DPAL Evidence Packet' ? (
            <>
              <p>DPAL Status: Official EPA Record Imported</p>
              <p>Source: U.S. EPA Envirofacts / GHGRP public data.</p>
              <p>Status: Official reported data, not an independent DPAL accusation.</p>
            </>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onOpenFacilityPage(profile.facility.facilityId)}
            className="rounded-lg border border-cyan-500/60 bg-cyan-900/30 px-3 py-2 text-xs font-semibold text-cyan-100"
          >
            Open Full Facility Evidence Page
          </button>
          <button type="button" className="rounded-lg border border-emerald-500/60 bg-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-100">
            Open Evidence Packet
          </button>
        </div>
      </aside>
    </div>
  );
};

export default EpaFacilityDetailDrawer;
