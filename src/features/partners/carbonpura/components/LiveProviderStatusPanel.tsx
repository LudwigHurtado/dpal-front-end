import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCarbonPuraLiveStatus } from '../hooks/useCarbonPuraLiveStatus';
import {
  sourceLifecycleClasses,
  sourceLifecycleLabel,
} from '../carbonPuraSourceStatusMatrix';
import { getPaceSuiteRouting, isPaceMatrixEntry, paceStatusDisplayLabel } from '../paceProductSuites';
import type { ProviderSourceStatusEntry, ProviderSourceLifecycleStatus } from '../../../environmentalIntegrity/environmentalIntegrityTypes';
import type { useCarbonPuraEvidenceDraft } from '../hooks/useCarbonPuraEvidenceDraft';
import { CARBONPURA_DEFAULT_PROJECT_ID } from '../carbonPuraProjectContext';
import { PaceSuiteLaunchActions } from './PaceSuiteLaunchActions';

type EvidenceDraftApi = ReturnType<typeof useCarbonPuraEvidenceDraft>;

function SourceStatusCard({
  source,
  defaultExpanded,
  evidenceDraft,
}: {
  source: ProviderSourceStatusEntry;
  defaultExpanded?: boolean;
  evidenceDraft?: EvidenceDraftApi;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const isPace = isPaceMatrixEntry(source);

  return (
    <li className={`rounded-xl border bg-white shadow-sm ${isPace ? 'border-indigo-100' : 'border-slate-200'}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left sm:flex-row sm:items-start sm:justify-between"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{source.sourceName}</p>
            {source.productSuiteCode ? (
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-800">
                {source.productSuiteCode}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {source.category}
            {source.instrument ? ` · ${source.instrument}` : ''}
          </p>
          {source.availabilitySummary ? (
            <p className="mt-1 text-xs font-medium text-indigo-800">{source.availabilitySummary}</p>
          ) : null}
          <p className="mt-2 text-xs leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-800">Why: </span>
            {source.reason}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 self-start rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sourceLifecycleClasses(source.status)}`}
        >
          {isPace ? paceStatusDisplayLabel(source.status) : sourceLifecycleLabel(source.status)}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-800">Current capability</dt>
              <dd className="mt-0.5">{source.currentCapability}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">Missing for full live</dt>
              <dd className="mt-0.5">{source.missingForFullLive}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">Related module</dt>
              <dd className="mt-0.5">{source.relatedModule}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">Confidence use</dt>
              <dd className="mt-0.5">{source.confidenceUse}</dd>
            </div>
            {source.domain ? (
              <div>
                <dt className="font-semibold text-slate-800">Domain</dt>
                <dd className="mt-0.5">{source.domain}</dd>
              </div>
            ) : null}
            {source.processingLevel ? (
              <div>
                <dt className="font-semibold text-slate-800">Processing level</dt>
                <dd className="mt-0.5">{source.processingLevel}</dd>
              </div>
            ) : null}
            {source.carbonPuraUse ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-slate-800">CarbonPura use</dt>
                <dd className="mt-0.5">{source.carbonPuraUse}</dd>
              </div>
            ) : null}
            {source.paceDataVersion ? (
              <div>
                <dt className="font-semibold text-slate-800">PACE data version</dt>
                <dd className="mt-0.5">{source.paceDataVersion}</dd>
              </div>
            ) : null}
            {source.lastRetrievalDate ? (
              <div>
                <dt className="font-semibold text-slate-800">Last retrieval / check</dt>
                <dd className="mt-0.5">{new Date(source.lastRetrievalDate).toLocaleString()}</dd>
              </div>
            ) : null}
            {source.uncertaintyAvailable !== undefined ? (
              <div>
                <dt className="font-semibold text-slate-800">Uncertainty fields</dt>
                <dd className="mt-0.5">
                  {source.uncertaintyAvailable ? 'Available in product design' : 'Not yet wired in hub'}
                </dd>
              </div>
            ) : null}
            {source.maturityLevel ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-slate-800">Maturity level (DPAL)</dt>
                <dd className="mt-0.5">{source.maturityLevel}</dd>
              </div>
            ) : null}
            {source.qualityFlagsRequired ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-slate-800">Quality flags required</dt>
                <dd className="mt-0.5">{source.qualityFlagsRequired}</dd>
              </div>
            ) : null}
            {source.evidenceUse ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-slate-800">Evidence use</dt>
                <dd className="mt-0.5">{source.evidenceUse}</dd>
              </div>
            ) : null}
            {source.route ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-slate-800">Route</dt>
                <dd className="mt-0.5">
                  <Link to={source.route} className="font-mono text-teal-700 hover:text-teal-900">
                    {source.route}
                  </Link>
                </dd>
              </div>
            ) : null}
            {source.providerNotes ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-slate-800">Provider notes (live)</dt>
                <dd className="mt-0.5 text-slate-500">{source.providerNotes}</dd>
              </div>
            ) : null}
            {isPace && source.productSuiteCode ? (
              <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                <PaceSuiteLaunchActions
                  projectId={CARBONPURA_DEFAULT_PROJECT_ID}
                  evidenceSelected={evidenceDraft?.isSuiteSelected(source.productSuiteCode) ?? false}
                  onMarkForEvidence={
                    evidenceDraft
                      ? () => {
                          const code = source.productSuiteCode!;
                          const routing = getPaceSuiteRouting(code);
                          if (evidenceDraft.isSuiteSelected(code)) {
                            evidenceDraft.removeSourceSuite(code);
                          } else {
                            evidenceDraft.addSourceSuite({
                              suiteCode: code,
                              moduleLabel: routing.recommendedModuleLabel,
                              route: routing.recommendedRoute,
                              evidenceUse: source.evidenceUse ?? routing.launchPurpose,
                            });
                          }
                        }
                      : undefined
                  }
                  source={{
                    productSuiteCode: source.productSuiteCode,
                    recommendedRoute: source.recommendedRoute ?? source.route,
                    recommendedModuleLabel: source.recommendedModuleLabel ?? source.relatedModule,
                    launchPurpose: source.launchPurpose,
                    evidenceRole: source.evidenceRole,
                    evidenceUse: source.evidenceUse,
                  }}
                />
              </div>
            ) : null}
          </dl>
        </div>
      ) : (
        <p className="border-t border-slate-50 px-4 py-2 text-[11px] text-slate-400">
          Tap to expand launch actions, maturity, QC flags, evidence use, and live provider notes
        </p>
      )}
    </li>
  );
}

