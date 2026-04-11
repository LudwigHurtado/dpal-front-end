import React, { useState } from 'react';
import type { EscrowCondition, MissionEscrowRecord, MissionEscrowStatus } from '../types';

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
    <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800">Escrow</h3>
      <p className="mt-0.5 text-xs text-slate-500">Lead locks funds and requests release; Verifier approves or disputes.</p>

      {escrow.status === 'not_applicable' || !escrow.enabled ? (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          No escrow required for this mission.
        </p>
      ) : (
        <>
          <dl className="mt-3 space-y-2 text-xs text-slate-700">
            <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2">
              <dt className="font-semibold text-slate-500">Escrow status</dt>
              <dd className="font-medium">{formatEscrowStatus(escrow.status)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2">
              <dt className="font-semibold text-slate-500">Reward</dt>
              <dd>{rewardLabel}</dd>
            </div>
            {escrow.lockedAt ? (
              <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="font-semibold text-slate-500">Locked</dt>
                <dd className="text-right">
                  {escrow.lockedBy ?? '—'} · {new Date(escrow.lockedAt).toLocaleString()}
                </dd>
              </div>
            ) : null}
            {escrow.releaseRequestedAt ? (
              <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="font-semibold text-slate-500">Release requested</dt>
                <dd className="text-right">
                  {escrow.releaseRequestedBy ?? '—'} · {new Date(escrow.releaseRequestedAt).toLocaleString()}
                </dd>
              </div>
            ) : null}
            {escrow.approvedAt ? (
              <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="font-semibold text-slate-500">Approved</dt>
                <dd className="text-right">
                  {escrow.approvedBy ?? '—'} · {new Date(escrow.approvedAt).toLocaleString()}
                </dd>
              </div>
            ) : null}
            {escrow.disputedAt && escrow.disputeReason ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                <dt className="font-semibold text-amber-900">Dispute</dt>
                <dd className="mt-1 text-amber-950">
                  {escrow.disputedBy ?? 'Verifier'} · {new Date(escrow.disputedAt).toLocaleString()}
                </dd>
                <dd className="mt-1 whitespace-pre-wrap text-amber-950">{escrow.disputeReason}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={controlsDisabled || !canLock}
              onClick={onLock}
              className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lock Escrow
            </button>
            <button
              type="button"
              disabled={controlsDisabled || !canRequestRelease}
              onClick={onRequestRelease}
              className="rounded-md border border-cyan-600 bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Request Release
            </button>
            <button
              type="button"
              disabled={controlsDisabled || !canApproveRelease}
              onClick={onApproveRelease}
              className="rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Approve Release
            </button>
          </div>

          {escrow.status === 'release_requested' && canDispute ? (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50/80 p-3">
              <label className="text-xs font-semibold text-rose-900" htmlFor="escrow-dispute-reason">
                Dispute (verifier — reason required)
              </label>
              <textarea
                id="escrow-dispute-reason"
                rows={2}
                value={disputeDraft}
                onChange={(e) => setDisputeDraft(e.target.value)}
                className="mt-1 w-full rounded border border-rose-200 bg-white px-2 py-1 text-xs text-slate-800"
                placeholder="Explain why release should not proceed…"
              />
              <button
                type="button"
                disabled={!disputeDraft.trim() || !canDispute}
                onClick={() => {
                  onDispute(disputeDraft);
                  setDisputeDraft('');
                }}
                className="mt-2 rounded-md border border-rose-600 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Dispute
              </button>
            </div>
          ) : null}
        </>
      )}

      {hasRows ? (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold text-slate-500">Reference conditions</p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
            {conditions.map((item) => (
              <li key={item.label} className="rounded border border-slate-100 bg-slate-50/80 px-2 py-1">
                <span className="font-medium text-slate-700">{item.label}:</span> {item.value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default EscrowConditionsSector;
