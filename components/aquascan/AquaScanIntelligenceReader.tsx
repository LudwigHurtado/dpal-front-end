import React, { useMemo, useState } from 'react';
import type { AquaScanProject } from '../water/aquaScanMockData';
import type { NearbyEntity } from '../../services/entityLookupService';
import type { WaterAnalysisResponse } from '../../services/waterAnalysisService';
import type {
  CopernicusCollection,
  CopernicusIndexType,
  CopernicusStatisticsComparisonResponse,
  CopernicusValidatorStatus,
} from '../../services/copernicus/types';

export type AquaScanFocusLocationSummary = {
  displayName: string;
  latitude: number;
  longitude: number;
} | null;

export type AquaScanCalculationHistoryEntry = {
  calculationId: string;
  projectId: string;
  focusLocation: {
    latitude: number | null;
    longitude: number | null;
  };
  aoiSignature: string;
  setupSignature: string;
  aoiAreaSqKm: number;
  indexType: CopernicusIndexType;
  collection: 'sentinel-2-l2a' | 'sentinel-1-grd';
  before: { from: string; to: string };
  after: { from: string; to: string };
  deltaPercent: number | null;
  confidenceScore: number | null;
  sampleCounts: {
    before: number;
    after: number;
  };
  measurementStatus: string;
  validatorStatus: CopernicusValidatorStatus;
  generatedAt: string;
  summary: string;
  resultSnapshot: CopernicusStatisticsComparisonResponse | null;
};

type AquaScanQuestionId =
  | 'ndwi_meaning'
  | 'ndvi_drop'
  | 'confidence'
  | 'water_sample'
  | 'missing_evidence'
  | 'validation'
  | 'compare_next'
  | 'packet';

type AquaScanReaderContext = {
  calculationId: string;
  indexType: CopernicusIndexType;
  collection: CopernicusCollection;
  before: { from: string; to: string };
  after: { from: string; to: string };
  deltaPercent: number | null;
  confidenceScore: number | null;
  sampleCounts: { before: number; after: number };
  measurementStatus: string;
  validatorStatus: CopernicusValidatorStatus;
  aoiAreaSqKm: number;
  interpretation: string;
  warnings: string[];
  source: 'current' | 'history';
};

export type AquaScanIntelligenceOutput = {
  stateLabel: 'active calculated result' | 'saved history result' | 'setup only' | 'no setup';
  summary: string;
  keyFindings: string[];
  confidenceInterpretation: string;
  suggestedQuestions: string[];
  recommendedActions: string[];
  evidenceNeeded: string[];
  limitations: string[];
  historyInterpretation: string[];
  currentMeasurementStatus: string;
  questionsAndAnswers: Array<{ id: AquaScanQuestionId; label: string; answer: string }>;
};

type AquaScanIntelligenceReaderProps = {
  selectedFocusLocation: AquaScanFocusLocationSummary;
  selectedProject: AquaScanProject;
  savedAoiAreaSqKm: number;
  comparisonResult: CopernicusStatisticsComparisonResponse | null;
  comparisonIndexType: CopernicusIndexType;
  comparisonCollection: 'sentinel-2-l2a' | 'sentinel-1-grd';
  beforeRange: { from: string; to: string };
  afterRange: { from: string; to: string };
  calculationHistory: AquaScanCalculationHistoryEntry[];
  nearbyEntities: NearbyEntity[];
  validatorGateStatus: CopernicusValidatorStatus;
  waterData: WaterAnalysisResponse | null;
  evidencePacketPayload: Record<string, unknown> | null;
  riskScore: number;
  warnings: string[];
  selectedHistoryItem?: AquaScanCalculationHistoryEntry | null;
  variant?: 'full' | 'compact';
};

const INDEX_GUIDE: Record<CopernicusIndexType, string> = {
  NDWI: 'NDWI tracks water presence and wetness.',
  NDVI: 'NDVI tracks vegetation health and greenness.',
  NDMI: 'NDMI tracks moisture signal and moisture stress.',
  NBR: 'NBR tracks burn or disturbance-related change.',
};

