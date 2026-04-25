import React from 'react';
import type { EnvirofactsRecord } from '../../types/envirofactsTypes';

type Props = {
  rows: EnvirofactsRecord[];
  onOpen: (recordId: string) => void;
  onAddEvidence: (recordId: string) => void;
};

const EnvirofactsResultsTable: React.FC<Props> = ({ rows, onOpen, onAddEvidence }) => (
  <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 md:p-5">
    <h2 className="text-base font-bold text-slate-100">Results Table</h2>
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-[1100px] w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-700 text-slate-300">
            <th className="px-2 py-2">Facility/Record</th>
            <th className="px-2 py-2">Source</th>
            <th className="px-2 py-2">Category</th>
            <th className="px-2 py-2">City</th>
            <th className="px-2 py-2">State</th>
            <th className="px-2 py-2">County</th>
            <th className="px-2 py-2">ZIP</th>
            <th className="px-2 py-2">Coordinates</th>
            <th className="px-2 py-2">DPAL Status</th>
            <th className="px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-800 text-slate-100">
              <td className="px-2 py-2">{row.facilityName || row.recordName || 'EPA Record'}</td>
              <td className="px-2 py-2">{row.sourceDatabase}</td>
              <td className="px-2 py-2">{row.environmentalCategory || 'Facilities'}</td>
              <td className="px-2 py-2">{row.city || 'N/A'}</td>
              <td className="px-2 py-2">{row.state || 'N/A'}</td>
              <td className="px-2 py-2">{row.county || 'N/A'}</td>
              <td className="px-2 py-2">{row.zip || 'N/A'}</td>
              <td className="px-2 py-2">
                {row.latitude != null && row.longitude != null ? `${row.latitude}, ${row.longitude}` : 'coordinates unavailable'}
              </td>
              <td className="px-2 py-2">Public Data Baseline</td>
              <td className="px-2 py-2">
                <div className="flex gap-2">
                  <button type="button" onClick={() => onOpen(row.id)} className="rounded border border-cyan-500/60 bg-cyan-900/30 px-2 py-1 text-[11px] text-cyan-100">Open</button>
                  <button type="button" onClick={() => onAddEvidence(row.id)} className="rounded border border-emerald-500/60 bg-emerald-900/30 px-2 py-1 text-[11px] text-emerald-100">Add</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export default EnvirofactsResultsTable;
