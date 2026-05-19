/**
 * Canonical Situation Room URLs — every QR must resolve to /situation-room/:roomId
 */
import { getDpalApiConfig } from '../src/config/api';

export const SITUATION_ROOM_PREFIX = '/situation-room';

export type SituationRoomViewMode = 'default' | 'public' | 'validator' | 'sealed';

type EnvBag = Record<string, unknown>;

function env(): EnvBag {
  return ((import.meta as unknown as { env?: EnvBag }).env ?? {}) as EnvBag;
}

/** Public SPA origin for share/QR links (production: https://dpal.info). */
export function getPublicAppBaseUrl(): string {
  const e = env();
  const fromPublic =
    (typeof e.VITE_PUBLIC_APP_URL === 'string' && e.VITE_PUBLIC_APP_URL.trim()) ||
    (typeof e.VITE_DPAL_PUBLIC_FRONTEND_URL === 'string' && e.VITE_DPAL_PUBLIC_FRONTEND_URL.trim()) ||
    '';
  if (fromPublic) return fromPublic.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return getDpalApiConfig().publicFrontendBaseUrl.replace(/\/+$/, '');
}

export function situationRoomPath(roomId: string, mode?: SituationRoomViewMode): string {
  const base = `${SITUATION_ROOM_PREFIX}/${encodeURIComponent(roomId)}`;
  if (!mode || mode === 'default') return base;
  return `${base}?mode=${mode}`;
}

/** Full permanent URL encoded in Situation Room QR codes. */
export function getSituationRoomUrl(roomId: string, mode?: SituationRoomViewMode): string {
  const id = roomId?.trim();
  if (!id) return getPublicAppBaseUrl();
  return `${getPublicAppBaseUrl()}${situationRoomPath(id, mode)}`;
}

export function buildCanonicalSituationRoomUrl(roomId: string, mode?: SituationRoomViewMode): string {
  return getSituationRoomUrl(roomId, mode);
}

export function logSituationRoomQrDiagnostics(roomId: string, canonicalRoomUrl: string): void {
  if (import.meta.env.DEV) {
    console.info('[SituationRoomQR] roomId:', roomId);
    console.info('[SituationRoomQR] canonicalRoomUrl:', canonicalRoomUrl);
  }
}

export function parseSituationRoomIdFromPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const aliasMatch =
    normalized.match(/^\/situation-room\/room\/([^/]+)$/) ??
    normalized.match(/^\/qr\/room\/([^/]+)$/);
  if (aliasMatch) return decodeURIComponent(aliasMatch[1]);
  const direct = normalized.match(/^\/situation-room\/([^/]+)$/);
  if (!direct) return null;
  const segment = decodeURIComponent(direct[1]);
  if (segment === 'room') return null;
  return segment;
}

export function isSituationRoomPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return (
    normalized === SITUATION_ROOM_PREFIX ||
    normalized.startsWith(`${SITUATION_ROOM_PREFIX}/`) ||
    normalized.startsWith('/qr/room/')
  );
}

export function parseSituationRoomModeFromSearch(search: string): SituationRoomViewMode {
  const mode = new URLSearchParams(search).get('mode');
  if (mode === 'public' || mode === 'validator' || mode === 'sealed') return mode;
  return 'default';
}

/** Legacy /incident deep link — redirect target for report-bound rooms. */
export function legacyIncidentSituationUrl(reportId: string): string {
  return buildCanonicalSituationRoomUrl(reportId);
}
