import { formatReportingPeriod, getDmrvProjectContext } from '../services/dmrvProjectContextService';
import type { DmrvProjectContext } from '../services/dmrvProjectContextTypes';
import { listDmrvInputConfigsForProject } from '../services/dmrvInputConfigService';
import type { DmrvInputConfig } from '../services/dmrvInputConfigTypes';
import { getSelectedSourceIds } from '../services/dmrvSourceSelectionService';
import { settingsToFieldPlot, type FieldPlotConfig } from '../services/dmrvFieldPlotConfigTypes';
import {
  emptySectionFromTemplate,
  getReportSectionTemplates,
  resolveDmrvReportType,
  type DmrvReportSectionTemplate,
} from './dmrvReportTemplates';
import { ensureReportLedgers } from './dmrvReportEvidenceSummary';
import type {
  DmrvBlockchainContext,
  DmrvCalculationContext,
  DmrvCmiTheme,
  DmrvCmiThemeScore,
  DmrvConfidenceLevel,
  DmrvDataSourceContext,
  DmrvEvidenceContext,
  DmrvEvidencePacketContext,
  DmrvEvidenceSourceRow,
  DmrvFieldPlotContext,
  DmrvInteroperabilityContext,
  DmrvInteroperabilityMetadata,
  DmrvMethodologyContext,
  DmrvProjectContextSnapshot,
  DmrvReadinessScore,
  DmrvReport,
  DmrvReportField,
  DmrvReportSection,
  DmrvReportStatus,
  DmrvSectionStatus,
  DmrvValidationContext,
  DmrvValidationRuleRow,
} from './dmrvReportTypes';

export type DmrvReportBuildOverrides = {
  projectContext?: DmrvProjectContext | null;
  inputConfigs?: DmrvInputConfig[];
  /** Merge a single in-progress input config over saved configs. */
  activeInputConfig?: DmrvInputConfig | null;
  /** Unsaved source stack picks (satellite / lidar) for live report preview. */
  draftSourceSelections?: Partial<Record<'satellite' | 'lidar', string[]>>;
};

function resolveSourceIds(
  projectId: string,
  typeId: string,
  kind: 'satellite' | 'lidar',
  overrides?: DmrvReportBuildOverrides,
): string[] {
  const draft = overrides?.draftSourceSelections?.[kind];
  if (draft) return draft;
  return getSelectedSourceIds(projectId, typeId, kind);
}

const REPORT_VERSION = '1.0.0-cmi-draft';

function missingValue(label = 'Missing'): string {
  return label;
}

