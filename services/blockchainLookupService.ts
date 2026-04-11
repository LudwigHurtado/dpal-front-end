import { getApiBase } from '../constants';
import { getChain } from './dpalChainService';
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
 * Merges every successful endpoint (feed + legacy list) and dedupes by id so filings
 * are not dropped when only one route returns them.
 */
export async function fetchReportsFeedFromApi(limit = 120): Promise<Report[]> {
  try {
    const apiBase = getApiBase().replace(/\/$/, "");
    /** dpal-ai-server exposes `GET /api/reports/feed` (not always `GET /api/reports`). */
    const urls = [
      `${apiBase}/api/reports/feed?limit=${encodeURIComponent(String(limit))}`,
      `${apiBase}/api/reports?limit=${encodeURIComponent(String(limit))}`,
      `${apiBase}/api/reports`,
    ];
    const flat: Report[] = [];
    let idx = 0;
    for (const url of urls) {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const raw = (data as any)?.items ?? (data as any)?.reports ?? data;
      const list = Array.isArray(raw) ? raw : [];
      for (const item of list) {
        const row = item as Record<string, unknown>;
        const mapped = mapApiReportToReport(row, pickReportIdFromApiPayload(row, `api-${idx}`));
        idx += 1;
        if (mapped) flat.push(mapped);
      }
    }
    return mergeReportsIntoPrevious([], flat);
  } catch {
    return [];
  }
}

/** Merge remote feed into existing list (hub / transparency). Exported for chain hydration ordering. */
export function mergeReportsIntoPrevious(prev: Report[], remote: Report[]): Report[] {
  const seen = new Set(prev.map((r) => r.id));
  const merged = [...prev];
  for (const r of remote) {
    if (!seen.has(r.id)) {
      merged.push(r);
      seen.add(r.id);
      continue;
    }
    const i = merged.findIndex((x) => x.id === r.id);
    if (i < 0) continue;
    const cur = merged[i]!;
    let next = cur;
    if (r.isAuthor && !cur.isAuthor) next = { ...next, isAuthor: true };
    const remoteImgs = Array.isArray(r.imageUrls) ? r.imageUrls.filter((u) => typeof u === 'string' && u.length > 0) : [];
    if (remoteImgs.length > 0 && (!cur.imageUrls || cur.imageUrls.length === 0)) {
      next = { ...next, imageUrls: remoteImgs };
    }
    const remoteHist = Array.isArray(r.filingImageHistory)
      ? r.filingImageHistory.filter((u) => typeof u === 'string' && u.length > 0)
      : [];
    if (remoteHist.length > 0 && (!cur.filingImageHistory || cur.filingImageHistory.length === 0)) {
      next = { ...next, filingImageHistory: remoteHist };
    }
    if (next !== cur) merged[i] = next;
  }
  merged.sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime());
  return merged;
}

/**
 * For each reportId anchored on the local DPAL chain, fetch the full report if missing from state.
 * Fills the gap when the API feed is capped or this browser lost localStorage rows.
 */
export async function fetchReportsMissingFromChain(existingIds: Set<string>): Promise<Report[]> {
  const chainIds = [
    ...new Set(
      getChain()
        .filter((b) => b.reportId && b.reportId !== 'DPAL_GENESIS')
        .map((b) => b.reportId),
    ),
  ];
  const missing = chainIds.filter((id) => !existingIds.has(id));
  const out: Report[] = [];
  for (const id of missing) {
    const r = await fetchReportFromApiById(id);
    if (r) out.push(r);
  }
  return out;
}

/**
 * Resolve a ledger block height to a report: local index first, then API lookup + optional full report fetch.
 */
