import { isAiEnabled, runGeminiPrompt } from '../../../../services/geminiService';
import type { DmrvValidationRules } from '../services/dmrvInputConfigTypes';
import type { DmrvMethodologyPreset, DmrvMethodologyStatus } from '../dmrvMethodologyPresets';
import {
  calculateMethodologyReadiness,
  createMethodologyTraceHash,
  DMRV_METHODOLOGY_PRESETS,
  evidenceRulesAppliedList,
  getMethodologyPresetById,
  METHODOLOGY_STATUS_LABELS,
} from '../dmrvMethodologyPresets';

export type MethodologyCounselTrace = {
  id: string;
  projectId?: string;
  dmrvTypeId?: string;
  methodologyId?: string;
  userQuestion: string;
  aiAnswer: string;
  methodologyReviewed: string;
  inputsReviewed: string[];
  formulaOrModelReviewed: string;
  evidenceRulesReviewed: string[];
  assumptions: string[];
  limitations: string[];
  riskFlags: string[];
  validatorQuestions: string[];
  recommendedActions: string[];
  confidenceScore: number;
  humanAccepted?: boolean;
  humanOverrideReason?: string;
  traceHash: string;
  createdAt: string;
  status: 'ai-draft' | 'verifier-review-required' | 'prepared-for-anchor' | 'anchored';
};

export type MethodologyCounselContext = {
  projectId?: string;
  dmrvTypeId?: string;
  dmrvTypeName?: string;
  selectedMethodologyId?: string;
  methodologyPreset?: DmrvMethodologyPreset | null;
  selectedSources?: string[];
  selectedLidarSources?: string[];
  formState?: Record<string, unknown>;
  evidenceRules?: Record<string, boolean>;
  topic?: string;
};

export type CalculatorMode = 'carbon' | 'plastic' | 'water' | 'pollution';

export type MethodologyExplanationBoard = {
  methodologyCard: {
    name: string;
    status: string;
    statusKey: DmrvMethodologyStatus | 'unknown';
    domain: string;
    maturity: string;
    bestFor: string;
    notFor: string;
  };
  calculationChain: string[];
  requiredEvidence: { label: string; met: boolean }[];
  validatorView: {
    verify: string[];
    assumptions: string[];
    limitations: string[];
    strengthen: string[];
  };
  riskFlags: string[];
  calculatorMode: CalculatorMode;
  calculatorInputs: Record<string, string | number | boolean>;
  calculatorOutputs: Record<string, string | number>;
  readinessLabel: string;
  readinessScore: number;
};

export type MethodologyCounselResponse = {
  answer: string;
  board: MethodologyExplanationBoard;
  trace: MethodologyCounselTrace;
};

export const METHODOLOGY_COUNSEL_TRACE_KEY = 'dpal_dmrv_methodology_counsel_traces_v1';

const RULE_LABELS: Record<string, string> = {
  requireCoordinates: 'AOI / coordinates',
  requireTimestamp: 'Timestamped records',
  requireSourceDocument: 'Source document',
  requireReviewerApproval: 'Reviewer approval',
  requireFieldVerification: 'Field verification',
  requireBeforeAfterComparison: 'Before/after comparison',
  requireAnomalyDetection: 'Anomaly detection',
  requireUncertaintyScore: 'Uncertainty score',
};

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return String(v ?? '').trim();
}

export function inferCalculatorMode(
  preset: DmrvMethodologyPreset | null | undefined,
  dmrvTypeId?: string,
): CalculatorMode {
  const type = (dmrvTypeId ?? '').toLowerCase();
  if (preset?.category === 'agriculture-soil') return 'carbon';
  if (
    preset?.category === 'forest-carbon' ||
    preset?.category === 'blue-carbon' ||
    preset?.category === 'avoided-deforestation' ||
    preset?.category === 'reforestation'
  ) {
    return 'carbon';
  }
  if (type.includes('plastic') || type.includes('marine-ocean') || type.includes('hyperspectral')) {
    return 'plastic';
  }
  if (
    type.includes('water') ||
    type.includes('freshwater') ||
    type.includes('drought') ||
    type.includes('marine') ||
    type.includes('mangrove')
  ) {
    return 'water';
  }
  if (
    type.includes('pollution') ||
    type.includes('emission') ||
    type.includes('carb') ||
    type.includes('regulatory')
  ) {
    return 'pollution';
  }
  return 'carbon';
}