function dsText(settings: Record<string, string | number | boolean | undefined>, key: string): string {
  const v = settings[key];
  if (v === undefined || v === null || v === false || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Yes' : '';
  return String(v);
}

function fpText(fp: FieldPlotConfig | null | undefined, key: keyof FieldPlotConfig): string {
  if (!fp) return '';
  const v = fp[key];
  if (typeof v === 'boolean') return v ? 'Yes' : '';
  return typeof v === 'string' ? v.trim() : '';
}

function needsReviewValue(): string {
  return 'Needs Review';
}

function notConfiguredValue(): string {
  return 'Not Yet Configured';
}

function fieldFromRaw(
  key: string,
  label: string,
  raw: string | undefined | null,
  opts?: { needsReview?: boolean; sourceStep?: string },
): DmrvReportField {
  const trimmed = raw?.trim() ?? '';
  let status: DmrvSectionStatus = 'missing';
  let value = missingValue();
  if (opts?.needsReview && trimmed) {
    status = 'needs_review';
    value = `${trimmed} (${needsReviewValue()})`;
  } else if (trimmed) {
    status = 'complete';
    value = trimmed;
  } else if (opts?.needsReview) {
    status = 'needs_review';
    value = needsReviewValue();
  }
  return { key, label, value, status, needsReview: opts?.needsReview, sourceStep: opts?.sourceStep };
}

function deriveSectionStatus(fields: DmrvReportField[]): DmrvSectionStatus {
  if (fields.every((f) => f.status === 'complete')) return 'complete';
  if (fields.some((f) => f.status === 'needs_review')) return 'needs_review';
  if (fields.some((f) => f.status === 'complete')) return 'partial';
  return 'missing';
}

function deriveConfidence(status: DmrvSectionStatus, evidenceCount: number): DmrvConfidenceLevel {
  if (status === 'complete' && evidenceCount > 0) return 'high';
  if (status === 'complete') return 'medium';
  if (status === 'partial') return 'medium';
  if (status === 'needs_review') return 'low';
  return 'low';
}

function satelliteConfig(configs: DmrvInputConfig[]): DmrvInputConfig | undefined {
  return configs.find((c) => c.configType === 'satellite' || c.inputKey === 'satellite-imagery');
}

function fieldPlotConfig(configs: DmrvInputConfig[]): DmrvInputConfig | undefined {
  return configs.find((c) => c.configType === 'field-plots');
}

function aoiLabel(ctx: DmrvProjectContext | null): string {
  if (!ctx) return '';
  if (ctx.location.aoiSummary.trim()) return ctx.location.aoiSummary.trim();
  if (ctx.location.aoiId.trim()) return ctx.location.aoiId.trim();
  if (ctx.location.aoiGeoJson.trim()) return 'AOI polygon saved';
  if (ctx.location.latitude && ctx.location.longitude) {
    return `${ctx.location.latitude}, ${ctx.location.longitude}`;
  }
  return '';
}

function buildFieldMap(
  template: DmrvReportSectionTemplate,
  ctx: DmrvProjectContext | null,
  configs: DmrvInputConfig[],
  typeId: string,
  overrides?: DmrvReportBuildOverrides,
): DmrvReportField[] {
  const sat = satelliteConfig(configs);
  const fp = fieldPlotConfig(configs);
  const fpSettings = fp ? settingsToFieldPlot(fp.dataSourceSettings) : null;
  const ds = sat?.dataSourceSettings ?? {};
  const reporting = ctx ? formatReportingPeriod(ctx) : '';
  const satIds = ctx ? resolveSourceIds(ctx.projectId, typeId, 'satellite', overrides) : [];
  const lidarIds = ctx ? resolveSourceIds(ctx.projectId, typeId, 'lidar', overrides) : [];

  const map: Record<string, DmrvReportField> = {
    projectName: fieldFromRaw('projectName', 'Project name', ctx?.projectName, { sourceStep: 'project-config' }),
    aoi: fieldFromRaw('aoi', 'AOI / boundary', aoiLabel(ctx), { sourceStep: 'project-config' }),
    location: fieldFromRaw(
      'location',
      'Location / jurisdiction',
      ctx?.location.countryRegion || aoiLabel(ctx),
      { sourceStep: 'project-config' },
    ),
    reportingPeriod: fieldFromRaw('reportingPeriod', 'Reporting period', reporting, { sourceStep: 'project-config' }),
    organization: fieldFromRaw('organization', 'Organization', ctx?.organization, { sourceStep: 'project-config' }),
    facilityLocation: fieldFromRaw('facilityLocation', 'Facility location', aoiLabel(ctx), { sourceStep: 'project-config' }),
    waterbodyType: fieldFromRaw('waterbodyType', 'Waterbody type', ctx?.typeTitle, { sourceStep: 'project-config' }),
    habitatType: fieldFromRaw('habitatType', 'Habitat type', ctx?.typeTitle, { sourceStep: 'project-config' }),
    monitoringObjective: fieldFromRaw('monitoringObjective', 'Monitoring objective', ctx?.description, {
      sourceStep: 'project-config',
    }),
    methodologyName: fieldFromRaw('methodologyName', 'Methodology', ctx?.methodology.name, { sourceStep: 'methodology' }),
    standardFramework: fieldFromRaw(
      'standardFramework',
      'Standard / framework',
      ctx?.methodology.standardFramework,
      { sourceStep: 'methodology' },
    ),
    baselineYear: fieldFromRaw('baselineYear', 'Baseline year', ctx?.reporting.baselineYear, { sourceStep: 'methodology' }),
    baselineDescription: fieldFromRaw(
      'baselineDescription',
      'Baseline description',
      ctx?.reporting.comparisonPeriod ? `Comparison: ${ctx.reporting.comparisonPeriod}` : '',
      { sourceStep: 'methodology' },
    ),
    projectScenario: fieldFromRaw('projectScenario', 'Project scenario', ctx?.description, { sourceStep: 'methodology' }),
    implementationPeriod: fieldFromRaw('implementationPeriod', 'Implementation period', reporting, {
      sourceStep: 'methodology',
    }),
    additionalityEvidence: fieldFromRaw(
      'additionalityEvidence',
      'Additionality evidence',
      ctx?.methodology.requiredEvidenceSources,
      { needsReview: true, sourceStep: 'methodology' },
    ),
    regulatorySurplus: fieldFromRaw('regulatorySurplus', 'Regulatory surplus', '', { needsReview: true }),
    permanenceRisk: fieldFromRaw('permanenceRisk', 'Permanence / reversal risk', '', { needsReview: true }),
    reversalMitigation: fieldFromRaw('reversalMitigation', 'Reversal mitigation', '', { needsReview: true }),
    leakageAssessment: fieldFromRaw('leakageAssessment', 'Leakage assessment', '', { needsReview: true }),
    leakageMitigation: fieldFromRaw('leakageMitigation', 'Leakage mitigation', '', { needsReview: true }),
    carbonStock: fieldFromRaw('carbonStock', 'Carbon stock / biomass', dsText(ds, 'biomassEstimate'), {
      sourceStep: 'calculation',
    }),
    co2eEstimate: fieldFromRaw('co2eEstimate', 'CO₂e estimate', dsText(ds, 'co2eEstimate'), { sourceStep: 'calculation' }),
    calculationMethod: fieldFromRaw(
      'calculationMethod',
      'Calculation method',
      ctx?.methodology.name || dsText(ds, 'calculationMethod'),
      { sourceStep: 'calculation' },
    ),
    uncertaintyRules: fieldFromRaw(
      'uncertaintyRules',
      'Uncertainty rules',
      ctx?.methodology.uncertaintyRules,
      { sourceStep: 'validation' },
    ),
    uncertaintyScore: fieldFromRaw('uncertaintyScore', 'Uncertainty score', dsText(ds, 'uncertaintyScore'), {
      sourceStep: 'validation',
    }),
    satelliteProvider: fieldFromRaw(
      'satelliteProvider',
      'Provider',
      dsText(ds, 'provider') || (satIds.length ? satIds.join(', ') : ''),
      { sourceStep: 'satellite-config' },
    ),
    selectedSatellites: fieldFromRaw(
      'selectedSatellites',
      'Selected satellites / missions',
      dsText(ds, 'selectedSatellites') || (satIds.length ? satIds.join(', ') : ''),
      { sourceStep: 'satellite-config' },
    ),
    monitoringWindow: fieldFromRaw(
      'monitoringWindow',
      'Monitoring window',
      [dsText(ds, 'startDate'), dsText(ds, 'endDate')].filter(Boolean).join(' → ') || reporting,
      { sourceStep: 'satellite-config' },
    ),
    cloudCoverLimit: fieldFromRaw('cloudCoverLimit', 'Cloud cover limit', dsText(ds, 'cloudCoverLimit'), {
      sourceStep: 'satellite-config',
    }),
    spatialResolution: fieldFromRaw('spatialResolution', 'Spatial resolution', dsText(ds, 'resolution'), {
      sourceStep: 'satellite-config',
    }),
    apiConnectionStatus: fieldFromRaw(
      'apiConnectionStatus',
      'API / adapter status',
      sat?.status ?? notConfiguredValue(),
      { sourceStep: 'satellite-config' },
    ),
    waterMetrics: fieldFromRaw(
      'waterMetrics',
      'Water metrics configured',
      [dsText(ds, 'ndwi'), dsText(ds, 'turbidity'), dsText(ds, 'chlorophyll')].filter(Boolean).join(', ') ||
        notConfiguredValue(),
      { sourceStep: 'satellite-config' },
    ),
    ndwi: fieldFromRaw('ndwi', 'NDWI', dsText(ds, 'ndwi'), { sourceStep: 'calculation' }),
    turbidity: fieldFromRaw('turbidity', 'Turbidity', dsText(ds, 'turbidity'), { sourceStep: 'calculation' }),
    chlorophyll: fieldFromRaw('chlorophyll', 'Chlorophyll', dsText(ds, 'chlorophyll'), { sourceStep: 'calculation' }),
    cdom: fieldFromRaw('cdom', 'CDOM', dsText(ds, 'cdom'), { sourceStep: 'calculation' }),
    paceSentinelNote: fieldFromRaw(
      'paceSentinelNote',
      'PACE / Sentinel / Landsat note',
      satIds.some((id) => /pace|sentinel|landsat|prisma/i.test(id))
        ? `Configured sources: ${satIds.join(', ')}`
        : '',
      { sourceStep: 'satellite-config' },
    ),
    detectionMethod: fieldFromRaw(
      'detectionMethod',
      'Detection approach',
      dsText(ds, 'detectionMethod') || sat?.inputLabel || '',
      { needsReview: true, sourceStep: 'methodology' },
    ),
    spectralIndicators: fieldFromRaw('spectralIndicators', 'Spectral / proxy indicators', dsText(ds, 'spectralBands'), {
      sourceStep: 'methodology',
    }),
    confidenceScore: fieldFromRaw('confidenceScore', 'Confidence score', dsText(ds, 'confidenceScore'), {
      needsReview: true,
      sourceStep: 'ai-evaluation',
    }),
    falsePositiveRisks: fieldFromRaw('falsePositiveRisks', 'False positive risks', '', { needsReview: true }),
    plotDesign: fieldFromRaw(
      'plotDesign',
      'Plot design / sampling method',
      fpText(fpSettings, 'plotSizeRadius') || fpText(fpSettings, 'provenanceNotes'),
      { sourceStep: 'field-plots' },
    ),
    fieldMeasurements: fieldFromRaw(
      'fieldMeasurements',
      'Field measurement type',
      fpText(fpSettings, 'biomassEvidence') || fpText(fpSettings, 'speciesLandCover'),
      { sourceStep: 'field-plots' },
    ),
    gpsProvenance: fieldFromRaw(
      'gpsProvenance',
      'GPS provenance',
      fpText(fpSettings, 'gpsAccuracySource') ||
        (fpText(fpSettings, 'latitude') && fpText(fpSettings, 'longitude')
          ? `${fpText(fpSettings, 'latitude')}, ${fpText(fpSettings, 'longitude')}`
          : ''),
      { sourceStep: 'field-plots' },
    ),
    fieldSamples: fieldFromRaw('fieldSamples', 'Field samples', fpText(fpSettings, 'plotId'), {
      sourceStep: 'field-plots',
    }),
    samplingMethod: fieldFromRaw('samplingMethod', 'Sampling method', fpText(fpSettings, 'plotSizeRadius'), {
      sourceStep: 'field-plots',
    }),
    fieldValidationPlan: fieldFromRaw('fieldValidationPlan', 'Field validation plan', fpText(fpSettings, 'provenanceNotes'), {
      needsReview: true,
      sourceStep: 'field-plots',
    }),
    inSituSamples: fieldFromRaw('inSituSamples', 'In situ samples', fpText(fpSettings, 'sampleDate'), {
      sourceStep: 'field-plots',
    }),
    evidenceInputs: fieldFromRaw(
      'evidenceInputs',
      'Configured evidence inputs',
      configs.length ? configs.map((c) => c.inputLabel).join('; ') : '',
      { sourceStep: 'evidence-sources' },
    ),
    qaQcStatus: fieldFromRaw(
      'qaQcStatus',
      'QA/QC status',
      configs.filter((c) => c.status === 'verified' || c.status === 'ready').length
        ? `${configs.filter((c) => c.status === 'verified' || c.status === 'ready').length} input(s) ready or verified`
        : '',
      { sourceStep: 'evidence-sources' },
    ),
    validationRules: fieldFromRaw(
      'validationRules',
      'Active validation rules',
      configs
        .flatMap((c) =>
          Object.entries(c.validationRules)
            .filter(([, v]) => v)
            .map(([k]) => k),
        )
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ') || '',
      { sourceStep: 'validation-rules' },
    ),
    reviewerGate: fieldFromRaw(
      'reviewerGate',
      'Reviewer gate',
      ctx?.reviewer.reviewRequired ? 'Human review required' : '',
      { sourceStep: 'validation-rules' },
    ),
    reviewer: fieldFromRaw(
      'reviewer',
      'Validator / reviewer',
      ctx?.reviewer.name || ctx?.reviewer.organization,
      { sourceStep: 'validator-review' },
    ),
    humanVerification: fieldFromRaw(
      'humanVerification',
      'Human verification',
      ctx?.reviewer.humanVerificationRequired ? 'Required' : 'Not required',
      { sourceStep: 'validator-review' },
    ),
    safeguardSummary: fieldFromRaw(
      'safeguardSummary',
      'Safeguards summary',
      ctx?.methodology.requiredEvidenceSources,
      { needsReview: true, sourceStep: 'safeguards' },
    ),
    evidencePacketIds: fieldFromRaw(
      'evidencePacketIds',
      'Evidence packet IDs',
      configs
        .map((c) => c.evidencePacketId)
        .filter(Boolean)
        .join(', '),
      { sourceStep: 'evidence-packet' },
    ),
    packetVisibility: fieldFromRaw(
      'packetVisibility',
      'Packet visibility',
      configs.map((c) => c.evidencePacket.publicVisibility).filter(Boolean).join(', '),
      { sourceStep: 'evidence-packet' },
    ),
    registryIds: fieldFromRaw('registryIds', 'Registry IDs', ctx?.projectId, { sourceStep: 'interoperability' }),
    claimType: fieldFromRaw('claimType', 'Claim type', ctx?.typeTitle, { sourceStep: 'interoperability' }),
    claimLimitations: fieldFromRaw(
      'claimLimitations',
      'Claim limitations',
      'Screening and evidence package only — not certified issuance without standard review.',
      { sourceStep: 'safeguards' },
    ),
    plasticClaimDisclaimer: fieldFromRaw(
      'plasticClaimDisclaimer',
      'Plastic / ocean claim note',
      'Do not present as carbon credit unless an accepted methodology supports this category.',
      { sourceStep: 'safeguards' },
    ),
    methodologyEligibility: fieldFromRaw(
      'methodologyEligibility',
      'Methodology eligibility',
      ctx?.methodology.standardFramework,
      { needsReview: true },
    ),
    configHash: fieldFromRaw(
      'configHash',
      'Config / anchor hash',
      ctx?.blockchain.configHash ||
        configs
          .map((c) => c.blockchain.lastAnchoredHash)
          .filter(Boolean)
          .join(', '),
      { sourceStep: 'blockchain-anchor' },
    ),
    anchorStatus: fieldFromRaw(
      'anchorStatus',
      'Anchor status',
      ctx?.blockchain.status === 'anchored'
        ? 'Anchored'
        : ctx?.blockchain.status === 'pending'
          ? 'Pending'
          : '',
      { sourceStep: 'blockchain-anchor' },
    ),
    anomalySummary: fieldFromRaw('anomalySummary', 'Anomaly summary', dsText(ds, 'anomalyNotes'), {
      needsReview: true,
      sourceStep: 'ai-evaluation',
    }),
    confidence: fieldFromRaw('confidence', 'Confidence', dsText(ds, 'confidenceScore'), { needsReview: true }),
    validationNeeds: fieldFromRaw('validationNeeds', 'Validation needs', ctx?.reviewer.reviewRequired ? 'Human review required' : '', {
      needsReview: true,
    }),
    sourceType: fieldFromRaw('sourceType', 'Source type', ctx?.typeTitle, { sourceStep: 'methodology' }),
    pollutants: fieldFromRaw('pollutants', 'Pollutants', dsText(ds, 'pollutants'), { sourceStep: 'methodology' }),
    publicRecords: fieldFromRaw(
      'publicRecords',
      'Public records',
      configs.filter((c) => c.configType === 'activity').map((c) => c.inputLabel).join(', '),
      { sourceStep: 'evidence-sources' },
    ),
    permitIds: fieldFromRaw('permitIds', 'Permit / facility IDs', dsText(ds, 'permitId'), { sourceStep: 'evidence-sources' }),
    sensorFeeds: fieldFromRaw(
      'sensorFeeds',
      'Sensor / IoT feeds',
      configs
        .filter((c) => c.configType === 'iot')
        .map((c) => c.inputLabel)
        .join(', '),
      { sourceStep: 'satellite-config' },
    ),
    fieldEvidence: fieldFromRaw(
      'fieldEvidence',
      'Field evidence',
      fp?.inputLabel || '',
      { sourceStep: 'field-plots' },
    ),
    reconciliationStatus: fieldFromRaw('reconciliationStatus', 'Reconciliation status', '', { needsReview: true }),
    baselineHabitat: fieldFromRaw('baselineHabitat', 'Baseline habitat', ctx?.reporting.baselineYear, {
      sourceStep: 'methodology',
    }),
    ndvi: fieldFromRaw('ndvi', 'NDVI / vegetation', dsText(ds, 'ndvi'), { sourceStep: 'calculation' }),
    speciesIndicators: fieldFromRaw('speciesIndicators', 'Species indicators', fpText(fpSettings, 'speciesLandCover'), {
      sourceStep: 'calculation',
    }),
    monitoringMetrics: fieldFromRaw(
      'monitoringMetrics',
      'Monitoring metrics',
      configs.map((c) => c.inputLabel).join(', '),
      { sourceStep: 'calculation' },
    ),
    fieldSurveys: fieldFromRaw('fieldSurveys', 'Field surveys', fpText(fpSettings, 'surveyor'), { sourceStep: 'field-plots' }),
    conservationClaim: fieldFromRaw('conservationClaim', 'Conservation claim', ctx?.description, {
      needsReview: true,
      sourceStep: 'methodology',
    }),
    verificationChecklist: fieldFromRaw(
      'verificationChecklist',
      'Verification checklist',
      configs
        .filter((c) => c.validationRules.requireReviewerApproval)
        .map((c) => c.inputLabel)
        .join(', '),
      { sourceStep: 'validator-review' },
    ),
    removalEvidence: fieldFromRaw('removalEvidence', 'Removal evidence', '', { needsReview: true }),
    chainOfCustody: fieldFromRaw('chainOfCustody', 'Chain of custody', '', { needsReview: true }),
  };

  if (lidarIds.length) {
    map.lidarSources = fieldFromRaw('lidarSources', 'LiDAR sources', lidarIds.join(', '), {
      sourceStep: 'satellite-config',
    });
  }

  return template.fieldKeys.map((key) => map[key] ?? fieldFromRaw(key, key, ''));
}

function buildSection(
  template: DmrvReportSectionTemplate,
  ctx: DmrvProjectContext | null,
  configs: DmrvInputConfig[],
  typeId: string,
  overrides?: DmrvReportBuildOverrides,
): DmrvReportSection {
  const fields = buildFieldMap(template, ctx, configs, typeId, overrides);
  const status = deriveSectionStatus(fields);
  const evidenceCount = configs.filter(
    (c) =>
      c.evidencePacketId ||
      c.status === 'verified' ||
      c.status === 'ready' ||
      c.status === 'blockchain_anchored',
  ).length;
  const humanReviewRequired = fields.some((f) => f.needsReview) || Boolean(ctx?.reviewer.humanVerificationRequired);
  const missingHints = fields.filter((f) => f.status === 'missing').map((f) => `Add ${f.label}`);

  let summary = notConfiguredValue();
  if (status === 'complete') summary = 'Configured from workflow data';
  else if (status === 'partial') summary = 'Partially configured — review missing fields';
  else if (status === 'needs_review') summary = needsReviewValue();

  return {
    id: template.id,
    title: template.title,
    workflowStep: template.workflowStep,
    status,
    confidence: deriveConfidence(status, evidenceCount),
    evidenceCount,
    validationStatus:
      status === 'complete'
        ? 'passed'
        : status === 'needs_review'
          ? 'needs_review'
          : status === 'partial'
            ? 'pending'
            : 'not_started',
    humanReviewRequired,
    summary,
    fields,
    cmiThemes: template.cmiThemes,
    missingHints,
  };
}

const CMI_THEME_LABELS: Record<DmrvCmiTheme, string> = {
  transparency: 'Transparency',
  accuracy: 'Accuracy',
  cost_efficiency: 'Cost efficiency',
  scalability: 'Scalability',
  accessibility: 'Accessibility',
  data_security_integrity: 'Data security & integrity',
  interoperability: 'Interoperability',
  explainability: 'Explainability',
  auditability: 'Auditability',
};

function computeCmiScores(sections: DmrvReportSection[]): DmrvCmiThemeScore[] {
  const themes = Object.keys(CMI_THEME_LABELS) as DmrvCmiTheme[];
  return themes.map((theme) => {
    const linked = sections.filter((s) => s.cmiThemes.includes(theme));
    if (!linked.length) {
      return { theme, label: CMI_THEME_LABELS[theme], score: 0, status: 'missing' as const, rationale: notConfiguredValue() };
    }
    const complete = linked.filter((s) => s.status === 'complete').length;
    const partial = linked.filter((s) => s.status === 'partial').length;
    const score = Math.round(((complete + partial * 0.5) / linked.length) * 100);
    const status: DmrvSectionStatus =
      complete === linked.length ? 'complete' : complete + partial > 0 ? 'partial' : 'missing';
    return {
      theme,
      label: CMI_THEME_LABELS[theme],
      score,
      status,
      rationale: `${complete}/${linked.length} linked sections complete`,
    };
  });
}

function computeReadiness(sections: DmrvReportSection[]): DmrvReadinessScore {
  const completedSections = sections.filter((s) => s.status === 'complete').length;
  const partialSections = sections.filter((s) => s.status === 'partial').length;
  const missingSections = sections.filter((s) => s.status === 'missing').length;
  const needsReviewSections = sections.filter((s) => s.status === 'needs_review').length;
  const weighted =
    sections.length > 0
      ? Math.round(
          ((completedSections + partialSections * 0.45 + needsReviewSections * 0.2) / sections.length) * 100,
        )
      : 0;
  return {
    overall: weighted,
    completedSections,
    partialSections,
    missingSections,
    needsReviewSections,
    cmiThemes: computeCmiScores(sections),
  };
}

function deriveReportStatus(readiness: DmrvReadinessScore, ctx: DmrvProjectContext | null): DmrvReportStatus {
  if (readiness.needsReviewSections > 0) return 'needs_human_review';
  if (readiness.overall >= 85 && ctx?.status === 'complete') return 'ready_for_review';
  if (readiness.overall > 0) return 'in_progress';
  return 'draft';
}

function buildInteroperabilityMetadata(
  report: Pick<DmrvReport, 'reportId' | 'projectId' | 'categoryId' | 'typeId'>,
  ctx: DmrvProjectContext | null,
  configs: DmrvInputConfig[],
): DmrvInteroperabilityMetadata {
  const limitations = [
    'dMRV evidence package — not certified issuance without applicable standard, methodology, registry, and VVB process.',
  ];
  if (report.categoryId === 'water-blue-carbon' || resolveDmrvReportType(report.categoryId, report.typeId) === 'plastic') {
    limitations.push('Do not label results as carbon credits unless an accepted methodology supports this category.');
  }
  return {
    projectId: report.projectId,
    reportId: report.reportId,
    methodologyId: ctx?.methodology.name || '',
    categoryId: report.categoryId,
    typeId: report.typeId,
    countryJurisdiction: ctx?.location.countryRegion || '',
    aoiGeometrySummary: aoiLabel(ctx),
    reportingPeriod: ctx ? formatReportingPeriod(ctx) : '',
    monitoringPeriod: ctx
      ? [ctx.reporting.startDate, ctx.reporting.endDate].filter(Boolean).join(' → ')
      : '',
    creditingPeriod: ctx?.reporting.comparisonPeriod || undefined,
    unitEligibilityLabels: [],
    evidencePacketIds: configs.map((c) => c.evidencePacketId).filter((id): id is string => Boolean(id)),
    blockchainHashes: [
      ctx?.blockchain.configHash,
      ...configs.map((c) => c.blockchain.lastAnchoredHash),
    ].filter((h): h is string => Boolean(h)),
    dataSourceIds: configs.map((c) => c.inputKey),
    validationStatus: configs.some((c) => c.status === 'verified') ? 'partially_verified' : 'draft',
    verifierStatus: ctx?.reviewer.name ? 'assigned' : 'not_assigned',
    claimType: ctx?.typeTitle || report.typeId,
    limitations,
    exportedAt: new Date().toISOString(),
  };
}

function snapshotProject(ctx: DmrvProjectContext): DmrvProjectContextSnapshot {
  return {
    projectId: ctx.projectId,
    projectName: ctx.projectName,
    organization: ctx.organization,
    categorySlug: ctx.categorySlug,
    categoryTitle: ctx.categoryTitle,
    typeId: ctx.typeId,
    typeTitle: ctx.typeTitle,
    location: ctx.location,
    reporting: ctx.reporting,
    methodology: ctx.methodology,
    reviewer: ctx.reviewer,
    blockchain: ctx.blockchain,
    status: ctx.status,
  };
}

function resolveInputConfigs(
  projectId: string,
  overrides?: DmrvReportBuildOverrides,
): DmrvInputConfig[] {
  let configs = overrides?.inputConfigs ?? listDmrvInputConfigsForProject(projectId);
  const active = overrides?.activeInputConfig;
  if (active) {
    const idx = configs.findIndex(
      (c) =>
        c.inputKey === active.inputKey &&
        c.categorySlug === active.categorySlug &&
        c.projectId === active.projectId,
    );
    if (idx >= 0) {
      configs = [...configs];
      configs[idx] = active;
    } else {
      configs = [...configs, active];
    }
  }
  return configs;
}

function buildEvidenceRows(configs: DmrvInputConfig[]): DmrvEvidenceSourceRow[] {
  return configs.map((c) => ({
    inputKey: c.inputKey,
    inputLabel: c.inputLabel,
    configType: c.configType,
    status: c.status,
    providerRef:
      dsText(c.dataSourceSettings, 'provider') ||
      dsText(c.dataSourceSettings, 'collection') ||
      c.inputLabel,
    filesOrRefs:
      [
        c.evidencePacketId ? `packet:${c.evidencePacketId}` : '',
        dsText(c.dataSourceSettings, 'uploadUrl'),
        dsText(c.dataSourceSettings, 'photoAttachments'),
      ]
        .filter(Boolean)
        .join('; ') || 'Missing',
    qaStatus:
      c.status === 'verified' || c.status === 'ready'
        ? 'complete'
        : c.status === 'draft'
          ? 'partial'
          : 'missing',
  }));
}

function buildValidationRules(configs: DmrvInputConfig[]): DmrvValidationRuleRow[] {
  const ruleLabels: Record<string, string> = {
    requireCoordinates: 'Coordinates required',
    requireTimestamp: 'Timestamp required',
    requireSourceDocument: 'Source document required',
    requireReviewerApproval: 'Reviewer approval required',
    requireFieldVerification: 'Field verification required',
    requireBeforeAfterComparison: 'Before/after comparison required',
    requireAnomalyDetection: 'Anomaly detection required',
    requireUncertaintyScore: 'Uncertainty score required',
  };
  const rows: DmrvValidationRuleRow[] = [];
  for (const c of configs) {
    for (const [key, enabled] of Object.entries(c.validationRules)) {
      rows.push({
        ruleId: `${c.inputKey}:${key}`,
        label: `${c.inputLabel} — ${ruleLabels[key] ?? key}`,
        enabled: Boolean(enabled),
        result: enabled
          ? c.status === 'verified'
            ? 'pass'
            : 'needs_review'
          : 'not_configured',
      });
    }
  }
  return rows;
}

function buildEvidencePacketContext(configs: DmrvInputConfig[]): DmrvEvidencePacketContext {
  const withPacket = configs.filter((c) => c.evidencePacketId || c.evidencePacket.title.trim());
  const primary = withPacket[0];
  const hasPacket = withPacket.length > 0;
  return {
    packetIds: configs.map((c) => c.evidencePacketId).filter((id): id is string => Boolean(id)),
    title: primary?.evidencePacket.title ?? 'Not Yet Configured',
    visibility: primary?.evidencePacket.publicVisibility ?? '—',
    includesMap: primary?.evidencePacket.includeMapSnapshot ?? false,
    includesRawData: primary?.evidencePacket.includeRawDataReference ?? false,
    includesReviewerNotes: primary?.evidencePacket.includeReviewerNotes ?? false,
    appendicesSummary: hasPacket
      ? `${withPacket.length} input(s) with packet settings`
      : 'Not Yet Configured',
    status: hasPacket ? (withPacket.some((c) => c.evidencePacketId) ? 'partial' : 'needs_review') : 'missing',
  };
}

export function buildDmrvReport(
  projectId: string,
  previous?: DmrvReport | null,
  overrides?: DmrvReportBuildOverrides,
): DmrvReport {
  const ctx =
    overrides?.projectContext !== undefined
      ? overrides.projectContext
      : getDmrvProjectContext(projectId);
  const configs = resolveInputConfigs(projectId, overrides);
  const categoryId = ctx?.categorySlug ?? configs[0]?.categorySlug ?? 'custom-intelligence';
  const typeId = ctx?.typeId ?? configs[0]?.typeId ?? 'custom';
  const reportType = resolveDmrvReportType(categoryId, typeId);
  const templates = getReportSectionTemplates(reportType);
  const sections = templates.map((t) => buildSection(t, ctx, configs, typeId, overrides));
  const readinessScore = computeReadiness(sections);
  const now = new Date().toISOString();
  const reportId = previous?.reportId ?? `dmrv-report-${projectId}`;

  const sat = satelliteConfig(configs);
  const fp = fieldPlotConfig(configs);
  const fpSettings = fp ? settingsToFieldPlot(fp.dataSourceSettings) : null;

  const base: DmrvReport = {
    reportId,
    projectId,
    categoryId,
    categoryLabel: ctx?.categoryTitle ?? categoryId,
    typeId,
    typeLabel: ctx?.typeTitle ?? typeId,
    reportType,
    version: REPORT_VERSION,
    status: deriveReportStatus(readinessScore, ctx),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    projectContext: ctx ? snapshotProject(ctx) : null,
    methodologyContext: {
      name: ctx?.methodology.name ?? '',
      standardFramework: ctx?.methodology.standardFramework ?? '',
      domain: ctx?.methodology.domain ?? 'custom',
      uncertaintyRules: ctx?.methodology.uncertaintyRules ?? '',
      requiredEvidenceSources: ctx?.methodology.requiredEvidenceSources ?? '',
      status: ctx?.methodology.name.trim() ? 'complete' : 'missing',
    },
    dataSourceContext: {
      satelliteProvider: sat ? dsText(sat.dataSourceSettings, 'provider') : '',
      selectedSatellites: sat ? dsText(sat.dataSourceSettings, 'selectedSatellites') : '',
      sensorConfiguration: sat?.inputLabel ?? notConfiguredValue(),
      lidarSources: resolveSourceIds(projectId, typeId, 'lidar', overrides),
      monitoringWindow: ctx ? formatReportingPeriod(ctx) : '',
      cloudCoverLimit: sat ? dsText(sat.dataSourceSettings, 'cloudCoverLimit') : '',
      spatialResolution: sat ? dsText(sat.dataSourceSettings, 'resolution') : '',
      sourceIds: resolveSourceIds(projectId, typeId, 'satellite', overrides).join(', ') || '',
      apiStatus: sat?.status ?? 'not_configured',
      status: sat && sat.status !== 'not_configured' ? 'partial' : 'missing',
    },
    evidenceContext: {
      configuredInputs: configs.length,
      evidencePacketIds: configs.map((c) => c.evidencePacketId).filter((id): id is string => Boolean(id)),
      evidenceSourcesSummary: configs.map((c) => c.inputLabel).join('; ') || notConfiguredValue(),
      qaQcStatus: configs.some((c) => c.status === 'verified') ? 'complete' : configs.length ? 'partial' : 'missing',
      evidenceRows: buildEvidenceRows(configs),
    },
    evidencePacketContext: buildEvidencePacketContext(configs),
    fieldPlotContext: {
      plotCount: fpSettings?.plotId ? 1 : 0,
      samplingMethod: fpText(fpSettings, 'plotSizeRadius'),
      fieldMeasurementType: fpText(fpSettings, 'biomassEvidence') || fpText(fpSettings, 'speciesLandCover'),
      linkedSatellite: sat?.inputLabel ?? '',
      status: fp && fp.status !== 'not_configured' ? 'partial' : 'missing',
    },
    validationContext: {
      rulesActive: configs.reduce(
        (n, c) => n + Object.values(c.validationRules).filter(Boolean).length,
        0,
      ),
      reviewerRequired: ctx?.reviewer.reviewRequired ?? true,
      humanVerificationRequired: ctx?.reviewer.humanVerificationRequired ?? true,
      status: configs.some((c) => Object.values(c.validationRules).some(Boolean)) ? 'partial' : 'missing',
      rules: buildValidationRules(configs),
    },
    calculationContext: {
      summary: sat ? dsText(sat.dataSourceSettings, 'co2eEstimate') || notConfiguredValue() : notConfiguredValue(),
      uncertaintyNote: ctx?.methodology.uncertaintyRules || notConfiguredValue(),
      status: 'missing',
    },
    blockchainContext: {
      projectHash: ctx?.blockchain.configHash,
      anchoredInputs: configs
        .filter((c) => c.blockchain.status === 'anchored')
        .map((c) => c.inputKey),
      ledgerRecordId: ctx?.blockchain.ledgerRecordId,
      status: ctx?.blockchain.status === 'anchored' ? 'complete' : ctx?.blockchain.configHash ? 'partial' : 'missing',
    },
    interoperabilityContext: {
      metadata: buildInteroperabilityMetadata(
        { reportId, projectId, categoryId, typeId },
        ctx,
        configs,
      ),
      registryReady: readinessScore.overall >= 70 && Boolean(ctx?.methodology.name.trim()),
    },
    sections,
    auditTrail: previous?.auditTrail ?? [],
    readinessScore,
    inputConfigs: configs,
    versions: previous?.versions ?? [
      {
        versionId: `ver-init-${projectId}`,
        label: 'Draft v0.1',
        versionNumber: '0.1',
        createdAt: previous?.createdAt ?? now,
        reportJsonHash: '',
        changeSummary: 'Initial living report draft',
        workflowStep: 'project-config',
        anchored: false,
      },
    ],
    blockchainAnchors: previous?.blockchainAnchors ?? [],
    anchorState: previous?.anchorState ?? {
      currentReportHash: '',
      hasUnanchoredChanges: false,
    },
    satelliteReviewHistory: previous?.satelliteReviewHistory ?? [],
    biomassTimeline: previous?.biomassTimeline ?? [],
    threatRegister: previous?.threatRegister ?? [],
    validatorMissions: previous?.validatorMissions ?? [],
    evidencePackets: previous?.evidencePackets ?? [],
    blockchainAnchorLedger: previous?.blockchainAnchorLedger ?? [],
    unanchoredChanges: previous?.unanchoredChanges ?? false,
    evidenceSummary: previous?.evidenceSummary ?? {
      lastSatelliteReviewAt: 'Missing',
      lastBiomassUpdateAt: 'Missing',
      baselineBiomassTonsPerHa: 'Missing',
      currentBiomassTonsPerHa: 'Missing',
      biomassChangeTonsPerHa: 'Missing',
      openThreatCount: 0,
      validatorMissionCount: 0,
      evidencePacketCount: 0,
      anchoredVersionLabel: 'Missing',
      verifierReadinessGaps: [],
    },
  };

  base.interoperabilityContext.metadata = buildInteroperabilityMetadata(base, ctx, configs);
  return ensureReportLedgers(base);
}

export function summarizeReportForVerifier(report: DmrvReport): string {
  const s = report.evidenceSummary;
  const lines = [
    `DPAL Living dMRV Evidence Report — ${report.categoryLabel} / ${report.typeLabel}`,
    `Report ID: ${report.reportId} · Project: ${report.projectContext?.projectName || report.projectId}`,
    `Readiness: ${report.readinessScore.overall}% · Status: ${report.status}`,
    `Last satellite review: ${s.lastSatelliteReviewAt}`,
    `Baseline biomass: ${s.baselineBiomassTonsPerHa} · Current: ${s.currentBiomassTonsPerHa} · Change: ${s.biomassChangeTonsPerHa}`,
    `Open threats: ${s.openThreatCount} · Validator missions: ${s.validatorMissionCount} · Evidence packets: ${s.evidencePacketCount}`,
    `Anchored version: ${s.anchoredVersionLabel}`,
    `Report hash: ${report.anchorState.currentReportHash}`,
    report.unanchoredChanges || report.anchorState.hasUnanchoredChanges
      ? 'WARNING: This report has changes that have not yet been anchored.'
      : report.anchorState.lastAnchoredAt
        ? `Last anchored: ${report.anchorState.lastAnchoredAt}`
        : 'No blockchain anchor recorded yet.',
    `Sections: ${report.readinessScore.completedSections} complete, ${report.readinessScore.missingSections} missing, ${report.readinessScore.needsReviewSections} need review`,
    '',
    'Verifier readiness gaps:',
    ...(s.verifierReadinessGaps.length ? s.verifierReadinessGaps.map((g) => `- ${g}`) : ['- None flagged']),
    '',
    'Missing sections:',
    ...report.sections.filter((sec) => sec.status === 'missing').map((sec) => `- ${sec.title}`),
    '',
    'This is a dMRV evidence package draft — not a certified carbon credit issuance document.',
  ];
  return lines.join('\n');
}
