import React from 'react';
import { Link } from 'react-router-dom';
import {
  buildCarbonPuraContextUrl,
  CARBONPURA_DEFAULT_PROJECT_ID,
  CARBONPURA_MODULE_ROUTES,
} from '../carbonPuraProjectContext';
import { carbonPuraSectionAnchor } from '../carbonPuraSections';
import type { CarbonPuraViewMode } from './CarbonPuraSectionNav';

type CarbonPuraHeaderProps = {
  onReturn?: () => void;
  viewMode: CarbonPuraViewMode;
  onViewModeChange: (mode: CarbonPuraViewMode) => void;
};

const WATER_HREF = buildCarbonPuraContextUrl(CARBONPURA_MODULE_ROUTES.waterMonitor);
const AQUASCAN_HREF = buildCarbonPuraContextUrl(CARBONPURA_MODULE_ROUTES.aquaScan, CARBONPURA_DEFAULT_PROJECT_ID, {
  sourceSuite: 'OC_IOP',
});
const PLASTIC_HREF = buildCarbonPuraContextUrl(CARBONPURA_MODULE_ROUTES.plasticWatch, CARBONPURA_DEFAULT_PROJECT_ID, {
  sourceSuite: 'OC_AOP',
});

function scrollToEvidenceChain(): void {
  document.getElementById(carbonPuraSectionAnchor('evidence-chain'))?.scrollIntoView({ behavior: 'smooth' });
}

export function CarbonPuraHeader({ onReturn, viewMode, onViewModeChange }: CarbonPuraHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {onReturn ? (
              <button
                type="button"
                onClick={onReturn}
                className="text-sm font-medium text-teal-700 hover:text-teal-900"
              >
                ← Back
              </button>
            ) : null}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Project</p>
              <p className="text-sm font-semibold text-slate-900">CarbonPura Demo Project</p>
              <p className="font-mono text-[11px] text-slate-500">{CARBONPURA_DEFAULT_PROJECT_ID}</p>
            </div>
            <div className="hidden h-10 w-px bg-slate-200 sm:block" aria-hidden />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <p className="text-sm font-semibold text-amber-900">Evidence preparation</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={WATER_HREF}
              className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Start at Water Monitor
            </Link>
            <Link
              to={AQUASCAN_HREF}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Open AquaScan
            </Link>
            <Link
              to={PLASTIC_HREF}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Open Plastic Watch
            </Link>
            <button
              type="button"
              onClick={scrollToEvidenceChain}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900 hover:bg-indigo-100"
            >
              View Evidence Chain
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Partner command center</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
              CarbonPura Live Environmental Integrity OS
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Powered by DPAL — launch water monitoring, AquaScan satellite analysis, PACE plastic intelligence, carbon
              MRV, forest integrity, air quality, hazardous waste audits, GeoLedger evidence, and registry-ready
              reporting from existing live engines.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Workspace view</p>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange('executive')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  viewMode === 'executive' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Executive
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('technical')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  viewMode === 'technical' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Technical
              </button>
            </div>
          </div>
        </div>
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          DPAL provides live environmental intelligence, evidence organization, monitoring support, and interoperability
          readiness. Final certification, validation, Article 6 authorization, or registry approval remains subject to
          the applicable authority, registry, standard, or validator.
        </p>
      </div>
    </header>
  );
}
