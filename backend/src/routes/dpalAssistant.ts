import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

type GuideResponse = {
  ok: true;
  mode: 'AI' | 'RULE_BASED';
  currentStep: string;
  nextStep: string;
  plainEnglishExplanation: string;
  missingItems: string[];
  warnings: string[];
  recommendedActions: string[];
  claimSafety: {
    canMakeClaim: boolean;
    safeClaimLanguage: string;
    unsafeClaimLanguage: string[];
  };
};

function buildRuleBasedGuide(body: any): GuideResponse {
  const state = (body?.workflowState ?? {}) as Record<string, any>;
  const sourceMode = String(state.sourceMode ?? '').toUpperCase();
  const signalStatus = String(state.signalStatus ?? '').toLowerCase();
  const processingStage = String((body?.scanResult ?? {})?.processingStage ?? '');
  const metrics = (state.metrics ?? {}) as Record<string, unknown>;
  const hasComputedMetric = ['ndviChange', 'nbrChange', 'ndmiChange', 'ndwiChange']
    .some((key) => typeof metrics[key] === 'number');

  const missingItems: string[] = [];
  if (!state.analysisType) missingItems.push('analysisType');
  if (!(typeof state.latitude === 'number' && typeof state.longitude === 'number')) missingItems.push('location');
  if (!state.aoiSaved) missingItems.push('saved AOI');
  if (!state.scanRequested) missingItems.push('scan run');
  if (!state.evidencePacket) missingItems.push('evidence packet');
  if (!state.missionCreated) missingItems.push('verification mission');

  const warnings: string[] = [
    'Satellite analysis is a screening tool. Do not present unverified indicators as final legal, regulatory, scientific, insurance, or carbon-credit conclusions.',
  ];

  let explanation =
    'Start by selecting an analysis type, map location, and AOI. Save the AOI before scanning so the result is tied to a fixed boundary.';
  let nextStep = 'choose_analysis_type';
  let currentStep = String(body?.currentStep ?? 'choose_analysis_type');

  if (!state.analysisType) {
    explanation = 'Choose an observation type first. DPAL needs to know what signal to look for.';
    nextStep = 'choose_analysis_type';
  } else if (!(typeof state.latitude === 'number' && typeof state.longitude === 'number')) {
    explanation = 'Select a location on the map. Satellite analysis needs a target area.';
    nextStep = 'select_location';
  } else if (!state.aoiSaved) {
    explanation = 'You have selected an area, but it is not saved yet. Save the AOI before scanning so results use a fixed boundary.';
    nextStep = 'save_aoi';
  } else if (!state.scanRequested) {
    explanation = 'Run the scan after AOI is saved. DPAL will check available products and compute signal status.';
    nextStep = 'run_scan';
  } else if (sourceMode === 'UNAVAILABLE') {
    explanation = 'The Earth Observation backend is connected, but no live imagery source is configured or available for this scan. DPAL cannot verify a satellite signal yet.';
    nextStep = 'review_results';
  } else if (processingStage === 'product_found') {
    explanation = 'Satellite products were found, but DPAL has not loaded imagery or computed metrics yet. Treat this as insufficient data.';
    nextStep = 'review_results';
  } else if (processingStage === 'imagery_loaded') {
    explanation = 'Imagery was found and loaded, but DPAL has not completed verified metric computation yet.';
    nextStep = 'review_results';
  } else if (processingStage === 'field_verified') {
    explanation = 'Remote-sensing evidence has supporting field verification. This is stronger, but still review scope and limitations before making claims.';
    nextStep = 'final_action';
  } else if (!hasComputedMetric || signalStatus === 'insufficient_data' || processingStage !== 'metric_computed') {
    explanation = 'Satellite products may exist, but DPAL has not computed verified index values yet. Treat this as insufficient data.';
    nextStep = 'review_results';
  } else if (!state.evidencePacket) {
    explanation = 'Metrics are computed. Next, create an evidence packet with AOI, source dates, metrics, and limitations.';
    nextStep = 'create_evidence_packet';
  } else if (!state.missionCreated) {
    explanation = 'Now create a field verification mission so on-ground evidence can confirm the screening signal.';
    nextStep = 'create_verification_mission';
  } else {
    explanation = 'The workflow is complete for this stage. Route to report, audit file, mission, or validator process as needed.';
    nextStep = 'final_action';
  }

  const canMakeClaim = hasComputedMetric && (signalStatus === 'verified' || signalStatus === 'partially_verified') && Boolean(state.evidencePacket);
  const safeClaimLanguage = canMakeClaim
    ? 'DPAL computed remote-sensing screening indicators and assembled supporting evidence; field verification is still required before formal legal or regulatory conclusions.'
    : 'DPAL detected a remote-sensing screening signal that requires field verification before strong claims.';

  return {
    ok: true,
    mode: 'RULE_BASED',
    currentStep,
    nextStep,
    plainEnglishExplanation: explanation,
    missingItems,
    warnings,
    recommendedActions: Array.isArray(state.recommendedActions) && state.recommendedActions.length
      ? [String(state.recommendedActions[0])]
      : ['Create field verification mission and collect geotagged evidence.'],
    claimSafety: {
      canMakeClaim,
      safeClaimLanguage,
      unsafeClaimLanguage: [
        'This proves illegal deforestation.',
        'This proves pollution.',
        'This is a verified carbon credit.',
        'This proves liability.',
        'This is final regulatory evidence.',
      ],
    },
  };
}

router.post('/project-guide', async (req, res) => {
  const base = buildRuleBasedGuide(req.body ?? {});
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return res.json(base);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `You are DPAL Project Assistant. Return strict JSON only.
Keep legal-safe language and uncertainty.
Context: ${JSON.stringify(req.body ?? {})}
Baseline guidance: ${JSON.stringify(base)}
Output keys:
currentStep,nextStep,plainEnglishExplanation,missingItems,warnings,recommendedActions,claimSafety{canMakeClaim,safeClaimLanguage,unsafeClaimLanguage}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    } as any);

    const text = String(response.text ?? '').trim();
    const parsed = JSON.parse(text || '{}') as Partial<GuideResponse>;
    return res.json({
      ...base,
      mode: 'AI',
      currentStep: typeof parsed.currentStep === 'string' ? parsed.currentStep : base.currentStep,
      nextStep: typeof parsed.nextStep === 'string' ? parsed.nextStep : base.nextStep,
      plainEnglishExplanation:
        typeof parsed.plainEnglishExplanation === 'string' ? parsed.plainEnglishExplanation : base.plainEnglishExplanation,
      missingItems: Array.isArray(parsed.missingItems) ? parsed.missingItems.map(String) : base.missingItems,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : base.warnings,
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions.map(String) : base.recommendedActions,
      claimSafety: {
        canMakeClaim: Boolean(parsed.claimSafety?.canMakeClaim ?? base.claimSafety.canMakeClaim),
        safeClaimLanguage: typeof parsed.claimSafety?.safeClaimLanguage === 'string'
          ? parsed.claimSafety.safeClaimLanguage
          : base.claimSafety.safeClaimLanguage,
        unsafeClaimLanguage: Array.isArray(parsed.claimSafety?.unsafeClaimLanguage)
          ? parsed.claimSafety!.unsafeClaimLanguage.map(String)
          : base.claimSafety.unsafeClaimLanguage,
      },
    });
  } catch {
    return res.json(base);
  }
});

export default router;

