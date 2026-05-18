import React from 'react';
import type { DeepAlRationale } from '../conversation/conversationTypes';

export type AiRationalePanelProps = {
  rationale: DeepAlRationale | null;
  visible?: boolean;
  title?: string;
  className?: string;
};

export function AiRationalePanel({
  rationale,
  visible = true,
  title = 'DeepAL Rationale',
  className = '',
}: AiRationalePanelProps): React.ReactElement | null {
  if (!visible || !rationale) return null;

  const rows: { label: string; value: string }[] = [
    { label: 'User request', value: rationale.userRequest },
    { label: 'Detected intent', value: rationale.detectedIntent },
    { label: 'Workspace / module', value: rationale.workspaceModule },
    { label: 'Model provider', value: rationale.modelProvider },
    { label: 'Data considered', value: rationale.projectDataConsidered },
    {
      label: 'Missing information',
      value: rationale.missingInformation.length
        ? rationale.missingInformation.join(' · ')
        : 'None flagged',
    },
    { label: 'Action recommended', value: rationale.actionRecommended || '—' },
    { label: 'Final answer', value: rationale.finalAnswer },
    { label: 'Spoken text', value: rationale.spokenText || '—' },
    { label: 'Voice status', value: rationale.voiceStatus },
  ];

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-slate-50/90 p-3 ${className}`.trim()}
      aria-label={title}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">{title}</p>
      <p className="mt-0.5 text-[10px] text-slate-500">AI decision record — audit-safe summary (no hidden reasoning).</p>
      <dl className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
            <dd className="mt-0.5 text-xs leading-relaxed text-slate-800">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
