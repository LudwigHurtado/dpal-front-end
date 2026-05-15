import React, { useState } from 'react';
import type { useCarbonPuraEvidenceChain } from '../hooks/useCarbonPuraEvidenceChain';
import type { useCarbonPuraEvidenceDraft } from '../hooks/useCarbonPuraEvidenceDraft';
import { getPaceSuiteRouting } from '../paceProductSuites';

type EvidenceDraftApi = ReturnType<typeof useCarbonPuraEvidenceDraft>;
type EvidenceChainApi = ReturnType<typeof useCarbonPuraEvidenceChain>;

type CarbonPuraEvidenceDraftPanelProps = {
  evidenceDraft: EvidenceDraftApi;
  evidenceChain: EvidenceChainApi;
};

const PENDING_INTEGRATIONS = [
  'Cross-module scan result attachment (module-native exports only today)',
  'Validator review queue at CarbonPura hub layer',
  'PACE granule-level provenance in combined export',
  'QR living evidence page',
  'Continuous monitoring schedule / event logging',
] as const;

export function CarbonPuraEvidenceDraftPanel({
  evidenceDraft,
  evidenceChain,
}: CarbonPuraEvidenceDraftPanelProps) {
  const { draft, selectedModules, clearDraft, removeSourceSuite } = evidenceDraft;
  const {
    loading: chainLoading,
    busy,
    backendAvailable,
    persistenceMode,
    project,
    events,
    packets,
    error: chainError,
    canCreateDraftPacket,
    attachEvidenceEvent,
    createDraftPacket,
    refresh,
  } = evidenceChain;

  const count = draft.selectedSourceSuites.length;
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleAttachEvent = async (entry: (typeof draft.selectedSourceSuites)[0]) => {
    const routing = getPaceSuiteRouting(entry.suiteCode);
    setLastAction(null);
    const res = await attachEvidenceEvent({
      moduleId: routing.recommendedView,
      moduleName: entry.moduleLabel,
      sourceSuite: entry.suiteCode,
      eventType: 'evidence_source_selected',
      title: `PACE ${entry.suiteCode} — evidence source`,
      summary: entry.evidenceUse,
      status: 'evidence_source_selected',
      confidenceUse: entry.evidenceUse,
      rawPayloadJson: {
        route: entry.route,
        evidenceRole: routing.evidenceRole,
        localDraftAddedAt: entry.addedAtIso,
      },
    });
    if (res.ok) setLastAction(`Saved evidence event ${res.data.event.eventId}`);
    else setLastAction(`Could not save event: ${res.error}`);
  };

  const handleCreateDraftPacket = async () => {
    setLastAction(null);
    const eventIds = events.map((e) => e.eventId);
    const res = await createDraftPacket(eventIds);
    if (res.ok) setLastAction(`Draft packet created: ${res.data.packet.packetId}`);
    else setLastAction(`Could not create packet: ${res.error}`);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Phase 4 · evidence chain</p>
          <h2 className="text-lg font-bold text-slate-900">CarbonPura evidence draft</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Local suite selection plus backend-persisted evidence events and draft packets when the CarbonPura API is
            available on <span className="font-mono text-xs">VITE_API_BASE</span>. This records evidence-source
            selections — not scan results unless a module export is attached later.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            backendAvailable
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {backendAvailable
            ? `Backend ${persistenceMode === 'prisma' ? 'PostgreSQL' : 'in-memory'}`
            : 'Local browser draft fallback'}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Project: <span className="font-mono text-slate-700">{draft.projectId}</span>
        {project ? (
          <>
            {' '}
            · backend status <span className="font-semibold">{project.status}</span>
          </>
        ) : chainLoading ? (
          ' · loading backend project…'
        ) : !backendAvailable ? (
          ' · backend aggregation unavailable'
        ) : null}
        {' '}
        · {count} local suite{count === 1 ? '' : 's'} · {events.length} backend event
        {events.length === 1 ? '' : 's'} · {packets.length} packet{packets.length === 1 ? '' : 's'}
      </p>

      {chainError ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{chainError}</p>
      ) : null}
      {lastAction ? (
        <p className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
          {lastAction}
        </p>
      ) : null}

      {count === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          No suites selected yet. Use &quot;Mark for evidence packet draft&quot; on a PACE matrix row or intelligence
          layer card to add evidence-support context.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {draft.selectedSourceSuites.map((entry) => {
            const routing = getPaceSuiteRouting(entry.suiteCode);
            const attached = events.some(
              (e) => e.sourceSuite === entry.suiteCode && e.eventType === 'evidence_source_selected',
            );
            return (
              <li
                key={entry.suiteCode}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-mono font-semibold text-indigo-800">PACE {entry.suiteCode}</p>
                  <p className="mt-0.5 text-slate-700">{entry.moduleLabel}</p>
                  <p className="mt-0.5 text-slate-500">{entry.evidenceUse}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase text-indigo-600">
                    Evidence role: {routing.evidenceRole}
                  </p>
                  {attached ? (
                    <p className="mt-1 text-[10px] font-semibold text-emerald-800">Backend event saved</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    disabled={!backendAvailable || busy || attached}
                    onClick={() => void handleAttachEvent(entry)}
                    className="rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-900 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      !backendAvailable
                        ? 'Backend aggregation unavailable'
                        : 'Creates a draft evidence-source event — not a scan result'
                    }
                  >
                    Attach draft evidence event
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSourceSuite(entry.suiteCode)}
                    className="text-[10px] font-semibold text-rose-700 hover:text-rose-900"
                  >
                    Remove from local draft
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {events.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-800">Persisted evidence events</p>
          <ul className="mt-2 space-y-1.5">
            {events.slice(0, 8).map((ev) => (
              <li key={ev.eventId} className="rounded border border-slate-100 bg-white px-2 py-1.5 text-[11px] text-slate-700">
                <span className="font-mono text-indigo-800">{ev.eventId}</span>
                {' · '}
                {ev.title}
                {' · '}
                <span className="text-slate-500">{ev.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {selectedModules.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-800">Selected DPAL modules (from suites)</p>
          <p className="mt-1 text-xs text-slate-600">{selectedModules.join(' · ')}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-800">Still pending for final evidence packet</p>
        <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
          {PENDING_INTEGRATIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={clearDraft}
          disabled={count === 0}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
        >
          Clear local draft
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
        >
          Refresh backend chain
        </button>
        <button
          type="button"
          disabled={!canCreateDraftPacket}
          onClick={() => void handleCreateDraftPacket()}
          title={
            !backendAvailable
              ? 'Backend aggregation unavailable'
              : events.length === 0
                ? 'Attach at least one evidence event first'
                : 'Creates a draft aggregated packet (not final verification)'
          }
          className="rounded-lg border border-indigo-300 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {backendAvailable
            ? canCreateDraftPacket
              ? 'Create draft evidence packet'
              : events.length === 0
                ? 'Create draft evidence packet — add an event first'
                : 'Create draft evidence packet — busy…'
            : 'Create draft evidence packet — backend aggregation unavailable'}
        </button>
      </div>

      {packets.length > 0 ? (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="text-xs font-semibold text-emerald-900">Draft packets (backend)</p>
          <ul className="mt-2 space-y-1 text-[11px] text-emerald-900">
            {packets.map((p) => (
              <li key={p.packetId}>
                <span className="font-mono">{p.packetId}</span> · {p.status} · hash{' '}
                <span className="font-mono">{p.packetHash.slice(0, 12)}…</span>
                {p.qrUrl ? null : ' · QR page pending'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
