import React, { useCallback, useMemo, useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Sparkles } from '../../../../components/icons';
import type { DmrvInputConfig } from '../services/dmrvInputConfigTypes';
import {
  calculateMethodologyReadiness,
  createMethodologyApplicationTrace,
  evidenceRulesAppliedList,
  getMethodologyPresetById,
  getMethodologyPresetsForType,
  getMethodologyTracesForProject,
  METHODOLOGY_STATUS_LABELS,
  METHODOLOGY_STATUS_STYLES,
  presetToDataSourceSettings,
  recommendMethodologyPreset,
  saveMethodologyTrace,
  type DmrvMethodologyPreset,
  type MethodologyApplicationTrace,
  type MethodologyRecommendation,
} from '../dmrvMethodologyPresets';
import { MethodologyPreviewCard } from './MethodologyPreviewCard';

export type DmrvMethodologyPresetPanelProps = {
  config: DmrvInputConfig;
  typeId: string;
  typeTitle: string;
  recommendContext: {
    selectedSources: string[];
    hasFieldPlots: boolean;
    projectContext: string;
  };
  onApplyPreset: (
    preset: DmrvMethodologyPreset,
    dataSourcePatch: ReturnType<typeof presetToDataSourceSettings>,
    validationRules: DmrvMethodologyPreset['requiredEvidenceRules'],
  ) => void;
  onTraceCreated?: (trace: MethodologyApplicationTrace) => void;
  disabled?: boolean;
};

