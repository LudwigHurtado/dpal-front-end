import React from 'react';
import type { LayerAction, LayerExecutionState } from '../types';
import { getLayerGateReason } from '../services/layerGating';
import SectorCard from './SectorCard';

interface PlatformLayersSectorProps {
  layers: LayerExecutionState;
  activeAction: LayerAction | null;
  error: string | null;
  onAction: (action: LayerAction) => void;
  onDismissError: () => void;
}

const PlatformLayersSector: React.FC<PlatformLayersSectorProps> = ({
  layers,
  activeAction,
  error,
  onAction,
  onDismissError,
}) => {
  const isRunning = (action: LayerAction) => activeAction === action;
  const btnBase = 'rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 disabled:opacity-50';
  const layerBtn = (action: LayerAction, label: string, runningLabel: string) => {
    const gate = getLayerGateReason(action, layers);
    const disabled = !!activeAction || !!gate;
    const title = gate || undefined;
    return (
      <button
        disabled={disabled}
        type="button"
        title={title}
        onClick={() => onAction(action)}
        className={btnBase}
      >
        {isRunning(action) ? runningLabel : label}
      </button>
    );
  };
  return (
    <SectorCard
      title="Service Layer Controls"
      subtitle="Report, evidence, validation, resolution — use the Escrow card above for lock / release / dispute"
    >
      <div className="space-y-2 text-xs text-slate-700">
        <p>
          Report: <span className="font-semibold">{layers.report}</span> · Evidence:{' '}
          <span className="font-semibold">{layers.evidence}</span>
        </p>
        <p>
          Validation: <span className="font-semibold">{layers.validation}</span> · Escrow (read-only):{' '}
          <span className="font-semibold">{layers.escrow}</span>
        </p>
        <p>
          Resolution: <span className="font-semibold">{layers.resolution}</span> · Outcome:{' '}
          <span className="font-semibold">{layers.outcome}</span>
        </p>
        <p>
          Reputation: <span className="font-semibold">{layers.reputation}</span> · Governance:{' '}
          <span className="font-semibold">{layers.governance}</span>
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {layerBtn('syncReport', 'Sync Report', 'Syncing...')}
        {layerBtn('collectEvidence', 'Collect Evidence', 'Collecting...')}
        {layerBtn('approveValidation', 'Approve', 'Approving...')}
        {layerBtn('rejectValidation', 'Reject', 'Rejecting...')}
        {layerBtn('startResolution', 'Start Resolution', 'Starting...')}
        {layerBtn('resolveCase', 'Resolve', 'Resolving...')}
        {layerBtn('recordOutcome', 'Record Outcome', 'Recording...')}
        {layerBtn('awardReputation', 'Award Reputation', 'Awarding...')}
        {layerBtn('closeGovernance', 'Close Governance', 'Closing...')}
      </div>
      {error ? (
        <div className="mt-3 flex items-center justify-between rounded border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={onDismissError} className="rounded bg-rose-100 px-2 py-1 text-[11px]">
            Dismiss
          </button>
        </div>
      ) : null}
    </SectorCard>
  );
};

export default PlatformLayersSector;
