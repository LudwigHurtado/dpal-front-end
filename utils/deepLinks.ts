/**
 * Canonical URLs for sharing — same query shape as certificate / PDF QRs.
 * Situation room chat uses report id as the API room id (`/api/situation/:reportId/...`).
 */
import { getDpalApiConfig } from '../src/config/api';

/** Same URL encoded in the “Ledger verification” QR on the printable certificate / PDF. */
export function buildReportVerifyUrl(reportId: string): string {
  const base = getDpalApiConfig().publicFrontendBaseUrl;
  try {
    const u = new URL('/transparency-db', base);
    u.searchParams.set('reportId', reportId);
    return u.toString();
  } catch {
    return `${base}/transparency-db?reportId=${encodeURIComponent(reportId)}`;
  }
}

export function buildSituationRoomUrl(reportId: string): string {
  const base = getDpalApiConfig().publicFrontendBaseUrl;
  try {
    const u = new URL('/incident', base);
    u.searchParams.set('reportId', reportId);
    u.searchParams.set('situationRoom', '1');
    return u.toString();
  } catch {
    return `${base}/incident?reportId=${encodeURIComponent(reportId)}&situationRoom=1`;
  }
}

/** Remove report/situation query params when leaving the situation room (avoid “stuck” on homepage with no context). */
export function clearReportDeepLinkQuery(): void {
  if (typeof window === 'undefined') return;
  try {
    const u = new URL(window.location.href);
    const hadReport = u.searchParams.has('reportId') || u.searchParams.has('roomId');
    if (!hadReport) return;
    u.searchParams.delete('reportId');
    u.searchParams.delete('roomId');
    u.searchParams.delete('situationRoom');
    const search = u.searchParams.toString();
    u.search = search ? `?${search}` : '';
    window.history.replaceState({}, '', `${u.pathname}${u.search}${u.hash}`);
  } catch {
    /* ignore */
  }
}
