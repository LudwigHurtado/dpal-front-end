import React from 'react';

export function PlasticPageExplainer(): React.ReactElement {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-900">What this page does</h3>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
          DPAL Plastic Watch helps users investigate possible plastic pollution by defining a scan area, checking
          satellite readiness, running a plastic-risk analysis, and generating a transparent evidence packet for
          review, validation, cleanup planning, or regulator/community reporting.
        </p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-amber-950">What this page does NOT do</h3>
        <p className="mt-2 text-[11px] leading-relaxed text-amber-950/90">
          This page does not claim that satellite imagery alone proves plastic is present. It identifies candidate risk
          zones and organizes evidence for validation.
        </p>
      </div>
      <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-sky-950">Best used for</h3>
        <ul className="mt-2 list-disc pl-4 text-[11px] leading-relaxed text-slate-700 space-y-1">
          <li>Coastal cleanup planning</li>
          <li>River-to-ocean plastic monitoring</li>
          <li>Port and industrial area review</li>
          <li>Storm debris assessment</li>
          <li>Community reporting</li>
          <li>ESG / environmental accountability</li>
          <li>Validator review</li>
        </ul>
      </div>
    </div>
  );
}
