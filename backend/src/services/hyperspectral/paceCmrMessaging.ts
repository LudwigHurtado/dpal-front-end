export const DEFAULT_PACE_CMR_PAGE_SIZE = 20;
export const MIN_PACE_CMR_PAGE_SIZE = 1;
export const MAX_PACE_CMR_PAGE_SIZE = 100;

export type PaceCmrSearchMetadata = {
  returnedCount: number;
  totalHits: number | null;
  pageSize: number;
  queryShortName: string;
  boundingBox: string;
  temporal: string;
  isPageLimited: boolean;
};

export function normalizePaceCmrPageSize(pageSize?: number): number {
  if (pageSize == null || !Number.isFinite(pageSize)) return DEFAULT_PACE_CMR_PAGE_SIZE;
  const n = Math.floor(pageSize);
  if (n < MIN_PACE_CMR_PAGE_SIZE || n > MAX_PACE_CMR_PAGE_SIZE) return DEFAULT_PACE_CMR_PAGE_SIZE;
  return n;
}

export function computePaceCmrSearchMetadata(args: {
  returnedCount: number;
  totalHits: number | null;
  pageSize: number;
  queryShortName: string;
  boundingBox: string;
  temporal: string;
}): PaceCmrSearchMetadata {
  const pageSize = normalizePaceCmrPageSize(args.pageSize);
  const totalHits =
    args.totalHits != null && Number.isFinite(args.totalHits) && args.totalHits >= 0 ? args.totalHits : null;
  const returnedCount = Math.max(0, Math.floor(args.returnedCount));
  const isPageLimited =
    returnedCount >= pageSize && (totalHits == null || totalHits > returnedCount);

  return {
    returnedCount,
    totalHits,
    pageSize,
    queryShortName: args.queryShortName,
    boundingBox: args.boundingBox,
    temporal: args.temporal,
    isPageLimited,
  };
}

const PACE_MESSAGE_TRAILER =
  'No spectral index extraction in this build. Not plastic classification — field validation required.';

/** Human-readable PACE CMR status line for provider block message field. */
export function formatPaceCmrProviderMessage(
  meta: Pick<PaceCmrSearchMetadata, 'returnedCount' | 'totalHits' | 'pageSize' | 'isPageLimited'>,
): string {
  const { returnedCount, totalHits, isPageLimited } = meta;

  if (isPageLimited && totalHits != null && totalHits > returnedCount) {
    return `NASA CMR returned ${returnedCount} of ${totalHits} matching PACE granule(s) — metadata only. ${PACE_MESSAGE_TRAILER}`;
  }
  if (isPageLimited) {
    return `NASA CMR returned the first ${returnedCount} matching PACE granule(s) for this AOI/date range — metadata only. This is a page-limited result, not necessarily the total available observations. ${PACE_MESSAGE_TRAILER}`;
  }
  return `NASA CMR returned ${returnedCount} matching PACE granule(s) — metadata only. ${PACE_MESSAGE_TRAILER}`;
}

export function parseCmrHitsHeader(headers: Record<string, unknown> | undefined): number | null {
  if (!headers) return null;
  const raw =
    headers['cmr-hits'] ??
    headers['CMR-Hits'] ??
    headers['Cmr-Hits'];
  if (raw == null) return null;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
