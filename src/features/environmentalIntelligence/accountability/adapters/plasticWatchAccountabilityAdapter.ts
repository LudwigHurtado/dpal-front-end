import type { HyperspectralPlasticScanResponse, PlasticProviderState } from '../../../hyperspectralPlasticWatch/types';
import type { AccountabilityModuleAdapter, AccountabilityModuleSignal, AccountabilityModuleStatus } from '../../shared/accountabilityModuleAdapters';
import { SatelliteConfidenceLevel, SatelliteEvidenceReadiness } from '../../shared/satelliteIntelligenceTypes';

function mapPlasticProviderStatus(s: PlasticProviderState): AccountabilityModuleStatus {
  if (s === 'available' || s === 'ready') return 'live';
  if (s === 'not_configured' || s === 'not_enabled') return 'not_configured';
  if (s === 'no_scene' || s === 'unavailable') return 'partial';
  if (s === 'rate_limited' || s === 'auth_error' || s === 'failed') return 'error';
  if (s === 'needs_credentials') return 'partial';
  return 'preview_only';
}

function paceConfidence(status: PlasticProviderState, sceneCount: number): SatelliteConfidenceLevel {
  if (status === 'available' && sceneCount > 0) return SatelliteConfidenceLevel.metadata_only;
  if (status === 'available' || status === 'ready') return SatelliteConfidenceLevel.satellite_indicated;
  return SatelliteConfidenceLevel.preview_only;
}

/** Normalize Plastic Watch scan — no plastic confirmation unless live indices explicitly support it. */
export function normalizePlasticWatchScan(scan: HyperspectralPlasticScanResponse | null): AccountabilityModuleSignal[] {
  if (!scan?.ok) return [];

  const out: AccountabilityModuleSignal[] = [];
  const pace = scan.providers.pace;
  const emit = scan.providers.emit;
  const paceScenes = pace.scenes?.length ?? 0;
  const paceStatus = mapPlasticProviderStatus(pace.status);
  const paceConf = paceConfidence(pace.status, paceScenes);

  out.push({
    id: `pw-pace-${scan.scanId}`,
    moduleId: 'plastic_watch',
    moduleLabel: 'Hyperspectral Plastic Watch',
    moduleStatus: paceStatus,
    providerIds: ['PACE_OCI', 'NASA_CMR'],
    signalType: paceScenes > 0 && paceConf === SatelliteConfidenceLevel.metadata_only ? 'other' : 'plastic_pollution_confidence',
    location: `${scan.aoi.lat.toFixed(4)}, ${scan.aoi.lng.toFixed(4)}`,
    aoi: `${scan.aoi.radiusKm} km`,
    observedDate: scan.generatedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    baselineDate: scan.aoi.baselineDate,
    currentDate: scan.aoi.currentDate,
    summary:
      paceScenes > 0
        ? 'PACE CMR metadata located — plastic confidence context requires spectral processing and field validation.'
        : 'PACE lane: no matching granule metadata or lane not active — no plastic inference.',
    confidenceLevel: paceConf,
    evidenceReadiness:
      paceConf === SatelliteConfidenceLevel.metadata_only
        ? SatelliteEvidenceReadiness.needs_cross_dataset_comparison
        : SatelliteEvidenceReadiness.preview_only,
    sourceSummary: pace.message || 'PACE / hyperspectral lane',
    limitations: pace.limitations ?? ['Evidence-support only — not plastic confirmation'],
    warnings: [
      'Use “possible plastic / pollution confidence zone” language when uncertain.',
      'Harmful algal bloom and water-quality confounders may mimic spectral anomalies.',
    ],
    previewOnly: paceConf !== SatelliteConfidenceLevel.live_provider_confirmed,
    rawReference: { pace: { status: pace.status, sceneCount: paceScenes }, emit: { status: emit.status } },
  });

  const algae = scan.spectralSignals?.waterConfounders?.algae;
  if (algae === 'high' || algae === 'moderate') {
    out.push({
      id: `pw-hab-${scan.scanId}`,
      moduleId: 'plastic_watch',
      moduleLabel: 'Hyperspectral Plastic Watch',
      moduleStatus: 'partial',
      providerIds: ['PACE_OCI', 'EMIT'],
      signalType: 'harmful_algal_bloom_risk',
      location: `${scan.aoi.lat.toFixed(4)}, ${scan.aoi.lng.toFixed(4)}`,
      aoi: `${scan.aoi.radiusKm} km`,
      observedDate: scan.generatedAt?.slice(0, 10) ?? '',
      summary: 'Water confounder panel suggests elevated algae context — HAB risk screening, not diagnosis.',
      confidenceLevel: SatelliteConfidenceLevel.satellite_indicated,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_field_validation,
      sourceSummary: 'Confounder summary from Plastic Watch — not standalone ocean biology product.',
      limitations: ['Not a regulatory HAB determination'],
      warnings: ['Field water sampling recommended.'],
      previewOnly: true,
      rawReference: { waterConfounders: scan.spectralSignals?.waterConfounders },
    });
  }

  const risk = scan.plasticRisk;
  if (risk && risk.status !== 'not_computed') {
    out.push({
      id: `pw-risk-${scan.scanId}`,
      moduleId: 'plastic_watch',
      moduleLabel: 'Hyperspectral Plastic Watch',
      moduleStatus: risk.status === 'metadata_only' ? 'metadata_only' : 'partial',
      providerIds: ['PACE_OCI', 'EMIT', 'LANDSAT_8_9'],
      signalType: 'plastic_pollution_confidence',
      location: `${scan.aoi.lat.toFixed(4)}, ${scan.aoi.lng.toFixed(4)}`,
      aoi: `${scan.aoi.radiusKm} km`,
      observedDate: scan.generatedAt?.slice(0, 10) ?? '',
      summary: risk.message || 'Plastic risk lane — metadata or context only unless indices are live.',
      confidenceLevel:
        risk.status === 'metadata_only'
          ? SatelliteConfidenceLevel.metadata_only
          : SatelliteConfidenceLevel.satellite_indicated,
      evidenceReadiness: SatelliteEvidenceReadiness.needs_field_validation,
      sourceSummary: scan.spectralSignals?.notes?.join(' ') || 'Spectral / confounder context',
      limitations: ['Does not confirm plastic without field validation'],
      warnings: ['Possible plastic / pollution confidence zone — review-first wording only.'],
      previewOnly: risk.status === 'metadata_only' || risk.status === 'pending_index_extraction',
      rawReference: { plasticRisk: risk },
    });
  }

  return out;
}

export const plasticWatchAccountabilityAdapter: AccountabilityModuleAdapter = {
  moduleId: 'plastic_watch',
  label: 'Hyperspectral Plastic Watch',
  description: 'PACE/EMIT metadata and spectral confounder context for coastal and water-adjacent screening.',
  route: '/hyperspectral-plastic-watch',
  supportsClaimTypes: ['pollution_control', 'water_quality', 'sustainability_report', 'other'],
  supportsSignalTypes: ['plastic_pollution_confidence', 'harmful_algal_bloom_risk', 'water_quality_risk', 'pollution_risk'],
  legalCaution:
    'Plastic Watch outputs are evidence-support signals. PACE metadata alone is not plastic detection. Do not infer guilt or fraud.',
  normalize: (raw) => normalizePlasticWatchScan(raw as HyperspectralPlasticScanResponse | null),
};
