import type { Report } from '../types';

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
