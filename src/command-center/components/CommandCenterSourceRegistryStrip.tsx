import React from 'react';
import { getSourceStatusSummary } from '../../features/environmentalIntelligence/sources/providerStatus';
import { fetchEnvironmentalSourceStatus } from '../../services/environmentalIntelligenceSourcesApi';

/**
 * Compact Command Center strip: local registry counts + optional live backend status.
 * Does not alter orchestration — informational only.
 */
export const CommandCenterSourceRegistryStrip: React.FC = () => {
  const local = React.useMemo(() => getSourceStatusSummary(), []);
  const [remote, setRemote] = React.useState<Awaited<ReturnType<typeof fetchEnvironmentalSourceStatus>>>(null);
  const [remoteErr, setRemoteErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const payload = await fetchEnvironmentalSourceStatus();
      if (cancelled) return;
      if (!payload) setRemoteErr('Backend registry status not reachable from this API host (local counts still apply).');
      else {
        setRemoteErr(null);
        setRemote(payload);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const catLine = Object.entries(local.byCategory)
    .map(([k, n]) => `${k}: ${n}`)
    .join(' · ');

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-800 shadow-sm">
      <p className="font-bold text-slate-900">DPAL source registry (Phase 3)</p>
      <p className="mt-1 text-slate-700">
        Local bundle: {local.allSources} sources · runnable {local.runnable} · public records {local.publicRecords} · commercial{' '}
        {local.commercial} · future {local.future}
      </p>
      <p className="mt-0.5 text-slate-600">{catLine}</p>
      {remote ? (
        <p className="mt-1 text-teal-900">
          API host mirror: {remote.allSources} sources · runnable {remote.runnable} · use-case index {remote.useCasesCount} entries.
        </p>
      ) : null}
      {remoteErr ? <p className="mt-1 text-amber-800">{remoteErr}</p> : null}
      <p className="mt-1 text-slate-500">
        Future and commercial lanes stay gated; Command Center safety labels remain pending_verification unless reviewer data says
        otherwise.
      </p>
    </div>
  );
};
