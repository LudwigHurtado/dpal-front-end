/**
 * AquaScan / Water Monitor — lightweight summary adapter.
 * TODO: Wire optional live snapshot from AquaScanView state via callback props when embedding Accountability Engine.
 */

import type { AccountabilityModuleAdapter, AccountabilityModuleSignal } from '../../shared/accountabilityModuleAdapters';
import { SatelliteConfidenceLevel, SatelliteEvidenceReadiness } from '../../shared/satelliteIntelligenceTypes';

export type AquascanAccountabilitySummary = {
  label?: string;
  lat?: number;
  lng?: number;
  copernicusConfigured?: boolean;
  riskLevel?: string;
  ndwiDeltaSummary?: string;
  floodContext?: string;
};

export function normalizeAquascanSummary(summary: AquascanAccountabilitySummary | null): AccountabilityModuleSignal[] {
  if (!summary || (summary.lat == null && summary.lng == null && !summary.riskLevel)) return [];
  const loc =
    summary.lat != null && summary.lng != null
      ? `${summary.lat.toFixed(4)}, ${summary.lng.toFixed(4)}`
      : summary.label ?? 'AOI not specified';
  const live = Boolean(summary.copernicusConfigured);
  const out: AccountabilityModuleSignal[] = [
    {
      id: `aq-main-${Date.now()}`,
      moduleId: 'aquascan_water',
      moduleLabel: 'AquaScan / Water Monitor',
      moduleStatus: live ? 'partial' : 'preview_only',
      providerIds: live ? ['COPERNICUS', 'SENTINEL_2'] : ['COPERNICUS'],
      signalType: 'water_quality_risk',
      location: loc,
      aoi: 'User-defined AOI',
      observedDate: new Date().toISOString().slice(0, 10),
      summary:
        summary.ndwiDeltaSummary ||
        (live
          ? 'Water workspace indicates live Copernicus lane may be available — screening context only.'
          : 'Water workspace preview — live Copernicus not confirmed from this summary alone.'),
      confidenceLevel: live ? SatelliteConfidenceLevel.satellite_indicated : SatelliteConfidenceLevel.preview_only,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_field_validation,
      sourceSummary: summary.riskLevel ? `Risk band context: ${summary.riskLevel}` : 'AquaScan intake / DMRV context',
      limitations: ['Legal water-quality claims require field sampling and lab confirmation'],
      warnings: ['PACE bio-ocean context is supporting only unless a dedicated PACE product lane is live on the API host.'],
      previewOnly: !live,
      rawReference: summary,
    },
  ];
  if (summary.floodContext) {
    out.push({
      id: `aq-flood-${Date.now()}`,
      moduleId: 'aquascan_water',
      moduleLabel: 'AquaScan / Water Monitor',
      moduleStatus: 'partial',
      providerIds: ['SENTINEL_2', 'VIIRS'],
      signalType: 'flood_extent',
      location: loc,
      aoi: 'User-defined AOI',
      observedDate: new Date().toISOString().slice(0, 10),
      summary: summary.floodContext,
      confidenceLevel: SatelliteConfidenceLevel.satellite_indicated,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_field_validation,
      sourceSummary: 'Flood / extent context from AquaScan overlays when configured',
      limitations: ['Not a government emergency alert'],
      warnings: [],
      previewOnly: false,
      rawReference: {},
    });
  }
  return out;
}

export const aquascanWaterAccountabilityAdapter: AccountabilityModuleAdapter = {
  moduleId: 'aquascan_water',
  label: 'AquaScan / Water Monitor',
  description: 'Copernicus DMRV compare, water risk bands, and flood context when live adapters are configured.',
  route: '/water/aquascan',
  supportsClaimTypes: ['water_quality', 'pollution_control', 'regulatory_compliance', 'other'],
  supportsSignalTypes: ['water_quality_risk', 'harmful_algal_bloom_risk', 'flood_extent', 'surface_water_change', 'wetland_change', 'pollution_risk'],
  legalCaution: 'Water signals are screening indicators. Field validation is required before legal or regulatory conclusions.',
  normalize: (raw) => normalizeAquascanSummary(raw as AquascanAccountabilitySummary | null),
};
