import React from 'react';
import type { EpaFacilityProfile } from '../../types/epa';

type Props = {
  rows: EpaFacilityProfile[];
  onOpenFacility: (facilityId: string) => void;
  onAddToPacket: (profile: EpaFacilityProfile) => void;
};

const EpaFacilityTable: React.FC<Props> = ({ rows, onOpenFacility, onAddToPacket }) => {
  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 md:p-5">
      <h2 className="text-base font-bold text-slate-100">Results</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[1100px] w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-300">
              <th className="px-2 py-2">Facility</th>
              <th className="px-2 py-2">Parent Company</th>
              <th className="px-2 py-2">City</th>
              <th className="px-2 py-2">State</th>
              <th className="px-2 py-2">Industry Type</th>
              <th className="px-2 py-2">Facility Type</th>
              <th className="px-2 py-2">Year</th>
              <th className="px-2 py-2">CO2e</th>
              <th className="px-2 py-2">Gas</th>
              <th className="px-2 py-2">Facility ID</th>
              <th className="px-2 py-2">DPAL Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.facility.facilityId} className="border-b border-slate-800 text-slate-100">
                <td className="px-2 py-2">{entry.facility.facilityName || 'Unknown'}</td>
                <td className="px-2 py-2">{entry.facility.parentCompany || 'Not reported'}</td>
                <td className="px-2 py-2">{entry.facility.city || 'N/A'}</td>
                <td className="px-2 py-2">{entry.facility.state || 'N/A'}</td>
                <td className="px-2 py-2">{entry.facility.reportedIndustryTypes || 'N/A'}</td>
                <td className="px-2 py-2">{entry.facility.facilityTypes || 'N/A'}</td>
                <td className="px-2 py-2">{entry.emissions.reportingYears[0] ?? entry.facility.year ?? 'N/A'}</td>
                <td className="px-2 py-2">{entry.emissions.totalCo2e?.toLocaleString() ?? 'N/A'}</td>
                <td className="px-2 py-2">{entry.emissions.byGas.map((g) => g.gasCode || g.gasName).join(', ') || 'N/A'}</td>
                <td className="px-2 py-2">{entry.facility.facilityId}</td>
                <td className="px-2 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenFacility(entry.facility.facilityId)}
                      className="rounded border border-cyan-500/60 bg-cyan-900/30 px-2 py-1 text-[11px] font-semibold text-cyan-100"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddToPacket(entry)}
                      className="rounded border border-emerald-500/60 bg-emerald-900/30 px-2 py-1 text-[11px] font-semibold text-emerald-100"
                    >
                      Add to investigation
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default EpaFacilityTable;