const QUESTION_LABELS: Array<{ id: AquaScanQuestionId; label: string }> = [
  { id: 'ndwi_meaning', label: 'What does this NDWI change mean?' },
  { id: 'ndvi_drop', label: 'Why did NDVI drop so much?' },
  { id: 'confidence', label: 'Is 60% confidence strong?' },
  { id: 'water_sample', label: 'Should I request a water sample?' },
  { id: 'missing_evidence', label: 'What evidence is missing?' },
  { id: 'validation', label: 'Are these results enough for validation?' },
  { id: 'compare_next', label: 'What should I compare next?' },
  { id: 'packet', label: 'Should I generate an Evidence Packet?' },
];

function formatSignedPercent(value: number | null): string {
  if (value == null) return 'N/A';
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function formatValidatorLabel(status: CopernicusValidatorStatus): string {
  return status.replace(/_/g, ' ');
}

export function formatCalculationHistoryHeadline(item: AquaScanCalculationHistoryEntry): string {
  if (item.measurementStatus.toLowerCase().includes('no valid samples')) {
    return `${item.indexType} | no valid samples`;
  }
  const confidence = item.confidenceScore != null ? `${Math.round(item.confidenceScore * 100)}% confidence` : 'Confidence unavailable';
  return `${item.indexType} | ${formatSignedPercent(item.deltaPercent)} | ${confidence} | ${formatValidatorLabel(item.validatorStatus)}`;
}

function describeStrength(deltaPercent: number | null): string {
  if (deltaPercent == null) return 'No measurable change strength could be graded because valid samples were not returned.';
  const absolute = Math.abs(deltaPercent);
  if (absolute < 5) return 'This is a small or stable change signal.';
  if (absolute <= 15) return 'This is a moderate change signal.';
  if (absolute <= 50) return 'This is a notable change signal and should be reviewed carefully.';
  return 'This is a major change signal and requires careful validation.';
}

function describeConfidence(confidenceScore: number | null): string {
  if (confidenceScore == null) return 'Confidence is not available for this result.';
  if (confidenceScore >= 0.75) return 'Higher confidence screening result.';
  if (confidenceScore >= 0.5) return 'Moderate confidence. Useful for screening, but needs validation.';
  return 'Low confidence. Treat this as weak evidence.';
}

function describeIndexReading(indexType: CopernicusIndexType, deltaPercent: number | null): string {
  if (deltaPercent == null) {
    return `${indexType} did not return valid samples for this run, so no directional interpretation is available.`;
  }
  if (indexType === 'NDWI') {
    return deltaPercent >= 0
      ? 'NDWI increased, suggesting a stronger water or wetness signal in the after period.'
      : 'NDWI decreased, suggesting a weaker water or wetness signal in the after period.';
  }
  if (indexType === 'NDVI') {
    return deltaPercent <= -50
      ? 'NDVI decreased sharply, suggesting vegetation signal dropped in the after period. This may reflect seasonal vegetation change, disturbance, drying, land cover change, or poor scene quality. It requires review.'
      : deltaPercent < 0
        ? 'NDVI decreased, suggesting a weaker vegetation signal in the after period.'
        : 'NDVI increased, suggesting a stronger vegetation signal in the after period.';
  }
  if (indexType === 'NDMI') {
    return deltaPercent < 0
      ? 'NDMI decreased, suggesting lower moisture signal or increased moisture stress.'
      : 'NDMI increased, suggesting a stronger moisture signal in the after period.';
  }
  return deltaPercent < 0
    ? 'NBR decreased, which may indicate disturbance or burn-related change, but it is not proof of fire without additional context.'
    : 'NBR increased, suggesting less disturbance signal in the after period, but it still needs context review.';
}

function buildCurrentContext(args: {
  comparisonResult: CopernicusStatisticsComparisonResponse | null;
  comparisonIndexType: CopernicusIndexType;
  comparisonCollection: 'sentinel-2-l2a' | 'sentinel-1-grd';
  beforeRange: { from: string; to: string };
  afterRange: { from: string; to: string };
  validatorGateStatus: CopernicusValidatorStatus;
  savedAoiAreaSqKm: number;
}): AquaScanReaderContext | null {
  const { comparisonResult } = args;
  if (!comparisonResult) return null;
  return {
    calculationId: 'current',
    indexType: args.comparisonIndexType,
    collection: args.comparisonCollection,
    before: args.beforeRange,
    after: args.afterRange,
    deltaPercent: comparisonResult.delta.percentChange,
    confidenceScore:
      comparisonResult.before.sampleCount > 0 && comparisonResult.after.sampleCount > 0
        ? comparisonResult.confidenceScore
        : null,
    sampleCounts: {
      before: comparisonResult.before.sampleCount,
      after: comparisonResult.after.sampleCount,
    },
    measurementStatus:
      comparisonResult.measurementStatus === 'no_valid_samples'
        ? 'No valid samples returned'
        : 'Valid samples returned',
    validatorStatus: args.validatorGateStatus,
    aoiAreaSqKm: args.savedAoiAreaSqKm,
    interpretation: comparisonResult.delta.interpretation,
    warnings: comparisonResult.warnings,
    source: 'current',
  };
}

function buildHistoryContext(item: AquaScanCalculationHistoryEntry | null): AquaScanReaderContext | null {
  if (!item) return null;
  return {
    calculationId: item.calculationId,
    indexType: item.indexType,
    collection: item.collection,
    before: item.before,
    after: item.after,
    deltaPercent: item.deltaPercent,
    confidenceScore: item.confidenceScore,
    sampleCounts: item.sampleCounts,
    measurementStatus: item.measurementStatus,
    validatorStatus: item.validatorStatus,
    aoiAreaSqKm: item.aoiAreaSqKm,
    interpretation: item.resultSnapshot?.delta.interpretation ?? describeIndexReading(item.indexType, item.deltaPercent),
    warnings: item.resultSnapshot?.warnings ?? [],
    source: 'history',
  };
}

export function buildAquaScanIntelligence(args: AquaScanIntelligenceReaderProps): AquaScanIntelligenceOutput {
  const currentContext = buildCurrentContext(args);
  const historyContext = buildHistoryContext(args.selectedHistoryItem ?? args.calculationHistory[0] ?? null);
  const activeContext = currentContext ?? historyContext;
  const recentHistory = args.calculationHistory.slice(0, 3);
  const hasSetup = Boolean(
    args.savedAoiAreaSqKm > 0
    && args.beforeRange.from
    && args.beforeRange.to
    && args.afterRange.from
    && args.afterRange.to
    && args.comparisonIndexType,
  );
  const stateLabel: AquaScanIntelligenceOutput['stateLabel'] = currentContext
    ? 'active calculated result'
    : historyContext
      ? 'saved history result'
      : hasSetup
        ? 'setup only'
        : 'no setup';
  const currentMeasurementStatus = currentContext
    ? `${currentContext.measurementStatus}. ${describeIndexReading(currentContext.indexType, currentContext.deltaPercent)}`
    : historyContext
      ? 'Reading saved comparison history.'
      : hasSetup
        ? 'Dates are selected, but no active calculated comparison has been run yet.'
        : 'No setup is ready yet. Select an AOI, index, and before/after date windows to prepare the comparison.';

  const summary = currentContext
    ? `Active calculated comparison loaded. ${describeIndexReading(currentContext.indexType, currentContext.deltaPercent)} ${describeStrength(currentContext.deltaPercent)} ${describeConfidence(currentContext.confidenceScore)}`
    : historyContext
      ? `Reading saved comparison history. ${describeIndexReading(historyContext.indexType, historyContext.deltaPercent)} ${describeStrength(historyContext.deltaPercent)} ${describeConfidence(historyContext.confidenceScore)}`
      : hasSetup
        ? recentHistory.length > 0
          ? `Comparison setup is ready, but the satellite calculation has not been run yet. Click Calculate Comparison to generate before/after measurement values. Saved comparison results are available. Restore a result or create a report directly from history. Recent rows include ${recentHistory.map((item) => formatCalculationHistoryHeadline(item)).join('; ')}.`
          : 'Comparison setup is ready, but the satellite calculation has not been run yet. Click Calculate Comparison to generate before/after measurement values.'
        : 'No setup is ready yet. Select an AOI, index, and before/after date windows to prepare the comparison.';

  const keyFindings = [
    currentContext
      ? `Current measurement status: ${currentContext.measurementStatus}.`
      : historyContext
        ? 'Current measurement status: reading saved comparison history.'
        : hasSetup
          ? 'Current measurement status: setup only, no active calculated result yet.'
          : 'Current measurement status: no setup loaded.',
    activeContext ? describeIndexReading(activeContext.indexType, activeContext.deltaPercent) : 'No index reading is available yet.',
    activeContext ? describeStrength(activeContext.deltaPercent) : 'Change strength cannot be graded until a comparison exists.',
    activeContext ? describeConfidence(activeContext.confidenceScore) : 'Confidence cannot be interpreted until a comparison exists.',
    args.nearbyEntities.length > 0
      ? `Nearby mapped entities are present (${args.nearbyEntities.length}), but they are contextual leads only.`
      : 'No nearby mapped entities are currently listed for this focus point.',
  ];

  const suggestedQuestions = [
    'Are these results from the same AOI?',
    'Are these results from the same before and after dates?',
    'Was the AOI drawn over water, vegetation, dry land, or mixed terrain?',
    'Were there clouds or no-data warnings?',
    activeContext?.indexType === 'NDVI' || args.calculationHistory.some((item) => item.indexType === 'NDVI')
      ? 'Was the NDVI drop seasonal or caused by disturbance?'
      : 'Does the current index change match what is visible in imagery?',
    activeContext?.indexType === 'NDWI' || args.calculationHistory.some((item) => item.indexType === 'NDWI')
      ? 'Does the NDWI change match visible water expansion or retreat?'
      : 'Should we compare the same months from another year?',
    activeContext?.indexType === 'NDMI' || args.calculationHistory.some((item) => item.indexType === 'NDMI')
      ? 'Does the NDMI decrease suggest drying or moisture stress?'
      : 'Should we request field photos or a water sample?',
    'Should this go to validator review?',
  ];

  const recommendedActions = [
    (activeContext?.indexType === 'NDWI' && activeContext.deltaPercent != null && Math.abs(activeContext.deltaPercent) > 15)
      ? 'Review the AOI on imagery and request a water sample if the concern remains.'
      : null,
    (activeContext?.indexType === 'NDVI' && activeContext.deltaPercent != null && activeContext.deltaPercent <= -15)
      ? 'Check seasonal vegetation patterns, disturbance, land cover change, burn history, or field photos.'
      : null,
    (activeContext?.indexType === 'NDMI' && activeContext.deltaPercent != null && activeContext.deltaPercent < -5)
      ? 'Review drought and moisture-stress context before drawing conclusions.'
      : null,
    (activeContext?.indexType === 'NBR' && activeContext.deltaPercent != null && Math.abs(activeContext.deltaPercent) > 5)
      ? 'Review burn or disturbance context. NBR alone does not prove fire.'
      : null,
    args.calculationHistory.filter((item) => item.deltaPercent != null && Math.abs(item.deltaPercent) > 15).length >= 2
      ? 'Several indexes changed notably. Generate an Evidence Packet and send it to validator review.'
      : null,
    !currentContext
      ? historyContext
        ? 'Use the saved history result directly, restore it into the current workspace, or create a report from that saved result.'
        : hasSetup
          ? 'Run Calculate Comparison for the current AOI and dates, create a preliminary setup report, or use a saved history result.'
          : 'Select an AOI, choose an index, and enter before/after dates first.'
      : 'If this current result matters operationally, export an Evidence Packet and pair it with field evidence.',
  ].filter((value): value is string => Boolean(value));

  const evidenceNeeded = [
    'Field photos from the same AOI and timeframe.',
    'Water sample or lab result if contamination remains a concern.',
    'A visual imagery review to confirm whether the index change matches what is visible.',
    'A repeat comparison using the same months from another year if seasonality may be driving the change.',
    args.warnings.length > 0 || activeContext?.warnings.length
      ? 'Review the comparison warnings before escalation.'
      : 'Review cloud cover and no-data conditions before escalation.',
  ];

  const limitations = [
    'Satellite-derived measurements are screening indicators. They do not prove contamination, legal responsibility, or official violations without field evidence, lab testing, or validator or agency review.',
    'Nearby mapped entities are contextual leads only. Proximity does not prove contamination, liability, wrongdoing, or responsibility.',
    'AOI placement, mixed terrain, clouds, seasonality, and scene availability can affect the result.',
  ];

  const confidenceInterpretation = activeContext ? describeConfidence(activeContext.confidenceScore) : 'Confidence is not available until a comparison result is loaded.';
  const historyInterpretation = Array.from(new Set(args.calculationHistory.slice(0, 6).map((item) => INDEX_GUIDE[item.indexType])));

  const questionAnswers: Record<AquaScanQuestionId, string> = {
    ndwi_meaning: activeContext?.indexType === 'NDWI'
      ? `${describeIndexReading('NDWI', activeContext.deltaPercent)} ${describeStrength(activeContext.deltaPercent)}`
      : 'NDWI tracks water presence and wetness. A positive change suggests stronger water or wetness signal, while a negative change suggests weaker signal.',
    ndvi_drop: args.calculationHistory.some((item) => item.indexType === 'NDVI' && (item.deltaPercent ?? 0) < 0) || activeContext?.indexType === 'NDVI'
      ? 'A sharp NDVI drop can reflect seasonal change, drying, disturbance, land cover change, or poor scene quality. It is a review signal, not proof of damage by itself.'
      : 'NDVI is not the active result here, but if it drops sharply it usually warrants a seasonality and disturbance review.',
    confidence: `${confidenceInterpretation} A 60% confidence score is moderate confidence. Useful for screening, not final proof.`,
    water_sample: activeContext?.indexType === 'NDWI' || String(args.selectedProject.concernType).toLowerCase().includes('contamination')
      ? 'If the water-related concern remains after imagery review, requesting a water sample is a sensible next step.'
      : 'A water sample can still help if the concern is operationally important, but first confirm the AOI and imagery context.',
    missing_evidence: evidenceNeeded.join(' '),
    validation: currentContext
      ? 'These results are useful for screening, but they are not enough for validation by themselves. Pair them with field evidence, lab work, imagery review, and validator review.'
      : 'Not yet. A current loaded comparison is missing, so validation should wait until the relevant result is restored or rerun.',
    compare_next: 'Compare the same AOI using the same months from another year, and compare neighboring AOIs if you need stronger context about seasonality versus site-specific change.',
    packet: currentContext
      ? 'Yes, if this current result is the one you want to document. The packet is most useful when paired with AOI, dates, warnings, and supporting field evidence.'
      : 'Generate an Evidence Packet only after restoring or rerunning the result you want to document for the current setup.',
  };

  return {
    stateLabel,
    summary,
    keyFindings,
    confidenceInterpretation,
    suggestedQuestions,
    recommendedActions,
    evidenceNeeded,
    limitations,
    historyInterpretation,
    currentMeasurementStatus,
    questionsAndAnswers: QUESTION_LABELS.map((question) => ({
      ...question,
      answer: questionAnswers[question.id],
    })),
  };
}

export function AquaScanIntelligenceReader(props: AquaScanIntelligenceReaderProps) {
  const intelligence = useMemo(() => buildAquaScanIntelligence(props), [props]);
  const [activeQuestionId, setActiveQuestionId] = useState<AquaScanQuestionId>('ndwi_meaning');
  const activeQuestion = intelligence.questionsAndAnswers.find((item) => item.id === activeQuestionId) ?? intelligence.questionsAndAnswers[0];

  if (props.variant === 'compact') {
    return (
      <div className="mt-2 rounded-lg border border-violet-500/30 bg-violet-950/20 p-2.5 text-[10px]">
        <p className="mb-1 font-semibold uppercase tracking-wider text-violet-300">AI Intelligence Reader</p>
        <p className="text-slate-300">{intelligence.summary}</p>
        <p className="mt-2 text-[10px] text-slate-400">{intelligence.confidenceInterpretation}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-slate-950/85 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">AI Intelligence Reader</p>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
          {props.comparisonResult ? 'Reading current comparison' : 'Reading saved history'}
        </span>
      </div>
      <div className="mt-3 space-y-3 text-xs text-slate-200">
        <div>
          <p className="font-semibold text-white">What this result means</p>
          <p className="mt-1 text-slate-300">{intelligence.summary}</p>
        </div>
        <div>
          <p className="font-semibold text-white">Current measurement status</p>
          <p className="mt-1 text-slate-300">{intelligence.currentMeasurementStatus}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="font-semibold text-white">What it does not prove</p>
            <p className="mt-1 text-slate-300">
              Satellite-derived measurements are screening indicators. They do not prove contamination, legal responsibility, or official violations without field evidence, lab testing, or validator or agency review.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white">Why it may matter</p>
            <p className="mt-1 text-slate-300">
              If the result can be reproduced for the same AOI and dates, it can help prioritize imagery review, field sampling, and validator attention.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="font-semibold text-white">History interpretation</p>
            <div className="mt-1 space-y-1 text-slate-300">
              {intelligence.historyInterpretation.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-white">Key findings</p>
            <div className="mt-1 space-y-1 text-slate-300">
              {intelligence.keyFindings.map((line) => (
                <p key={line}>- {line}</p>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="font-semibold text-white">Questions to ask next</p>
            <div className="mt-1 space-y-1 text-slate-300">
              {intelligence.suggestedQuestions.map((line) => (
                <p key={line}>- {line}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-white">What evidence is missing</p>
            <div className="mt-1 space-y-1 text-slate-300">
              {intelligence.evidenceNeeded.map((line) => (
                <p key={line}>- {line}</p>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="font-semibold text-white">What action makes sense next</p>
          <div className="mt-1 space-y-1 text-slate-300">
            {intelligence.recommendedActions.map((line) => (
              <p key={line}>- {line}</p>
            ))}
          </div>
        </div>
        <div>
          <p className="font-semibold text-white">Interactive questions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {intelligence.questionsAndAnswers.map((question) => (
              <button
                key={question.id}
                type="button"
                onClick={() => setActiveQuestionId(question.id)}
                className={`rounded-full border px-2 py-1 text-[10px] ${
                  activeQuestionId === question.id
                    ? 'border-violet-400 bg-violet-900/30 text-violet-100'
                    : 'border-slate-700 bg-slate-900/40 text-slate-300'
                }`}
              >
                {question.label}
              </button>
            ))}
          </div>
          {activeQuestion ? (
            <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-slate-300">
              <p className="font-semibold text-white">{activeQuestion.label}</p>
              <p className="mt-1">{activeQuestion.answer}</p>
            </div>
          ) : null}
        </div>
        <div className="rounded-lg border border-amber-500/40 bg-amber-900/15 p-3 text-[11px] text-amber-100">
          <p>{intelligence.limitations[0]}</p>
          <p className="mt-1">{intelligence.limitations[1]}</p>
        </div>
      </div>
    </div>
  );
}

export default AquaScanIntelligenceReader;
