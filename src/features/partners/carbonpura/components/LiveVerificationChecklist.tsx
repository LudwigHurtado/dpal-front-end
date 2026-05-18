import React from 'react';
import { VIEW_PATHS } from '../../../../../utils/appRoutes';

type CheckItem = {
  id: string;
  label: string;
  path: string;
  manual: boolean;
};

const ROUTE_CHECKS: CheckItem[] = [
  { id: 'water-monitor', label: '/water/monitor opens', path: VIEW_PATHS.waterOperationsEngine, manual: true },
  { id: 'aquascan', label: '/water/aquascan opens', path: VIEW_PATHS.aquaScanWater, manual: true },
  { id: 'plastic', label: '/hyperspectral-plastic-watch opens', path: VIEW_PATHS.hyperspectralPlasticWatch, manual: true },
  { id: 'carbon', label: '/carbon opens', path: VIEW_PATHS.carbonDMRV, manual: true },
  { id: 'forest', label: '/forest-integrity opens', path: VIEW_PATHS.forestIntegrity, manual: true },
  { id: 'air', label: '/air opens', path: VIEW_PATHS.airQualityMonitor, manual: true },
  { id: 'hazard', label: '/hazardous-waste-audit opens', path: VIEW_PATHS.hazardousWasteAudit, manual: true },
  { id: 'env-hub', label: '/environmental-intelligence opens', path: VIEW_PATHS.environmentalIntelligenceHub, manual: true },
];

const POLICY_CHECKS = [
  'Provider status displayed where safe (no auto-scan from hub)',
  'No fake live readings on this command center',
  'Sample/demo project IDs clearly labeled when used in context links',
  'Context links do not break target modules (query params ignored until wired)',
  'npm run lint and npm run build pass',
] as const;

export function LiveVerificationChecklist() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-slate-900">Live verification checklist</h2>
      <p className="mt-1 text-sm text-slate-600">Manual QA items for CarbonPura partner launch.</p>
      <ul className="mt-4 space-y-2">
        {ROUTE_CHECKS.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-sm text-slate-800">{item.label}</span>
            <a
              href={item.path}
              className="shrink-0 text-xs font-semibold text-teal-700 hover:text-teal-900"
              target="_blank"
              rel="noreferrer"
            >
              Test route
            </a>
          </li>
        ))}
        {POLICY_CHECKS.map((label) => (
          <li key={label} className="flex items-start gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-700">
            <span className="mt-0.5 text-slate-400" aria-hidden>
              ☐
            </span>
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
