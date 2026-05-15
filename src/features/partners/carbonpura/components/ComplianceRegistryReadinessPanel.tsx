import React from 'react';

const REGISTRY_ITEMS = [
  { id: 'a6', title: 'Article 6 readiness', status: 'Connection pending' },
  { id: 'host', title: 'Host country authorization', status: 'Connection pending' },
  { id: 'itmo', title: 'ITMO / first transfer tracker', status: 'Connection pending' },
  { id: 'ca', title: 'Corresponding adjustment risk', status: 'Connection pending' },
  { id: 'corsia', title: 'CORSIA screening', status: 'Connection pending' },
  { id: 'labels', title: 'Voluntary / compliance labels', status: 'Connection pending' },
  { id: 'cad', title: 'CAD Trust-style export', status: 'Connection pending' },
  { id: 'api', title: 'Registry / API export', status: 'Connection pending' },
] as const;

export function ComplianceRegistryReadinessPanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-slate-900">Registry readiness</h2>
      <p className="mt-2 text-sm text-slate-600">
        DPAL does not replace registries or Article 6 authorities. DPAL prepares structured, evidence-backed records
        that can support registry, validator, buyer, and public transparency workflows.
      </p>
      <p className="mt-3 text-xs text-slate-500">
        No fake compliance status is shown. Items below are planned checks — live only when wired to backend/registry
        adapters.
      </p>
      <ul className="mt-4 space-y-2">
        {REGISTRY_ITEMS.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm font-medium text-slate-800">{item.title}</span>
            <span className="text-xs font-medium text-slate-500">{item.status}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
