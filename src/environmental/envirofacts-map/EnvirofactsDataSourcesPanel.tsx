import React from 'react';

const EnvirofactsDataSourcesPanel: React.FC = () => (
  <section className="rounded-xl border border-slate-700/90 bg-slate-900/70 p-4 md:p-5 shadow-sm">
    <h2 className="text-sm font-semibold tracking-wide text-slate-100">How this data fits together</h2>
    <p className="mt-3 text-sm leading-relaxed text-slate-300">
      EPA Envirofacts gathers environmental records from multiple EPA systems, including Air, Water, Waste, Toxics, Land, Radiation,
      facility registries, substance registries, and compliance-related datasets. DPAL organizes those records into map-based evidence
      packets for review and comparison. Nothing on this page replaces official agency determinations or legal advice.
    </p>
    <p className="mt-3 text-xs leading-relaxed text-slate-500">
      Technical reference:{' '}
      <a
        className="text-slate-400 underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
        href="https://www.epa.gov/enviro/envirofacts-data-service-api"
        target="_blank"
        rel="noreferrer"
      >
        U.S. EPA Envirofacts Data Service API
      </a>
      {' · '}
      <span className="font-mono text-[11px]">https://data.epa.gov/efservice/</span>
    </p>
  </section>
);

export default EnvirofactsDataSourcesPanel;
