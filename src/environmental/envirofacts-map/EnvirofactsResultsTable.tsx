import React from 'react';
import type { EnvirofactsRecord } from '../../types/envirofactsTypes';

type Props = {
  rows: EnvirofactsRecord[];
  onOpen: (recordId: string) => void;
  onAddEvidence: (recordId: string) => void;
  onCompareSatellite?: (recordId: string) => void;
  onCreateInvestigation?: (recordId: string) => void;
};

const btn =
  'rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40';

const EnvirofactsResultsTable: React.FC<Props> = ({
  rows,
  onOpen,
  onAddEvidence,
  onCompareSatellite,
  onCreateInvestigation,
}) => {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="rounded-xl border border-slate-700/90 bg-slate-900/75 p-4 shadow-sm md:p-5">
      <h2 className="text-sm font-semibold tracking-wide text-slate-100">Results</h2>
      <p className="mt-1 text-xs text-slate-500">Official EPA fields normalized for review. Coordinates may be absent even when the record is valid.</p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800/80">
        <table className="min-w-[1650px] w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-950/80 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2">Facility / Record</th>
            <th className="px-3 py-2">Address</th>
            <th className="px-3 py-2">City</th>
            <th className="px-3 py-2">County</th>
            <th className="px-3 py-2">State</th>
            <th className="px-3 py-2">ZIP</th>
            <th className="px-3 py-2">Registry ID</th>
            <th className="px-3 py-2">Coordinates</th>
            <th className="px-3 py-2">EPA source flags</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">DPAL status</th>
            <th className="px-3 py-2">Actions</th>
            <th className="px-3 py-2">More</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <React.Fragment key={row.id}>
              <tr className="border-b border-slate-800/90 text-slate-200">
                <td className="px-3 py-2 font-medium text-slate-100">{row.facilityName || row.recordName || 'EPA Record'}</td>
                <td className="max-w-[240px] px-3 py-2 text-slate-400">{row.address || '—'}</td>
                <td className="px-3 py-2">{row.city || '—'}</td>
                <td className="px-3 py-2">{row.county || '—'}</td>
                <td className="px-3 py-2">{row.state || '—'}</td>
                <td className="px-3 py-2">{row.zip || '—'}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{row.recordId || '—'}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-slate-400">
                  {row.pinnable ? `${row.latitude}, ${row.longitude}` : 'Unavailable'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex max-w-[220px] flex-wrap gap-1">
                    {row.sourceFlags.length ? (
                      row.sourceFlags.map((flag) => (
                        <span key={`${row.id}-${flag}`} className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] text-slate-300">
                          {flag}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-300">{row.environmentalCategory || '—'}</td>
                <td className="max-w-[220px] px-3 py-2 text-[10px] leading-snug text-slate-400">{row.dpalReviewStatus}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <button type="button" className={btn} onClick={() => onOpen(row.id)}>
                      Open Details
                    </button>
                    <button type="button" className={btn} onClick={() => onAddEvidence(row.id)}>
                      Add to Evidence Packet
                    </button>
                    <button
                      type="button"
                      className={btn}
                      title="Satellite comparison workflow"
                      onClick={() => onCompareSatellite?.(row.id)}
                    >
                      Compare Satellite Data
                    </button>
                    <button
                      type="button"
                      className={btn}
                      title="Investigation workflow"
                      onClick={() => onCreateInvestigation?.(row.id)}
                    >
                      Create Investigation
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2 align-top">
                  <button type="button" className={btn} onClick={() => toggleExpanded(row.id)}>
                    {expanded[row.id] ? 'Less' : 'More'}
                  </button>
                </td>
              </tr>
              {expanded[row.id] ? (
                <tr className="border-b border-slate-800/90 text-slate-300">
                  <td colSpan={13} className="px-3 py-3 text-[11px]">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      <p><span className="text-slate-500">Source database:</span> {row.sourceDatabase || 'N/A'}</p>
                      <p><span className="text-slate-500">EPA table:</span> {row.sourceTable || 'N/A'}</p>
                      <p><span className="text-slate-500">Layer tags:</span> {row.layerTags.length ? row.layerTags.join(', ') : 'facilities'}</p>
                      <p><span className="text-slate-500">Water body:</span> {row.waterBody || 'N/A'}</p>
                      <p><span className="text-slate-500">Compliance status:</span> {row.complianceStatus || 'N/A'}</p>
                      <p><span className="text-slate-500">Pinnable:</span> {row.pinnable ? 'Yes' : 'No'}</p>
                      <p><span className="text-slate-500">Enforcement cue:</span> {row.enforcementCue ? 'Present' : 'Not detected'}</p>
                      <p><span className="text-slate-500">Registry ID present:</span> {row.hasRegistryId ? 'Yes' : 'No'}</p>
                      <p><span className="text-slate-500">Record key:</span> {row.id}</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  </section>
  );
};

export default EnvirofactsResultsTable;
