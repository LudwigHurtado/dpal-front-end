/**
 * Carbon DMRV — summary adapter from optional dashboard snapshot (no heavy CarbonDMRVDashboard import).
 */

import type { AccountabilityModuleAdapter, AccountabilityModuleSignal } from '../../shared/accountabilityModuleAdapters';
import { SatelliteConfidenceLevel, SatelliteEvidenceReadiness } from '../../shared/satelliteIntelligenceTypes';

export type CarbonMrvAccountabilitySummary = {
  projectName?: string;
  hasLiveAirScan?: boolean;
  hasLiveMineralScan?: boolean;
  mrvScore?: number | null;
  demoMode?: boolean;
};

export function normalizeCarbonMrvSummary(s: CarbonMrvAccountabilitySummary | null): AccountabilityModuleSignal[] {
  if (!s) return [];
  const preview = Boolean(s.demoMode);
  const liveBits = (s.hasLiveAirScan ? 1 : 0) + (s.hasLiveMineralScan ? 1 : 0);
  return [
    {
      id: `cmrv-${Date.now()}`,
      moduleId: 'carbon_mrv',
      moduleLabel: 'Carbon DMRV',
      moduleStatus: preview ? 'preview_only' : liveBits > 0 ? 'partial' : 'metadata_only',
      providerIds: ['LANDSAT_8_9', 'OCO_2'],
      signalType: 'carbon_mrv',
      location: s.projectName ?? 'Project AOI',
      aoi: 'Project boundary (summary)',
      observedDate: new Date().toISOString().slice(0, 10),
      summary:
        'Carbon DMRV workspace context — DMRV support for disclosure comparison, not automatic credit verification.',
      confidenceLevel:
        liveBits >= 2
          ? SatelliteConfidenceLevel.multi_source_supported
          : preview
            ? SatelliteConfidenceLevel.preview_only
            : SatelliteConfidenceLevel.metadata_only,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_field_validation,
      sourceSummary: s.mrvScore != null ? `DMRV score context: ${s.mrvScore}` : 'DMRV indicators not attached in summary',
      limitations: ['Local/demo mode must be labeled preview when APIs are cold'],
      warnings: ['deforestation_free and net_zero claims require official record and field cross-check.'],
      previewOnly: preview || liveBits === 0,
      rawReference: s,
    },
  ];
}

export const carbonMrvAccountabilityAdapter: AccountabilityModuleAdapter = {
  moduleId: 'carbon_mrv',
  label: 'Carbon DMRV',
  description: 'Satellite and adapter reads from the Carbon DMRV dashboard when summarized for accountability.',
  route: '/carbon',
  supportsClaimTypes: ['carbon_credit', 'net_zero', 'deforestation_free', 'co2_emissions', 'other'],
  supportsSignalTypes: ['carbon_mrv', 'co2_hotspot', 'vegetation_decline', 'biomass_decline'],
  legalCaution: 'Carbon DMRV outputs support DMRV narratives — they are not sole proof of net-zero or credit quality.',
  normalize: (raw) => normalizeCarbonMrvSummary(raw as CarbonMrvAccountabilitySummary | null),
};
