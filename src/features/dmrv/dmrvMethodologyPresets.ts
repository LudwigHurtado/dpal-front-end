import type { DmrvDataSourceSettings, DmrvValidationRules } from './services/dmrvInputConfigTypes';

export type DmrvMethodologyStatus =
  | 'dpal-pilot'
  | 'reference-aligned'
  | 'external-standard-aligned'
  | 'requires-review'
  | 'custom';

export type DmrvMethodologyPreset = {
  id: string;
  name: string;
  shortName: string;
  dmrvTypeIds: string[];
  category:
    | 'forest-carbon'
    | 'agriculture-soil'
    | 'blue-carbon'
    | 'avoided-deforestation'
    | 'reforestation'
    | 'custom';
  status: DmrvMethodologyStatus;
  modelUsed: string;
  units: string;
  conversionFactor: string;
  carbonFraction: string;
  defaultUncertaintyPercent: string;
  requiredEvidenceRules: DmrvValidationRules;
  requiredInputs: string[];
  compatibleEvidenceSources: string[];
  calculationChain: string[];
  qaQcNotes: string;
  verifierExplanation: string;
  limitations: string[];
  bestFor: string;
};

export type MethodologyApplicationTrace = {
  id: string;
  projectId?: string;
  dmrvTypeId?: string;
  presetId: string;
  presetName: string;
  fieldsApplied: string[];
  evidenceRulesApplied: string[];
  assumptions: string[];
  limitations: string[];
  verifierExplanation: string;
  appliedBy: 'user' | 'ai-recommendation';
  createdAt: string;
  status: 'draft' | 'ready-for-review' | 'prepared-for-anchor';
  traceHash: string;
};

export type MethodologyReadinessResult = {
  score: number;
  label: 'Draft' | 'Needs Evidence' | 'Ready for Review' | 'Evidence Packet Ready';
  missing: string[];
};

export type MethodologyRecommendation = {
  preset: DmrvMethodologyPreset;
  reason: string;
  requiredEvidence: string[];
  missing: string[];
  needsVerifierReview: boolean;
  warnings: string[];
};

export const METHODOLOGY_STATUS_LABELS: Record<DmrvMethodologyStatus, string> = {
  'dpal-pilot': 'DPAL Pilot',
  'reference-aligned': 'Reference-Aligned',
  'external-standard-aligned': 'External-Standard Aligned',
  'requires-review': 'Requires Verifier Review',
  custom: 'Custom',
};

export const METHODOLOGY_STATUS_STYLES: Record<DmrvMethodologyStatus, string> = {
  'dpal-pilot': 'bg-emerald-50 text-emerald-900 border-emerald-200',
  'reference-aligned': 'bg-sky-50 text-sky-900 border-sky-200',
  'external-standard-aligned': 'bg-indigo-50 text-indigo-900 border-indigo-200',
  'requires-review': 'bg-amber-50 text-amber-900 border-amber-200',
  custom: 'bg-slate-100 text-slate-800 border-slate-200',
};

