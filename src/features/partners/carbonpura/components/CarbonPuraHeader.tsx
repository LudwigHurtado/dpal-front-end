import React from 'react';

type CarbonPuraHeaderProps = {
  onReturn?: () => void;
};

export function CarbonPuraHeader({ onReturn }: CarbonPuraHeaderProps) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          {onReturn ? (
            <button
              type="button"
              onClick={onReturn}
              className="mb-3 text-sm font-medium text-teal-700 hover:text-teal-900"
            >
              ← Back
            </button>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Partner command center</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            CarbonPura Live Environmental Integrity OS
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">
            Powered by DPAL — live access to water monitoring, AquaScan satellite analysis, PACE plastic intelligence,
            carbon MRV, forest integrity, air quality, hazardous waste audits, GeoLedger evidence, and registry-ready
            reporting.
          </p>
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 md:text-sm">
            DPAL provides live environmental intelligence, evidence organization, monitoring support, and interoperability
            readiness. Final certification, validation, Article 6 authorization, or registry approval remains subject to
            the applicable authority, registry, standard, or validator.
          </p>
        </div>
        <aside className="shrink-0 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-xs text-teal-900 md:max-w-xs">
          CarbonPura gets the branded operating system. DPAL supplies the infrastructure. This workspace taps into
          existing DPAL engines instead of rebuilding them.
        </aside>
      </div>
    </header>
  );
}
