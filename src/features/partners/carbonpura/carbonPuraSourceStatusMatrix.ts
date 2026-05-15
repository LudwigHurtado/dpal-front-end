import { getApiBase } from '../../../../constants';
import { VIEW_PATHS } from '../../../../utils/appRoutes';
import type {
  ProviderSourceLifecycleStatus,
  ProviderSourceStatusEntry,
} from '../../environmentalIntegrity/environmentalIntegrityTypes';
import type { HyperspectralPlasticProviderStatusResponse } from '../../hyperspectralPlasticWatch/types';
import type { CopernicusSetupState } from '../../../../services/copernicus/types';
import { buildPaceProductSuiteRows } from './paceProductSuites';

export type CarbonPuraProbeSnapshot = {
  checkedAtIso: string;
  apiReachable: boolean | null;
  apiDetail: string;
  plastic: HyperspectralPlasticProviderStatusResponse | null;
  plasticError: string | null;
  droneConfigured: boolean | null;
  droneEnabled: boolean | null;
  droneMessage: string | null;
  droneError: string | null;
  copernicus: CopernicusSetupState | null;
  copernicusError: string | null;
  waterStatsOk: boolean | null;
  waterStatsError: string | null;
};

function entry(
  partial: Omit<ProviderSourceStatusEntry, 'checkedAtIso'> & { checkedAtIso?: string },
): ProviderSourceStatusEntry {
  return partial;
}

function emitStatusFromProbe(plastic: HyperspectralPlasticProviderStatusResponse | null): {
  status: ProviderSourceLifecycleStatus;
  providerNotes?: string;
} {
  if (!plastic) return { status: 'unavailable' };
  const emit = plastic.emit;
  const notes = emit?.message;
  if (emit?.configured && emit?.enabled) {
    return { status: 'partial', providerNotes: notes };
  }
  if (emit?.configured) {
    return { status: 'metadata_only', providerNotes: notes };
  }
  return { status: 'unavailable', providerNotes: notes };
}

function sentinelPlasticStatusFromProbe(plastic: HyperspectralPlasticProviderStatusResponse | null): {
  status: ProviderSourceLifecycleStatus;
  providerNotes?: string;
} {
  if (!plastic) return { status: 'unavailable' };
  const fb = plastic.sentinelLandsat;
  if (fb?.configured) {
    return { status: 'partial', providerNotes: fb.message };
  }
  return { status: 'metadata_only', providerNotes: fb?.message };
}

function copernicusSentinelStatus(cop: CopernicusSetupState | null, error: string | null): {
  status: ProviderSourceLifecycleStatus;
  providerNotes?: string;
} {
  if (error) return { status: 'unavailable', providerNotes: error };
  if (!cop) return { status: 'unavailable' };
  if (cop.configured) {
    return { status: 'live', providerNotes: cop.message };
  }
  if (cop.enabled) {
    return { status: 'partial', providerNotes: cop.message };
  }
  return { status: 'unavailable', providerNotes: cop.message };
}

