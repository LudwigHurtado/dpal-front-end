import type { ForestIntegrityScanResponse, ForestProviderState } from '../../../forestIntegrity/types';
import type { AccountabilityModuleAdapter, AccountabilityModuleSignal, AccountabilityModuleStatus } from '../../shared/accountabilityModuleAdapters';
import { SatelliteConfidenceLevel, SatelliteEvidenceReadiness } from '../../shared/satelliteIntelligenceTypes';

function mapForestStatus(s: ForestProviderState): AccountabilityModuleStatus {
  if (s === 'available' || s === 'cached') return 'live';
  if (s === 'not_configured') return 'not_configured';
  if (s === 'unavailable') return 'unavailable';
  if (s === 'rate_limited' || s === 'auth_error' || s === 'failed') return 'error';
  return 'partial';
}

export function normalizeForestIntegrityScan(scan: ForestIntegrityScanResponse | null): AccountabilityModuleSignal[] {
  if (!scan?.ok) return [];

  const out: AccountabilityModuleSignal[] = [];
  const gedi = scan.providers.gedi;
  const gfw = scan.providers.gfw;
  const firms = scan.providers.firms;
  const gediStatus = mapForestStatus(gedi.status);
  const gediPreview =
    gediStatus === 'not_configured' || (gedi.message?.toLowerCase().includes('not implemented') ?? false);

  out.push({
    id: `fi-gedi-${scan.scanId}`,
    moduleId: 'forest_integrity',
    moduleLabel: 'Forest Integrity',
    moduleStatus: gediPreview ? 'preview_only' : gediStatus,
    providerIds: ['GEDI_LIDAR'],
    signalType: 'vegetation_decline',
    location: `${scan.aoi.lat.toFixed(4)}, ${scan.aoi.lng.toFixed(4)}`,
    aoi: `${scan.aoi.radiusKm} km`,
    observedDate: scan.generatedAt.slice(0, 10),
    baselineDate: scan.aoi.baselineDate,
    currentDate: scan.aoi.currentDate,
    summary: gediPreview
      ? 'GEDI lane scaffolded — not fully implemented on this API host; no live canopy/biomass product claimed here.'
      : 'GEDI lane returned messages — interpret as structure/biomass support context, not carbon-credit invalidation.',
    confidenceLevel: gediPreview ? SatelliteConfidenceLevel.preview_only : SatelliteConfidenceLevel.metadata_only,
    evidenceReadiness: gediPreview
      ? SatelliteEvidenceReadiness.preview_only
      : SatelliteEvidenceReadiness.needs_cross_dataset_comparison,
    sourceSummary: gedi.message || 'NASA GEDI',
    limitations: gedi.limitations ?? ['GEDI alone does not verify carbon credits'],
    warnings: ['Potential mismatch with forest conservation / carbon claims requires multi-source review — never auto-guilt.'],
    previewOnly: gediPreview,
    rawReference: { gedi: { status: gedi.status } },
  });

  const gfwAlerts = (gfw.integratedAlerts ?? 0) + (gfw.disturbanceAlerts ?? 0);
  if (gfwAlerts > 0 || gfw.status === 'available') {
    out.push({
      id: `fi-gfw-${scan.scanId}`,
      moduleId: 'forest_integrity',
      moduleLabel: 'Forest Integrity',
      moduleStatus: mapForestStatus(gfw.status),
      providerIds: ['GFW'],
      signalType: 'forest_loss',
      location: `${scan.aoi.lat.toFixed(4)}, ${scan.aoi.lng.toFixed(4)}`,
      aoi: `${scan.aoi.radiusKm} km`,
      observedDate: scan.generatedAt.slice(0, 10),
      summary: `GFW alert context (${gfwAlerts} combined alert signals when present) — satellite-indicated forest disturbance screening.`,
      confidenceLevel:
        gfw.status === 'available' && gfwAlerts > 0
          ? SatelliteConfidenceLevel.multi_source_supported
          : SatelliteConfidenceLevel.satellite_indicated,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_field_validation,
      sourceSummary: gfw.message || 'Global Forest Watch',
      limitations: gfw.limitations ?? [],
      warnings: ['Forest loss signals are review leads — not proof of claim falsity.'],
      previewOnly: false,
      rawReference: { gfw },
    });
  }

  if ((firms.activeFires ?? 0) > 0 || firms.status === 'available') {
    out.push({
      id: `fi-firms-${scan.scanId}`,
      moduleId: 'forest_integrity',
      moduleLabel: 'Forest Integrity',
      moduleStatus: mapForestStatus(firms.status),
      providerIds: ['VIIRS'],
      signalType: 'heat_stress',
      location: `${scan.aoi.lat.toFixed(4)}, ${scan.aoi.lng.toFixed(4)}`,
      aoi: `${scan.aoi.radiusKm} km`,
      observedDate: scan.generatedAt.slice(0, 10),
      summary: `FIRMS hotspot context (${firms.activeFires ?? 0} rows) — cross-check for fire-related vegetation stress.`,
      confidenceLevel: SatelliteConfidenceLevel.satellite_indicated,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_cross_dataset_comparison,
      sourceSummary: firms.message || 'NASA FIRMS',
      limitations: firms.limitations ?? [],
      warnings: [],
      previewOnly: false,
      rawReference: { firms },
    });
  }

  const ndviCh = scan.indices.ndviChange;
  if (ndviCh != null && Math.abs(ndviCh) > 0.02) {
    out.push({
      id: `fi-ndvi-${scan.scanId}`,
      moduleId: 'forest_integrity',
      moduleLabel: 'Forest Integrity',
      moduleStatus: 'partial',
      providerIds: ['LANDSAT_8_9'],
      signalType: 'vegetation_decline',
      location: `${scan.aoi.lat.toFixed(4)}, ${scan.aoi.lng.toFixed(4)}`,
      aoi: `${scan.aoi.radiusKm} km`,
      observedDate: scan.generatedAt.slice(0, 10),
      summary: 'Landsat-derived index change in scan window — scene-level screening context.',
      confidenceLevel: SatelliteConfidenceLevel.satellite_indicated,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_field_validation,
      sourceSummary: `NDVI change ${ndviCh.toFixed(4)}`,
      limitations: scan.limitations ?? [],
      warnings: ['Biomass decline narratives require corroboration — not automatic carbon-credit invalidation.'],
      previewOnly: false,
      rawReference: { indices: scan.indices },
    });
  }

  return out;
}

export const forestIntegrityAccountabilityAdapter: AccountabilityModuleAdapter = {
  moduleId: 'forest_integrity',
  label: 'Forest Integrity',
  description: 'GFW, FIRMS, Landsat indices, and GEDI scaffold for forest structure and disturbance context.',
  route: '/forest-integrity',
  supportsClaimTypes: ['forest_conservation', 'deforestation_free', 'carbon_credit', 'net_zero', 'other'],
  supportsSignalTypes: ['forest_loss', 'biomass_decline', 'vegetation_decline', 'carbon_mrv'],
  legalCaution:
    'GEDI may be not implemented — label honestly. Never state carbon credits are invalid from satellite alone.',
  normalize: (raw) => normalizeForestIntegrityScan(raw as ForestIntegrityScanResponse | null),
};
