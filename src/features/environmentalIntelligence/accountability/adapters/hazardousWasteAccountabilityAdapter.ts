import type { AccountabilityModuleAdapter, AccountabilityModuleSignal } from '../../shared/accountabilityModuleAdapters';
import { SatelliteConfidenceLevel, SatelliteEvidenceReadiness } from '../../shared/satelliteIntelligenceTypes';

export type HazardousWasteAccountabilitySummary = {
  facilityName?: string;
  sourceMode?: string;
  complianceRiskScore?: number;
};

export function normalizeHazardousWasteSummary(s: HazardousWasteAccountabilitySummary | null): AccountabilityModuleSignal[] {
  if (!s?.facilityName) return [];
  const official = (s.sourceMode ?? '').toUpperCase() === 'LIVE' || (s.sourceMode ?? '').toUpperCase() === 'IMPORTED';
  return [
    {
      id: `hw-${Date.now()}`,
      moduleId: 'hazardous_waste_audit',
      moduleLabel: 'Hazardous Waste Audit',
      moduleStatus: official ? 'partial' : 'preview_only',
      providerIds: ['EPA_DATASET'],
      signalType: 'hazardous_waste_risk',
      location: s.facilityName,
      aoi: 'RCRA facility context',
      observedDate: new Date().toISOString().slice(0, 10),
      summary:
        'RCRA / hazardous waste audit context — potential regulatory discrepancy language only when records diverge; not illegal dumping unless records support review.',
      confidenceLevel: official
        ? SatelliteConfidenceLevel.multi_source_supported
        : SatelliteConfidenceLevel.preview_only,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_validator_review,
      sourceSummary: `Source mode: ${s.sourceMode ?? 'unknown'} · risk score ${s.complianceRiskScore ?? 'n/a'}`,
      limitations: ['Demo fallback must be labeled preview'],
      warnings: ['Use “requires review” — not guilt.'],
      previewOnly: !official,
      rawReference: s,
    },
  ];
}

export const hazardousWasteAccountabilityAdapter: AccountabilityModuleAdapter = {
  moduleId: 'hazardous_waste_audit',
  label: 'Hazardous Waste / EPA',
  description: 'Hazardous waste audit and EPA-style record context when datasets are live or imported.',
  route: '/hazardous-waste-audit',
  supportsClaimTypes: ['hazardous_waste', 'regulatory_compliance', 'pollution_control', 'other'],
  supportsSignalTypes: ['hazardous_waste_risk', 'pollution_risk', 'regulatory_compliance'],
  legalCaution: 'Treat EPA/CARB records as official-record context — still require qualified review before conclusions.',
  normalize: (raw) => normalizeHazardousWasteSummary(raw as HazardousWasteAccountabilitySummary | null),
};

export function normalizeEnvirofactsSummary(s: { regionLabel?: string } | null): AccountabilityModuleSignal[] {
  if (!s?.regionLabel) return [];
  return [
    {
      id: `envf-${Date.now()}`,
      moduleId: 'envirofacts_geo',
      moduleLabel: 'EPA / Envirofacts Geo',
      moduleStatus: 'partial',
      providerIds: ['EPA_DATASET'],
      signalType: 'pollution_risk',
      location: s.regionLabel,
      aoi: 'Map search AOI',
      observedDate: new Date().toISOString().slice(0, 10),
      summary: 'Envirofacts geo baseline — facility and permit context for cross-check.',
      confidenceLevel: SatelliteConfidenceLevel.multi_source_supported,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_cross_dataset_comparison,
      sourceSummary: 'Public EPA Envirofacts family',
      limitations: ['Rate limits and coverage gaps'],
      warnings: [],
      previewOnly: false,
      rawReference: s,
    },
  ];
}

export const envirofactsAccountabilityAdapter: AccountabilityModuleAdapter = {
  moduleId: 'envirofacts_geo',
  label: 'Envirofacts Geo',
  description: 'Geographic EPA / Envirofacts intelligence dashboard baselines.',
  route: '/environmental-intelligence/envirofacts-map',
  supportsClaimTypes: ['pollution_control', 'hazardous_waste', 'regulatory_compliance', 'other'],
  supportsSignalTypes: ['pollution_risk', 'hazardous_waste_risk', 'air_pollution_hotspot'],
  legalCaution: 'Public records support transparency — not automatic enforcement outcomes.',
  normalize: (raw) => normalizeEnvirofactsSummary(raw as { regionLabel?: string } | null),
};
