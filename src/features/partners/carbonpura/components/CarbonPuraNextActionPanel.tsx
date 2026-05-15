import React from 'react';
import { Link } from 'react-router-dom';
import {
  buildCarbonPuraContextUrl,
  CARBONPURA_DEFAULT_PROJECT_ID,
  CARBONPURA_MODULE_ROUTES,
} from '../carbonPuraProjectContext';
import { carbonPuraSectionAnchor } from '../carbonPuraSections';

type ActionStatus =
  | 'Available now'
  | 'Module-local'
  | 'Backend event available'
  | 'QR pending'
  | 'Monitoring schedule pending';

type NextStep = {
  step: number;
  label: string;
  detail: string;
  status: ActionStatus;
  href?: string;
  anchorId?: string;
};

const STEPS: NextStep[] = [
  {
    step: 1,
    label: 'Open Water Monitor',
    detail: 'Create or select a water project on the live Water Operations Engine route.',
    status: 'Available now',
    href: buildCarbonPuraContextUrl(CARBONPURA_MODULE_ROUTES.waterMonitor),
  },
  {
    step: 2,
    label: 'Open AquaScan for AOI scan',
    detail: 'Run technical water-satellite analysis inside AquaScan when the operator is ready — not from this map.',
    status: 'Module-local',
    href: buildCarbonPuraContextUrl(CARBONPURA_MODULE_ROUTES.aquaScan, CARBONPURA_DEFAULT_PROJECT_ID, {
      sourceSuite: 'OC_IOP',
    }),
  },
  {
    step: 3,
    label: 'Open PACE Plastic Watch',
    detail: 'PACE supports a plastic-risk confidence layer — not standalone proof of plastic pollution.',
    status: 'Module-local',
    href: buildCarbonPuraContextUrl(CARBONPURA_MODULE_ROUTES.plasticWatch, CARBONPURA_DEFAULT_PROJECT_ID, {
      sourceSuite: 'OC_AOP',
    }),
  },
  {
    step: 4,
    label: 'Mark evidence for draft packet',
    detail: 'Select PACE suites or module outputs for local draft — cross-module scan outputs are not auto-attached.',
    status: 'Module-local',
    anchorId: carbonPuraSectionAnchor('evidence-chain'),
  },
  {
    step: 5,
    label: 'Create backend draft packet',
    detail: 'Backend aggregation pending until evidence-source events exist on the configured API host.',
    status: 'Backend event available',
    anchorId: carbonPuraSectionAnchor('evidence-chain'),
  },
  {
    step: 6,
    label: 'QR living evidence page',
    detail: 'QR living page pending — not implemented in this workspace.',
    status: 'QR pending',
  },
];

function statusClasses(status: ActionStatus): string {
  switch (status) {
    case 'Available now':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'Module-local':
      return 'border-teal-200 bg-teal-50 text-teal-900';
    case 'Backend event available':
      return 'border-indigo-200 bg-indigo-50 text-indigo-900';
    case 'QR pending':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'Monitoring schedule pending':
      return 'border-slate-200 bg-slate-50 text-slate-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

export function CarbonPuraNextActionPanel() {
  return (
    <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-white p-5 shadow-sm md:p-6">
      <h2 className="text-lg font-bold text-slate-900">Next best action</h2>
      <p className="mt-1 text-sm text-slate-600">
        Recommended operator path across live DPAL engines. Continuous monitoring schedule and validator approval remain
        pending at the hub layer.
      </p>
      <ol className="mt-4 space-y-3">
        {STEPS.map((item) => (
          <li
            key={item.step}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800 tabular-nums">
                {item.step}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.detail}</p>
                {item.href ? (
                  <Link to={item.href} className="mt-2 inline-block text-xs font-semibold text-teal-700 hover:text-teal-900">
                    Open module →
                  </Link>
                ) : item.anchorId ? (
                  <button
                    type="button"
                    onClick={() => document.getElementById(item.anchorId!)?.scrollIntoView({ behavior: 'smooth' })}
                    className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-900"
                  >
                    Go to evidence chain →
                  </button>
                ) : null}
              </div>
            </div>
            <span
              className={`inline-flex shrink-0 self-start rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusClasses(item.status)}`}
            >
              {item.status}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
