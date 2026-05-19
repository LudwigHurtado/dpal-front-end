import React from 'react';
import { AlertTriangle } from '../../../components/icons';
import { getPublicAppBaseUrl } from '../../../utils/situationRoomPaths';

type Props = {
  roomId: string;
  onReturnHome?: () => void;
};

export default function SituationRoomNotFound({ roomId, onReturnHome }: Props): React.ReactElement {
  const scannedUrl = typeof window !== 'undefined' ? window.location.href : '';
  const displayRoomId = roomId?.trim() || '(missing room ID)';

  const reportIssue = () => {
    const subject = encodeURIComponent('Situation Room link not found');
    const body = encodeURIComponent(
      `Scanned URL: ${scannedUrl}\nRoom ID: ${displayRoomId}\n\nDescribe what you expected to see:`,
    );
    window.location.href = `mailto:support@dpal.info?subject=${subject}&body=${body}`;
  };

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-rose-900/50 bg-zinc-950 p-8 text-center">
      <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-rose-400" />
      <h1 className="text-lg font-bold text-white">Situation Room not found or not yet synced.</h1>
      <p className="mt-2 text-sm text-zinc-400">
        No workspace exists for room ID <span className="font-mono text-rose-300">{displayRoomId}</span>.
      </p>
      <dl className="mt-4 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-left text-xs text-zinc-400">
        <div>
          <dt className="font-bold uppercase tracking-wider text-zinc-500">Scanned URL</dt>
          <dd className="mt-1 break-all font-mono text-zinc-300">{scannedUrl || '—'}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wider text-zinc-500">Room ID</dt>
          <dd className="mt-1 font-mono text-zinc-300">{displayRoomId}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-zinc-500">
        Valid links look like{' '}
        <span className="font-mono text-cyan-700/90">
          {getPublicAppBaseUrl()}/situation-room/your-room-id
        </span>
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {onReturnHome && (
          <button
            type="button"
            onClick={onReturnHome}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-200 hover:bg-zinc-900"
          >
            Return home
          </button>
        )}
        <button
          type="button"
          onClick={reportIssue}
          className="rounded-xl border border-rose-800/60 bg-rose-950/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-200 hover:bg-rose-950/50"
        >
          Report issue
        </button>
      </div>
    </div>
  );
}
