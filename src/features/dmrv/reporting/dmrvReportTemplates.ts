import type { DmrvCmiTheme, DmrvReportSection, DmrvReportType } from './dmrvReportTypes';

export type DmrvReportSectionTemplate = {
  id: string;
  title: string;
  workflowStep: string;
  cmiThemes: DmrvCmiTheme[];
  fieldKeys: string[];
};

const CARBON_SECTIONS: DmrvReportSectionTemplate[] = [
  { id: 'project-identity', title: 'Project Identity & AOI', workflowStep: 'project-config', cmiThemes: ['transparency', 'interoperability'], fieldKeys: ['projectName', 'aoi', 'location', 'reportingPeriod'] },
  { id: 'baseline-scenario', title: 'Baseline Scenario', workflowStep: 'methodology', cmiThemes: ['accuracy', 'explainability'], fieldKeys: ['baselineYear', 'baselineDescription'] },
  { id: 'project-scenario', title: 'Project Scenario', workflowStep: 'methodology', cmiThemes: ['accuracy', 'explainability'], fieldKeys: ['projectScenario', 'implementationPeriod'] },
  { id: 'additionality', title: 'Additionality', workflowStep: 'methodology', cmiThemes: ['accuracy', 'auditability'], fieldKeys: ['additionalityEvidence', 'regulatorySurplus'] },
  { id: 'permanence-reversal', title: 'Permanence & Reversal Risk', workflowStep: 'validation', cmiThemes: ['accuracy', 'auditability'], fieldKeys: ['permanenceRisk', 'reversalMitigation'] },
  { id: 'leakage', title: 'Leakage', workflowStep: 'validation', cmiThemes: ['accuracy'], fieldKeys: ['leakageAssessment', 'leakageMitigation'] },
  { id: 'biomass-carbon', title: 'Biomass / Carbon / CO₂e', workflowStep: 'calculation', cmiThemes: ['accuracy', 'transparency'], fieldKeys: ['carbonStock', 'co2eEstimate', 'calculationMethod'] },
  { id: 'uncertainty', title: 'Uncertainty', workflowStep: 'validation', cmiThemes: ['accuracy', 'explainability'], fieldKeys: ['uncertaintyRules', 'uncertaintyScore'] },
  { id: 'methodology-alignment', title: 'Methodology Alignment', workflowStep: 'methodology', cmiThemes: ['interoperability', 'auditability'], fieldKeys: ['methodologyName', 'standardFramework'] },
  { id: 'data-sources', title: 'Satellite & Data Sources', workflowStep: 'satellite-config', cmiThemes: ['transparency', 'data_security_integrity'], fieldKeys: ['satelliteProvider', 'selectedSatellites', 'monitoringWindow'] },
  { id: 'ground-truth', title: 'Ground Truth / Field Plots', workflowStep: 'field-plots', cmiThemes: ['accuracy', 'auditability'], fieldKeys: ['plotDesign', 'fieldMeasurements', 'gpsProvenance'] },
  { id: 'evidence-sources', title: 'Evidence Sources & QA/QC', workflowStep: 'evidence-sources', cmiThemes: ['transparency', 'auditability'], fieldKeys: ['evidenceInputs', 'qaQcStatus'] },
  { id: 'validation-rules', title: 'Validation Rules', workflowStep: 'validation-rules', cmiThemes: ['auditability', 'data_security_integrity'], fieldKeys: ['validationRules', 'reviewerGate'] },
  { id: 'vvb-checklist', title: 'VVB Review Checklist', workflowStep: 'validator-review', cmiThemes: ['auditability', 'accessibility'], fieldKeys: ['reviewer', 'humanVerification'] },
  { id: 'safeguards', title: 'Non-GHG Safeguards', workflowStep: 'safeguards', cmiThemes: ['transparency', 'accessibility'], fieldKeys: ['safeguardSummary'] },
  { id: 'evidence-packet', title: 'Verifier Evidence Packet', workflowStep: 'evidence-packet', cmiThemes: ['interoperability', 'auditability'], fieldKeys: ['evidencePacketIds', 'packetVisibility'] },
  { id: 'registry-metadata', title: 'Registry / Interoperability Metadata', workflowStep: 'interoperability', cmiThemes: ['interoperability', 'scalability'], fieldKeys: ['registryIds', 'claimType'] },
  { id: 'blockchain-audit', title: 'Blockchain & Audit Trail', workflowStep: 'blockchain-anchor', cmiThemes: ['data_security_integrity', 'auditability'], fieldKeys: ['configHash', 'anchorStatus'] },
];

