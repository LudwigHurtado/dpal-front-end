/**
 * Citizen flood report intake.
 */

import type { FloodCitizenReport, FloodZone } from './floodGuardTypes';
import { findZoneForPoint, getZoneById } from './floodCityZoneService';

export interface CitizenReportBody {
  description: string;
  zoneId?: string;
  lat?: number;
  lng?: number;
  reporterHandle?: string;
  reporterName?: string;
  hasPhoto?: boolean;
  observedDepthCm?: number;
  timestamp?: string;
  reportId?: string;
}

export function resolveZoneForCitizen(body: CitizenReportBody): { ok: true; zone: FloodZone } | { ok: false; error: string } {
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
  return { ok: false, error: 'Provide zoneId or both lat and lng.' };
}

export function buildCitizenReport(body: CitizenReportBody, zone: FloodZone): FloodCitizenReport {
  const ts = body.timestamp ?? new Date().toISOString();
  const id = body.reportId ?? `CIT-REP-${zone.zoneId.slice(-6)}-${Date.now()}`;
  const lat = body.lat ?? zone.center.lat;
  const lng = body.lng ?? zone.center.lng;
  return {
    reportId: id,
    zoneId: zone.zoneId,
    reporterHandle: body.reporterHandle,
    reporterName: body.reporterName,
    description: body.description,
    observedDepthCm: body.observedDepthCm,
    hasPhoto: Boolean(body.hasPhoto),
    timestamp: ts,
    location: { lat, lng },
  };
}
