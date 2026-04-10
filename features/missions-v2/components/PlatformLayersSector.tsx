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
  const btnBase = 'rounded px-2 py-1 text-[11px] disabled:opacity-50';
  return (
    <SectorCard title="Platform Layers Sector" subtitle="Cross-layer control panel for the DPAL architecture">
      <div className="space-y-2 text-xs text-zinc-300">
        <p>Report: <span className="text-zinc-100">{layers.report}</span> · Evidence: <span className="text-zinc-100">{layers.evidence}</span></p>
        <p>Validation: <span className="text-zinc-100">{layers.validation}</span> · Escrow: <span className="text-zinc-100">{layers.escrow}</span></p>
        <p>Resolution: <span className="text-zinc-100">{layers.resolution}</span> · Outcome: <span className="text-zinc-100">{layers.outcome}</span></p>
        <p>Reputation: <span className="text-zinc-100">{layers.reputation}</span> · Governance: <span className="text-zinc-100">{layers.governance}</span></p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={!!activeAction} type="button" onClick={() => onAction('syncReport')} className={`${btnBase} bg-zinc-800`}>{isRunning('syncReport') ? 'Syncing...' : 'Sync Report'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('collectEvidence')} className={`${btnBase} bg-zinc-800`}>{isRunning('collectEvidence') ? 'Collecting...' : 'Collect Evidence'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('approveValidation')} className={`${btnBase} bg-emerald-800`}>{isRunning('approveValidation') ? 'Approving...' : 'Approve'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('rejectValidation')} className={`${btnBase} bg-rose-800`}>{isRunning('rejectValidation') ? 'Rejecting...' : 'Reject'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('lockEscrow')} className={`${btnBase} bg-amber-800`}>{isRunning('lockEscrow') ? 'Locking...' : 'Lock Escrow'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('releaseEscrow')} className={`${btnBase} bg-emerald-800`}>{isRunning('releaseEscrow') ? 'Releasing...' : 'Release Escrow'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('disputeEscrow')} className={`${btnBase} bg-rose-800`}>{isRunning('disputeEscrow') ? 'Disputing...' : 'Dispute Escrow'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('startResolution')} className={`${btnBase} bg-zinc-800`}>{isRunning('startResolution') ? 'Starting...' : 'Start Resolution'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('resolveCase')} className={`${btnBase} bg-emerald-800`}>{isRunning('resolveCase') ? 'Resolving...' : 'Resolve'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('recordOutcome')} className={`${btnBase} bg-cyan-800`}>{isRunning('recordOutcome') ? 'Recording...' : 'Record Outcome'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('awardReputation')} className={`${btnBase} bg-cyan-800`}>{isRunning('awardReputation') ? 'Awarding...' : 'Award Reputation'}</button>
        <button disabled={!!activeAction} type="button" onClick={() => onAction('closeGovernance')} className={`${btnBase} bg-zinc-800`}>{isRunning('closeGovernance') ? 'Closing...' : 'Close Governance'}</button>
      </div>
      {error ? (
        <div className="mt-3 flex items-center justify-between rounded border border-rose-900 bg-rose-950/40 p-2 text-xs text-rose-200">
          <span>{error}</span>
          <button type="button" onClick={onDismissError} className="rounded bg-rose-900 px-2 py-1 text-[11px]">
            Dismiss
          </button>
        </div>
      ) : null}
    </SectorCard>
  );
};

export default PlatformLayersSector;