function maturityLabel(status: DmrvMethodologyStatus | undefined): string {
  switch (status) {
    case 'dpal-pilot':
      return 'DPAL pilot — draft configuration';
    case 'reference-aligned':
      return 'Reference-aligned screening';
    case 'external-standard-aligned':
      return 'External-standard aligned — still requires review';
    case 'requires-review':
      return 'Verifier review required';
    case 'custom':
      return 'Custom — manual documentation required';
    default:
      return 'Not configured';
  }
}

function notForHint(preset: DmrvMethodologyPreset | null): string {
  if (!preset) return 'Formal crediting claims without verifier review and complete evidence.';
  if (preset.id === 'satellite-ndvi-biomass-regression') {
    return 'Final biomass proof without field calibration or dense forest without saturation controls.';
  }
  if (preset.category === 'avoided-deforestation') {
    return 'Projects without documented baseline, leakage, and permanence safeguards.';
  }
  if (preset.status === 'custom') {
    return 'Automated approval without complete formula documentation.';
  }
  return 'Certified carbon credit claims without independent program validation.';
}

export function findMissingMethodologyEvidence(
  preset: DmrvMethodologyPreset | null,
  formState: Record<string, unknown> = {},
  evidenceRules: Record<string, boolean> = {},
): string[] {
  const missing: string[] = [];
  if (!preset) {
    missing.push('Select a methodology preset');
    return missing;
  }
  if (!str(formState.equationModel)) missing.push('Equation / model used');
  if (!str(formState.units) || formState.units === 'user-defined') missing.push('Units defined');
  if (!str(formState.conversionFactor) || formState.conversionFactor === 'user-defined') {
    missing.push('Conversion factor');
  }
  if (!str(formState.carbonFraction) || formState.carbonFraction === 'user-defined') {
    missing.push('Carbon fraction');
  }
  if (!str(formState.uncertaintyPct)) missing.push('Uncertainty %');
  if (!str(formState.qaQcNotes)) missing.push('QA/QC notes');

  for (const [key, required] of Object.entries(preset.requiredEvidenceRules)) {
    if (required && !evidenceRules[key]) {
      missing.push(RULE_LABELS[key] ?? key);
    }
  }

  for (const input of preset.requiredInputs) {
    const lower = input.toLowerCase();
    if (lower.includes('aoi') && !evidenceRules.requireCoordinates) {
      missing.push(`Required input: ${input}`);
    }
  }

  const sources = (formState._selectedSources as string[] | undefined) ?? [];
  if (
    sources.length > 0 &&
    sources.every((s) => s.toLowerCase().includes('satellite')) &&
    preset.requiredEvidenceRules.requireFieldVerification &&
    !evidenceRules.requireFieldVerification
  ) {
    missing.push('Field verification for satellite-heavy evidence');
  }

  return [...new Set(missing)];
}

export function generateValidatorQuestions(
  preset: DmrvMethodologyPreset | null,
  formState: Record<string, unknown> = {},
): string[] {
  if (!preset) {
    return [
      'Which methodology preset is selected and who approved it?',
      'What evidence supports each input in the calculation chain?',
    ];
  }
  const base = [
    `Does the AOI boundary match the documented ${preset.shortName} scope?`,
    'Are biomass or stock estimates traceable to primary source records?',
    `Is uncertainty (${str(formState.uncertaintyPct) || preset.defaultUncertaintyPercent}%) documented and conservative?`,
    'Has an independent reviewer approved this configuration before evidence packet export?',
    'Are carbon fraction and conversion assumptions appropriate for this ecosystem?',
  ];
  if (preset.requiredEvidenceRules.requireFieldVerification) {
    base.push('Is field plot sampling design documented (plot ID, GPS, surveyor, date)?');
  }
  if (preset.requiredEvidenceRules.requireBeforeAfterComparison) {
    base.push('Do before/after scenes or periods align with the reporting window?');
  }
  if (preset.category === 'avoided-deforestation') {
    base.push('How were baseline, leakage, and permanence assumptions validated?');
  }
  if (preset.status === 'custom') {
    base.push('Where is the full custom formula documentation and external reference?');
  }
  return base;
}

