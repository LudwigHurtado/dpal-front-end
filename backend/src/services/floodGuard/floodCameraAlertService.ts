/**
 * Camera AI detection intake — resolves zone from lat/lng or explicit zoneId.
 */

import type { FloodCameraDetection, FloodZone } from './floodGuardTypes';
import { findZoneForPoint, getZoneById } from './floodCityZoneService';

export interface CameraAlertBody {
  cameraId: string;
  label: string;
  confidence: number;
  timestamp?: string;
  lat?: number;
  lng?: number;
  zoneId?: string;
  streamUrl?: string;
  cameraLabel?: string;
  notes?: string;
  detectionId?: string;
}

export function resolveZoneForCamera(body: CameraAlertBody): { ok: true; zone: FloodZone } | { ok: false; error: string } {
  if (body.zoneId) {
    const zone = getZoneById(body.zoneId);
    if (!zone) return { ok: false, error: `Unknown zoneId: ${body.zoneId}` };
    return { ok: true, zone };
  }
  if (typeof body.lat === 'number' && typeof body.lng === 'number') {
    const zone = findZoneForPoint(body.lat, body.lng);
    if (!zone) return { ok: false, error: 'No flood zone contains the supplied coordinates.' };
    return { ok: true, zone };
  }
  return { ok: false, error: 'Provide zoneId or both lat and lng to match a Geo-ID zone.' };
}

export function buildCameraDetection(body: CameraAlertBody, zone: FloodZone): FloodCameraDetection {
  const ts = body.timestamp ?? new Date().toISOString();
  const id =
    body.detectionId ??
    `CAM-DET-${body.cameraId}-${ts.replace(/[:.]/g, '-').slice(11, 23)}`;
  return {
    detectionId: id,
    cameraId: body.cameraId,
    cameraLabel: body.cameraLabel ?? `${body.cameraId} (ingested)`,
    zoneId: zone.zoneId,
    label: body.label,
    confidence: Math.max(0, Math.min(1, body.confidence)),
    timestamp: ts,
    streamUrl: body.streamUrl,
    notes: body.notes,
  };
}
