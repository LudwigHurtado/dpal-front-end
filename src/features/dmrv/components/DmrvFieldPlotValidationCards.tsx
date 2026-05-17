import React from 'react';
import type { FieldPlotValidationRule } from '../services/dmrvFieldPlotConfigTypes';

const STATUS_UI = {
  pass: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/60',
    badge: 'bg-emerald-100 text-emerald-900',
    label: 'Pass',
  },
  missing: {
    border: 'border-rose-200',
    bg: 'bg-rose-50/40',
    badge: 'bg-rose-100 text-rose-900',
    label: 'Missing',
  },
  needs_review: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/60',
    badge: 'bg-amber-100 text-amber-900',
    label: 'Needs review',
  },
} as const;

export type DmrvFieldPlotValidationCardsProps = {
  rules: FieldPlotValidationRule[];
  disabled?: boolean;
  onScrollToField: (fieldKey: string) => void;
};

export function DmrvFieldPlotValidationCards({
  rules,
  disabled = false,
  onScrollToField,
}: DmrvFieldPlotValidationCardsProps): React.ReactElement {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">
        Validation rules explain what reviewers expect before field evidence can support satellite MRV and blockchain
        anchoring.
      </p>
      {rules.map((rule) => {
        const ui = STATUS_UI[rule.status];
        return (
          <article
            key={rule.id}
            className={`rounded-xl border p-4 ${ui.border} ${ui.bg}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-[#1e3a5f]">{rule.name}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ui.badge}`}>
                {ui.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">{rule.whyItMatters}</p>
            {rule.fixHint ? (
              <p className="mt-2 text-[11px] font-medium text-slate-700">{rule.fixHint}</p>
            ) : null}
            {rule.fieldKey && rule.status !== 'pass' ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onScrollToField(rule.fieldKey!)}
                className="mt-2 rounded-lg border border-[#1e3a5f]/25 bg-white px-3 py-1.5 text-[11px] font-bold text-[#1e3a5f] hover:bg-[#e8f0f7] disabled:opacity-50"
              >
                Fix — go to field
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
