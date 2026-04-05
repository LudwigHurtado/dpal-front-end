import { getApiBase } from '../constants';
import { findReportByBlockNumber } from '../utils/blockchainLookup';
import { Category, type Report } from '../types';

/**
 * Ask the API which report was anchored at this block (when the ledger index is indexed server-side).
 * Backend can implement: GET /api/reports/lookup?blockNumber=12345 → { reportId: "rep-..." }
 */
export async function fetchReportIdByBlockNumber(blockNumber: number): Promise<string | null> {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/api/reports/lookup?blockNumber=${encodeURIComponent(String(blockNumber))}`);
    if (!res.ok) return null;
    const data = await res.json();
    const id = data?.reportId ?? data?.id;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/**
 * Full report for a filing when this device does not have it in localStorage yet.
 * Used for public ?reportId= deep links (QR / PDF) — not gated by blockchainAnchorEnabled
 * so shared links work whenever the backend exposes GET /api/reports/:id.
 */
export async function fetchReportFromApiById(reportId: string): Promise<Report | null> {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/api/reports/${encodeURIComponent(reportId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return mapApiReportToReport(data, reportId);
  } catch {
    return null;
  }
}

/**
 * Fetch a feed list of reports for community viewing.
 * Backend may implement either:
 * - GET /api/reports
 * - GET /api/reports?limit=50
 * This client treats it as best-effort and falls back to empty list on any error.
 */
export async function fetchReportsFeedFromApi(limit = 60): Promise<Report[]> {
  try {
    const apiBase = getApiBase().replace(/\/$/, "");
    /** dpal-ai-server exposes `GET /api/reports/feed` (not `GET /api/reports`). */
    const urls = [
      `${apiBase}/api/reports/feed?limit=${encodeURIComponent(String(limit))}`,
      `${apiBase}/api/reports?limit=${encodeURIComponent(String(limit))}`,
      `${apiBase}/api/reports`,
    ];
    for (const url of urls) {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const raw = (data as any)?.items ?? (data as any)?.reports ?? data;
      const list = Array.isArray(raw) ? raw : [];
      if (!Array.isArray(list) || list.length === 0) continue;
      return list
        .map((item: any, idx: number) =>
          mapApiReportToReport(item, item?.id ?? item?.reportId ?? item?._id ?? `api-${idx}`)
        )
        .filter((r: Report | null): r is Report => Boolean(r));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Resolve a ledger block height to a report: local index first, then API lookup + optional full report fetch.
 */
export async function resolveReportByBlockNumber(blockNumber: number, reports: Report[]): Promise<Report | null> {
  const local = findReportByBlockNumber(reports, blockNumber);
  if (local) return local;
  const id = await fetchReportIdByBlockNumber(blockNumber);
  if (!id) return null;
  const byId = reports.find((r) => r.id === id);
  if (byId) return byId;
  return fetchReportFromApiById(id);
}

function mapApiReportToReport(data: Record<string, unknown>, fallbackId: string): Report | null {
  const id =
    typeof data.id === 'string'
      ? data.id
      : typeof data.reportId === 'string'
        ? data.reportId
        : fallbackId;
  const ts = data.timestamp ? new Date(String(data.timestamp)) : new Date();
  const safeTs = Number.isNaN(ts.getTime()) ? new Date() : ts;

  const isAuthor =
    typeof data.isAuthor === 'boolean'
      ? data.isAuthor
      : typeof (data as { payload?: { isAuthor?: boolean } }).payload?.isAuthor === 'boolean'
        ? Boolean((data as { payload?: { isAuthor?: boolean } }).payload?.isAuthor)
        : undefined;

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Ledger filing',
    description: typeof data.description === 'string' ? data.description : '',
    category: (data.category as Report['category']) || Category.Other,
    location: typeof data.location === 'string' ? data.location : 'Unknown',
    timestamp: safeTs,
    hash: typeof data.hash === 'string' ? data.hash : `0x${Math.random().toString(16).slice(2)}`,
    blockchainRef: typeof data.blockchainRef === 'string' ? data.blockchainRef : typeof data.txHash === 'string' ? data.txHash : '',
    blockNumber: typeof data.blockNumber === 'number' ? data.blockNumber : undefined,
    txHash: typeof data.txHash === 'string' ? data.txHash : undefined,
    chain: typeof data.chain === 'string' ? data.chain : undefined,
    anchoredAt: data.anchoredAt ? new Date(String(data.anchoredAt)) : undefined,
    status: (data.status as Report['status']) || 'Submitted',
    trustScore: typeof data.trustScore === 'number' ? data.trustScore : 70,
    severity: (data.severity as Report['severity']) || 'Standard',
    isActionable: typeof data.isActionable === 'boolean' ? data.isActionable : true,
    evidenceVault: data.evidenceVault as Report['evidenceVault'],
    ...(isAuthor !== undefined ? { isAuthor } : {}),
  };
}