export async function resolveReportByBlockNumber(blockNumber: number, reports: Report[]): Promise<Report | null> {
  const local = findReportByBlockNumber(reports, blockNumber);
  if (local) return local;

  const fromChain = getChain().find(
    (b) => b.index === blockNumber && b.reportId && b.reportId !== 'DPAL_GENESIS',
  );
  if (fromChain) {
    const hit = reports.find((r) => r.id === fromChain.reportId);
    if (hit) return hit;
    const fetched = await fetchReportFromApiById(fromChain.reportId);
    if (fetched) return fetched;
  }

  const id = await fetchReportIdByBlockNumber(blockNumber);
  if (!id) return null;
  const byId = reports.find((r) => r.id === id);
  if (byId) return byId;
  return fetchReportFromApiById(id);
}

function pickReportIdFromApiPayload(data: Record<string, unknown>, fallbackId: string): string {
  const reportIdStr = typeof data.reportId === 'string' ? data.reportId.trim() : '';
  const idStr = typeof data.id === 'string' ? data.id.trim() : '';
  if (reportIdStr.startsWith('rep-')) return reportIdStr;
  if (idStr.startsWith('rep-')) return idStr;
  if (reportIdStr.length > 0) return reportIdStr;
  if (idStr.length > 0) return idStr;
  const legacy = typeof data._id === 'string' ? data._id.trim() : '';
  if (legacy.length > 0) return legacy;
  return fallbackId;
}

function parseBlockNumberField(data: Record<string, unknown>): number | undefined {
  if (typeof data.blockNumber === 'number' && Number.isFinite(data.blockNumber)) return data.blockNumber;
  if (typeof data.blockNumber === 'string' && /^\d+$/.test(data.blockNumber.trim())) {
    const n = Number.parseInt(data.blockNumber.trim(), 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function mapApiReportToReport(data: Record<string, unknown>, fallbackId: string): Report | null {
  const id = pickReportIdFromApiPayload(data, fallbackId);
  const ts = data.timestamp ? new Date(String(data.timestamp)) : new Date();
  const safeTs = Number.isNaN(ts.getTime()) ? new Date() : ts;

  const isAuthor =
    typeof data.isAuthor === 'boolean'
      ? data.isAuthor
      : typeof (data as { payload?: { isAuthor?: boolean } }).payload?.isAuthor === 'boolean'
        ? Boolean((data as { payload?: { isAuthor?: boolean } }).payload?.isAuthor)
        : undefined;

  const imageUrls = normalizeStringArray(data.imageUrls);
  const filingImageHistory = normalizeStringArray(
    (data as { filingImageHistory?: unknown }).filingImageHistory
  );

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Ledger filing',
    description: typeof data.description === 'string' ? data.description : '',
    category: (data.category as Report['category']) || Category.Other,
    location: typeof data.location === 'string' ? data.location : 'Unknown',
    timestamp: safeTs,
    hash: typeof data.hash === 'string' ? data.hash : `0x${Math.random().toString(16).slice(2)}`,
    blockchainRef: typeof data.blockchainRef === 'string' ? data.blockchainRef : typeof data.txHash === 'string' ? data.txHash : '',
    blockNumber: parseBlockNumberField(data),
    txHash: typeof data.txHash === 'string' ? data.txHash : undefined,
    chain: typeof data.chain === 'string' ? data.chain : undefined,
    anchoredAt: data.anchoredAt ? new Date(String(data.anchoredAt)) : undefined,
    status: (data.status as Report['status']) || 'Submitted',
    trustScore: typeof data.trustScore === 'number' ? data.trustScore : 70,
    severity: (data.severity as Report['severity']) || 'Standard',
    isActionable: typeof data.isActionable === 'boolean' ? data.isActionable : true,
    evidenceVault: data.evidenceVault as Report['evidenceVault'],
    ...(imageUrls.length > 0 ? { imageUrls } : {}),
    ...(filingImageHistory.length > 0 ? { filingImageHistory } : {}),
    ...(isAuthor !== undefined ? { isAuthor } : {}),
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((u): u is string => typeof u === 'string' && u.length > 0);
}
