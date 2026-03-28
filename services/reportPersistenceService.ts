import { getApiBase } from '../constants';
import type { Report } from '../types';

/**
 * JSON body for POST so the ledger server can store the same shape returned by GET /api/reports/:id.
 * Omits browser-only fields (File attachments, transient flags).
 */
export function serializeReportForApi(report: Report): Record<string, unknown> {
  const { attachments: _a, isGeneratingNft: _g, ...rest } = report;

  return {
    ...rest,
    timestamp: report.timestamp instanceof Date ? report.timestamp.toISOString() : report.timestamp,
    anchoredAt: report.anchoredAt instanceof Date ? report.anchoredAt.toISOString() : report.anchoredAt,
  };
}

/**
 * Persist the certified report to the backend so GET /api/reports/:id works on any browser.
 * 1) POST /api/reports — preferred document upsert for Mongo/public lookup.
 * 2) POST /api/reports/anchor — fallback when the dedicated route is absent or server errors.
 */
export async function persistReportForPublicLookup(report: Report): Promise<{ ok: boolean; status?: number }> {
  const apiBase = getApiBase().replace(/\/$/, '');
  const body = JSON.stringify(serializeReportForApi(report));

  async function post(path: string): Promise<Response | null> {
    try {
      return await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch {
      return null;
    }
  }

  const primary = await post('/api/reports');
  if (primary?.ok) return { ok: true, status: primary.status };

  const useAnchorFallback =
    primary == null ||
    primary.status === 404 ||
    primary.status === 405 ||
    primary.status >= 500;

  if (useAnchorFallback) {
    const anchor = await post('/api/reports/anchor');
    if (anchor?.ok) return { ok: true, status: anchor.status };
    return { ok: false, status: anchor?.status ?? primary?.status };
  }

  return { ok: false, status: primary.status };
}
