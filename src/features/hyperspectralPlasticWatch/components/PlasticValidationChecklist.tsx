import React from 'react';

const DEFAULT_ITEMS = [
  'Shoreline or water-surface photos at candidate zone',
  'Drone overflight or boat survey where safe and permitted',
  'Cleanup crew logs or community reports from the same window',
  'Water-quality context (turbidity, algae, sediment, foam)',
  'Independent validator review before public attribution claims',
];

type Props = {
  items?: string[];
  className?: string;
};

export function PlasticValidationChecklist({ items = DEFAULT_ITEMS, className = '' }: Props): React.ReactElement {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <h3 className="text-xs font-semibold text-slate-900">Field validation checklist</h3>
      <p className="mt-1 text-[10px] text-slate-600">
        Complete before treating any candidate plastic-risk zone as confirmed plastic.
      </p>
      <ul className="mt-2 space-y-1.5 text-[11px] text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border border-slate-300 bg-white" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
