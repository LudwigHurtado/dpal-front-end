import React from 'react';
import { CheckCircle, ShieldCheck, AlertTriangle } from '../../../../components/icons';
import type { FloodAlert, FloodAlertLifecycle } from '../floodGuardTypes';
import { LIFECYCLE_LABEL, LIFECYCLE_ORDER, lifecycleProgress } from './floodGuardUi';

interface FloodValidatorWorkflowPanelProps {
  alert: FloodAlert | null;
  onAdvance: (lifecycle: FloodAlertLifecycle) => void;
  onValidatorDecision?: (decision: 'approved' | 'rejected' | 'needs_evidence', notes?: string) => void;
  className?: string;
}

const FloodValidatorWorkflowPanel: React.FC<FloodValidatorWorkflowPanelProps> = ({
  alert,
  onAdvance,
  onValidatorDecision,
  className = '',
}) => {
  if (!alert) {
    return (
      <div
        className={`rounded-2xl p-5 border dpal-border-subtle ${className}`}
        style={{ background: 'var(--dpal-card)' }}
      >
        <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
          Validator Workflow
        </div>
        <div className="text-xs dpal-text-muted mt-2">
          Select an alert to review its validator state and lifecycle.
        </div>
      </div>
    );
  }

  const progress = lifecycleProgress(alert.lifecycle);

  return (
    <div
      className={`rounded-2xl p-5 border dpal-border-subtle ${className}`}
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
        <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
          Validator Workflow
        </div>
      </div>

      <div className="text-sm font-semibold mb-1" style={{ color: 'var(--dpal-text-primary)' }}>
        {alert.label} · {alert.zoneId}
      </div>
      <div className="text-[11px] dpal-text-muted mb-3">
        Lifecycle progress: <strong>{progress}%</strong> · Current state{' '}
        <strong>{LIFECYCLE_LABEL[alert.lifecycle]}</strong>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {LIFECYCLE_ORDER.map((stage) => {
          const reached = LIFECYCLE_ORDER.indexOf(stage) <= LIFECYCLE_ORDER.indexOf(alert.lifecycle);
          return (
            <button
              type="button"
              key={stage}
              onClick={() => onAdvance(stage)}
              className="text-[10px] font-semibold rounded-md px-2 py-1 transition"
              style={{
                background: reached ? 'rgba(34,211,238,0.15)' : 'var(--dpal-surface-alt)',
                color: reached ? '#22d3ee' : 'var(--dpal-text-secondary)',
                border: `1px solid ${reached ? 'rgba(34,211,238,0.4)' : 'var(--dpal-border)'}`,
              }}
            >
              {LIFECYCLE_LABEL[stage]}
            </button>
          );
        })}
      </div>

      {onValidatorDecision && (
        <div
          className="rounded-xl p-3"
          style={{ background: 'var(--dpal-surface-alt)' }}
        >
          <div className="text-[10px] uppercase tracking-wider dpal-text-muted mb-2">
            Human verification
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onValidatorDecision('approved')}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)' }}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve & route
            </button>
            <button
              type="button"
              onClick={() => onValidatorDecision('needs_evidence')}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15', border: '1px solid rgba(250,204,21,0.4)' }}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Needs evidence
            </button>
            <button
              type="button"
              onClick={() => onValidatorDecision('rejected')}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {alert.validatorReview && (
        <div
          className="mt-3 rounded-lg px-3 py-2 text-[11px]"
          style={{ background: 'var(--dpal-surface)', color: 'var(--dpal-text-secondary)' }}
        >
          Validator decision:{' '}
          <strong>{alert.validatorReview.decision.replace(/_/g, ' ')}</strong>
          {alert.validatorReview.reviewerHandle && (
            <> · by {alert.validatorReview.reviewerHandle}</>
          )}
          {alert.validatorReview.decidedAt && (
            <> · {new Date(alert.validatorReview.decidedAt).toLocaleString()}</>
          )}
        </div>
      )}
    </div>
  );
};

export default FloodValidatorWorkflowPanel;
