import { apiUrl, API_ROUTES } from '../../constants';
import type {
  AquaScanOverlayRequest,
  AquaScanOverlayResponse,
  AquaScanOverlayState,
  AquaScanOverlayType,
} from './overlayTypes';

function defaultUnavailable(
  overlayType: AquaScanOverlayType,
  reason = 'No live-derived overlay returned for this AOI/date.',
): AquaScanOverlayResponse {
  return {
    ok: false,
    overlayType,
    source: 'unavailable',
    sourceName: 'Unavailable',
    status: 'unavailable',
    geometry: null,
    rasterTileUrl: null,
    statistics: null,
    confidence: null,
    warnings: [],
    reason,
  };
}

export function isOverlayLiveDerived(overlay: AquaScanOverlayResponse | AquaScanOverlayState | null | undefined): boolean {
  return Boolean(
    overlay
    && overlay.ok
    && overlay.status === 'available'
    && (overlay.source === 'copernicus_derived' || overlay.source === 'backend_derived')
    && (overlay.geometry || overlay.rasterTileUrl),
  );
}

export function normalizeOverlayResponse(
  overlayType: AquaScanOverlayType,
  payload: unknown,
): AquaScanOverlayResponse {
  const raw = (payload ?? {}) as Partial<AquaScanOverlayResponse>;
  if (!raw || raw.ok !== true || raw.status !== 'available') {
    return {
      ...defaultUnavailable(overlayType, raw.reason || 'No live-derived overlay returned for this AOI/date.'),
      warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    };
  }

  return {
    ok: true,
    overlayType: raw.overlayType ?? overlayType,
    source: raw.source ?? 'backend_derived',
    sourceName: raw.sourceName ?? 'Backend-derived',
    status: 'available',
    dateRange: raw.dateRange,
    collection: raw.collection,
    indexType: raw.indexType,
    threshold: raw.threshold,
    geometry: raw.geometry ?? null,
    rasterTileUrl: raw.rasterTileUrl ?? null,
    statistics: raw.statistics ?? null,
    confidence: raw.confidence ?? raw.statistics?.confidence ?? null,
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    reason: raw.reason,
    generatedAt: raw.generatedAt,
  };
}

async function postOverlay(
  route: string,
  overlayType: AquaScanOverlayType,
  request: AquaScanOverlayRequest,
  signal?: AbortSignal,
): Promise<AquaScanOverlayResponse> {
  try {
    const response = await fetch(apiUrl(route), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return defaultUnavailable(overlayType, payload?.reason || payload?.error || 'Live-derived overlay unavailable.');
    }
    return normalizeOverlayResponse(overlayType, payload);
  } catch (error) {
    return defaultUnavailable(
      overlayType,
      error instanceof Error ? error.message : 'Live-derived overlay unavailable.',
    );
  }
}

export function fetchNdwiOverlay(request: AquaScanOverlayRequest, signal?: AbortSignal): Promise<AquaScanOverlayResponse> {
  return postOverlay(API_ROUTES.AQUASCAN_OVERLAY_NDWI, 'ndwi_water_presence', request, signal);
}

export function fetchWaterExtentOverlay(request: AquaScanOverlayRequest, signal?: AbortSignal): Promise<AquaScanOverlayResponse> {
  return postOverlay(API_ROUTES.AQUASCAN_OVERLAY_WATER_EXTENT, 'water_extent', request, signal);
}

export function fetchFloodWetOverlay(request: AquaScanOverlayRequest, signal?: AbortSignal): Promise<AquaScanOverlayResponse> {
  return postOverlay(API_ROUTES.AQUASCAN_OVERLAY_FLOOD_WET, 'flood_wet', request, signal);
}

export function fetchRiskZones(request: AquaScanOverlayRequest, signal?: AbortSignal): Promise<AquaScanOverlayResponse> {
  return postOverlay(API_ROUTES.AQUASCAN_OVERLAY_RISK_ZONES, 'risk_zones', request, signal);
}

export function fetchFlowDirection(request: AquaScanOverlayRequest, signal?: AbortSignal): Promise<AquaScanOverlayResponse> {
  return postOverlay(API_ROUTES.AQUASCAN_OVERLAY_FLOW_DIRECTION, 'flow_direction', request, signal);
}
