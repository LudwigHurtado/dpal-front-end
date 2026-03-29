/**
 * Canonical URLs for sharing — same query shape as certificate / PDF QRs.
 * Situation room chat uses report id as the API room id (`/api/situation/:reportId/...`).
 */

/** Same URL encoded in the “Ledger verification” QR on the printable certificate / PDF. */
export function buildReportVerifyUrl(reportId: string): string {
  if (typeof window === 'undefined') return '';
  try {
    const u = new URL(window.location.href);
    u.hash = '';
    const q = new URLSearchParams();
    q.set('reportId', reportId);
    u.search = q.toString();
    return u.toString();
  } catch {
    const origin = window.location.origin;
    return `${origin}/?reportId=${encodeURIComponent(reportId)}`;
  }
}

export function buildSituationRoomUrl(reportId: string): string {
  if (typeof window === 'undefined') return '';
  try {
    const u = new URL(window.location.href);
    u.hash = '';
    const q = new URLSearchParams();
    q.set('reportId', reportId);
    q.set('situationRoom', '1');
    u.search = q.toString();
    return u.toString();
  } catch {
    const origin = window.location.origin;
    return `${origin}/?reportId=${encodeURIComponent(reportId)}&situationRoom=1`;
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
