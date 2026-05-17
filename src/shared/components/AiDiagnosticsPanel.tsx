import React, { useCallback, useState } from 'react';
import { getAiDiagnostics } from '../../services/dpalAiClient';

type DiagnosticsSnapshot = Awaited<ReturnType<typeof getAiDiagnostics>> & {
  timestamp: string;
};

export function AiDiagnosticsPanel(): React.ReactElement | null {
  if (!import.meta.env.DEV) return null;

  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAiDiagnostics();
      setSnapshot({ ...data, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 text-xs text-slate-700">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next && !snapshot) void load();
            return next;
          });
        }}
        className="flex w-full items-center justify-between px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100/80"
      >
        AI Diagnostics (dev only)
        <span>{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <DiagnosticsDetails
          loading={loading}
          snapshot={snapshot}
          onRefresh={() => void load()}
        />
      ) : null}
    </div>
  );
}

function DiagnosticsDetails({
  loading,
  snapshot,
  onRefresh,
}: {
  loading: boolean;
  snapshot: DiagnosticsSnapshot | null;
  onRefresh: () => void;
}): React.ReactElement {
  return (
    <div className="border-t border-slate-200 px-3 py-2 space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={onRefresh}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? 'Refreshing…' : 'Refresh diagnostics'}
      </button>
      {snapshot ? (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white p-2 font-mono text-[10px] text-slate-800">
          {JSON.stringify(
            {
              mode: snapshot.mode,
              useServerAi: snapshot.useServerAi,
              apiBase: snapshot.apiBase,
              hasBrowserGeminiKey: snapshot.hasBrowserGeminiKey,
              health: {
                ok: snapshot.health.ok,
                configured: snapshot.health.configured,
                provider: snapshot.health.provider,
                mode: snapshot.health.mode,
                missing: snapshot.health.missing,
                detail: snapshot.health.detail,
              },
              timestamp: snapshot.timestamp,
            },
            null,
            2,
          )}
        </pre>
      ) : (
        <p className="text-[10px] text-slate-500">No snapshot yet.</p>
      )}
    </div>
  );
}
