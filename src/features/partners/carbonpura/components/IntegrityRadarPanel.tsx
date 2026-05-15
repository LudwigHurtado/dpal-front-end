import React from 'react';

type IntegrityItem = {
  id: string;
  title: string;
  detail: string;
  status: 'pending' | 'live_partial';
};

const ITEMS: IntegrityItem[] = [
  {
    id: 'geoledger',
    title: 'GeoLedger boundary fingerprint',
    detail: 'Anchors boundaries and evidence events for traceability. Connection pending at CarbonPura aggregation layer.',
    status: 'pending',
  },
  {
    id: 'gps-aoi',
    title: 'GPS / AOI / geohash',
    detail: 'Live inside Water Monitor, AquaScan, and Plastic Watch when operators define AOIs — not centralized here yet.',
    status: 'live_partial',
  },
  {
    id: 'anchor',
    title: 'Blockchain anchor / hash',
    detail: 'Module-native evidence hashes exist (e.g. Plastic Watch evidence packet). Cross-module anchor view pending.',
    status: 'live_partial',
  },
  {
    id: 'overlap',
    title: 'Coordinate overlap scan',
    detail: 'Planned double-counting review across project boundaries. No live detection shown from this hub.',
    status: 'pending',
  },
  {
    id: 'double-count',
    title: 'Double-counting risk',
    detail: 'Traditional systems often track credits after issuance. DPAL also tracks boundary, evidence, and claims before market use — aggregation pending.',
    status: 'pending',
  },
  {
    id: 'serial',
    title: 'Serial number decoder',
    detail: 'Connection pending.',
    status: 'pending',
  },
  {
    id: 'registry-conflict',
    title: 'Registry conflict check',
    detail: 'Connection pending — no fabricated conflict results.',
    status: 'pending',
  },
  {
    id: 'buyer-claim',
    title: 'Buyer / claim conflict',
    detail: 'Connection pending.',
    status: 'pending',
  },
  {
    id: 'ai-consistency',
    title: 'AI-agent consistency review',
    detail: 'Field OS / Navigator assistance available elsewhere; CarbonPura-wide consistency pass pending.',
    status: 'pending',
  },
];

function statusBadge(status: IntegrityItem['status']) {
  if (status === 'live_partial') {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
        Live in modules
      </span>
    );
  }
  return (
    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
      Connection pending
    </span>
  );
}

export function IntegrityRadarPanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-slate-900">Integrity radar</h2>
      <p className="mt-2 text-sm text-slate-600">
        GeoLedger anchors boundaries and evidence events to support traceability and double-counting review. This panel
        lists planned checks — it does not fabricate active detections.
      </p>
      <ul className="mt-4 space-y-3">
        {ITEMS.map((item) => (
          <li key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              {statusBadge(item.status)}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
