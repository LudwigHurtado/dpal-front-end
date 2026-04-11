import React, { useState } from 'react';
import type { EscrowCondition, MissionEscrowRecord, MissionEscrowStatus } from '../types';
import { mw } from '../missionWorkspaceTheme';

function formatEscrowStatus(status: MissionEscrowStatus): string {
  switch (status) {
    case 'not_applicable':
      return 'Not applicable';
    case 'pending_funding':
      return 'Pending funding';
    case 'locked':
      return 'Locked';
    case 'release_requested':
      return 'Release requested';
    case 'released':
      return 'Released';
    case 'disputed':
      return 'Disputed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

interface EscrowConditionsSectorProps {
  conditions: EscrowCondition[];
  escrow: MissionEscrowRecord;
  canLock: boolean;
  canRequestRelease: boolean;
  canApproveRelease: boolean;
  canDispute: boolean;
  onLock: () => void;
  onRequestRelease: () => void;
  onApproveRelease: () => void;
  onDispute: (reason: string) => void;
}

const EscrowConditionsSector: React.FC<EscrowConditionsSectorProps> = ({
  conditions,
  escrow,
  canLock,
  canRequestRelease,
  canApproveRelease,
  canDispute,
  onLock,
  onRequestRelease,
  onApproveRelease,
  onDispute,
}) => {
  const [disputeDraft, setDisputeDraft] = useState('');
  const hasRows = Array.isArray(conditions) && conditions.length > 0;
  const rewardLabel =
    escrow.rewardType === 'None' || !escrow.enabled
      ? 'No reward escrow'
      : `${escrow.rewardAmount.toLocaleString()} ${escrow.rewardType}`;

  const controlsDisabled = !escrow.enabled || escrow.status === 'not_applicable';

  return (
    <div className={`${mw.sectorCard}`}>
      <h3 className="text-sm font-bold text-teal-100">Escrow</h3>
      <p className={`mt-0.5 ${mw.textMuted}`}>Lead locks funds and requests release; Verifier approves or disputes.</p>

      {escrow.status === 'not_applicable' || !escrow.enabled ? (
        <p className={`mt-3 rounded-lg border border-teal-900/50 ${mw.innerWell} p-3 text-sm text-teal-100/90`}>
          No escrow required for this mission.
        </p>
      ) : (
        <>
          <dl className="mt-3 space-y-2 text-xs text-teal-100/90">
            <div className="flex flex-wrap justify-between gap-2 border-b border-teal-900/40 pb-2">
              <dt className={`font-semibold ${mw.textMuted}`}>Escrow status</dt>
              <dd className="font-medium">{formatEscrowStatus(escrow.status)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-teal-900/40 pb-2">
              <dt className={`font-semibold ${mw.textMuted}`}>Reward</dt>
              <dd>{rewardLabel}</dd>
            </div>
            {escrow.lockedAt ? (
              <div className="flex flex-wrap justify-between gap-2 border-b border-teal-900/40 pb-2">
                <dt className={`font-semibold ${mw.textMuted}`}>Locked</dt>
                <dd className="text-right">
                  {escrow.lockedBy ?? '—'} · {new Date(escrow.lockedAt).toLocaleString()}
                </dd>
              </div>
            ) : null}
            {escrow.releaseRequestedAt ? (
              <div className="flex flex-wrap justify-between gap-2 border-b border-teal-900/40 pb-2">
                <dt className={`font-semibold ${mw.textMuted}`}>Release requested</dt>
                <dd className="text-right">
                  {escrow.releaseRequestedBy ?? '—'} · {new Date(escrow.releaseRequestedAt).toLocaleString()}
                </dd>
              </div>
            ) : null}
            {escrow.approvedAt ? (
              <div className="flex flex-wrap justify-between gap-2 border-b border-teal-900/40 pb-2">
                <dt className={`font-semibold ${mw.textMuted}`}>Approved</dt>
                <dd className="text-right">
                  {escrow.approvedBy ?? '—'} · {new Date(escrow.approvedAt).toLocaleString()}
                </dd>
              </div>
            ) : null}
            {escrow.disputedAt && escrow.disputeReason ? (
              <div className="rounded-lg border border-amber-800/45 bg-amber-950/35 p-2">
                <dt className="font-semibold text-amber-200">Dispute</dt>
                <dd className="mt-1 text-amber-100/95">
                  {escrow.disputedBy ?? 'Verifier'} · {new Date(escrow.disputedAt).toLocaleString()}
                </dd>
                <dd className="mt-1 whitespace-pre-wrap text-amber-100/90">{escrow.disputeReason}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={controlsDisabled || !canLock}
              onClick={onLock}
              className="rounded-lg border border-teal-900/60 bg-teal-950/70 px-3 py-1.5 text-xs font-semibold text-teal-100 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-teal-900/80"
            >
              Lock Escrow
            </button>
            <button
              type="button"
              disabled={controlsDisabled || !canRequestRelease}
              onClick={onRequestRelease}
              className="rounded-lg border border-teal-600/50 bg-gradient-to-r from-teal-800 to-teal-600 px-3 py-1.5 text-xs font-semibold text-teal-50 shadow-[0_0_12px_rgba(13,148,136,0.35)] disabled:cursor-not-allowed disabled:opacity-50 hover:from-teal-700 hover:to-teal-500"
            >
              Request Release
            </button>
            <button
              type="button"
              disabled={controlsDisabled || !canApproveRelease}
              onClick={onApproveRelease}
              className="rounded-lg border border-emerald-700/50 bg-emerald-900/80 px-3 py-1.5 text-xs font-semibold text-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-emerald-800/90"
            >
              Approve Release
            </button>
          </div>

          {escrow.status === 'release_requested' && canDispute ? (
            <div className="mt-3 rounded-lg border border-rose-800/50 bg-rose-950/35 p-3">
              <label className="text-xs font-semibold text-rose-200" htmlFor="escrow-dispute-reason">
                Dispute (verifier — reason required)
              </label>
              <textarea
                id="escrow-dispute-reason"
                rows={2}
                value={disputeDraft}
                onChange={(e) => setDisputeDraft(e.target.value)}
                className="mt-1 w-full rounded-lg border border-rose-800/50 bg-slate-950/80 px-2 py-1 text-xs text-rose-100 placeholder:text-rose-900/50"
                placeholder="Explain why release should not proceed…"
              />
              <button
                type="button"
                disabled={!disputeDraft.trim() || !canDispute}
                onClick={() => {
                  onDispute(disputeDraft);
                  setDisputeDraft('');
                }}
                className="mt-2 rounded-lg border border-rose-700/50 bg-rose-900/80 px-3 py-1.5 text-xs font-semibold text-rose-50 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-rose-800/90"
              >
                Dispute
              </button>
            </div>
          ) : null}
        </>
      )}

      {hasRows ? (
        <div className="mt-4 border-t border-teal-900/40 pt-3">
          <p className={`text-xs font-semibold ${mw.textMuted}`}>Reference conditions</p>
          <ul className="mt-2 space-y-1.5 text-xs text-teal-200/85">
            {conditions.map((item) => (
              <li key={item.label} className={`rounded border border-teal-900/45 ${mw.innerWell} px-2 py-1`}>
                <span className="font-medium text-teal-100">{item.label}:</span> {item.value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default EscrowConditionsSector;
