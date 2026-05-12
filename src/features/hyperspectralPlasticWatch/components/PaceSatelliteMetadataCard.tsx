import React, { useMemo } from 'react';
import type {
  DpalHyperspectralCompactScene,
  DpalHyperspectralScene,
  HyperspectralPlasticScanResponse,
} from '../types';

type Props = {
  scan: HyperspectralPlasticScanResponse | null;
};

function formatUtcSnippet(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function formatCloudCover(c: number | null | undefined): string {
  if (c == null || Number.isNaN(c)) return '—';
  return `${Math.round(c)}%`;
}

type SceneRow = DpalHyperspectralScene | DpalHyperspectralCompactScene;

const PaceSatelliteMetadataCard: React.FC<Props> = ({ scan }) => {
  const pace = scan?.providers.pace;
  const scenes = pace?.scenes ?? [];
  const previewRows = useMemo(() => scenes.slice(0, 3) as SceneRow[], [scenes]);
  const sceneCount = scenes.length;
  const latestSceneTime =
    pace?.sceneDate != null && String(pace.sceneDate).trim() !== ''
      ? formatUtcSnippet(String(pace.sceneDate))
      : previewRows[0]?.startTime
        ? formatUtcSnippet(previewRows[0].startTime)
        : null;

  if (!scan) {
    return (
      <section
        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
        aria-labelledby="pace-metadata-heading"
      >
        <h3 id="pace-metadata-heading" className="text-sm font-semibold text-slate-900">
          PACE Satellite Metadata
        </h3>
        <p className="mt-2 text-[11px] text-slate-600 leading-relaxed">
          After you run Watch DPAL Work or a manual scan, this card shows whether DPAL located relevant PACE granule
          metadata from NASA CMR for your AOI. This is not plastic classification.
        </p>
      </section>
    );
  }

  const statusLabel =
    pace?.status === 'available'
      ? 'PACE metadata available'
      : pace?.status === 'no_scene'
        ? 'No matching PACE granules in window'
        : pace?.status?.replace(/_/g, ' ') ?? '—';

  return (
    <section
      className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/90 to-white p-4 shadow-sm"
      aria-labelledby="pace-metadata-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="pace-metadata-heading" className="text-sm font-semibold text-sky-950">
            PACE Satellite Metadata
          </h3>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800/90">{statusLabel}</p>
        </div>
        {sceneCount > 0 ? (
          <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-sky-900">
            Satellite observations found: {sceneCount} granule{sceneCount === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] text-slate-700 leading-relaxed">
        This confirms DPAL can locate relevant satellite observations for the AOI. Plastic classification requires
        calibrated spectral processing and field validation.
      </p>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
        <div className="rounded-lg border border-sky-100 bg-white/80 p-2.5">
          <dt className="font-semibold text-slate-600">Provider status</dt>
          <dd className="mt-0.5 font-mono text-slate-900">{pace?.status ?? '—'}</dd>
        </div>
        <div className="rounded-lg border border-sky-100 bg-white/80 p-2.5">
          <dt className="font-semibold text-slate-600">Latest scene date (reference)</dt>
          <dd className="mt-0.5 font-mono text-slate-900">{latestSceneTime ?? '—'}</dd>
        </div>
        <div className="rounded-lg border border-sky-100 bg-white/80 p-2.5 sm:col-span-2">
          <dt className="font-semibold text-slate-600">Spectral range (product context)</dt>
          <dd className="mt-0.5 text-slate-800">{pace?.spectralRange ?? '—'}</dd>
        </div>
        <div className="rounded-lg border border-sky-100 bg-white/80 p-2.5 sm:col-span-2">
          <dt className="font-semibold text-slate-600">NASA CMR summary</dt>
          <dd className="mt-0.5 text-slate-800 leading-snug">{pace?.message ?? '—'}</dd>
        </div>
      </dl>

      <p className="mt-3 text-[10px] text-slate-600 leading-snug">
        Spectral extraction is not implemented in this build — listings are metadata only. Field validation is required
        before any enforcement or public attribution use.
      </p>

      {pace?.limitations?.length ? (
        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">Limitations</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-amber-950/90">
            {pace.limitations.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {previewRows.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Sample granules (first {previewRows.length} of {sceneCount})
          </p>
          <ul className="mt-2 space-y-2">
            {previewRows.map((row, idx) => (
              <li
                key={`${row.conceptId ?? row.title}-${idx}`}
                className="rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-800"
              >
                <p className="font-semibold text-slate-900 leading-snug">{row.title}</p>
                <p className="mt-1 text-slate-600">
                  <span className="text-slate-500">Start:</span> {formatUtcSnippet(row.startTime)}
                </p>
                <p className="mt-0.5 text-slate-600">
                  <span className="text-slate-500">Cloud cover:</span> {formatCloudCover(row.cloudCover)}
                </p>
                <p className="mt-0.5 text-slate-600">
                  <span className="text-slate-500">Source:</span> {row.source}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : pace?.status === 'available' ? (
        <p className="mt-3 text-[11px] text-slate-600">Granule list not included in this response — see message above.</p>
      ) : null}
    </section>
  );
};

export default PaceSatelliteMetadataCard;
