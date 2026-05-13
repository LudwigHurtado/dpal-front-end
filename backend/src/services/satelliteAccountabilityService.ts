import type { AnalyzeBody } from './disclosureIntegrityService';
import { buildAnalyzeDisclaimer, buildEvidenceShellMessage } from './disclosureIntegrityService';
import { calculateAnomalyScore, getAnomalyStatus, type AnomalyStatus, type Confidence } from './anomalyScoringService';

function nowIso(): string {
  return new Date().toISOString();
}

export function getProviderLanesStatus(): Array<{ id: string; status: string; detail: string }> {
  return [
    { id: 'PACE_OCI', status: 'metadata_only', detail: 'CMR / metadata lanes may be available — no auto bio-product pipeline in this stub.' },
    { id: 'GEDI_LIDAR', status: 'metadata_only', detail: 'Forest integrity GEDI adapter not fully implemented on default host.' },
    { id: 'EPA_DATASET', status: 'partial', detail: 'EPA / Envirofacts surfaces exist elsewhere in DPAL when API host supports them.' },
    { id: 'COMPANY_DISCLOSURE', status: 'preview', detail: 'Disclosure text is user-supplied in this endpoint — treat as claim record only.' },
  ];
}

function summarizeLanesFromStub(
  lanes: Array<{ id: string; status: string; detail: string }>,
): {
  liveCount: number;
  partialCount: number;
  metadataOnlyCount: number;
  previewOnlyCount: number;
  plannedOrFutureCount: number;
  unavailableCount: number;
  notConfiguredCount: number;
  warnings: string[];
} {
  const snap = {
    liveCount: 0,
    partialCount: 0,
    metadataOnlyCount: 0,
    previewOnlyCount: 0,
    plannedOrFutureCount: 0,
    unavailableCount: 0,
    notConfiguredCount: 0,
    warnings: [] as string[],
  };
  for (const l of lanes) {
    if (l.status === 'live') snap.liveCount += 1;
    else if (l.status === 'partial') snap.partialCount += 1;
    else if (l.status === 'metadata_only') snap.metadataOnlyCount += 1;
    else if (l.status === 'preview' || l.status === 'preview_only') snap.previewOnlyCount += 1;
    else if (l.status === 'planned' || l.status === 'future') snap.plannedOrFutureCount += 1;
    else if (l.status === 'unavailable') snap.unavailableCount += 1;
    else if (l.status === 'not_configured') snap.notConfiguredCount += 1;
  }
  snap.warnings.push('Backend lane list is a stub — combine with deployed upstream services for live readiness.');
  return snap;
}

export function getProviderStatusResponse() {
  const lanes = getProviderLanesStatus();
  const providerSummary = summarizeLanesFromStub(lanes);
  return {
    ok: true as const,
    mode: 'preview' as const,
    lanes,
    providerSummary,
    providers: lanes.map((l) => ({
      id: l.id,
      label: l.id.replace(/_/g, ' '),
      group: 'ground_truth_public',
      status: l.status,
      displayLabel: l.status.replace(/_/g, ' '),
      legalCaution: l.detail,
    })),
    warnings: providerSummary.warnings,
  };
}

