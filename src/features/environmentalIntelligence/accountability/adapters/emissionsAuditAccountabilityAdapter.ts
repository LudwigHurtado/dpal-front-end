import type { AccountabilityModuleAdapter, AccountabilityModuleSignal } from '../../shared/accountabilityModuleAdapters';
import { SatelliteConfidenceLevel, SatelliteEvidenceReadiness } from '../../shared/satelliteIntelligenceTypes';

/** Minimal CARB audit handoff — extend when CarbEmissionsAuditPage exports a stable DTO. */
export type CarbAuditAccountabilitySummary = {
  facilityName?: string;
  reportingYear?: number;
  reconciliationNeeded?: boolean;
  datasetMode?: string;
};

export function normalizeCarbAuditSummary(s: CarbAuditAccountabilitySummary | null): AccountabilityModuleSignal[] {
  if (!s?.facilityName && !s?.reportingYear) return [];
  return [
    {
      id: `carb-${Date.now()}`,
      moduleId: 'carb_emissions_audit',
      moduleLabel: 'CARB / Emissions Audit',
      moduleStatus: 'partial',
      providerIds: ['CARB_DATASET'],
      signalType: 'greenhouse_gas_hotspot',
      location: s.facilityName ?? 'Facility',
      aoi: 'Regulatory facility record',
      observedDate: new Date().toISOString().slice(0, 10),
      summary:
        'Reported emissions record vs investigation context — official-record cross-check; does not state a company “lied”.',
      confidenceLevel: SatelliteConfidenceLevel.multi_source_supported,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_validator_review,
      sourceSummary: `Dataset mode: ${s.datasetMode ?? 'unknown'} · Year ${s.reportingYear ?? 'n/a'}`,
      limitations: ['Interpretation requires qualified analyst'],
      warnings: s.reconciliationNeeded
        ? ['Source reconciliation may flag mismatches — use “potential mismatch” language only.']
        : [],
      previewOnly: false,
      rawReference: s,
    },
  ];
}

export const emissionsAuditAccountabilityAdapter: AccountabilityModuleAdapter = {
  moduleId: 'carb_emissions_audit',
  label: 'CARB / Emissions Audit',
  description: 'CARB facility investigation workspace when routed on the configured API host.',
  route: '/carb-emissions-audit',
  supportsClaimTypes: ['methane_emissions', 'co2_emissions', 'regulatory_compliance', 'pollution_control', 'other'],
  supportsSignalTypes: ['methane_plume', 'co2_hotspot', 'greenhouse_gas_hotspot', 'air_pollution_hotspot', 'regulatory_compliance'],
  legalCaution:
    'Regulatory records are strong cross-checks but still require interpretation. Never label a company fraudulent from a single screen.',
  normalize: (raw) => normalizeCarbAuditSummary(raw as CarbAuditAccountabilitySummary | null),
};