export function DmrvMethodologyPresetPanel({
  config,
  typeId,
  typeTitle,
  recommendContext,
  onApplyPreset,
  onTraceCreated,
  disabled = false,
}: DmrvMethodologyPresetPanelProps): React.ReactElement {
  const presets = useMemo(() => getMethodologyPresetsForType(typeId), [typeId]);
  const storedPresetId = String(config.dataSourceSettings.methodologyPresetId ?? '');
  const [selectedPresetId, setSelectedPresetId] = useState(
    storedPresetId || presets[0]?.id || 'custom-methodology',
  );
  const [showChain, setShowChain] = useState(true);
  const [showVerifier, setShowVerifier] = useState(true);
  const [recommendation, setRecommendation] = useState<MethodologyRecommendation | null>(null);
  const [lastTrace, setLastTrace] = useState<MethodologyApplicationTrace | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  const selectedPreset = useMemo(
    () => getMethodologyPresetById(selectedPresetId) ?? null,
    [selectedPresetId],
  );

  const appliedPreset = useMemo(
    () => (storedPresetId ? getMethodologyPresetById(storedPresetId) : null),
    [storedPresetId],
  );

  const previewPreset = appliedPreset ?? selectedPreset;

  const readiness = useMemo(
    () =>
      calculateMethodologyReadiness(previewPreset, {
        dataSourceSettings: config.dataSourceSettings,
        validationRules: config.validationRules,
        selectedPresetId: storedPresetId || selectedPresetId,
      }),
    [config.dataSourceSettings, config.validationRules, previewPreset, selectedPresetId, storedPresetId],
  );

  const applyPresetInternal = useCallback(
    (preset: DmrvMethodologyPreset, appliedBy: 'user' | 'ai-recommendation') => {
      const dsPatch = presetToDataSourceSettings(preset);
      onApplyPreset(preset, dsPatch, preset.requiredEvidenceRules);
      setSelectedPresetId(preset.id);

      const readinessResult = calculateMethodologyReadiness(preset, {
        dataSourceSettings: { ...config.dataSourceSettings, ...dsPatch },
        validationRules: preset.requiredEvidenceRules,
        selectedPresetId: preset.id,
      });

      const fieldsApplied = [
        'equationModel',
        'units',
        'conversionFactor',
        'carbonFraction',
        'uncertaintyPct',
        'qaQcNotes',
      ];
      const evidenceRulesApplied = evidenceRulesAppliedList(preset.requiredEvidenceRules);
      const trace = createMethodologyApplicationTrace({
        projectId: config.projectId,
        dmrvTypeId: typeId,
        preset,
        fieldsApplied,
        evidenceRulesApplied,
        appliedBy,
        readinessScore: readinessResult.score,
      });
      saveMethodologyTrace(trace);
      setLastTrace(trace);
      onTraceCreated?.(trace);
    },
    [config.dataSourceSettings, config.projectId, onApplyPreset, onTraceCreated, typeId],
  );

  const handleApply = useCallback(() => {
    const preset = getMethodologyPresetById(selectedPresetId);
    if (!preset) return;
    applyPresetInternal(preset, 'user');
  }, [applyPresetInternal, selectedPresetId]);

  const handleRecommend = useCallback(() => {
    const rec = recommendMethodologyPreset(typeId, {
      selectedSources: recommendContext.selectedSources,
      hasFieldPlots: recommendContext.hasFieldPlots,
      projectContext: [
        recommendContext.projectContext,
        config.projectContext.methodology,
        config.projectContext.projectName,
        typeTitle,
      ]
        .filter(Boolean)
        .join(' '),
    });
    setRecommendation(rec);
    setSelectedPresetId(rec.preset.id);
  }, [config.projectContext, recommendContext, typeId, typeTitle]);

  const handleApplyRecommendation = useCallback(() => {
    if (!recommendation) return;
    applyPresetInternal(recommendation.preset, 'ai-recommendation');
  }, [applyPresetInternal, recommendation]);

  const projectTraces = useMemo(
    () => getMethodologyTracesForProject(config.projectId).slice(0, 3),
    [config.projectId, lastTrace],
  );

  const showCertWarning =
    previewPreset &&
    previewPreset.status !== 'external-standard-aligned';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-[#1e3a5f]">Methodology Preset</h3>
        <p className="mt-1 text-xs text-slate-600">
          Choose a pre-aligned calculation style. DPAL will fill the biomass/carbon fields and evidence rules for
          verifier review.
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Fits <span className="font-semibold">{typeTitle}</span> — draft configuration; not certified until reviewed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Methodology style</span>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15"
            value={selectedPresetId}
            onChange={(e) => {
              setSelectedPresetId(e.target.value);
              setRecommendation(null);
            }}
            disabled={disabled}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName} — {METHODOLOGY_STATUS_LABELS[p.status]}
              </option>
            ))}
          </select>
        </label>
        {selectedPreset ? (
          <span
            className={`inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${METHODOLOGY_STATUS_STYLES[selectedPreset.status]}`}
          >
            {METHODOLOGY_STATUS_LABELS[selectedPreset.status]}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleApply}
          disabled={disabled || !selectedPreset}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-sm font-bold text-white hover:bg-[#152a47] disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          Apply Preset
        </button>
        <button
          type="button"
          onClick={handleRecommend}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
        >
          <Bot className="h-4 w-4" />
          AI Recommend Methodology
        </button>
        <button
          type="button"
          onClick={() => setShowChain((v) => !v)}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {showChain ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showChain ? 'Hide' : 'View'} calculation chain
        </button>
        <button
          type="button"
          onClick={() => setShowVerifier((v) => !v)}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {showVerifier ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showVerifier ? 'Hide' : 'View'} verifier explanation
        </button>
      </div>

      {showCertWarning ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
          This preset prepares a verifier-facing DMRV configuration. It does not certify or approve carbon credits by
          itself. Status:{' '}
          <span className="font-semibold">{previewPreset ? METHODOLOGY_STATUS_LABELS[previewPreset.status] : '—'}</span>
          {' '}
          — requires independent review before any formal crediting claim.
        </p>
      ) : null}

      {recommendation ? (
        <div className="rounded-xl border border-[#1e3a5f]/25 bg-[#e8f0f7] px-4 py-3 text-sm">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#1e3a5f]">AI recommendation</p>
          <p className="mt-1 font-semibold text-slate-900">{recommendation.preset.shortName}</p>
          <p className="mt-1 text-xs text-slate-700">{recommendation.reason}</p>
          {recommendation.warnings.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-xs text-amber-900">
              {recommendation.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-[11px] text-slate-600">
            <span className="font-semibold">Required evidence:</span>{' '}
            {recommendation.requiredEvidence.join(', ') || '—'}
          </p>
          {recommendation.missing.length > 0 ? (
            <p className="mt-1 text-[11px] text-amber-800">
              <span className="font-semibold">May be missing:</span> {recommendation.missing.join(', ')}
            </p>
          ) : null}
          {recommendation.needsVerifierReview ? (
            <p className="mt-2 text-[11px] font-semibold text-amber-900">Requires verifier review before formal use.</p>
          ) : null}
          <button
            type="button"
            onClick={handleApplyRecommendation}
            disabled={disabled}
            className="mt-3 rounded-lg bg-[#1e3a5f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#152a47] disabled:opacity-60"
          >
            Apply recommended preset
          </button>
        </div>
      ) : null}

      <MethodologyPreviewCard
        preset={previewPreset}
        readiness={readiness}
        showCalculationChain={showChain}
        showVerifierExplanation={showVerifier}
      />

      {(lastTrace || projectTraces.length > 0) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80">
          <button
            type="button"
            onClick={() => setShowTrace((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-[#1e3a5f]"
          >
            Methodology application trace
            {showTrace ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showTrace ? (
            <div className="space-y-2 border-t border-slate-200 px-3 py-2.5">
              {(lastTrace ? [lastTrace, ...projectTraces.filter((t) => t.id !== lastTrace.id)] : projectTraces)
                .slice(0, 3)
                .map((trace) => (
                  <div key={trace.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]">
                    <p className="font-semibold text-slate-900">{trace.presetName}</p>
                    <p className="text-slate-600">
                      {new Date(trace.createdAt).toLocaleString()} · {trace.appliedBy} · {trace.status}
                    </p>
                    <p className="mt-1 font-mono text-slate-500">{trace.traceHash}</p>
                    <p className="mt-1 text-slate-600">{trace.verifierExplanation.slice(0, 120)}…</p>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