export function calculateMethodologyExample(
  preset: DmrvMethodologyPreset | null,
  inputs: Record<string, string | number | boolean>,
  mode?: CalculatorMode,
): { mode: CalculatorMode; inputs: Record<string, string | number | boolean>; outputs: Record<string, string | number> } {
  const calcMode = mode ?? inferCalculatorMode(preset, undefined);

  if (calcMode === 'plastic') {
    const hotspots = num(inputs.hotspotCount);
    const area = num(inputs.affectedAreaHa);
    const confidence = num(inputs.confidenceScore, 0.5);
    const fieldValidated = Boolean(inputs.fieldValidation);
    const risk = Math.min(100, Math.round(hotspots * 8 + area * 2 + (1 - confidence) * 20));
    return {
      mode: calcMode,
      inputs,
      outputs: {
        plasticRiskScore: risk,
        validationStatus: fieldValidated ? 'Field validation noted — screening only' : 'Screening — field validation recommended',
        evidenceReadiness: fieldValidated && confidence >= 0.6 ? 'Ready for review' : 'Needs evidence',
      },
    };
  }

  if (calcMode === 'water') {
    const before = num(inputs.waterExtentBeforeHa);
    const after = num(inputs.waterExtentAfterHa);
    const confidence = num(inputs.confidenceScore, 0.5);
    const change = after - before;
    const pct = before > 0 ? (change / before) * 100 : 0;
    const score = Math.min(100, Math.round(confidence * 70 + (Math.abs(pct) < 30 ? 20 : 5)));
    return {
      mode: calcMode,
      inputs,
      outputs: {
        changeAreaHa: Math.round(change * 100) / 100,
        percentChange: Math.round(pct * 10) / 10,
        hydrologyEvidenceScore: score,
      },
    };
  }

  if (calcMode === 'pollution') {
    const reported = num(inputs.reportedValue);
    const observed = num(inputs.observedValue);
    const confidence = num(inputs.confidenceScore, 0.5);
    const reliability = num(inputs.sourceReliability, 0.5);
    const discrepancy = reported > 0 ? Math.abs((observed - reported) / reported) * 100 : 0;
    const priority = Math.min(100, Math.round(discrepancy * 0.6 + (1 - confidence) * 25 + (1 - reliability) * 15));
    return {
      mode: calcMode,
      inputs,
      outputs: {
        discrepancyScore: Math.round(discrepancy * 10) / 10,
        reviewPriority: priority >= 60 ? 'High' : priority >= 35 ? 'Medium' : 'Low',
      },
    };
  }

  const biomass = num(inputs.biomassTHa, 120);
  const carbonFraction = num(
    inputs.carbonFraction,
    num(preset?.carbonFraction, 0.47),
  );
  const conversion = num(inputs.conversionFactor, num(preset?.conversionFactor, 3.667));
  const uncertainty = num(inputs.uncertaintyPct, num(preset?.defaultUncertaintyPercent, 20));
  const tC = biomass * carbonFraction;
  const tCO2e = tC * conversion;
  const adjusted = tCO2e * (1 - uncertainty / 100);
  return {
    mode: 'carbon',
    inputs,
    outputs: {
      tCHa: Math.round(tC * 100) / 100,
      tCO2eHa: Math.round(tCO2e * 100) / 100,
      adjustedTCO2eHa: Math.round(adjusted * 100) / 100,
    },
  };
}

function buildRiskFlags(
  preset: DmrvMethodologyPreset | null,
  formState: Record<string, unknown>,
  evidenceRules: Record<string, boolean>,
  selectedSources: string[] = [],
): string[] {
  const flags: string[] = [];
  if (!evidenceRules.requireFieldVerification && preset?.requiredEvidenceRules.requireFieldVerification) {
    flags.push('Missing field verification');
  }
  if (!evidenceRules.requireCoordinates) flags.push('Missing AOI / coordinates');
  if (!evidenceRules.requireSourceDocument) flags.push('Missing source document');
  if (!evidenceRules.requireUncertaintyScore) flags.push('No uncertainty score');
  if (
    selectedSources.length > 0 &&
    selectedSources.every((s) => s.toLowerCase().includes('satellite')) &&
    !selectedSources.some((s) => s.toLowerCase().includes('field'))
  ) {
    flags.push('Satellite-only claim — calibration recommended');
  }
  if (preset?.status === 'custom' || str(formState.equationModel).toLowerCase().includes('custom')) {
    flags.push('Custom formula requires review');
  }
  if (!str(formState.qaQcNotes)) flags.push('QA/QC notes incomplete');
  return flags;
}

