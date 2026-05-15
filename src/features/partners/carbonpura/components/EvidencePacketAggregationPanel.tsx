import React from 'react';

const CONSTITUENTS = [
  'Water Monitor report (live in /water/monitor when saved)',
  'AquaScan evidence (live when operator runs AOI workflow)',
  'PACE Plastic Watch evidence (live when operator runs scan + packet)',
  'Carbon / Forest / Air / Hazard context (module-native exports)',
] as const;

const EXPORT_PLACEHOLDERS = [
  { id: 'qr', label: 'QR evidence page', status: 'Connection pending' },
  { id: 'pdf', label: 'PDF export', status: 'Connection pending' },
  { id: 'json', label: 'JSON export', status: 'Live in individual modules where implemented' },
  { id: 'validator', label: 'Validator status', status: 'Live in Water Operations validator queue' },
  { id: 'public', label: 'Public / non-confidential evidence', status: 'Connection pending' },
  { id: 'raw-hash', label: 'Raw data hash', status: 'Live in module evidence packets where available' },
  { id: 'packet-hash', label: 'Combined evidence packet hash', status: 'Aggregation pending' },
] as const;

export function EvidencePacketAggregationPanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-slate-900">Evidence packet readiness</h2>
      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Live modules available; cross-module evidence aggregation pending.
      </p>
      <p className="mt-3 text-sm text-slate-600">
        Intended live aggregation: Water Monitor report + AquaScan evidence + PACE Plastic Watch evidence + Carbon / Forest
        / Air / Hazard context → Combined CarbonPura Evidence Packet. Do not treat this hub as a fabricated combined
        packet.
      </p>
      <ul className="mt-4 space-y-2">
        {CONSTITUENTS.map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="text-teal-600" aria-hidden>
              +
            </span>
            {line}
          </li>
        ))}
      </ul>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {EXPORT_PLACEHOLDERS.map((row) => (
          <div
            key={row.id}
            className="flex flex-col rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm font-medium text-slate-800">{row.label}</span>
            <span className="text-xs text-slate-500">{row.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
