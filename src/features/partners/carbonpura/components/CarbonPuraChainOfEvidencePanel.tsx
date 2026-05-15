import React from 'react';
import type { useCarbonPuraEvidenceChain } from '../hooks/useCarbonPuraEvidenceChain';
import type { useCarbonPuraEvidenceDraft } from '../hooks/useCarbonPuraEvidenceDraft';
import { CARBONPURA_CHAIN_STATUSES } from '../services/carbonPuraEvidenceTypes';

type ChainApi = ReturnType<typeof useCarbonPuraEvidenceChain>;
type DraftApi = ReturnType<typeof useCarbonPuraEvidenceDraft>;

type StepState = 'done' | 'active' | 'pending';

type ChainStep = {
  id: string;
  label: string;
  detail: string;
  state: StepState;
};

function stepBadge(state: StepState): string {
  if (state === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (state === 'active') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export function CarbonPuraChainOfEvidencePanel({
  evidenceChain,
  evidenceDraft,
}: {
  evidenceChain: ChainApi;
  evidenceDraft: DraftApi;
}) {
  const {
    loading,
    backendAvailable,
    persistenceMode,
    project,
    events,
    packets,
    error,
    hasDraftPacket,
  } = evidenceChain;
  const suiteCount = evidenceDraft.selectedSourceSuites.length;

  const steps: ChainStep[] = [
    {
      id: 'project',
      label: 'Project created',
      detail: project
        ? `${project.name} (${project.status}) · ${project.projectId}`
        : backendAvailable
          ? 'Ensuring CarbonPura project record…'
          : 'Backend project registry unavailable',
      state: project ? 'done' : loading ? 'active' : 'pending',
    },
    {
      id: 'suite',
      label: 'PACE suite selected',
      detail:
        suiteCount > 0
          ? `${suiteCount} suite${suiteCount === 1 ? '' : 's'} in local draft`
          : 'Mark suites in the PACE matrix for evidence-building context',
      state: suiteCount > 0 ? 'done' : 'pending',
    },
    {
      id: 'launch',
      label: 'Module launch available',
      detail: 'Use PACE suite launch actions to open live DPAL modules with CarbonPura context',
      state: suiteCount > 0 ? 'active' : 'pending',
    },
    {
      id: 'event',
      label: 'Evidence event saved',
      detail:
        events.length > 0
          ? `${events.length} backend event${events.length === 1 ? '' : 's'} (source selection or attachment)`
          : CARBONPURA_CHAIN_STATUSES.moduleResultPending,
      state: events.length > 0 ? 'done' : suiteCount > 0 ? 'active' : 'pending',
    },
    {
      id: 'packet',
      label: 'Draft packet created',
      detail: hasDraftPacket
        ? `${packets.filter((p) => p.status === 'draft').length} draft packet(s) on backend`
        : `${CARBONPURA_CHAIN_STATUSES.packetDraftCreated} — requires ≥1 evidence event`,
      state: hasDraftPacket ? 'done' : events.length > 0 ? 'active' : 'pending',
    },
    {
      id: 'qr',
      label: 'QR living evidence page',
      detail: CARBONPURA_CHAIN_STATUSES.qrPagePending,
      state: 'pending',
    },
    {
      id: 'monitoring',
      label: 'Continuous monitoring',
      detail: CARBONPURA_CHAIN_STATUSES.monitoringSchedulePending,
      state: 'pending',
    },
  ];

  return (
    <section className="rounded-2xl border border-indigo-200 bg-white p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Phase 4 · chain of evidence</p>
      <h2 className="text-lg font-bold text-slate-900">CarbonPura chain of evidence</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Backend-supported evidence chain for CarbonPura projects. Live modules remain separate; this hub records source
        selections and draft aggregation only — not validator-approved verification.
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full border px-2.5 py-1 font-semibold ${
            backendAvailable ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          Backend: {backendAvailable ? 'reachable' : 'unavailable'}
        </span>
        {backendAvailable ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700">
            Persistence: {persistenceMode === 'prisma' ? 'PostgreSQL (Prisma)' : 'In-memory (dev fallback)'}
          </span>
        ) : null}
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-900">
          {CARBONPURA_CHAIN_STATUSES.validatorReviewPending}
        </span>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{error}</p>
      ) : null}

      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`flex gap-3 rounded-lg border px-3 py-2.5 ${stepBadge(step.state)}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold">{step.label}</p>
              <p className="mt-0.5 text-xs opacity-90">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