export function buildMethodologyExplanationBoard(
  preset: DmrvMethodologyPreset | null,
  formState: Record<string, unknown> = {},
  evidenceRules: Record<string, boolean> = {},
  ctx: Partial<MethodologyCounselContext> = {},
): MethodologyExplanationBoard {
  const rules = evidenceRules as DmrvValidationRules;
  const readiness = calculateMethodologyReadiness(preset, {
    dataSourceSettings: formState as Record<string, string | number | boolean | undefined>,
    validationRules: rules,
    selectedPresetId: preset?.id,
  });

  const chain = [
    'Input Data',
    'Model / Formula',
    'Normalization',
    'Uncertainty',
    'Evidence Packet',
    'Verifier Review',
    'Blockchain Trace',
  ];

  const requiredEvidence: { label: string; met: boolean }[] = [];
  if (preset) {
    for (const input of preset.requiredInputs) {
      requiredEvidence.push({ label: input, met: Boolean(str(formState[input]) || str(formState.equationModel)) });
    }
    for (const [key, label] of Object.entries(RULE_LABELS)) {
      const required = preset.requiredEvidenceRules[key as keyof typeof preset.requiredEvidenceRules];
      if (required) {
        requiredEvidence.push({ label, met: Boolean(evidenceRules[key]) });
      }
    }
  }

  const calcMode = inferCalculatorMode(preset, ctx.dmrvTypeId);
  const defaultCalcInputs: Record<string, string | number | boolean> =
    calcMode === 'carbon'
      ? {
          biomassTHa: 120,
          carbonFraction: str(formState.carbonFraction) || preset?.carbonFraction || '0.47',
          conversionFactor: str(formState.conversionFactor) || preset?.conversionFactor || '3.667',
          uncertaintyPct: str(formState.uncertaintyPct) || preset?.defaultUncertaintyPercent || '20',
        }
      : calcMode === 'plastic'
        ? { hotspotCount: 3, affectedAreaHa: 12, confidenceScore: 0.65, fieldValidation: false }
        : calcMode === 'water'
          ? { waterExtentBeforeHa: 100, waterExtentAfterHa: 88, confidenceScore: 0.7 }
          : { reportedValue: 100, observedValue: 118, confidenceScore: 0.6, sourceReliability: 0.7 };

  const { outputs } = calculateMethodologyExample(preset, defaultCalcInputs, calcMode);

  return {
    methodologyCard: {
      name: preset?.name ?? 'No methodology selected',
      status: preset ? METHODOLOGY_STATUS_LABELS[preset.status] : 'Draft configuration',
      statusKey: preset?.status ?? 'unknown',
      domain: preset?.category ?? ctx.dmrvTypeName ?? 'DMRV',
      maturity: maturityLabel(preset?.status),
      bestFor: preset?.bestFor ?? 'Select a preset to see fit guidance.',
      notFor: notForHint(preset),
    },
    calculationChain: preset?.calculationChain.length ? [...preset.calculationChain, 'Verifier Review', 'Blockchain Trace'] : chain,
    requiredEvidence,
    validatorView: {
      verify: preset
        ? [
            preset.verifierExplanation,
            'Confirm evidence rules match project scope.',
            'Check reviewer approval before evidence packet export.',
          ]
        : ['Select methodology and complete required fields.'],
      assumptions: preset
        ? [
            `Carbon fraction: ${preset.carbonFraction}`,
            `Conversion factor: ${preset.conversionFactor}`,
            `Default uncertainty: ${preset.defaultUncertaintyPercent}%`,
          ]
        : [],
      limitations: preset?.limitations ?? ['Not certified until independently reviewed.'],
      strengthen: preset
        ? [
            'Add field plots where satellite-only screening is used.',
            'Document AOI boundary and reporting period.',
            'Attach source documents and uncertainty treatment notes.',
          ]
        : [],
    },
    riskFlags: buildRiskFlags(preset, formState, evidenceRules, ctx.selectedSources),
    calculatorMode: calcMode,
    calculatorInputs: defaultCalcInputs,
    calculatorOutputs: outputs,
    readinessLabel: readiness.label,
    readinessScore: readiness.score,
  };
}