const WATER_SECTIONS: DmrvReportSectionTemplate[] = [
  { id: 'project-identity', title: 'Project Identity & Waterbody AOI', workflowStep: 'project-config', cmiThemes: ['transparency', 'interoperability'], fieldKeys: ['projectName', 'aoi', 'waterbodyType'] },
  { id: 'water-sensors', title: 'Satellite / Water Sensor Configuration', workflowStep: 'satellite-config', cmiThemes: ['transparency', 'accuracy'], fieldKeys: ['satelliteProvider', 'waterMetrics', 'monitoringWindow'] },
  { id: 'water-metrics', title: 'NDWI / Turbidity / Chlorophyll / CDOM', workflowStep: 'calculation', cmiThemes: ['accuracy', 'explainability'], fieldKeys: ['ndwi', 'turbidity', 'chlorophyll', 'cdom'] },
  { id: 'ground-truth', title: 'Ground Truth / Field Sampling', workflowStep: 'field-plots', cmiThemes: ['accuracy', 'auditability'], fieldKeys: ['fieldSamples', 'samplingMethod'] },
  { id: 'anomalies', title: 'Water Quality Anomaly Findings', workflowStep: 'ai-evaluation', cmiThemes: ['explainability', 'accuracy'], fieldKeys: ['anomalySummary', 'confidence'] },
  { id: 'uncertainty-validation', title: 'Uncertainty & Validation Needs', workflowStep: 'validation', cmiThemes: ['accuracy', 'auditability'], fieldKeys: ['uncertaintyRules', 'validationNeeds'] },
  { id: 'evidence-packet', title: 'Evidence Packet', workflowStep: 'evidence-packet', cmiThemes: ['interoperability', 'auditability'], fieldKeys: ['evidencePacketIds'] },
  { id: 'methodology-alignment', title: 'Methodology & Blue Carbon Context', workflowStep: 'methodology', cmiThemes: ['interoperability'], fieldKeys: ['methodologyName', 'claimLimitations'] },
  { id: 'blockchain-audit', title: 'Audit Trail & Blockchain', workflowStep: 'blockchain-anchor', cmiThemes: ['data_security_integrity', 'auditability'], fieldKeys: ['configHash', 'anchorStatus'] },
];