function MatrixSection({
  title,
  subtitle,
  sources,
  defaultExpandFirst,
  evidenceDraft,
}: {
  title: string;
  subtitle?: string;
  sources: ProviderSourceStatusEntry[];
  defaultExpandFirst?: number;
  evidenceDraft?: EvidenceDraftApi;
}) {
  if (sources.length === 0) return null;
  return (
    <li className="list-none">
      <div className="mb-2 mt-4 first:mt-0">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <ul className="space-y-3">
        {sources.map((source, index) => (
          <SourceStatusCard
            key={source.id}
            source={source}
            defaultExpanded={index < (defaultExpandFirst ?? 0)}
            evidenceDraft={evidenceDraft}
          />
        ))}
      </ul>
    </li>
  );
}

type ProviderMatrixFilter =
  | 'all'
  | 'pace'
  | 'live'
  | 'partial'
  | 'planned_future'
  | 'metadata_only';

const FILTER_OPTIONS: { id: ProviderMatrixFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pace', label: 'PACE suites' },
  { id: 'live', label: 'Live' },
  { id: 'partial', label: 'Partial' },
  { id: 'planned_future', label: 'Planned/Future' },
  { id: 'metadata_only', label: 'Metadata only' },
];

function matchesFilter(source: ProviderSourceStatusEntry, filter: ProviderMatrixFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pace') return isPaceMatrixEntry(source);
  if (filter === 'live') return source.status === 'live';
  if (filter === 'partial') return source.status === 'partial';
  if (filter === 'metadata_only') return source.status === 'metadata_only';
  if (filter === 'planned_future') return source.status === 'planned' || source.status === 'future';
  return true;
}

