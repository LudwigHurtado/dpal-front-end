import React, { useMemo } from 'react';
import { Sparkles } from '../../../../components/icons';
import {
  FIELD_PLOT_FIELD_DEFS,
  getFieldPlotFieldStatus,
} from '../services/dmrvFieldPlotConfigService';
import type { FieldPlotDraft, FieldPlotSettingKey } from '../services/dmrvFieldPlotConfigTypes';
import { settingsToFieldPlot } from '../services/dmrvFieldPlotConfigTypes';
import type { DmrvDataSourceSettings } from '../services/dmrvInputConfigTypes';

const STATUS_STYLES = {
  missing: 'border-slate-200 bg-slate-50',
  suggested: 'border-amber-200 bg-amber-50/60',
  filled: 'border-emerald-200 bg-emerald-50/50',
  needs_review: 'border-amber-300 bg-amber-50',
} as const;

const STATUS_LABELS = {
  missing: 'Missing',
  suggested: 'Suggested',
  filled: 'Filled',
  needs_review: 'Needs review',
} as const;

export type DmrvFieldPlotGuidedPanelProps = {
  settings: DmrvDataSourceSettings;
  draft: FieldPlotDraft | null;
  showDraftReview: boolean;
  hasAoi: boolean;
  disabled?: boolean;
  onChange: (key: string, value: string | boolean) => void;
  onAiFill: () => void;
  onMarkReviewed: () => void;
  onDismissDraftReview: () => void;
};

export function DmrvFieldPlotGuidedPanel({
  settings,
  draft,
  showDraftReview,
  hasAoi,
  disabled = false,
  onChange,
  onAiFill,
  onMarkReviewed,
  onDismissDraftReview,
}: DmrvFieldPlotGuidedPanelProps): React.ReactElement {
  const plot = useMemo(() => settingsToFieldPlot(settings), [settings]);

  const suggestionMap = useMemo(() => {
    const map = new Map<FieldPlotSettingKey, string>();
    for (const s of draft?.suggestions ?? []) {
      map.set(s.key, s.value);
    }
    return map;
  }, [draft?.suggestions]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#1e3a5f]/20 bg-[#e8f0f7] p-4">
        <p className="text-sm font-semibold text-[#1e3a5f]">
          Field plots are ground-truth evidence that helps verify what satellites observe.
        </p>
        <p className="mt-1 text-xs text-slate-600">
          For forest DMRV, you typically need GPS coordinates, land-cover type, survey date, plot size, photos, and
          provenance notes. Use AI Fill to draft values from your project — then review every field before saving.
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={onAiFill}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-3 text-sm font-bold text-white hover:bg-[#152a47] disabled:opacity-60 sm:w-auto"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          AI Fill From Project + Evidence Sources
        </button>
      </div>

      {showDraftReview && draft ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">{draft.label}</p>
          <p className="mt-1 text-sm text-amber-950">{draft.provenanceSummary}</p>
          {draft.missingItems.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-xs text-amber-900">
              {draft.missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onMarkReviewed}
              className="rounded-lg border border-emerald-400 bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
            >
              Mark draft reviewed
            </button>
            <button
              type="button"
              onClick={onDismissDraftReview}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Dismiss banner
            </button>
          </div>
        </div>
      ) : null}

      {!hasAoi ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          <p className="font-semibold">Draw or select an AOI first</p>
          <p className="mt-1 text-xs">
            Project configuration needs a location or AOI before plot coordinates can be inferred reliably.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {FIELD_PLOT_FIELD_DEFS.map((field) => {
          const value = plot[field.key];
          const status = getFieldPlotFieldStatus(field.key, value, draft);
          const suggestion = suggestionMap.get(field.key);

          return (
            <article
              key={field.key}
              id={`field-plot-${field.key}`}
              className={`rounded-xl border p-4 shadow-sm transition ${STATUS_STYLES[status]}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#1e3a5f]">{field.label}</h3>
                  <p className="mt-0.5 text-xs text-slate-600">{field.explanation}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    status === 'filled'
                      ? 'bg-emerald-100 text-emerald-900'
                      : status === 'needs_review'
                        ? 'bg-amber-100 text-amber-900'
                        : status === 'suggested'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>

              <p className="mt-2 text-[10px] text-slate-500">
                Example: <span className="font-medium text-slate-700">{field.example}</span>
              </p>

              {field.inputType === 'textarea' ? (
                <textarea
                  rows={3}
                  disabled={disabled}
                  value={String(value ?? '')}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15"
                  placeholder={field.example}
                />
              ) : (
                <input
                  type={field.inputType === 'date' ? 'date' : 'text'}
                  disabled={disabled}
                  value={String(value ?? '')}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15"
                  placeholder={field.example}
                />
              )}

              {suggestion && status !== 'filled' ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-[10px] text-slate-600">
                    AI suggestion: <span className="font-medium">{suggestion}</span>
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(field.key, suggestion)}
                    className="rounded-md border border-[#1e3a5f]/25 bg-white px-2 py-1 text-[10px] font-bold text-[#1e3a5f] hover:bg-[#e8f0f7] disabled:opacity-50"
                  >
                    Use suggestion
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}

        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            checked={Boolean(plot.photosRequired)}
            disabled={disabled}
            onChange={(e) => onChange('photosRequired', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm font-medium text-slate-800">Photos required for field verification</span>
        </label>

        <label className="block rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-sm font-bold text-[#1e3a5f]">Minimum plot count</span>
          <input
            type="text"
            disabled={disabled}
            value={String(plot.minimumPlotCount ?? '')}
            onChange={(e) => onChange('minimumPlotCount', e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  );
}
