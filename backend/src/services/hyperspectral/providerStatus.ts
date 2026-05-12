import { computeDroneReadiness } from './droneValidationProvider';

export type ReadinessStatus =
  | 'not_enabled'
  | 'needs_credentials'
  | 'ready'
  | 'error'
  | 'available'
  | 'partial'
  | 'unavailable'
  | 'ready_to_connect'
  | 'provider_api_missing'
  | 'provider_api_ready';

export type ProviderReadinessCard = {
  enabled: boolean;
  configured: boolean;
  status: ReadinessStatus;
  label: string;
  message: string;
};

function paceEnabled(): boolean {
  return process.env.DPAL_PACE_SPECTRAL_ENABLED === 'true';
}

function emitEnabled(): boolean {
  return process.env.DPAL_EMIT_L2A_ENABLED === 'true';
}

function earthdataTokenPresent(): boolean {
  return Boolean(process.env.NASA_EARTHDATA_TOKEN?.trim());
}

function eoLive(): boolean {
  return process.env.EARTH_OBSERVATION_LIVE_ENABLED === 'true';
}

export function buildPaceReadinessCard(): ProviderReadinessCard {
  const label = 'NASA PACE';
  if (!paceEnabled()) {
    return {
      enabled: false,
      configured: false,
      status: 'not_enabled',
      label,
      message:
        'PACE spectral pulls are disabled. Set DPAL_PACE_SPECTRAL_ENABLED=true and NASA_EARTHDATA_TOKEN to query NASA CMR for PACE granules near your AOI.',
    };
  }
  if (!earthdataTokenPresent()) {
    return {
      enabled: true,
      configured: false,
      status: 'needs_credentials',
      label,
      message: 'PACE is enabled but NASA_EARTHDATA_TOKEN is missing. Add a server-side Earthdata token for authenticated CMR/catalog use.',
    };
  }
  return {
    enabled: true,
    configured: true,
    status: 'ready',
    label,
    message:
      'PACE CMR lane is ready. Run a Plastic Watch scan to list PACE_OCI_L2_BGC granules (or override via DPAL_PACE_CMR_SHORT_NAME) for the AOI and date window — metadata only until spectral indices are extracted.',
  };
}

export function buildEmitReadinessCard(): ProviderReadinessCard {
  const label = 'NASA EMIT';
  if (!emitEnabled()) {
    return {
      enabled: false,
      configured: false,
      status: 'not_enabled',
      label,
      message:
        'EMIT L2A pulls are disabled. Set DPAL_EMIT_L2A_ENABLED=true and NASA_EARTHDATA_TOKEN to query NASA CMR for EMIT L2A granules near your AOI.',
    };
  }
  if (!earthdataTokenPresent()) {
    return {
      enabled: true,
      configured: false,
      status: 'needs_credentials',
      label,
      message: 'EMIT is enabled but NASA_EARTHDATA_TOKEN is missing. Add a server-side Earthdata token for authenticated CMR/catalog use.',
    };
  }
  return {
    enabled: true,
    configured: true,
    status: 'ready',
    label,
    message:
      'EMIT CMR lane is ready. Run a Plastic Watch scan to list EMIT L2A granules (default short name EMITL2ARFL; override via DPAL_EMIT_CMR_SHORT_NAME) — metadata only until narrow-band indices are extracted.',
  };
}

export function buildSentinelLandsatReadinessCard(): ProviderReadinessCard {
  const label = 'Sentinel / Landsat fallback';
  if (!eoLive()) {
    return {
      enabled: true,
      configured: false,
      status: 'unavailable',
      label,
      message:
        'Earth Observation live adapter is disabled (EARTH_OBSERVATION_LIVE_ENABLED). Enable it on the API host for Landsat C2 L2 broadband context used as a non-plastic-specific fallback.',
    };
  }
  return {
    enabled: true,
    configured: true,
    status: 'available',
    label,
    message: 'Broadband fallback available for scene-level multispectral context (not plastic-specific proof).',
  };
}

export function buildDroneReadinessCard(): ProviderReadinessCard {
  const d = computeDroneReadiness();
  const status: ReadinessStatus =
    d.status === 'provider_api_missing'
      ? 'provider_api_missing'
      : d.status === 'provider_api_ready'
        ? 'provider_api_ready'
        : d.status === 'not_enabled'
          ? 'not_enabled'
          : 'ready_to_connect';

  return {
    enabled: d.enabled,
    configured: d.configured,
    status,
    label: d.label,
    message: d.message,
  };
}

export type PlasticWatchProviderReadinessPayload = {
  ok: true;
  generatedAt: string;
  pace: ProviderReadinessCard;
  emit: ProviderReadinessCard;
  sentinelLandsat: ProviderReadinessCard;
  drone: ProviderReadinessCard;
  /** Legacy flat flags for older clients */
  paceConfigured: boolean;
  emitConfigured: boolean;
  earthObservationLive: boolean;
  notes: string[];
};

export function buildPlasticWatchProviderReadinessPayload(): PlasticWatchProviderReadinessPayload {
  const pace = buildPaceReadinessCard();
  const emit = buildEmitReadinessCard();
  const sentinelLandsat = buildSentinelLandsatReadinessCard();
  const drone = buildDroneReadinessCard();

  const notes: string[] = [
    'PACE/EMIT are connection-ready when enabled with NASA_EARTHDATA_TOKEN; scans return NASA CMR metadata only — no fabricated spectral indices or plastic detections.',
    'Drone validation is connector-first: configure DPAL_DRONE_VALIDATION_ENABLED and DPAL_DRONE_PROVIDER_MODE; live dispatch requires your own provider worker.',
    'Plastic-risk scoring stays unavailable until narrow-band index extraction and validation logic are implemented against real products.',
  ];

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    pace,
    emit,
    sentinelLandsat,
    drone,
    paceConfigured: pace.configured,
    emitConfigured: emit.configured,
    earthObservationLive: eoLive(),
    notes,
  };
}
