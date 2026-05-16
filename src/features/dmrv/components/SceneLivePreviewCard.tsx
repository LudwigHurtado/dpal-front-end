import React, { useMemo } from 'react';
import { AlertTriangle, Check, CheckCircle, Circle, Loader } from '../../../../components/icons';
import {
  getNextActionText,
  getSceneChecklist,
  getSceneImpactChips,
  getSceneNarratorMessage,
  getScenePreviewVisual,
  getSceneSummaryText,
  type ScenePreviewConfig,
} from '../utils/scenePreviewHelpers';

export type SceneLivePreviewCardProps = ScenePreviewConfig & {
  isUpdating?: boolean;
  autofillStatus?: string | null;
};

function ChecklistIcon({ status }: { status: 'complete' | 'warning' | 'pending' }): React.ReactElement {
  if (status === 'complete') {
    return <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />;
  }
  if (status === 'warning') {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />;
  }
  return <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />;
}

export function SceneLivePreviewCard({
  provider,
  product,
  dateStart,
  dateEnd,
  cloudCover,
  resolution,
  minimumCoverage,
  aoiRequired,
  refreshFrequency,
  dmrvTypeId,
  dmrvTypeName,
  aoiExists,
  isUpdating = false,
  autofillStatus = null,
}: SceneLivePreviewCardProps): React.ReactElement {
  const config: ScenePreviewConfig = useMemo(
    () => ({
      provider,
      product,
      dateStart,
      dateEnd,
      cloudCover,
      resolution,
      minimumCoverage,
      aoiRequired,
      refreshFrequency,
      dmrvTypeId,
      dmrvTypeName,
      aoiExists,
    }),
    [
      aoiExists,
      aoiRequired,
      cloudCover,
      dateEnd,
      dateStart,
      dmrvTypeId,
      dmrvTypeName,
      minimumCoverage,
      product,
      provider,
      refreshFrequency,
      resolution,
    ],
  );

  const visual = useMemo(() => getScenePreviewVisual(config), [config]);
  const summary = useMemo(() => getSceneSummaryText(config), [config]);
  const chips = useMemo(() => getSceneImpactChips(config), [config]);
  const checklist = useMemo(() => getSceneChecklist(config), [config]);
  const nextAction = useMemo(() => getNextActionText(config), [config]);
  const narrator = useMemo(() => getSceneNarratorMessage(config), [config]);
  const statusLine = autofillStatus ?? (isUpdating ? 'Updating preview…' : null);

  return (
    <section
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-live="polite"
      aria-busy={isUpdating}
    >
      <header className="mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Scene strategy</p>
        <h3 className="text-base font-black text-[#1e3a5f]">Live Scene Preview</h3>
        <p className="mt-1 text-xs text-slate-600">
          DPAL updates this preview as you configure the scene search strategy.
        </p>
      </header>

      <div
        className={`relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${visual.gradient} shadow-inner transition-opacity duration-300 ${
          isUpdating ? 'opacity-80' : 'opacity-100'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.22),transparent_50%)]" />
        <div
          className={`absolute inset-0 ${isUpdating ? 'animate-pulse bg-white/10' : ''}`}
          aria-hidden
        />
        <div className="relative flex min-h-[180px] flex-col justify-between p-4 sm:min-h-[200px]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-3xl drop-shadow-md" aria-hidden>
              {visual.icon}
            </span>
            <span className="rounded-full border border-white/25 bg-black/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90 backdrop-blur-sm">
              Preview · not live imagery
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-white drop-shadow">{visual.title}</p>
            <p className="mt-1 max-w-[95%] text-[10px] font-medium leading-snug text-white/85">
              {visual.overlayLabel}
            </p>
          </div>
        </div>
        {isUpdating ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/35 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Loader className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Updating preview…
          </div>
        ) : null}
      </div>

      {statusLine ? (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-[#1e3a5f]/15 bg-[#e8f0f7] px-2.5 py-2 text-[11px] font-semibold text-[#1e3a5f]">
          {autofillStatus ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden /> : null}
          {statusLine}
        </p>
      ) : null}

      <p className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/70 px-2.5 py-2 text-[11px] leading-relaxed text-emerald-950">
        {narrator}
      </p>

      <div className="mb-4">
        <h4 className="text-[11px] font-black uppercase tracking-wide text-[#1e3a5f]">What your settings mean</h4>
        <p className="mt-2 text-xs leading-relaxed text-slate-700">{summary}</p>
      </div>

      {chips.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition-colors duration-300"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mb-4">
        <h4 className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#1e3a5f]">Readiness</h4>
        <ul className="space-y-1.5">
          {checklist.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                item.status === 'complete'
                  ? 'bg-emerald-50 text-emerald-950'
                  : item.status === 'warning'
                    ? 'bg-amber-50 text-amber-950'
                    : 'bg-slate-50 text-slate-600'
              }`}
            >
              <ChecklistIcon status={item.status} />
              <span className="font-medium">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto rounded-xl border border-[#1e3a5f]/15 bg-[#f8fafc] px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#1e3a5f]">Next step</p>
        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-700">{nextAction}</p>
      </div>
    </section>
  );
}
