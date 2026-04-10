import React from 'react';
import type { LayerAction, LayerExecutionState } from '../types';
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
  return (
    <SectorCard title="Service Layer Controls" subtitle="Report, evidence, validation, escrow, resolution, outcome, reputation, governance">
      <div className="space-y-2 text-xs text-slate-700">
        <p>Report: <span className="font-semibold">{layers.report}</span> · Evidence: <span className="font-semibold">{layers.evidence}</span></p>
        <p>Validation: <span className="font-semibold">{layers.validation}</span> · Escrow: <span className="font-semibold">{layers.escrow}</span></p>
        <p>Resolution: <span className="font-semibold">{layers.resolution}</span> · Outcome: <span className="font-semibold">{layers.outcome}</span></p>
        <p>Reputation: <span className="font-semibold">{layers.reputation}</span> · Governance: <span className="font-semibold">{layers.governance}</span></p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={!!activeAction} type="button" onClick={() => onAction('syncReport')} className={btnBase}>{isRunning('syncReport') ? 'Syncing...' : 'Sync Report'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('collectEvidence')} className={btnBase}>{isRunning('collectEvidence') ? 'Collecting...' : 'Collect Evidence'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('approveValidation')} className={btnBase}>{isRunning('approveValidation') ? 'Approving...' : 'Approve'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('rejectValidation')} className={btnBase}>{isRunning('rejectValidation') ? 'Rejecting...' : 'Reject'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('lockEscrow')} className={btnBase}>{isRunning('lockEscrow') ? 'Locking...' : 'Lock Escrow'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('releaseEscrow')} className={btnBase}>{isRunning('releaseEscrow') ? 'Releasing...' : 'Release Escrow'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('disputeEscrow')} className={btnBase}>{isRunning('disputeEscrow') ? 'Disputing...' : 'Dispute Escrow'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('startResolution')} className={btnBase}>{isRunning('startResolution') ? 'Starting...' : 'Start Resolution'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('resolveCase')} className={btnBase}>{isRunning('resolveCase') ? 'Resolving...' : 'Resolve'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('recordOutcome')} className={btnBase}>{isRunning('recordOutcome') ? 'Recording...' : 'Record Outcome'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('awardReputation')} className={btnBase}>{isRunning('awardReputation') ? 'Awarding...' : 'Award Reputation'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('closeGovernance')} className={btnBase}>{isRunning('closeGovernance') ? 'Closing...' : 'Close Governance'}</button>
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