export const DMRV_METHODOLOGY_PRESETS: DmrvMethodologyPreset[] = [
  {
    id: 'dpal-forest-stock-change-v1',
    name: 'DPAL Forest Biomass Stock-Change Model v1.0',
    shortName: 'DPAL Stock-Change v1',
    dmrvTypeIds: ['forest-land-use'],
    category: 'forest-carbon',
    status: 'dpal-pilot',
    modelUsed:
      'DPAL Forest Biomass Stock-Change Model v1.0 — field plot allometry, satellite vegetation indices, and LiDAR canopy-height cross-checks.',
    units: 'tCO2e/ha',
    conversionFactor: '3.667',
    carbonFraction: '0.47',
    defaultUncertaintyPercent: '20',
    requiredEvidenceRules: {
      requireCoordinates: true,
      requireTimestamp: true,
      requireSourceDocument: true,
      requireReviewerApproval: true,
      requireFieldVerification: true,
      requireBeforeAfterComparison: false,
      requireAnomalyDetection: false,
      requireUncertaintyScore: true,
    },
    requiredInputs: [
      'AOI boundary',
      'reporting period',
      'field plot measurements',
      'biomass estimate',
      'satellite imagery source',
      'LiDAR or canopy-height source where available',
    ],
    compatibleEvidenceSources: [
      'Field Plots',
      'Satellite Imagery',
      'LiDAR',
      'Biomass Data',
      'Activity Data',
    ],
    calculationChain: [
      'Tree / vegetation measurement',
      'Above-ground biomass estimate',
      'Carbon stock estimate',
      'CO2e conversion',
      'Uncertainty adjustment',
      'Evidence packet output',
    ],
    qaQcNotes:
      'Biomass estimates must be supported by field plots, satellite imagery, LiDAR or canopy-height evidence where available, timestamped source records, reviewer approval, and uncertainty scoring before evidence packet generation.',
    verifierExplanation:
      'This preset estimates forest carbon stock using project-level biomass evidence, remote-sensing cross-checks, and a conservative uncertainty score. It is suitable for DPAL pilot DMRV workflows and requires verifier review before use in any formal crediting claim.',
    limitations: [
      'Pilot methodology; not automatically certified',
      'Requires local validation of field plot data',
      'Requires project-specific allometric assumptions',
      'Uncertainty must be recalculated for formal use',
    ],
    bestFor: 'Forest carbon pilots, land-use monitoring, reforestation evidence, regrowth review.',
  },
  {
    id: 'ipcc-afolu-biomass-reference',
    name: 'IPCC-Style AFOLU Biomass-to-Carbon Reference Approach',
    shortName: 'IPCC-Style AFOLU',
    dmrvTypeIds: ['forest-land-use', 'afolu'],
    category: 'forest-carbon',
    status: 'reference-aligned',
    modelUsed:
      'IPCC-style AFOLU biomass-to-carbon conversion using biomass stock estimates, default carbon fraction, and CO2 molecular-weight conversion.',
    units: 'tCO2e/ha',
    conversionFactor: '3.667',
    carbonFraction: '0.47',
    defaultUncertaintyPercent: '25',
    requiredEvidenceRules: {
      requireCoordinates: true,
      requireTimestamp: true,
      requireSourceDocument: true,
      requireReviewerApproval: true,
      requireFieldVerification: false,
      requireBeforeAfterComparison: false,
      requireAnomalyDetection: false,
      requireUncertaintyScore: true,
    },
    requiredInputs: [
      'AOI boundary',
      'biomass stock estimate',
      'carbon fraction assumption',
      'reporting period',
      'source documentation',
    ],
    compatibleEvidenceSources: ['Field Plots', 'Satellite Imagery', 'Biomass Data', 'Activity Data'],
    calculationChain: [
      'Biomass stock estimate',
      'Carbon fraction application',
      'CO2e conversion (3.667)',
      'Uncertainty adjustment',
      'Evidence packet output',
    ],
    qaQcNotes:
      'Use conservative assumptions where local data is incomplete. Document all biomass source data, carbon fraction assumptions, uncertainty treatment, and reviewer notes.',
    verifierExplanation:
      'This preset provides a reference-aligned biomass-to-carbon calculation structure based on conventional AFOLU-style conversion logic. It is useful where the project needs a transparent baseline calculation chain.',
    limitations: [
      'Requires project-specific validation',
      'Default values may not match local ecosystem conditions',
      'Does not replace approved program methodology',
    ],
    bestFor: 'General forest biomass estimates and baseline carbon-stock reporting.',
  },
  {
    id: 'field-plot-allometric-equation',
    name: 'Field Plot Allometric Equation Method',
    shortName: 'Field Plot Allometry',
    dmrvTypeIds: ['forest-land-use', 'biodiversity-ecosystems'],
    category: 'forest-carbon',
    status: 'requires-review',
    modelUsed:
      'Field plot allometric biomass equation using tree diameter, height, wood density, species group, and plot expansion factor.',
    units: 'tCO2e/ha',
    conversionFactor: '3.667',
    carbonFraction: '0.47',
    defaultUncertaintyPercent: '15',
    requiredEvidenceRules: {
      requireCoordinates: true,
      requireTimestamp: true,
      requireSourceDocument: true,
      requireReviewerApproval: true,
      requireFieldVerification: true,
      requireBeforeAfterComparison: false,
      requireAnomalyDetection: false,
      requireUncertaintyScore: true,
    },
    requiredInputs: [
      'plot ID and GPS',
      'DBH and tree height',
      'species or wood-density class',
      'plot radius/area',
      'surveyor identity and measurement date',
    ],
    compatibleEvidenceSources: ['Field Plots', 'Satellite Imagery', 'LiDAR', 'Biomass Data'],
    calculationChain: [
      'Tree measurements (DBH, height)',
      'Allometric biomass equation',
      'Plot expansion to per-hectare stock',
      'Carbon fraction and CO2e conversion',
      'Uncertainty adjustment',
      'Evidence packet output',
    ],
    qaQcNotes:
      'Require plot ID, GPS coordinates, plot radius/area, surveyor identity, measurement date, DBH, tree height, species or wood-density class, photos, and reviewer approval.',
    verifierExplanation:
      'This preset prioritizes ground-measured field plot data as the primary biomass source. Satellite and LiDAR layers should be used as cross-checks rather than sole evidence.',
    limitations: [
      'Requires trained surveyors',
      'Measurement error can affect biomass estimates',
      'Sampling design must be documented',
    ],
    bestFor: 'High-integrity forest inventory, field-heavy projects, verifier review.',
  },
  {
    id: 'lidar-canopy-height-biomass',
    name: 'LiDAR Canopy Height Biomass Model',
    shortName: 'LiDAR Biomass',
    dmrvTypeIds: ['forest-land-use'],
    category: 'forest-carbon',
    status: 'requires-review',
    modelUsed:
      'LiDAR canopy-height biomass model using canopy height, canopy structure, field plot calibration, and remote-sensing cross-checks.',
    units: 'tCO2e/ha',
    conversionFactor: '3.667',
    carbonFraction: '0.47',
    defaultUncertaintyPercent: '18',
    requiredEvidenceRules: {
      requireCoordinates: true,
      requireTimestamp: true,
      requireSourceDocument: true,
      requireReviewerApproval: true,
      requireFieldVerification: true,
      requireBeforeAfterComparison: true,
      requireAnomalyDetection: false,
      requireUncertaintyScore: true,
    },
    requiredInputs: [
      'LiDAR source and acquisition date',
      'canopy height model',
      'field plot calibration data',
      'AOI boundary',
    ],
    compatibleEvidenceSources: ['LiDAR', 'Field Plots', 'Satellite Imagery', 'Biomass Data'],
    calculationChain: [
      'Canopy height / structure',
      'Calibrated biomass estimate',
      'Carbon stock',
      'CO2e conversion',
      'Uncertainty adjustment',
      'Evidence packet output',
    ],
    qaQcNotes:
      'LiDAR-derived canopy height must be linked to AOI, acquisition date, sensor/source, processing method, field calibration data where available, and uncertainty score.',
    verifierExplanation:
      'This preset uses 3D canopy structure as a biomass-support layer. It is strongest when paired with field plot calibration and satellite change detection.',
    limitations: [
      'LiDAR coverage may be limited',
      'Requires calibration against local field data',
      'Canopy height alone is not a complete biomass claim',
    ],
    bestFor: 'Forest structure, biomass validation, canopy-height verification.',
  },
  {
    id: 'satellite-ndvi-biomass-regression',
    name: 'Satellite NDVI Biomass Regression Model',
    shortName: 'NDVI Biomass Regression',
    dmrvTypeIds: ['forest-land-use', 'agriculture'],
    category: 'forest-carbon',
    status: 'requires-review',
    modelUsed:
      'Satellite vegetation-index biomass regression using NDVI/EVI trend signals calibrated against field or reference biomass observations.',
    units: 'tCO2e/ha',
    conversionFactor: '3.667',
    carbonFraction: '0.47',
    defaultUncertaintyPercent: '30',
    requiredEvidenceRules: {
      requireCoordinates: true,
      requireTimestamp: true,
      requireSourceDocument: true,
      requireReviewerApproval: true,
      requireFieldVerification: false,
      requireBeforeAfterComparison: true,
      requireAnomalyDetection: true,
      requireUncertaintyScore: true,
    },
    requiredInputs: [
      'satellite imagery source',
      'index formula and scene dates',
      'field or reference calibration',
      'AOI boundary',
    ],
    compatibleEvidenceSources: ['Satellite Imagery', 'Field Plots', 'Biomass Data', 'Activity Data'],
    calculationChain: [
      'Vegetation index time series',
      'Regression to biomass',
      'Carbon stock estimate',
      'CO2e conversion',
      'Uncertainty adjustment',
      'Evidence packet output',
    ],
    qaQcNotes:
      'Vegetation-index biomass estimates must be calibrated against field plots or verified reference data. Cloud filtering, scene dates, AOI coverage, and index formula must be recorded.',
    verifierExplanation:
      'This preset is useful for scalable screening and trend analysis, but it should not be treated as final biomass proof without calibration and uncertainty controls.',
    limitations: [
      'NDVI saturation risk in dense forests',
      'Cloud and seasonality can affect results',
      'Requires local calibration',
    ],
    bestFor: 'Large-area screening, vegetation trend monitoring, early warning, low-cost pilots.',
  },
  {
    id: 'avoided-deforestation-baseline',
    name: 'Avoided Deforestation Baseline Comparison',
    shortName: 'Avoided Deforestation',
    dmrvTypeIds: ['forest-land-use'],
    category: 'avoided-deforestation',
    status: 'requires-review',
    modelUsed:
      'Avoided deforestation baseline comparison using historical land-cover change, reference-region trend, project AOI monitoring, and conservative carbon-stock assumptions.',
    units: 'tCO2e/ha',
    conversionFactor: '3.667',
    carbonFraction: '0.47',
    defaultUncertaintyPercent: '30',
    requiredEvidenceRules: {
      requireCoordinates: true,
      requireTimestamp: true,
      requireSourceDocument: true,
      requireReviewerApproval: true,
      requireFieldVerification: false,
      requireBeforeAfterComparison: true,
      requireAnomalyDetection: true,
      requireUncertaintyScore: true,
    },
    requiredInputs: [
      'historical baseline period',
      'reference region',
      'AOI boundary',
      'deforestation-risk logic',
      'leakage/permanence notes',
    ],
    compatibleEvidenceSources: ['Satellite Imagery', 'Activity Data', 'Biomass Data', 'Field Plots'],
    calculationChain: [
      'Baseline land-cover scenario',
      'Project-area monitoring',
      'Stock-change comparison',
      'CO2e conversion',
      'Uncertainty adjustment',
      'Evidence packet output',
    ],
    qaQcNotes:
      'Require historical baseline period, reference region, AOI boundary, deforestation-risk logic, before/after satellite scenes, activity data, and leakage/permanence notes.',
    verifierExplanation:
      'This preset supports avoided-deforestation analysis by comparing project-area forest outcomes against a documented baseline scenario. It requires careful review of additionality, leakage, permanence, and baseline assumptions.',
    limitations: [
      'Baseline assumptions are sensitive',
      'Requires additionality review',
      'Requires leakage and permanence safeguards',
    ],
    bestFor: 'Avoided deforestation pilots and forest-risk monitoring.',
  },
  {
    id: 'reforestation-growth-curve',
    name: 'Reforestation / Afforestation Growth Curve Model',
    shortName: 'Reforestation Growth',
    dmrvTypeIds: ['forest-land-use'],
    category: 'reforestation',
    status: 'dpal-pilot',
    modelUsed:
      'Reforestation growth-curve model using planting records, survival rate, species group, field plot growth measurements, and satellite/LiDAR cross-checks.',
    units: 'tCO2e/ha',
    conversionFactor: '3.667',
    carbonFraction: '0.47',
    defaultUncertaintyPercent: '25',
    requiredEvidenceRules: {
      requireCoordinates: true,
      requireTimestamp: true,
      requireSourceDocument: true,
      requireReviewerApproval: true,
      requireFieldVerification: true,
      requireBeforeAfterComparison: true,
      requireAnomalyDetection: false,
      requireUncertaintyScore: true,
    },
    requiredInputs: [
      'planting date and species group',
      'survival rate',
      'field plot growth measurements',
      'canopy development evidence',
    ],
    compatibleEvidenceSources: ['Field Plots', 'Activity Data', 'Satellite Imagery', 'LiDAR', 'Biomass Data'],
    calculationChain: [
      'Planting and survival records',
      'Growth curve / biomass accumulation',
      'Carbon stock estimate',
      'CO2e conversion',
      'Uncertainty adjustment',
      'Evidence packet output',
    ],
    qaQcNotes:
      'Require planting date, species group, survival rate, field plot measurements, canopy development evidence, disturbance notes, and uncertainty score.',
    verifierExplanation:
      'This preset estimates carbon accumulation from tree growth over time. It is strongest when planting records, survival checks, field measurements, and remote sensing all agree.',
    limitations: [
      'Requires survival-rate monitoring',
      'Growth curves must match local species/ecosystem',
      'Young projects may have limited measurable carbon',
    ],
    bestFor: 'Tree planting, restoration, regrowth, community reforestation projects.',
  },
  {
    id: 'blue-carbon-mangrove-biomass',
    name: 'Blue Carbon Mangrove Biomass Model',
    shortName: 'Mangrove Blue Carbon',
    dmrvTypeIds: ['water-blue-carbon', 'forest-land-use'],
    category: 'blue-carbon',
    status: 'requires-review',
    modelUsed:
      'Mangrove blue-carbon biomass model using mangrove extent, above-ground biomass, below-ground biomass assumptions, field plots, water/coastal satellite evidence, and uncertainty treatment.',
    units: 'tCO2e/ha',
    conversionFactor: '3.667',
    carbonFraction: '0.47',
    defaultUncertaintyPercent: '30',
    requiredEvidenceRules: {
      requireCoordinates: true,
      requireTimestamp: true,
      requireSourceDocument: true,
      requireReviewerApproval: true,
      requireFieldVerification: true,
      requireBeforeAfterComparison: true,
      requireAnomalyDetection: false,
      requireUncertaintyScore: true,
    },
    requiredInputs: [
      'mangrove boundary',
      'tidal/coastal context',
      'field plot or reference biomass',
      'satellite water/coastal evidence',
    ],
    compatibleEvidenceSources: ['Field Plots', 'Satellite Imagery', 'Biomass Data', 'Activity Data'],
    calculationChain: [
      'Mangrove extent mapping',
      'Above- and below-ground biomass',
      'Carbon stock',
      'CO2e conversion',
      'Uncertainty adjustment',
      'Evidence packet output',
    ],
    qaQcNotes:
      'Require mangrove boundary, tidal/coastal context, field plot or reference biomass source, satellite water/coastal evidence, and uncertainty adjustment.',
    verifierExplanation:
      'This preset supports mangrove or coastal blue-carbon screening. It requires careful ecosystem classification, boundary review, and verifier confirmation.',
    limitations: [
      'Coastal boundaries can shift',
      'Soil carbon may require separate methodology',
      'Requires ecosystem-specific validation',
    ],
    bestFor: 'Mangroves, coastal restoration, blue-carbon pilots.',
  },
  {
    id: 'agriculture-soil-organic-carbon',
    name: 'Agriculture Soil Organic Carbon Change Model',
    shortName: 'Soil Organic Carbon',
    dmrvTypeIds: ['agriculture', 'soil-restoration'],
    category: 'agriculture-soil',
    status: 'requires-review',
    modelUsed:
      'Soil organic carbon stock-change model using soil samples, management practice records, baseline/current comparison, and uncertainty scoring.',
    units: 'tCO2e/ha',
    conversionFactor: '3.667',
    carbonFraction: '1.0',
    defaultUncertaintyPercent: '35',
    requiredEvidenceRules: {
      requireCoordinates: true,
      requireTimestamp: true,
      requireSourceDocument: true,
      requireReviewerApproval: true,
      requireFieldVerification: true,
      requireBeforeAfterComparison: true,
      requireAnomalyDetection: false,
      requireUncertaintyScore: true,
    },
    requiredInputs: [
      'soil sample location and depth',
      'lab/source document',
      'baseline/current dates',
      'management activity data',
    ],
    compatibleEvidenceSources: ['Soil Samples', 'Field Plots', 'Activity Data', 'Biomass Data'],
    calculationChain: [
      'Soil sample analysis',
      'Stock-change calculation',
      'CO2e conversion',
      'Uncertainty adjustment',
      'Evidence packet output',
    ],
    qaQcNotes:
      'Require soil sample location, depth, lab/source document, baseline/current dates, management activity data, and uncertainty treatment.',
    verifierExplanation:
      'This preset supports soil carbon change tracking. It relies heavily on sample quality, sampling depth consistency, and transparent before/after comparison.',
    limitations: [
      'Soil carbon changes can be slow',
      'Sampling design must be consistent',
      'Lab/source documentation required',
    ],
    bestFor: 'Soil restoration, regenerative agriculture, practice verification.',
  },
  {
    id: 'custom-methodology',
    name: 'Custom Project Methodology',
    shortName: 'Custom',
    dmrvTypeIds: [
      'forest-land-use',
      'agriculture',
      'water-blue-carbon',
      'pollution-emissions',
      'custom-advanced-intelligence',
    ],
    category: 'custom',
    status: 'custom',
    modelUsed:
      'Custom project methodology — user must define calculation chain, units, conversion assumptions, evidence requirements, and QA/QC notes.',
    units: 'user-defined',
    conversionFactor: 'user-defined',
    carbonFraction: 'user-defined',
    defaultUncertaintyPercent: '',
    requiredEvidenceRules: {
      requireCoordinates: true,
      requireTimestamp: true,
      requireSourceDocument: true,
      requireReviewerApproval: true,
      requireFieldVerification: false,
      requireBeforeAfterComparison: false,
      requireAnomalyDetection: false,
      requireUncertaintyScore: true,
    },
    requiredInputs: [
      'calculation chain documentation',
      'units and conversion assumptions',
      'evidence source references',
    ],
    compatibleEvidenceSources: ['Field Plots', 'Satellite Imagery', 'LiDAR', 'Biomass Data', 'Activity Data'],
    calculationChain: [
      'User-defined inputs',
      'User-defined calculation',
      'Carbon / CO2e estimate',
      'Uncertainty treatment',
      'Evidence packet output',
    ],
    qaQcNotes:
      'Custom methodologies require full documentation, source references, formula explanation, input logging, reviewer approval, and uncertainty scoring.',
    verifierExplanation:
      'This preset is for project-specific or externally supplied methodologies. It should be reviewed before inclusion in a formal evidence packet.',
    limitations: [
      'Requires manual review',
      'Not pre-validated',
      'User must provide complete methodology documentation',
    ],
    bestFor: 'Special projects and imported external methodologies.',
  },
];