const PLASTIC_SECTIONS: DmrvReportSectionTemplate[] = [
  { id: 'project-identity', title: 'Monitoring Objective & AOI', workflowStep: 'project-config', cmiThemes: ['transparency'], fieldKeys: ['projectName', 'aoi', 'monitoringObjective'] },
  { id: 'satellite-provider', title: 'Satellite / Provider (PACE, Sentinel, Landsat, PRISMA)', workflowStep: 'satellite-config', cmiThemes: ['transparency', 'accuracy'], fieldKeys: ['satelliteProvider', 'selectedSatellites', 'paceSentinelNote'] },
  { id: 'detection-approach', title: 'Detection Approach', workflowStep: 'methodology', cmiThemes: ['explainability', 'accuracy'], fieldKeys: ['detectionMethod', 'spectralIndicators'] },
  { id: 'confidence-fp', title: 'Confidence & False Positive Risks', workflowStep: 'ai-evaluation', cmiThemes: ['accuracy', 'explainability'], fieldKeys: ['confidenceScore', 'falsePositiveRisks'] },
  { id: 'field-validation', title: 'Field Validation Needs', workflowStep: 'field-plots', cmiThemes: ['auditability', 'accuracy'], fieldKeys: ['fieldValidationPlan', 'inSituSamples'] },
  { id: 'removal-custody', title: 'Removal Evidence & Chain of Custody', workflowStep: 'evidence-sources', cmiThemes: ['auditability', 'data_security_integrity'], fieldKeys: ['removalEvidence', 'chainOfCustody'] },
  { id: 'claim-limitations', title: 'Claim Limitations (Not Carbon Credit)', workflowStep: 'safeguards', cmiThemes: ['transparency', 'accessibility'], fieldKeys: ['plasticClaimDisclaimer', 'methodologyEligibility'] },
  { id: 'evidence-packet', title: 'Evidence Packet', workflowStep: 'evidence-packet', cmiThemes: ['interoperability'], fieldKeys: ['evidencePacketIds'] },
  { id: 'blockchain-audit', title: 'Audit Trail', workflowStep: 'blockchain-anchor', cmiThemes: ['auditability'], fieldKeys: ['configHash'] },
];

const EMISSIONS_SECTIONS: DmrvReportSectionTemplate[] = [
  { id: 'facility-entity', title: 'Facility / Entity', workflowStep: 'project-config', cmiThemes: ['transparency', 'interoperability'], fieldKeys: ['projectName', 'facilityLocation', 'organization'] },
  { id: 'emissions-source', title: 'Emissions Source', workflowStep: 'methodology', cmiThemes: ['accuracy'], fieldKeys: ['sourceType', 'pollutants'] },
  { id: 'regulatory-datasets', title: 'Regulatory Dataset References', workflowStep: 'evidence-sources', cmiThemes: ['interoperability', 'auditability'], fieldKeys: ['publicRecords', 'permitIds'] },
  { id: 'satellite-iot-field', title: 'Satellite / IoT / Field Evidence', workflowStep: 'satellite-config', cmiThemes: ['transparency', 'accuracy'], fieldKeys: ['satelliteProvider', 'sensorFeeds', 'fieldEvidence'] },
  { id: 'anomaly-reconciliation', title: 'Anomaly Detection & Reconciliation', workflowStep: 'ai-evaluation', cmiThemes: ['accuracy', 'explainability'], fieldKeys: ['anomalySummary', 'reconciliationStatus'] },
  { id: 'validation-review', title: 'Validator Review', workflowStep: 'validator-review', cmiThemes: ['auditability'], fieldKeys: ['reviewer', 'validationRules'] },
  { id: 'evidence-packet', title: 'Evidence Packet', workflowStep: 'evidence-packet', cmiThemes: ['interoperability'], fieldKeys: ['evidencePacketIds'] },
  { id: 'blockchain-audit', title: 'Audit Trail', workflowStep: 'blockchain-anchor', cmiThemes: ['data_security_integrity'], fieldKeys: ['configHash'] },
];

