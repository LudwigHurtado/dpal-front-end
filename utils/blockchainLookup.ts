import type { Report } from '../types';

/**
 * When the anchor API does not return a block height, derive a stable numeric value from the report id
 * so every record stays searchable and shows a consistent “block” in the public index.
 */
export function deriveStableBlockNumber(reportId: string): number {
  let h = 2166136261;
  for (let i = 0; i < reportId.length; i++) {
    h ^= reportId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 1_000_000 + (Math.abs(h) % 8_999_000);
}

/** Accepts e.g. "6843021", "#6843021", "6,843,021". */
export function parseBlockNumberInput(raw: string): number | null {
  const s = raw.trim().replace(/^#/, '').replace(/,/g, '');
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Match anchored block or NFT mint block on a report. */
export function findReportByBlockNumber(reports: Report[], blockNumber: number): Report | undefined {
  return reports.find(
    (r) => r.blockNumber === blockNumber || r.earnedNft?.blockNumber === blockNumber
  );
}