export const METHODOLOGY_TRACE_STORAGE_KEY = 'dpal_dmrv_methodology_traces_v1';

export function getMethodologyPresetById(id: string): DmrvMethodologyPreset | undefined {
  return DMRV_METHODOLOGY_PRESETS.find((p) => p.id === id);
}

export function getMethodologyPresetsForType(dmrvTypeId: string): DmrvMethodologyPreset[] {
  return DMRV_METHODOLOGY_PRESETS.filter(
    (p) => p.dmrvTypeIds.includes(dmrvTypeId) || p.id === 'custom-methodology',
  );
}

export function presetToDataSourceSettings(preset: DmrvMethodologyPreset): DmrvDataSourceSettings {
  return {
    equationModel: preset.modelUsed,
    units: preset.units,
    conversionFactor: preset.conversionFactor,
    carbonFraction: preset.carbonFraction,
    uncertaintyPct: preset.defaultUncertaintyPercent,
    qaQcNotes: preset.qaQcNotes,
    methodologyPresetId: preset.id,
    methodologyPresetName: preset.name,
    methodologyStatus: preset.status,
  };
}

export function createMethodologyTraceHash(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return `dmrv-meth-${Math.abs(h).toString(16).padStart(8, '0')}`;
}

export function createMethodologyApplicationTrace(params: {
  projectId?: string;
  dmrvTypeId?: string;
  preset: DmrvMethodologyPreset;
  fieldsApplied: string[];
  evidenceRulesApplied: string[];
  appliedBy: 'user' | 'ai-recommendation';
  readinessScore: number;
}): MethodologyApplicationTrace {
  const assumptions = [
    `Conversion factor: ${params.preset.conversionFactor}`,
    `Carbon fraction: ${params.preset.carbonFraction}`,
    `Default uncertainty: ${params.preset.defaultUncertaintyPercent || 'user-defined'}%`,
  ];
  const traceBody = {
    presetId: params.preset.id,
    projectId: params.projectId,
    dmrvTypeId: params.dmrvTypeId,
    appliedAt: new Date().toISOString(),
    fieldsApplied: params.fieldsApplied,
  };
  const status: MethodologyApplicationTrace['status'] =
    params.readinessScore >= 90
      ? 'prepared-for-anchor'
      : params.readinessScore >= 70
        ? 'ready-for-review'
        : 'draft';

  return {
    id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: params.projectId,
    dmrvTypeId: params.dmrvTypeId,
    presetId: params.preset.id,
    presetName: params.preset.name,
    fieldsApplied: params.fieldsApplied,
    evidenceRulesApplied: params.evidenceRulesApplied,
    assumptions,
    limitations: params.preset.limitations,
    verifierExplanation: params.preset.verifierExplanation,
    appliedBy: params.appliedBy,
    createdAt: new Date().toISOString(),
    status,
    traceHash: createMethodologyTraceHash(traceBody),
  };
}

