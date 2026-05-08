import React, { useMemo } from 'react';
import { CheckCircle, ChevronRight } from '../../../../components/icons';
import type { WaterIntelWorkflowStepBase } from '../waterIntelligenceWorkflow';

export interface WaterIntelligenceWorkflowPanelProps<T extends string> {
  heading: string;
  subheading?: string;
  steps: Array<WaterIntelWorkflowStepBase & { id: T }>;
  completedIds: T[];
  onOpenRelated: (stepId: T) => void;
  onMarkComplete: (stepId: T) => void;
}

function WaterIntelligenceWorkflowPanel<T extends string>({
  heading,
  subheading,
  steps,
  completedIds,
  onOpenRelated,
  onMarkComplete,
}: WaterIntelligenceWorkflowPanelProps<T>): React.ReactElement {
  const activeId = useMemo(() => {
    const firstOpen = steps.find((s) => !completedIds.includes(s.id));
    return firstOpen?.id ?? null;
  }, [steps, completedIds]);

  return (
    <div
      className="rounded-2xl p-5 border dpal-border-subtle space-y-3"
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">{heading}</span>
        {subheading && <p className="text-xs dpal-text-secondary">{subheading}</p>}
      </div>

      <ol className="space-y-3">
        {steps.map((step) => {
          const done = completedIds.includes(step.id);
          const isNext = activeId === step.id;
          return (
            <li
              key={step.id}
              className="rounded-xl p-3 space-y-2"
              style={{
                background: isNext
                  ? 'rgba(34,211,238,0.12)'
                  : done
                    ? 'rgba(34,197,94,0.08)'
                    : 'var(--dpal-surface-alt)',
                border: `1px solid ${
                  isNext ? 'rgba(34,211,238,0.45)' : done ? 'rgba(34,197,94,0.35)' : 'var(--dpal-border)'
                }`,
              }}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle className="w-4 h-4" style={{ color: '#86efac' }} />
                  ) : (
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                      style={{
                        background: isNext ? 'rgba(34,211,238,0.25)' : 'var(--dpal-surface)',
                        color: isNext ? '#22d3ee' : 'var(--dpal-text-muted)',
                        border: `1px solid ${isNext ? 'rgba(34,211,238,0.5)' : 'var(--dpal-border)'}`,
                      }}
                    >
                      {steps.indexOf(step) + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                      {step.title}
                    </span>
                    {isNext && !done && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(34,211,238,0.2)', color: '#67e8f9' }}
                      >
                        Next step
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] dpal-text-secondary leading-snug">
                    <span className="font-semibold dpal-text-muted">Purpose: </span>
                    {step.purpose}
                  </p>
                  <div
                    className="rounded-lg px-2 py-1.5 text-[10px]"
                    style={{ background: 'var(--dpal-surface)', border: '1px dashed var(--dpal-border)' }}
                  >
                    <span className="font-bold uppercase tracking-wide dpal-text-muted">AI suggestion · </span>
                    <span className="dpal-text-secondary">{step.aiHint}</span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wide dpal-text-muted pt-1">
                    Checklist
                  </div>
                  <ul className="text-[11px] dpal-text-secondary list-disc pl-4 space-y-0.5">
                    {step.checklist.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenRelated(step.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border dpal-border-subtle"
                      style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
                    >
                      {step.openTabLabel}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={done}
                      onClick={() => onMarkComplete(step.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-45"
                      style={{
                        background: done ? 'var(--dpal-surface-alt)' : 'var(--dpal-primary)',
                        color: done ? 'var(--dpal-text-muted)' : 'var(--md-sys-color-on-primary, #00201a)',
                      }}
                    >
                      {step.continueLabel}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default WaterIntelligenceWorkflowPanel;