function detectTopic(message: string): string {
  const m = message.toLowerCase();
  if (/defend|validator|attorney|defender/.test(m)) return 'defend';
  if (/compare|versus|vs\b|difference/.test(m)) return 'compare';
  if (/calculat|example|math|formula|tco2|co2e/.test(m)) return 'calculate';
  if (/missing|gap|lack|need evidence/.test(m)) return 'missing';
  if (/validator question|what should.*check|review question/.test(m)) return 'validator-questions';
  if (/explain|what is|how does/.test(m)) return 'explain';
  return 'general';
}

function ruleBasedAnswer(
  topic: string,
  preset: DmrvMethodologyPreset | null,
  ctx: MethodologyCounselContext,
  board: MethodologyExplanationBoard,
): string {
  const typeName = ctx.dmrvTypeName ?? ctx.dmrvTypeId ?? 'this DMRV type';
  const missing = findMissingMethodologyEvidence(preset, ctx.formState, ctx.evidenceRules);
  const questions = generateValidatorQuestions(preset, ctx.formState);

  if (topic === 'defend' && preset) {
    return [
      `**Methodology selected:** ${preset.name} (${METHODOLOGY_STATUS_LABELS[preset.status]}).`,
      `**Why it fits ${typeName}:** ${preset.bestFor}`,
      `**Required evidence:** ${evidenceRulesAppliedList(preset.requiredEvidenceRules).join(', ') || 'See evidence rules panel.'}`,
      `**Formula / model logic:** ${preset.modelUsed}`,
      `**Known limitations:** ${preset.limitations.slice(0, 2).join('; ')}`,
      `**Validator should check:** ${questions.slice(0, 3).join(' ')}`,
      `**Readiness:** ${board.readinessLabel} (${board.readinessScore}%) — prepared for evidence packet review, not certified.`,
      missing.length ? `**Missing:** ${missing.join(', ')}.` : '**Missing:** No critical gaps detected in configured fields.',
      'This is an AI draft for verifier review — not legal advice or certification.',
    ].join('\n\n');
  }

  if (topic === 'compare') {
    const others = DMRV_METHODOLOGY_PRESETS.filter(
      (p) => p.id !== preset?.id && p.dmrvTypeIds.includes(ctx.dmrvTypeId ?? 'forest-land-use'),
    ).slice(0, 3);
    const lines = others.map(
      (p) => `• **${p.shortName}** (${METHODOLOGY_STATUS_LABELS[p.status]}): ${p.bestFor.slice(0, 80)}…`,
    );
    return [
      `**Current:** ${preset?.shortName ?? 'None selected'}.`,
      '**Alternatives for this DMRV type:**',
      lines.join('\n') || 'No alternate presets for this type.',
      'Compare uncertainty defaults, field verification requirements, and whether satellite-only screening is acceptable.',
    ].join('\n\n');
  }

  if (topic === 'calculate' && preset) {
    const ex = calculateMethodologyExample(preset, board.calculatorInputs, board.calculatorMode);
    const out = Object.entries(ex.outputs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return `**Calculation example** (${board.calculatorMode} screening method):\n${out}\n\nIllustrative only — verifier must confirm inputs. Not a certified credit estimate.`;
  }

  if (topic === 'missing') {
    return missing.length
      ? `**Missing evidence / configuration:**\n${missing.map((m) => `• ${m}`).join('\n')}\n\nStatus: ${board.readinessLabel}.`
      : `Configuration appears complete for screening (${board.readinessScore}%). Verifier review still required before formal use.`;
  }

  if (topic === 'validator-questions') {
    return `**Suggested validator questions:**\n${questions.map((q) => `• ${q}`).join('\n')}`;
  }

  if (preset) {
    return [
      `**${preset.shortName}** supports ${typeName} DMRV as a ${METHODOLOGY_STATUS_LABELS[preset.status]} approach.`,
      preset.verifierExplanation,
      `Evidence readiness: ${board.readinessScore}% (${board.readinessLabel}).`,
      'Use Defend for Validator or Generate Verifier Questions for structured review handoff.',
    ].join('\n\n');
  }

  return 'Select a methodology preset and apply it to the biomass fields. I can then explain, compare, calculate examples, and prepare verifier-safe traces.';
}

export function buildMethodologyDecisionTrace(
  context: MethodologyCounselContext,
  response: { answer: string; board: MethodologyExplanationBoard },
  userQuestion: string,
): MethodologyCounselTrace {
  const preset = context.methodologyPreset ?? null;
  const missing = findMissingMethodologyEvidence(preset, context.formState, context.evidenceRules);
  const questions = generateValidatorQuestions(preset, context.formState);
  const score = response.board.readinessScore;
  const status: MethodologyCounselTrace['status'] =
    score >= 85 ? 'prepared-for-anchor' : score >= 60 ? 'verifier-review-required' : 'ai-draft';

  const traceBody = {
    projectId: context.projectId,
    dmrvTypeId: context.dmrvTypeId,
    methodologyId: preset?.id,
    userQuestion,
    createdAt: new Date().toISOString(),
  };

  return {
    id: `counsel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: context.projectId,
    dmrvTypeId: context.dmrvTypeId,
    methodologyId: preset?.id,
    userQuestion,
    aiAnswer: response.answer,
    methodologyReviewed: preset?.name ?? 'None',
    inputsReviewed: preset?.requiredInputs ?? [],
    formulaOrModelReviewed: str(context.formState?.equationModel) || preset?.modelUsed || '—',
    evidenceRulesReviewed: preset ? evidenceRulesAppliedList(preset.requiredEvidenceRules) : [],
    assumptions: preset
      ? [`CF ${preset.carbonFraction}`, `Conv ${preset.conversionFactor}`, `U% ${preset.defaultUncertaintyPercent}`]
      : [],
    limitations: preset?.limitations ?? ['AI draft — not certified'],
    riskFlags: response.board.riskFlags,
    validatorQuestions: questions,
    recommendedActions: missing.length
      ? missing.map((m) => `Resolve: ${m}`)
      : ['Proceed to verifier review', 'Export evidence packet when reviewer approves'],
    confidenceScore: Math.min(95, Math.max(35, score)),
    traceHash: createMethodologyTraceHash(traceBody),
    createdAt: new Date().toISOString(),
    status,
  };
}

export function saveMethodologyCounselTrace(trace: MethodologyCounselTrace): void {
  try {
    const raw = localStorage.getItem(METHODOLOGY_COUNSEL_TRACE_KEY);
    const list: MethodologyCounselTrace[] = raw ? (JSON.parse(raw) as MethodologyCounselTrace[]) : [];
    list.unshift(trace);
    localStorage.setItem(METHODOLOGY_COUNSEL_TRACE_KEY, JSON.stringify(list.slice(0, 40)));
  } catch {
    /* ignore */
  }
}

export function getMethodologyCounselTraces(projectId?: string): MethodologyCounselTrace[] {
  try {
    const raw = localStorage.getItem(METHODOLOGY_COUNSEL_TRACE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as MethodologyCounselTrace[];
    if (!projectId) return list;
    return list.filter((t) => t.projectId === projectId);
  } catch {
    return [];
  }
}

export async function generateMethodologyCounselResponse(
  context: MethodologyCounselContext,
  userMessage: string,
): Promise<MethodologyCounselResponse> {
  const preset =
    context.methodologyPreset ??
    (context.selectedMethodologyId ? getMethodologyPresetById(context.selectedMethodologyId) : null) ??
    null;

  const topic = context.topic ?? detectTopic(userMessage);
  const board = buildMethodologyExplanationBoard(
    preset,
    { ...context.formState, _selectedSources: context.selectedSources },
    context.evidenceRules ?? {},
    context,
  );

  let answer = ruleBasedAnswer(topic, preset, { ...context, methodologyPreset: preset }, board);

  if (isAiEnabled() && userMessage.trim()) {
    try {
      const gemini = await runGeminiPrompt(
        `You are Deep Methodology Counsel — a verifier-facing DMRV assistant (methodology attorney mode). NOT legal advice. Never claim certified/approved/verified carbon credits.

Context JSON:
${JSON.stringify({ preset: preset?.id, type: context.dmrvTypeName, form: context.formState, rules: context.evidenceRules, board: { readiness: board.readinessScore, risks: board.riskFlags } }, null, 2)}

User: ${userMessage}

Respond in plain English, structured with short headings. Include: methodology fit, required evidence, limitations, validator checks, readiness (${board.readinessLabel}), missing items. Max 12 sentences.`,
      );
      if (gemini.trim()) answer = gemini.trim();
    } catch {
      /* keep rule-based answer */
    }
  }

  const trace = buildMethodologyDecisionTrace(context, { answer, board }, userMessage);
  return { answer, board, trace };
}