export function runModuleStatus() {
  return {
    ok: true as const,
    mode: 'preview' as const,
    modules: [
      {
        moduleId: 'plastic_watch',
        label: 'Hyperspectral Plastic Watch',
        status: 'partial',
        route: '/hyperspectral-plastic-watch',
        contributes: 'PACE / EMIT metadata and spectral confounder context for coastal screening.',
        supportedClaimTypes: ['pollution_control', 'water_quality', 'sustainability_report', 'other'],
        supportedSignalTypes: ['plastic_pollution_confidence', 'harmful_algal_bloom_risk', 'water_quality_risk'],
        limitations: ['Does not confirm plastic without field validation', 'Stub does not call live Plastic Watch API'],
        warnings: ['Use review-first wording only — no fraud or guilt labels.'],
      },
      {
        moduleId: 'forest_integrity',
        label: 'Forest Integrity',
        status: 'partial',
        route: '/forest-integrity',
        contributes: 'GFW, FIRMS, Landsat indices, GEDI scaffold (honest not-implemented states).',
        supportedClaimTypes: ['forest_conservation', 'deforestation_free', 'carbon_credit', 'net_zero', 'other'],
        supportedSignalTypes: ['forest_loss', 'biomass_decline', 'vegetation_decline', 'carbon_mrv'],
        limitations: ['GEDI may be preview-only on default host', 'No automatic carbon-credit invalidation'],
        warnings: ['Potential mismatch language only when multi-source context supports review.'],
      },
      {
        moduleId: 'aquascan_water',
        label: 'AquaScan / Water Monitor',
        status: 'partial',
        route: '/water/aquascan',
        contributes: 'Copernicus MRV compare, water risk bands, flood context when configured.',
        supportedClaimTypes: ['water_quality', 'pollution_control', 'regulatory_compliance', 'other'],
        supportedSignalTypes: ['water_quality_risk', 'harmful_algal_bloom_risk', 'flood_extent', 'surface_water_change'],
        limitations: ['Field sampling for legal water-quality claims', 'Stub does not pull live AquaScan state'],
        warnings: [],
      },
      {
        moduleId: 'carbon_mrv',
        label: 'Carbon MRV',
        status: 'partial',
        route: '/carbon',
        contributes: 'MRV indicators and adapter reads as claim context — not sole verification.',
        supportedClaimTypes: ['carbon_credit', 'net_zero', 'deforestation_free', 'co2_emissions', 'other'],
        supportedSignalTypes: ['carbon_mrv', 'co2_hotspot', 'vegetation_decline', 'biomass_decline'],
        limitations: ['Demo/local modes must stay labeled preview', 'Stub does not invoke live MRV API'],
        warnings: [],
      },
      {
        moduleId: 'carb_emissions_audit',
        label: 'CARB / Emissions Audit',
        status: 'partial',
        route: '/carb-emissions-audit',
        contributes: 'Regulatory facility records for official-record cross-check.',
        supportedClaimTypes: ['methane_emissions', 'co2_emissions', 'regulatory_compliance', 'pollution_control', 'other'],
        supportedSignalTypes: ['methane_plume', 'co2_hotspot', 'greenhouse_gas_hotspot', 'air_pollution_hotspot'],
        limitations: ['Interpretation requires qualified analyst'],
        warnings: ['Never state a company lied — use potential mismatch when records diverge.'],
      },
      {
        moduleId: 'hazardous_waste_audit',
        label: 'Hazardous Waste / EPA',
        status: 'partial',
        route: '/hazardous-waste-audit',
        contributes: 'RCRA-style audit context when datasets are live or imported.',
        supportedClaimTypes: ['hazardous_waste', 'regulatory_compliance', 'pollution_control', 'other'],
        supportedSignalTypes: ['hazardous_waste_risk', 'pollution_risk', 'regulatory_compliance'],
        limitations: ['Does not infer illegal dumping without records'],
        warnings: [],
      },
      {
        moduleId: 'envirofacts_geo',
        label: 'EPA / Envirofacts Geo',
        status: 'partial',
        route: '/environmental-intelligence/envirofacts-map',
        contributes: 'Geographic EPA / Envirofacts baselines for triage.',
        supportedClaimTypes: ['pollution_control', 'hazardous_waste', 'regulatory_compliance', 'other'],
        supportedSignalTypes: ['pollution_risk', 'hazardous_waste_risk', 'air_pollution_hotspot'],
        limitations: ['Coverage gaps and rate limits'],
        warnings: [],
      },
      {
        moduleId: 'command_center',
        label: 'Command Center',
        status: 'partial',
        route: '/command-center',
        contributes: 'Multi-module orchestration and evidence-builder handoff when normalized findings are supplied.',
        supportedClaimTypes: ['other', 'regulatory_compliance', 'pollution_control', 'carbon_credit', 'water_quality'],
        supportedSignalTypes: ['other', 'methane_plume', 'forest_loss', 'water_quality_risk'],
        limitations: ['Does not auto-run all live adapters without human gates'],
        warnings: [],
      },
    ],
  };
}

