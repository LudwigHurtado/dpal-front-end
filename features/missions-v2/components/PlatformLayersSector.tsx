import React from 'react';
import type { LayerAction, LayerExecutionState } from '../types';
import { getLayerGateReason } from '../services/layerGating';
import { mw } from '../missionWorkspaceTheme';
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
  const btnBase =
    'rounded-lg border border-teal-900/55 bg-teal-950/60 px-2 py-1 text-[11px] text-teal-100/90 hover:border-teal-700/60 hover:bg-teal-950/90 disabled:opacity-50';
  const layerBtn = (action: LayerAction, label: string, runningLabel: string) => {
    const gate = getLayerGateReason(action, layers);
    const disabled = !!activeAction || !!gate;
    const title = gate || undefined;
    return (
      <button disabled={disabled} type="button" title={title} onClick={() => onAction(action)} className={btnBase}>
        {isRunning(action) ? runningLabel : label}
      </button>
    );
  };
  return (
    <SectorCard
      title="Service Layer Controls"
      subtitle="Report, evidence, validation, resolution — use the Escrow card above for lock / release / dispute"
    >
      <div className={`space-y-2 text-xs ${mw.textBody}`}>
        <p>
          Report: <span className="font-semibold text-teal-100">{layers.report}</span> · Evidence:{' '}
          <span className="font-semibold text-teal-100">{layers.evidence}</span>
        </p>
        <p>
          Validation: <span className="font-semibold text-teal-100">{layers.validation}</span> · Escrow (read-only):{' '}
          <span className="font-semibold text-teal-100">{layers.escrow}</span>
        </p>
        <p>
          Resolution: <span className="font-semibold text-teal-100">{layers.resolution}</span> · Outcome:{' '}
          <span className="font-semibold text-teal-100">{layers.outcome}</span>
        </p>
        <p>
          Reputation: <span className="font-semibold text-teal-100">{layers.reputation}</span> · Governance:{' '}
          <span className="font-semibold text-teal-100">{layers.governance}</span>
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
        <div className="mt-3 flex items-center justify-between rounded-lg border border-rose-800/50 bg-rose-950/40 p-2 text-xs text-rose-200">
          <span>{error}</span>
          <button type="button" onClick={onDismissError} className="rounded border border-rose-800/60 bg-rose-950/60 px-2 py-1 text-[11px] text-rose-100">
            Dismiss
          </button>
        </div>
      ) : null}
    </SectorCard>
  );
};

export default PlatformLayersSector;