function matchesSearch(source: ProviderSourceStatusEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [source.sourceName, source.productSuiteCode, source.relatedModule]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

type LiveProviderStatusPanelProps = {
  evidenceDraft?: EvidenceDraftApi;
};

export function LiveProviderStatusPanel({ evidenceDraft }: LiveProviderStatusPanelProps) {
  const { loading, apiDetail, sources, refreshedAtIso, refresh } = useCarbonPuraLiveStatus();
  const [filter, setFilter] = useState<ProviderMatrixFilter>('all');
  const [search, setSearch] = useState('');
  const [matrixExpanded, setMatrixExpanded] = useState(false);

  const filteredSources = useMemo(
    () => sources.filter((s) => matchesFilter(s, filter) && matchesSearch(s, search)),
    [sources, filter, search],
  );

  const { paceSources, otherSources } = useMemo(() => {
    const pace: ProviderSourceStatusEntry[] = [];
    const other: ProviderSourceStatusEntry[] = [];
    for (const s of filteredSources) {
      if (isPaceMatrixEntry(s)) pace.push(s);
      else other.push(s);
    }
    return { paceSources: pace, otherSources: other };
  }, [filteredSources]);

  const previewSources = useMemo(() => filteredSources.slice(0, 4), [filteredSources]);

  const statusCounts = useMemo(() => {
    const counts: Record<ProviderSourceLifecycleStatus, number> = {
      live: 0,
      partial: 0,
      metadata_only: 0,
      planned: 0,
      future: 0,
      unavailable: 0,
    };
    for (const s of sources) {
      counts[s.status] += 1;
    }
    return counts;
  }, [sources]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Provider / source status matrix</h2>
          <p className="mt-1 text-sm text-slate-600">
            PACE rows follow official NASA product suites (OC_AOP, OC_IOP, OC_BGC, MOANA, PAR, CLDMASK, SFREFL, LANDVI,
            AER/UVAI, HARP2/SPEXone). Each row shows status and why.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh status'}
        </button>
      </div>
      <p className="mb-2 text-xs text-slate-500">{apiDetail}</p>
      {refreshedAtIso ? (
        <p className="mb-3 text-[11px] text-slate-400">Last checked {new Date(refreshedAtIso).toLocaleString()}</p>
      ) : null}
      {!loading && sources.length > 0 ? (
        <p className="mb-4 flex flex-wrap gap-2 text-[11px]">
          {(Object.keys(statusCounts) as ProviderSourceLifecycleStatus[]).map((key) =>
            statusCounts[key] > 0 ? (
              <span
                key={key}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${sourceLifecycleClasses(key)}`}
              >
                <span className="uppercase tracking-wide">{sourceLifecycleLabel(key)}</span>: {statusCounts[key]}
              </span>
            ) : null,
          )}
        </p>
      ) : null}

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs text-slate-600">
          <span className="mb-1 block font-semibold text-slate-800">Search sources</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="sourceName, suite code, related module…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                filter === opt.id
                  ? 'border-teal-600 bg-teal-50 text-teal-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!matrixExpanded && filteredSources.length > 0 ? (
        <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-800">
            Showing {filteredSources.length} of {sources.length} sources
            {filter !== 'all' || search ? ' (filtered)' : ''}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {previewSources.map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span className="truncate font-medium text-slate-800">{s.sourceName}</span>
                <span className="shrink-0 tabular-nums text-slate-500">{sourceLifecycleLabel(s.status)}</span>
              </li>
            ))}
            {filteredSources.length > previewSources.length ? (
              <li className="text-slate-400">+{filteredSources.length - previewSources.length} more…</li>
            ) : null}
          </ul>
          <button
            type="button"
            onClick={() => setMatrixExpanded(true)}
            className="mt-3 text-xs font-semibold text-teal-700 hover:text-teal-900"
          >
            Expand full matrix ({filteredSources.length} rows)
          </button>
        </div>
      ) : null}

      {matrixExpanded ? (
        <>
          <button
            type="button"
            onClick={() => setMatrixExpanded(false)}
            className="mb-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Collapse matrix preview
          </button>
          <ul className="space-y-1">
            <MatrixSection
              title="PACE product suites (NASA OCI · HARP2 · SPEXone)"
              subtitle="10 suite-specific rows — launch live engines or mark for local evidence draft"
              sources={paceSources}
              defaultExpandFirst={0}
              evidenceDraft={evidenceDraft}
            />
            <MatrixSection
              title="Other DPAL sources & infrastructure"
              sources={otherSources}
              defaultExpandFirst={0}
              evidenceDraft={evidenceDraft}
            />
            {!loading && filteredSources.length === 0 ? (
              <li className="list-none text-sm text-slate-500">No sources match the current filter.</li>
            ) : null}
          </ul>
        </>
      ) : null}

      {!loading && sources.length === 0 ? (
        <p className="text-sm text-slate-500">Connection pending — source matrix not loaded yet.</p>
      ) : null}
    </section>
  );
}
