export type DroneProviderMode = 'manual' | 'upload' | 'api' | 'flight_plan_hook';

function parseMode(raw: string | undefined): DroneProviderMode {
  const v = (raw ?? 'manual').trim().toLowerCase();
  if (v === 'upload') return 'upload';
  if (v === 'api') return 'api';
  if (v === 'flight_plan_hook' || v === 'flight-plan-hook' || v === 'hook') return 'flight_plan_hook';
  return 'manual';
}

export function isDroneValidationEnabled(): boolean {
  return process.env.DPAL_DRONE_VALIDATION_ENABLED === 'true';
}

export function getDroneProviderMode(): DroneProviderMode {
  return parseMode(process.env.DPAL_DRONE_PROVIDER_MODE);
}

export function hasDroneProviderApiConfigured(): boolean {
  const url = process.env.DPAL_DRONE_PROVIDER_API_URL?.trim();
  const key = process.env.DPAL_DRONE_PROVIDER_API_KEY?.trim();
  return Boolean(url && key);
}

export type DroneReadinessStatus =
  | 'not_enabled'
  | 'ready_to_connect'
  | 'provider_api_missing'
  | 'provider_api_ready'
  | 'error';

export function computeDroneReadiness(): {
  enabled: boolean;
  configured: boolean;
  status: DroneReadinessStatus;
  label: string;
  message: string;
  mode: DroneProviderMode;
} {
  const label = 'Drone Validation';
  const mode = getDroneProviderMode();

  if (!isDroneValidationEnabled()) {
    return {
      enabled: false,
      configured: false,
      status: 'not_enabled',
      label,
      mode,
      message:
        'Drone validation connector is disabled. Set DPAL_DRONE_VALIDATION_ENABLED=true, then choose DPAL_DRONE_PROVIDER_MODE (manual, upload, api, or flight_plan_hook).',
    };
  }

  if (mode === 'api') {
    if (!hasDroneProviderApiConfigured()) {
      return {
        enabled: true,
        configured: false,
        status: 'provider_api_missing',
        label,
        mode,
        message:
          'API mode selected but DPAL_DRONE_PROVIDER_API_URL or DPAL_DRONE_PROVIDER_API_KEY is missing. Switch to manual/upload mode or add provider credentials server-side.',
      };
    }
    return {
      enabled: true,
      configured: true,
      status: 'provider_api_ready',
      label,
      mode,
      message:
        'Drone provider API URL and key are present server-side. Live dispatch must still be confirmed by your provider; DPAL does not mark a flight as dispatched without a successful provider response.',
    };
  }

  if (mode === 'flight_plan_hook') {
    return {
      enabled: true,
      configured: true,
      status: 'ready_to_connect',
      label,
      mode,
      message:
        'Flight-plan hook mode is selected. Wire your mission/flight-plan system to accept validation requests from this connector when your provider integration is ready.',
    };
  }

  const uploadNote =
    mode === 'upload'
      ? 'Upload mode: attach orthophotos / flight logs through your operator workflow when the upload bridge is connected.'
      : 'Manual mode: operators can prepare validation checklists and evidence attachments without an external drone API.';

  return {
    enabled: true,
    configured: true,
    status: 'ready_to_connect',
    label,
    mode,
    message: `Drone validation connector is available. ${uploadNote}`,
  };
}

export type DroneValidationRequestInput = {
  lat: number;
  lng: number;
  radiusKm: number;
  siteLabel?: string;
  reason?: string;
  requestedValidationTypes?: string[];
};

export function validateDroneRequestBody(body: unknown): { ok: true; value: DroneValidationRequestInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object.' };
  const o = body as Record<string, unknown>;
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  const radiusKm = Number(o.radiusKm ?? 10);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false, error: 'lat and lng are required numbers.' };
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { ok: false, error: 'lat/lng out of range.' };
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 250) return { ok: false, error: 'radiusKm must be between 0 and 250.' };
  const siteLabel = typeof o.siteLabel === 'string' ? o.siteLabel.slice(0, 200) : undefined;
  const reason = typeof o.reason === 'string' ? o.reason.slice(0, 500) : undefined;
  const requestedValidationTypes = Array.isArray(o.requestedValidationTypes)
    ? o.requestedValidationTypes.map((x) => String(x).slice(0, 80)).slice(0, 12)
    : undefined;
  return {
    ok: true,
    value: { lat, lng, radiusKm, siteLabel, reason, requestedValidationTypes },
  };
}

/**
 * Prepare-only: does not call external drone APIs (no accidental dispatch).
 * Returns an acknowledgment the front-end can show in a panel.
 */
export function buildDroneValidationAcknowledgment(input: DroneValidationRequestInput): {
  status: 'ready_to_connect' | 'provider_api_ready' | 'provider_api_missing' | 'not_enabled';
  mode: DroneProviderMode;
  message: string;
  requestId: string;
  dispatched: false;
  payloadEcho: DroneValidationRequestInput;
} {
  const r = computeDroneReadiness();
  const requestId = `dvr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  if (!isDroneValidationEnabled()) {
    return {
      status: 'not_enabled',
      mode: r.mode,
      message: 'Drone validation is not enabled on this host (DPAL_DRONE_VALIDATION_ENABLED).',
      requestId,
      dispatched: false,
      payloadEcho: input,
    };
  }

  if (r.mode === 'api' && !hasDroneProviderApiConfigured()) {
    return {
      status: 'provider_api_missing',
      mode: 'api',
      message:
        'Validation request can be prepared, but API mode needs DPAL_DRONE_PROVIDER_API_URL and DPAL_DRONE_PROVIDER_API_KEY before live dispatch.',
      requestId,
      dispatched: false,
      payloadEcho: input,
    };
  }

  if (r.mode === 'api' && hasDroneProviderApiConfigured()) {
    return {
      status: 'provider_api_ready',
      mode: 'api',
      message:
        'Validation request recorded for operator review. Live dispatch to the provider API is not executed from this endpoint; integrate your dispatch worker separately.',
      requestId,
      dispatched: false,
      payloadEcho: input,
    };
  }

  return {
    status: 'ready_to_connect',
    mode: r.mode,
    message:
      'Drone validation request can be prepared for manual / upload / flight-plan workflows. No external dispatch was performed.',
    requestId,
    dispatched: false,
    payloadEcho: input,
  };
}