export function runNormalizeSignals(body: { moduleSignals?: Array<Record<string, unknown>>; disclosureClaim?: unknown }) {
  const moduleSignals = Array.isArray(body.moduleSignals) ? body.moduleSignals : [];
  const observedSignals = moduleSignals.map((s, i) => {
    const moduleId = String(s.moduleId ?? 'unknown');
    const providerIds = Array.isArray(s.providerIds) ? (s.providerIds as unknown[]).map(String) : [];
    const limitations = Array.isArray(s.limitations) ? (s.limitations as unknown[]).map(String) : [];
    return {
      id: `obs-api-${i}-${Date.now()}`,
      providerId: providerIds[0] || moduleId,
      providerLabel: String(s.moduleLabel ?? moduleId),
      sourceModuleId: moduleId,
      sourceModuleLabel: String(s.moduleLabel ?? ''),
      signalType: String(s.signalType ?? 'other'),
      location: String(s.location ?? 'Location not specified'),
      aoi: String(s.aoi ?? 'AOI not specified'),
      observedDate: String(s.observedDate ?? nowIso().slice(0, 10)),
      baselineDate: s.baselineDate != null ? String(s.baselineDate) : undefined,
      currentDate: s.currentDate != null ? String(s.currentDate) : undefined,
      confidenceLevel: String(s.confidenceLevel ?? 'preview_only'),
      evidenceReadiness: String(s.evidenceReadiness ?? 'preview_only'),
      sourceSummary: String(s.sourceSummary ?? s.summary ?? ''),
      limitations,
      previewOnly: Boolean(s.previewOnly ?? true),
    };
  });
  return {
    ok: true as const,
    observedSignals,
    warnings: [
      'Stub normalization — no live module APIs were invoked here.',
      'Align with front-end adapter registry when wiring production hosts.',
    ],
    disclaimer:
      'Observed signals are structured summaries for transparency — not fabricated orbital products or enforcement outcomes.',
  };
}

export function runAnalyze(body: AnalyzeBody) {
  const mode = 'preview' as const;
  const warnings = [
    'No live satellite retrieval in this stub — mode is preview.',
    'Do not treat output as enforcement evidence without independent validation.',
  ];

  const signals = (body.selectedProviders ?? []).map((id) => ({
    previewOnly: true,
    metadataOnly: id !== 'EPA_DATASET',
    needsField: true,
  }));

  if (!signals.length) {
    signals.push({ previewOnly: true, metadataOnly: true, needsField: true });
  }

  const score = calculateAnomalyScore({
    signals,
    claimVague: !(body.claimText && String(body.claimText).length > 40),
    officialSupport: false,
    independentSources: Math.min(3, Math.max(1, (body.selectedProviders ?? []).length)),
    locationMatch: 'medium',
    weatherExplainable: false,
  });

  const confidence: Confidence = 'medium';
  const anomalyStatus: AnomalyStatus = getAnomalyStatus(score, confidence, 'none');

  const finding = {
    id: `finding-${Date.now()}`,
    companyName: body.companyName?.trim() || 'Example Facility — Preview Only',
    facilityName: body.facilityName?.trim(),
    claim: {
      id: `claim-${Date.now()}`,
      companyName: body.companyName?.trim() || 'Example Facility — Preview Only',
      facilityName: body.facilityName?.trim(),
      reportingPeriod: body.reportingPeriod,
      claimType: (body.claimType as string) || 'other',
      claimText: body.claimText?.trim() || 'Preview claim — replace with sourced disclosure text.',
      confidenceInClaimRecord: 'medium',
    },
    observedSignals: [
      {
        id: `sig-${Date.now()}`,
        providerId: (body.selectedProviders ?? [])[0] || 'PACE_OCI',
        providerLabel: 'Preview lane',
        signalType: 'other',
        location: 'AOI not geocoded in stub',
        aoi: 'User AOI placeholder',
        observedDate: nowIso().slice(0, 10),
        confidenceLevel: 'metadata_only',
        evidenceReadiness: 'preview_only',
        sourceSummary: 'Preview-only placeholder signal — no live granule pull in this API response.',
        limitations: ['Stub endpoint', 'No orbital product ingestion'],
        previewOnly: true,
      },
    ],
    anomalyStatus,
    anomalyScore: score,
    confidenceLevel: confidence,
    riskFlags: ['Preview scenario — not a live finding', 'Requires validator review before external use'],
    recommendedActions: [
      'Replace preview signals with configured provider lanes on your API host.',
      'Attach filing references and field validation plan to the evidence packet.',
    ],
    legalSafeSummary:
      'This response is a structured preview for workflow testing. Observed conditions are not verified against real satellite products here.',
    evidencePacketReady: false,
    blockchainReady: false,
    qrReady: false,
    createdAt: nowIso(),
  };

  return {
    ok: true as const,
    mode,
    providerStatus: Object.fromEntries(getProviderLanesStatus().map((l) => [l.id, { status: l.status, detail: l.detail }])),
    finding,
    warnings,
    disclaimer: buildAnalyzeDisclaimer(),
  };
}

export function runEvidencePacketShell(body: { finding?: Record<string, unknown> }) {
  const finding = body.finding;
  if (!finding || typeof finding !== 'object') {
    return { ok: false as const, error: 'finding_required' };
  }
  return {
    ok: true as const,
    finding,
    shellMessage: buildEvidenceShellMessage(),
    disclaimer: buildAnalyzeDisclaimer(),
  };
}