const BIODIVERSITY_SECTIONS: DmrvReportSectionTemplate[] = [
  { id: 'project-identity', title: 'Project Identity & Habitat AOI', workflowStep: 'project-config', cmiThemes: ['transparency'], fieldKeys: ['projectName', 'aoi', 'habitatType'] },
  { id: 'habitat-baseline', title: 'Habitat Baseline', workflowStep: 'methodology', cmiThemes: ['accuracy', 'explainability'], fieldKeys: ['baselineHabitat', 'baselineYear'] },
  { id: 'ecological-indicators', title: 'Ecological Indicators', workflowStep: 'calculation', cmiThemes: ['accuracy'], fieldKeys: ['ndvi', 'speciesIndicators', 'monitoringMetrics'] },
  { id: 'monitoring-data', title: 'Monitoring Data', workflowStep: 'satellite-config', cmiThemes: ['transparency'], fieldKeys: ['satelliteProvider', 'fieldSurveys'] },
  { id: 'conservation-claim', title: 'Conservation Claim', workflowStep: 'methodology', cmiThemes: ['explainability', 'auditability'], fieldKeys: ['conservationClaim', 'claimLimitations'] },
  { id: 'safeguards', title: 'Human / Non-GHG Safeguards', workflowStep: 'safeguards', cmiThemes: ['accessibility', 'transparency'], fieldKeys: ['safeguardSummary'] },
  { id: 'verification-checklist', title: 'Verification Checklist', workflowStep: 'validator-review', cmiThemes: ['auditability'], fieldKeys: ['reviewer', 'verificationChecklist'] },
  { id: 'evidence-packet', title: 'Evidence Packet', workflowStep: 'evidence-packet', cmiThemes: ['interoperability'], fieldKeys: ['evidencePacketIds'] },
  { id: 'blockchain-audit', title: 'Audit Trail', workflowStep: 'blockchain-anchor', cmiThemes: ['auditability'], fieldKeys: ['configHash'] },
];

const CUSTOM_SECTIONS: DmrvReportSectionTemplate[] = [
  { id: 'project-identity', title: 'Project Identity', workflowStep: 'project-config', cmiThemes: ['transparency'], fieldKeys: ['projectName', 'aoi', 'reportingPeriod'] },
  { id: 'methodology', title: 'Methodology', workflowStep: 'methodology', cmiThemes: ['interoperability'], fieldKeys: ['methodologyName'] },
  { id: 'data-sources', title: 'Data Sources', workflowStep: 'satellite-config', cmiThemes: ['transparency'], fieldKeys: ['satelliteProvider', 'evidenceInputs'] },
  { id: 'validation', title: 'Validation', workflowStep: 'validation-rules', cmiThemes: ['auditability'], fieldKeys: ['validationRules'] },
  { id: 'evidence-packet', title: 'Evidence Packet', workflowStep: 'evidence-packet', cmiThemes: ['interoperability'], fieldKeys: ['evidencePacketIds'] },
  { id: 'blockchain-audit', title: 'Audit Trail', workflowStep: 'blockchain-anchor', cmiThemes: ['auditability'], fieldKeys: ['configHash'] },
];

export function resolveDmrvReportType(categorySlug: string, typeId: string): DmrvReportType {
  const t = typeId.toLowerCase();
  if (t.includes('plastic') || t.includes('marine-ocean') || t.includes('hyperspectral')) {
    return 'plastic';
  }
  switch (categorySlug) {
    case 'carbon-land':
      return 'carbon';
    case 'water-blue-carbon':
      return 'water';
    case 'pollution-emissions':
      return 'emissions';
    case 'biodiversity-ecosystems':
      return 'biodiversity';
    default:
      return 'custom';
  }
}

export function getReportSectionTemplates(reportType: DmrvReportType): DmrvReportSectionTemplate[] {
  switch (reportType) {
    case 'carbon':
      return CARBON_SECTIONS;
    case 'water':
      return WATER_SECTIONS;
    case 'plastic':
      return PLASTIC_SECTIONS;
    case 'emissions':
      return EMISSIONS_SECTIONS;
    case 'biodiversity':
      return BIODIVERSITY_SECTIONS;
    default:
      return CUSTOM_SECTIONS;
  }
}

export function emptySectionFromTemplate(template: DmrvReportSectionTemplate): DmrvReportSection {
  return {
    id: template.id,
    title: template.title,
    workflowStep: template.workflowStep,
    status: 'missing',
    confidence: 'low',
    evidenceCount: 0,
    validationStatus: 'not_started',
    humanReviewRequired: false,
    summary: 'Not Yet Configured',
    fields: template.fieldKeys.map((key) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      value: 'Missing',
      status: 'missing' as const,
    })),
    cmiThemes: template.cmiThemes,
    missingHints: [],
  };
}
