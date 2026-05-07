/**
 * DPAL FloodGuard — frontend API client.
 *
 * Wraps the backend endpoints listed in the FloodGuard architecture spec:
 *   GET  /api/floodguard/cities
 *   GET  /api/floodguard/cities/:cityId/zones
 *   GET  /api/floodguard/zones/:zoneId/status
 *   POST /api/floodguard/camera-alert
 *   POST /api/floodguard/citizen-report
 *   POST /api/floodguard/generate-evidence-packet
 *   POST /api/floodguard/anchor-alert
 *   GET  /api/floodguard/alerts/live
 *   GET  /api/floodguard/alerts/:alertId
 *   GET  /api/floodguard/situation/:alertId
 *   GET  /api/floodguard/agents/monitor
 *   POST /api/floodguard/agents/dispatch-mission
 *
 * Until the backend ships, callers receive a typed `unavailable` result so the
 * UI can fall back to the Santa Cruz mock data without throwing.
 */

import { apiUrl } from '../../../../constants';
import type {
  FloodAgentMonitorResponse,
  FloodAlert,
  FloodCameraDetection,
  FloodCity,
  FloodCitizenReport,
  FloodDispatchedMissionRecord,
  FloodEvidencePacket,
  FloodMissionSafetyClassification,
  FloodSituationRoom,
  FloodZone,
} from '../floodGuardTypes';

export const FLOODGUARD_ROUTES = {
  CITIES: '/api/floodguard/cities',
  CITY_ZONES: (cityId: string) => `/api/floodguard/cities/${encodeURIComponent(cityId)}/zones`,
  ZONE_STATUS: (zoneId: string) => `/api/floodguard/zones/${encodeURIComponent(zoneId)}/status`,
  CAMERA_ALERT: '/api/floodguard/camera-alert',
  CITIZEN_REPORT: '/api/floodguard/citizen-report',
  GENERATE_EVIDENCE_PACKET: '/api/floodguard/generate-evidence-packet',
  ANCHOR_ALERT: '/api/floodguard/anchor-alert',
  ALERTS_LIVE: '/api/floodguard/alerts/live',
  ALERT_DETAIL: (alertId: string) => `/api/floodguard/alerts/${encodeURIComponent(alertId)}`,
  SITUATION: (alertId: string) => `/api/floodguard/situation/${encodeURIComponent(alertId)}`,
  AGENTS_MONITOR: '/api/floodguard/agents/monitor',
  AGENTS_DISPATCH_MISSION: '/api/floodguard/agents/dispatch-mission',
} as const;

export type FloodGuardApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 'unavailable' | 'http_error' | 'network_error'; message: string; code?: string };

async function safeFetch<T>(input: string, init?: RequestInit): Promise<FloodGuardApiResult<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      let message = `Request failed (${res.status}). FloodGuard backend may not be deployed yet.`;
      let code: string | undefined;
      try {
        const errBody = (await res.json()) as { error?: string; code?: string };
        if (typeof errBody?.error === 'string' && errBody.error.trim()) message = errBody.error;
        if (typeof errBody?.code === 'string') code = errBody.code;
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        status: res.status === 404 ? 'unavailable' : 'http_error',
        message,
        code,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      status: 'network_error',
      message: err instanceof Error ? err.message : 'Unknown network error.',
    };
  }
}

export const floodGuardApi = {
  listCities: () => safeFetch<{ cities: FloodCity[] }>(apiUrl(FLOODGUARD_ROUTES.CITIES)),
  listZones: (cityId: string) =>
    safeFetch<{ zones: FloodZone[] }>(apiUrl(FLOODGUARD_ROUTES.CITY_ZONES(cityId))),
  getZoneStatus: (zoneId: string) =>
    safeFetch<{ status: FloodAlert | null }>(apiUrl(FLOODGUARD_ROUTES.ZONE_STATUS(zoneId))),
  liveAlerts: () => safeFetch<{ alerts: FloodAlert[] }>(apiUrl(FLOODGUARD_ROUTES.ALERTS_LIVE)),
  getAlert: (alertId: string) =>
    safeFetch<{ alert: FloodAlert }>(apiUrl(FLOODGUARD_ROUTES.ALERT_DETAIL(alertId))),
  getSituation: (alertId: string) =>
    safeFetch<{ room: FloodSituationRoom }>(apiUrl(FLOODGUARD_ROUTES.SITUATION(alertId))),
  postCameraAlert: (detection: FloodCameraDetection) =>
    safeFetch<{ alert?: FloodAlert; accepted: true }>(apiUrl(FLOODGUARD_ROUTES.CAMERA_ALERT), {
      method: 'POST',
      body: JSON.stringify(detection),
    }),
  postCitizenReport: (report: FloodCitizenReport) =>
    safeFetch<{ alert?: FloodAlert; accepted: true }>(apiUrl(FLOODGUARD_ROUTES.CITIZEN_REPORT), {
      method: 'POST',
      body: JSON.stringify(report),
    }),
  generateEvidencePacket: (alertId: string, generatedBy?: string) =>
    safeFetch<{ packet: FloodEvidencePacket }>(apiUrl(FLOODGUARD_ROUTES.GENERATE_EVIDENCE_PACKET), {
      method: 'POST',
      body: JSON.stringify({ alertId, generatedBy: generatedBy ?? 'DPAL Web' }),
    }),
  anchorAlert: (alertId: string) =>
    safeFetch<{ alertId: string; ledgerRecordId: string; contentHash: string }>(
      apiUrl(FLOODGUARD_ROUTES.ANCHOR_ALERT),
      {
        method: 'POST',
        body: JSON.stringify({ alertId }),
      },
    ),

  /** Stage 12C — agentic evaluation for all Geo-IDs. */
  getAgentMonitor: () =>
    safeFetch<FloodAgentMonitorResponse>(apiUrl(FLOODGUARD_ROUTES.AGENTS_MONITOR)),

  /** Stage 12C — dispatch only when mission type and safety gate allow. */
  dispatchMission: (payload: {
    zoneId: string;
    missionType: string;
    requestedBy: string;
    safetyClassification: FloodMissionSafetyClassification;
  }) =>
    safeFetch<{ mission: FloodDispatchedMissionRecord }>(
      apiUrl(FLOODGUARD_ROUTES.AGENTS_DISPATCH_MISSION),
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
};