export function saveMethodologyTrace(trace: MethodologyApplicationTrace): void {
  try {
    const raw = localStorage.getItem(METHODOLOGY_TRACE_STORAGE_KEY);
    const list: MethodologyApplicationTrace[] = raw ? (JSON.parse(raw) as MethodologyApplicationTrace[]) : [];
    list.unshift(trace);
    localStorage.setItem(METHODOLOGY_TRACE_STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* ignore storage errors */
  }
}

export function getMethodologyTracesForProject(projectId: string): MethodologyApplicationTrace[] {
  try {
    const raw = localStorage.getItem(METHODOLOGY_TRACE_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as MethodologyApplicationTrace[];
    return Array.isArray(list) ? list.filter((t) => t.projectId === projectId) : [];
  } catch {
    return [];
  }
}

const RULE_LABELS: Record<keyof DmrvValidationRules, string> = {
  requireCoordinates: 'Require coordinates',
  requireTimestamp: 'Require timestamp',
  requireSourceDocument: 'Require source document',
  requireReviewerApproval: 'Require reviewer approval',
  requireFieldVerification: 'Require field verification',
  requireBeforeAfterComparison: 'Require before/after comparison',
  requireAnomalyDetection: 'Require anomaly detection',
  requireUncertaintyScore: 'Require uncertainty score',
};

export function evidenceRulesAppliedList(rules: DmrvValidationRules): string[] {
  return (Object.keys(rules) as (keyof DmrvValidationRules)[])
    .filter((k) => rules[k])
    .map((k) => RULE_LABELS[k]);
}

export type MethodologyFormState = {
  dataSourceSettings: DmrvDataSourceSettings;
  validationRules: DmrvValidationRules;
  selectedPresetId?: string;
};

export function calculateMethodologyReadiness(
  preset: DmrvMethodologyPreset | null,
  form: MethodologyFormState,
): MethodologyReadinessResult {
  const missing: string[] = [];
  const ds = form.dataSourceSettings;
  let earned = 0;
  const total = 12;

  if (form.selectedPresetId || preset) earned += 1;
  else missing.push('Select a methodology preset');

  if (String(ds.equationModel ?? '').trim()) earned += 1;
  else missing.push('Equation / model used');

  if (String(ds.units ?? '').trim() && ds.units !== 'user-defined') earned += 1;
  else if (String(ds.units ?? '').trim()) earned += 1;
  else missing.push('Units');

  if (String(ds.conversionFactor ?? '').trim() && ds.conversionFactor !== 'user-defined') earned += 1;
  else if (String(ds.conversionFactor ?? '').trim()) earned += 1;
  else missing.push('Conversion factor');

  if (String(ds.carbonFraction ?? '').trim() && ds.carbonFraction !== 'user-defined') earned += 1;
  else if (String(ds.carbonFraction ?? '').trim()) earned += 1;
  else missing.push('Carbon fraction');

  if (String(ds.uncertaintyPct ?? '').trim()) earned += 1;
  else missing.push('Uncertainty %');

  if (String(ds.qaQcNotes ?? '').trim()) earned += 1;
  else missing.push('QA/QC notes');

  const rules = form.validationRules;
  const required = preset?.requiredEvidenceRules ?? rules;
  const ruleKeys = Object.keys(required) as (keyof DmrvValidationRules)[];
  let rulesMet = 0;
  let rulesRequired = 0;
  for (const key of ruleKeys) {
    if (required[key]) {
      rulesRequired += 1;
      if (rules[key]) rulesMet += 1;
      else missing.push(RULE_LABELS[key]);
    }
  }
  if (rulesRequired > 0) {
    earned += Math.round((rulesMet / rulesRequired) * 4);
  } else {
    earned += 2;
  }

  const score = Math.min(100, Math.round((earned / total) * 100));
  let label: MethodologyReadinessResult['label'];
  if (score < 40) label = 'Draft';
  else if (score < 70) label = 'Needs Evidence';
  else if (score < 90) label = 'Ready for Review';
  else label = 'Evidence Packet Ready';

  return { score, label, missing };
}

export type RecommendMethodologyContext = {
  selectedSources?: string[];
  selectedLidarSources?: string[];
  hasFieldPlots?: boolean;
  projectContext?: string;
};

export function recommendMethodologyPreset(
  dmrvTypeId: string,
  ctx: RecommendMethodologyContext = {},
): MethodologyRecommendation {
  const sources = (ctx.selectedSources ?? []).map((s) => s.toLowerCase());
  const lidarSelected =
    ctx.selectedLidarSources?.length ||
    sources.some((s) => s.includes('lidar') || s.includes('gedi') || s.includes('canopy'));
  const satelliteOnly =
    sources.some((s) => s.includes('satellite')) &&
    !ctx.hasFieldPlots &&
    !lidarSelected;
  const context = (ctx.projectContext ?? '').toLowerCase();
  const warnings: string[] = [];
  const missing: string[] = [];

  const pick = (id: string, reason: string): MethodologyRecommendation => {
    const preset = getMethodologyPresetById(id) ?? getMethodologyPresetById('custom-methodology')!;
    if (preset.status === 'requires-review' || preset.status === 'custom') {
      warnings.push('Requires verifier review before formal crediting use.');
    }
    if (satelliteOnly && id === 'satellite-ndvi-biomass-regression') {
      warnings.push('Field plot calibration is strongly recommended when using satellite-only biomass regression.');
      missing.push('Field plot calibration data');
    }
    if (!ctx.hasFieldPlots && preset.requiredEvidenceRules.requireFieldVerification) {
      missing.push('Field plot or field verification evidence');
    }
    return {
      preset,
      reason,
      requiredEvidence: evidenceRulesAppliedList(preset.requiredEvidenceRules),
      missing,
      needsVerifierReview: preset.status !== 'dpal-pilot',
      warnings,
    };
  };

  if (dmrvTypeId === 'water-blue-carbon' || context.includes('mangrove') || context.includes('coastal')) {
    return pick(
      'blue-carbon-mangrove-biomass',
      'Water / blue-carbon context detected — mangrove biomass model aligns with coastal restoration screening.',
    );
  }

  if (
    dmrvTypeId === 'agriculture' ||
    dmrvTypeId === 'soil-restoration' ||
    context.includes('soil') ||
    context.includes('agriculture')
  ) {
    return pick(
      'agriculture-soil-organic-carbon',
      'Agriculture or soil-restoration context — soil organic carbon stock-change model fits practice verification.',
    );
  }

  if (
    context.includes('avoided deforestation') ||
    context.includes('deforestation') ||
    context.includes('redd')
  ) {
    return pick(
      'avoided-deforestation-baseline',
      'Avoided deforestation or REDD-style language detected — baseline comparison preset recommended.',
    );
  }

  if (
    context.includes('planting') ||
    context.includes('reforestation') ||
    context.includes('afforestation') ||
    context.includes('restoration') ||
    context.includes('regrowth')
  ) {
    return pick(
      'reforestation-growth-curve',
      'Planting or restoration language detected — growth-curve model fits accumulation over time.',
    );
  }

  if (dmrvTypeId === 'forest-land-use' && ctx.hasFieldPlots && lidarSelected) {
    return pick(
      'dpal-forest-stock-change-v1',
      'Forest land use with field plots and LiDAR — DPAL stock-change v1 combines ground plots, vegetation indices, and canopy structure cross-checks.',
    );
  }

  if (dmrvTypeId === 'forest-land-use' && lidarSelected) {
    return pick(
      'lidar-canopy-height-biomass',
      'LiDAR sources selected — canopy-height biomass model uses 3D structure with field calibration where available.',
    );
  }

  if (dmrvTypeId === 'forest-land-use' && ctx.hasFieldPlots) {
    return pick(
      'field-plot-allometric-equation',
      'Field plots configured — allometric equation preset prioritizes ground-measured inventory.',
    );
  }

  if (satelliteOnly || (sources.some((s) => s.includes('satellite')) && dmrvTypeId === 'forest-land-use')) {
    return pick(
      'satellite-ndvi-biomass-regression',
      'Mostly satellite evidence — NDVI biomass regression useful for screening; field calibration recommended.',
    );
  }

  if (dmrvTypeId === 'forest-land-use' || dmrvTypeId === 'afolu') {
    return pick(
      'ipcc-afolu-biomass-reference',
      'Forest / AFOLU type without strong source signals — IPCC-style reference approach provides transparent conversion chain.',
    );
  }

  return pick(
    'custom-methodology',
    'Project context is unclear — custom methodology lets you document project-specific assumptions with full verifier review.',
  );
}
