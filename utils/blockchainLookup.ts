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

/** Accepts e.g. "6843021", "#6843021", "6,843,021", "rep-1775421654549". */
export function parseBlockNumberInput(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const normalized = s.replace(/,/g, '');
  const direct = normalized.replace(/^#/, '');
  let candidate = direct;
  if (!/^\d+$/.test(direct)) {
    const matches = normalized.match(/\d{3,}/g);
    if (!matches || matches.length === 0) return null;
    candidate = matches.sort((a, b) => b.length - a.length)[0];
  }
  const n = Number.parseInt(candidate, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Match anchored block, NFT mint block, stable id-derived index, or same numeric string. */
export function findReportByBlockNumber(reports: Report[], blockNumber: number): Report | undefined {
  const byStored = reports.find(
    (r) =>
      r.blockNumber === blockNumber ||
      r.earnedNft?.blockNumber === blockNumber ||
      (r.blockNumber != null && Number(r.blockNumber) === blockNumber),
  );
  if (byStored) return byStored;
  return reports.find((r) => deriveStableBlockNumber(r.id) === blockNumber);
}
