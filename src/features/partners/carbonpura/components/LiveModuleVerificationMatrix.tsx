import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CARBONPURA_MODULE_VERIFICATION,
  CARBONPURA_VERIFICATION_DISCLAIMER,
  type CarbonPuraModuleVerificationRow,
  type VerificationBannerStatus,
  type VerificationRouteStatus,
} from '../carbonPuraModuleVerification';
import { useCarbonPuraLiveStatus } from '../hooks/useCarbonPuraLiveStatus';

function statusPill(
  label: string,
  tone: 'emerald' | 'amber' | 'slate' | 'indigo' | 'rose',
): string {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
  };
  return `inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`;
}

function routeStatusTone(status: VerificationRouteStatus): 'emerald' | 'amber' | 'slate' | 'indigo' {
  if (status === 'Opens correctly') return 'emerald';
  if (status === 'Route registered in SPA') return 'indigo';
  if (status === 'Needs manual scan test') return 'amber';
  return 'slate';
}

function bannerStatusTone(status: VerificationBannerStatus): 'emerald' | 'amber' | 'slate' | 'rose' | 'indigo' {
  if (status === 'Context banner confirmed') return 'emerald';
  if (status === 'Context banner implemented (code)') return 'indigo';
  if (status === 'Context banner not implemented') return 'rose';
  return 'slate';
}

function providerNoteFromProbe(
  row: CarbonPuraModuleVerificationRow,
  apiDetail: string,
  plasticConfigured: boolean | null,
  waterOk: boolean | null,
): string {
  if (row.providerProbeKey === 'plastic') {
    return plasticConfigured === null
      ? 'Plastic Watch provider-status not loaded'
      : plasticConfigured
        ? 'Plastic Watch lane reachable (configured on API)'
        : 'Plastic Watch lane metadata/unavailable on API';
  }
  if (row.providerProbeKey === 'water') {
    return waterOk === null
      ? 'Water stats probe not loaded'
      : waterOk
        ? 'GET /api/water/stats OK from hub probe'
        : 'Water stats unavailable on configured API host';
  }
  if (row.providerProbeKey === 'copernicus') {
    return 'Copernicus status probed at hub â€” AquaScan uses server proxy when VITE_API_BASE configured';
  }
  if (row.providerProbeKey === 'api') {
    return apiDetail;
  }
  return row.providerStatus;
}

type LiveModuleVerificationMatrixProps = {
  /** When Playwright smoke passes, parent or docs can set â€” optional override per row id. */
  e2ePassedRouteIds?: string[];
};

export function LiveModuleVerificationMatrix({ e2ePassedRouteIds = [] }: LiveModuleVerificationMatrixProps) {
  const liveStatus = useCarbonPuraLiveStatus();

  const plasticConfigured = useMemo(() => {
    const paceRow = liveStatus.sources.find((s) => s.productSuiteCode === 'OC_AOP');
    if (!paceRow) return null;
    return paceRow.status === 'partial' || paceRow.status === 'live' || paceRow.status === 'metadata_only';
  }, [liveStatus.sources]);

  const waterOk = useMemo(() => {
    const w = liveStatus.sources.find((s) => s.id === 'water-ops-api');
    return w ? w.status === 'live' : null;
  }, [liveStatus.sources]);

  const rows = useMemo(
    () =>
      CARBONPURA_MODULE_VERIFICATION.map((row) => ({
        ...row,
        routeStatus: e2ePassedRouteIds.includes(row.id)
          ? ('Opens correctly' as VerificationRouteStatus)
          : row.routeStatus,
        contextBannerStatus:
          e2ePassedRouteIds.includes(row.id) &&
          row.contextBannerStatus === 'Context banner implemented (code)'
            ? ('Context banner confirmed' as VerificationBannerStatus)
            : row.contextBannerStatus,
        liveProviderNote: providerNoteFromProbe(row, liveStatus.apiDetail, plasticConfigured, waterOk),
      })),
    [e2ePassedRouteIds, liveStatus.apiDetail, plasticConfigured, waterOk],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-slate-900">Live module verification matrix</h2>
      <p className="mt-1 text-sm text-slate-600">{CARBONPURA_VERIFICATION_DISCLAIMER}</p>
      <p className="mt-2 text-xs text-slate-500">
        Run <code className="rounded bg-slate-100 px-1">npm run test:e2e -- tests/e2e/carbonpura-module-smoke.spec.ts</code>{' '}
        for render-only smoke (no live scans). Manual QA checklist per module below.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-3 font-semibold">Module</th>
              <th className="py-2 pr-3 font-semibold">Route status</th>
              <th className="py-2 pr-3 font-semibold">Context banner</th>
              <th className="py-2 pr-3 font-semibold">Provider (hub probe)</th>
              <th className="py-2 pr-3 font-semibold">Evidence</th>
              <th className="py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 align-top">
                <td className="py-3 pr-3">
                  <p className="font-semibold text-slate-900">{row.moduleName}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-600">{row.nativeRoute}</p>
                  {row.contextRoute ? (
                    <p className="mt-0.5 font-mono text-[10px] text-teal-700">{row.contextRoute}</p>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-slate-400">No CarbonPura context route</p>
                  )}
                </td>
                <td className="py-3 pr-3">
                  <span className={statusPill(row.routeStatus, routeStatusTone(row.routeStatus))}>
                    {row.routeStatus}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <span className={statusPill(row.contextBannerStatus, bannerStatusTone(row.contextBannerStatus))}>
                    {row.contextBannerStatus}
                  </span>
                </td>
                <td className="py-3 pr-3 text-slate-600">{row.liveProviderNote}</td>
                <td className="py-3 pr-3">
                  <span className={statusPill(row.evidenceAttachmentStatus, 'amber')}>
                    {row.evidenceAttachmentStatus}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex flex-col gap-1">
                    <Link to={row.nativeRoute} className="font-semibold text-teal-700 hover:text-teal-900">
                      Open native
                    </Link>
                    {row.contextRoute ? (
                      <Link to={row.contextRoute} className="font-semibold text-indigo-700 hover:text-indigo-900">
                        Open with context
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <details key={`${row.id}-qa`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              Manual QA â€” {row.moduleName}
            </summary>
            <p className="mt-2 text-xs text-slate-600">{row.verificationNotes}</p>
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold">Evidence export path: </span>
              {row.evidenceExportPath}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold">Next action: </span>
              {row.nextAction}
            </p>
            <ul className="mt-2 space-y-1">
              {row.qaChecklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="text-slate-400" aria-hidden>
                    {item.codeVerified ? 'â—†' : 'â˜'}
                  </span>
                  {item.label}
                  {item.codeVerified ? (
                    <span className="text-[10px] text-slate-400">(documented in matrix)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
        <p className="font-semibold">Pending backend evidence attachment</p>
        <ul className="mt-1 list-inside list-disc">
          <li>Cross-module scan result attachment API</li>
          <li>Combined CarbonPura evidence packet aggregation</li>
          <li>Validator review queue linkage at hub layer</li>
          <li>PACE granule provenance fields in combined export</li>
        </ul>
      </div>
    </section>
  );
}