/** Baseline matrix enriched with live probe results when available. */
export function buildCarbonPuraSourceMatrix(probe: CarbonPuraProbeSnapshot): ProviderSourceStatusEntry[] {
  const { checkedAtIso, apiReachable, apiDetail, plastic, plasticError } = probe;
  const paceSuiteRows = buildPaceProductSuiteRows(plasticError, plastic, checkedAtIso);
  const emitProbe = emitStatusFromProbe(plastic);
  const sentinelPlasticProbe = sentinelPlasticStatusFromProbe(plastic);
  const copProbe = copernicusSentinelStatus(probe.copernicus, probe.copernicusError);

  const sources: ProviderSourceStatusEntry[] = [
    entry({
      id: 'dpal-api',
      sourceName: 'DPAL API (VITE_API_BASE)',
      category: 'Infrastructure',
      status:
        apiReachable === true ? 'live' : apiReachable === false ? 'unavailable' : 'partial',
      reason:
        apiReachable === true
          ? `Health check succeeded against ${getApiBase()}. Module routes and status endpoints depend on this host.`
          : apiReachable === false
            ? `Could not reach the configured DPAL API health endpoint. ${apiDetail}`
            : 'API reachability has not been confirmed yet.',
      currentCapability: 'SPA routing, provider-status polling, water/plastic/carbon API proxies when deployed on host',
      missingForFullLive:
        apiReachable === false
          ? 'Correct VITE_API_BASE, CORS, and deployed routes on Railway (or chosen API host)'
          : 'None when health responds — individual provider lanes may still be partial',
      relatedModule: 'CarbonPura command center (orchestration)',
      route: VIEW_PATHS.carbonPuraWorkspace,
      providerNotes: apiDetail,
      confidenceUse: 'Infrastructure gate — not a scientific signal; confirms where live calls are sent',
      matrixGroup: 'infrastructure',
    }),

    ...paceSuiteRows,

    entry({
      id: 'nasa-emit',
      sourceName: 'NASA EMIT (hyperspectral)',
      category: 'Plastic / PACE intelligence',
      status: plasticError ? 'unavailable' : emitProbe.status,
      reason: plasticError
        ? `Provider status unavailable: ${plasticError}`
        : emitProbe.status === 'partial'
          ? 'EMIT hyperspectral scenes can be discovered via NASA CMR when configured; DPAL exposes screening and metadata-first plastic-risk context, not full EMIT product extraction in-browser.'
          : emitProbe.status === 'metadata_only'
            ? 'EMIT adapter is present but not enabled for live lane reads — readiness/metadata only.'
            : 'EMIT is not configured on the API host for this deployment.',
      currentCapability: 'Scene metadata, hyperspectral lane readiness, plastic-watch scan payload when operator runs scan',
      missingForFullLive:
        'Automated narrow-band extraction, calibrated plastic anomaly scoring, field-validation fusion at hub layer',
      relatedModule: 'Hyperspectral Plastic Watch',
      route: VIEW_PATHS.hyperspectralPlasticWatch,
      providerNotes: emitProbe.providerNotes ?? plastic?.emit?.message,
      confidenceUse: 'Supporting hyperspectral context — combine with PACE OCI suites, Sentinel/Landsat fallback, and field validation',
      matrixGroup: 'other',
    }),

    entry({
      id: 'sentinel-landsat-plastic',
      sourceName: 'Sentinel-2 / Landsat (plastic fallback)',
      category: 'Plastic / PACE intelligence',
      status: plasticError ? 'unavailable' : sentinelPlasticProbe.status,
      reason: plasticError
        ? `Fallback lane status unknown: ${plasticError}`
        : sentinelPlasticProbe.status === 'partial'
          ? 'Sentinel/Landsat fallback supports contextual screening when hyperspectral lanes are limited; outputs are metadata/screening oriented inside Plastic Watch, not full plastic product certification.'
          : 'Fallback adapter not configured — Plastic Watch may rely on PACE/EMIT metadata only.',
      currentCapability: 'Fallback scene context, coarse screening support when primary hyperspectral lanes are limited',
      missingForFullLive:
        'Calibrated plastic-specific indices, automated confidence zones, hub aggregation of fallback scans per CarbonPura project',
      relatedModule: 'Hyperspectral Plastic Watch',
      route: VIEW_PATHS.hyperspectralPlasticWatch,
      providerNotes: sentinelPlasticProbe.providerNotes,
      confidenceUse: 'Secondary context layer — always pair with confounder review and field validation',
    }),

    entry({
      id: 'sentinel-2-copernicus',
      sourceName: 'Sentinel-2 (Copernicus Data Space)',
      category: 'Water / satellite MRV',
      status: probe.copernicusError ? 'unavailable' : copProbe.status,
      reason: probe.copernicusError
        ? `Copernicus proxy status failed: ${probe.copernicusError}`
        : copProbe.status === 'live'
          ? 'Copernicus/Sentinel workflows are connected for water/forest/AOI analysis where provider health is OK.'
          : copProbe.status === 'partial'
            ? 'Copernicus integration is enabled but not fully configured on the API host — AquaScan may show degraded MRV compare.'
            : 'Copernicus proxy is disabled or unreachable; AquaScan NDVI/NDWI/NDMI/NBR compare depends on backend configuration.',
      currentCapability: 'AOI scan, water/vegetation indices, before/after comparison support via AquaScan MRV compare',
      missingForFullLive:
        'Depends on provider health/rate limits, credentials on API host, and operator-initiated compare (not auto-run from CarbonPura hub)',
      relatedModule: 'AquaScan Technical Water Scan',
      route: VIEW_PATHS.aquaScanWater,
      providerNotes: copProbe.providerNotes ?? probe.copernicus?.message,
      confidenceUse: 'Technical water-satellite screening — indicative MRV, not certified credits or legal determination',
    }),

    entry({
      id: 'landsat-pc',
      sourceName: 'Landsat (Planetary Computer / Earth Observation)',
      category: 'Forest / biomass · Earth observation',
      status: plastic?.earthObservationLive ? 'partial' : 'metadata_only',
      reason: plastic?.earthObservationLive
        ? 'Earth Observation and Forest Integrity modules can query Landsat-class scenes via PC/STAC on configured API hosts when operators run scans.'
        : 'Landsat pathways exist in DPAL modules but earth-observation live flag is off on the plastic provider-status host — treat as module-native, not hub-polled.',
      currentCapability: 'NDVI/NBR/NDMI-style screening, scene statistics, forest integrity scan when initiated in-module',
      missingForFullLive:
        'Hub-level unified Landsat status per CarbonPura project, zonal AOI averages, automatic cross-module attachment',
      relatedModule: 'Forest Integrity · Earth Observation',
      route: VIEW_PATHS.forestIntegrity,
      providerNotes: plastic?.notes?.length ? plastic.notes.join(' · ') : undefined,
      confidenceUse: 'Screening-level vegetation/change context — validator and field evidence still required',
    }),

    entry({
      id: 'water-ops-api',
      sourceName: 'Water Operations API',
      category: 'Water intelligence',
      status:
        probe.waterStatsOk === true
          ? 'live'
          : probe.waterStatsOk === false
            ? 'partial'
            : probe.waterStatsError
              ? 'unavailable'
              : 'partial',
      reason:
        probe.waterStatsOk === true
          ? 'Water stats/projects API responded on the configured host — project workflow, snapshots, validator queue, and credits surfaces are available inside Water Operations Engine.'
          : probe.waterStatsError
            ? `${probe.waterStatsError} UI route /water/monitor remains live; API may be on a different host than VITE_API_BASE.`
            : probe.waterStatsOk === false
              ? 'Water API returned a non-OK response — operational UI may still open with local/demo gaps depending on deployment.'
              : 'Water API check pending.',
      currentCapability:
        'Project CRUD, satellite preview hooks, impact reports, validator queue, DPAL Verified Water Impact Credits (module-native)',
      missingForFullLive:
        'CarbonPura projectId handoff, cross-module evidence packet IDs, aggregated hub dashboard counts',
      relatedModule: 'Water Operations Engine',
      route: VIEW_PATHS.waterOperationsEngine,
      providerNotes: probe.waterStatsError ?? undefined,
      confidenceUse: 'Operational water MRV workflow — credits and claims require validator and registry gates',
    }),

    entry({
      id: 'openaq-air',
      sourceName: 'OpenAQ / air-quality adapters',
      category: 'Air / ppm intelligence',
      status: 'partial',
      reason:
        'Air Quality opens the live Carbon MRV dashboard air tab; OpenAQ-style reads and ppm normalization depend on API routes and keys on the filing host — not polled from this hub.',
      currentCapability: 'Live route to air-quality tab, pollutant context, adapter pulls when configured in Carbon MRV',
      missingForFullLive:
        'Hub-level live OpenAQ status row, CarbonPura attachment of air readings to shared project evidence',
      relatedModule: 'Air Quality / ppm Intelligence',
      route: VIEW_PATHS.airQualityMonitor,
      confidenceUse: 'Ambient air context for emissions screening — not facility compliance determination alone',
    }),

    entry({
      id: 'carbon-mrv-adapters',
      sourceName: 'Carbon MRV (OCO-2 / minerals / projects)',
      category: 'Carbon intelligence',
      status: apiReachable === true ? 'partial' : 'unavailable',
      reason:
        apiReachable === true
          ? 'Carbon MRV engine is a live route; gas and mineral adapters return live or explicit unavailable states (no fabricated ppm/mineral charts from this hub).'
          : 'Cannot confirm carbon adapter host until DPAL API health succeeds.',
      currentCapability: 'Project monitoring UI, air-quality tab, mineral/geology metadata lookups when API configured',
      missingForFullLive:
        'Unified CarbonPura carbon analysis record, automatic baseline/additionality packet export at hub layer',
      relatedModule: 'Carbon MRV Engine',
      route: VIEW_PATHS.carbonMRV,
      confidenceUse: 'MRV evidence support — not issuance or registry approval',
    }),

    entry({
      id: 'drone-validation',
      sourceName: 'Drone field validation hook',
      category: 'Field validation',
      status: probe.droneError
        ? 'unavailable'
        : probe.droneConfigured
          ? 'partial'
          : probe.droneEnabled
            ? 'metadata_only'
            : 'planned',
      reason: probe.droneError
        ? `Drone status endpoint failed: ${probe.droneError}`
        : probe.droneConfigured
          ? 'Drone validation prepare/status endpoints exist — manual/upload/API hook modes support field confirmation workflows inside Plastic Watch.'
          : probe.droneEnabled
            ? 'Drone lane enabled but not fully configured — operators see readiness messaging only.'
            : 'Drone validation is documented as a recommended step but not configured on API host.',
      currentCapability: 'Validation request preparation, status messaging, field-validation UX in Plastic Watch',
      missingForFullLive:
        'Automated dispatch, live flight telemetry ingestion, CarbonPura-attached validation certificates',
      relatedModule: 'Hyperspectral Plastic Watch',
      route: VIEW_PATHS.hyperspectralPlasticWatch,
      providerNotes: probe.droneMessage ?? undefined,
      confidenceUse: 'Required confounder/plastic confirmation layer — satellite confidence alone is insufficient',
    }),

    entry({
      id: 'geoledger',
      sourceName: 'GeoLedger boundary anchor',
      category: 'Integrity / traceability',
      status: 'planned',
      reason:
        'GeoLedger boundary fingerprinting and evidence anchoring are part of the DPAL integrity roadmap; no live hub-level anchor API is polled here.',
      currentCapability: 'Integrity Radar panel documents intended checks (connection pending)',
      missingForFullLive:
        'Live boundary hash, coordinate overlap scan, double-counting API, hub display of anchor events',
      relatedModule: 'CarbonPura Integrity Radar',
      route: VIEW_PATHS.carbonPuraWorkspace,
      confidenceUse: 'Future traceability for claims and registry conflict review — not active in this hub yet',
    }),

    entry({
      id: 'registry-article6',
      sourceName: 'Article 6 / registry export',
      category: 'Registry readiness',
      status: 'planned',
      reason:
        'DPAL prepares evidence-shaped records for registry and Article 6 workflows; authorization and corresponding adjustments remain with national authorities and registries.',
      currentCapability: 'Compliance & registry panel lists planned checks without fabricated ITMO/CORSIA status',
      missingForFullLive:
        'CAD Trust-style export, registry API connectors, host-country authorization tracker wired to live backend',
      relatedModule: 'CarbonPura registry readiness',
      route: VIEW_PATHS.carbonPuraWorkspace,
      confidenceUse: 'Governance and export readiness only — not a substitute for registry approval',
    }),
  ];

  return sources.map((s) => ({ ...s, checkedAtIso }));
}

export function sourceLifecycleLabel(status: ProviderSourceLifecycleStatus): string {
  switch (status) {
    case 'live':
      return 'Live';
    case 'partial':
      return 'Partial';
    case 'metadata_only':
      return 'Metadata only';
    case 'planned':
      return 'Planned';
    case 'future':
      return 'Future';
    case 'unavailable':
      return 'Unavailable';
    default:
      return status;
  }
}

export function sourceLifecycleClasses(status: ProviderSourceLifecycleStatus): string {
  switch (status) {
    case 'live':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'partial':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'metadata_only':
      return 'bg-sky-50 text-sky-900 border-sky-200';
    case 'planned':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'future':
      return 'bg-violet-50 text-violet-900 border-violet-200';
    case 'unavailable':
      return 'bg-rose-50 text-rose-900 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
