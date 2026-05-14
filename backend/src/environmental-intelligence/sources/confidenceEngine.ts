import type { ProviderRunResult } from './providerAdapters';

export type EvidenceConfidenceLevel = 'low' | 'medium' | 'high' | 'pending';

export type EvidenceConfidenceSummary = {
  overall: EvidenceConfidenceLevel;
  rationale: string[];
  pendingVerification: boolean;
};

/** Alias for API payloads — screening confidence, not legal or registry truth. */
export type EvidenceConfidence = EvidenceConfidenceSummary;

const COUNTABLE: ReadonlySet<ProviderRunResult['status']> = new Set(['success', 'partial']);

function isSatelliteLike(id: string): boolean {
  return /^(PACE|SWOT|SENTINEL|LANDSAT|NASA_HLS|VIIRS|MODIS|GEDI|ICESAT|ECOSTRESS|OCO|GRACE|SMAP|DYNAMIC|NASA_EMIT|TEMPO)/i.test(
    id,
  );
}

function isPublicRecordLike(id: string): boolean {
  return /^(EPA|CARB|DISCLOSURE|ESG|REGULATORY|WEATHER|RIVER|COMMUNITY|INCIDENT|NASA_FIRMS)/i.test(id);
}

function isFieldLike(id: string): boolean {
  return /^(FIELD|LAB|DRONE|QR)/i.test(id);
}

export function calculateEvidenceConfidence(results: ProviderRunResult[]): EvidenceConfidenceSummary {
  const rationale: string[] = [];
  const effective = results.filter((r) => COUNTABLE.has(r.status));
  const nonBoosting = results.filter((r) => !COUNTABLE.has(r.status));

  if (nonBoosting.length) {
    rationale.push(
      'Sources that did not return success or partial data do not increase screening confidence (future, unavailable, not configured, errors, etc.).',
    );
  }

  if (effective.length === 0) {
    return {
      overall: 'pending',
      rationale: [...rationale, 'No successful or partial provider runs — confidence remains pending.'],
      pendingVerification: true,
    };
  }

  if (effective.length === 1) {
    rationale.push('Only one screening source produced usable output — confidence capped at medium.');
    return { overall: 'medium', rationale, pendingVerification: true };
  }

  const hasErrorAmong = results.some((r) => r.status === 'error');
  if (hasErrorAmong) {
    rationale.push('At least one provider ended in error — contradictory or unstable run set; confidence capped at medium.');
    return { overall: 'medium', rationale, pendingVerification: true };
  }

  const ids = new Set(effective.map((r) => r.sourceId));
  const hasSatellite = [...ids].some(isSatelliteLike);
  const hasPublic = [...ids].some(isPublicRecordLike);
  const hasField = [...ids].some(isFieldLike);

  const satStatuses = effective.filter((r) => isSatelliteLike(r.sourceId)).map((r) => r.status);
  const pubStatuses = effective.filter((r) => isPublicRecordLike(r.sourceId)).map((r) => r.status);
  const agreement =
    hasSatellite &&
    hasPublic &&
    satStatuses.every((s) => s === 'success') &&
    pubStatuses.every((s) => s === 'success');

  if (hasSatellite && hasPublic && hasField) {
    rationale.push('Satellite-class, public-record-class, and field-class sources all returned usable screening output.');
    rationale.push('High-impact claims remain pending human and domain validation.');
    return { overall: 'high', rationale, pendingVerification: true };
  }

  if (hasSatellite && hasPublic) {
    if (agreement) {
      rationale.push('Satellite-class and public-record-class sources both returned full success — screening confidence may be elevated.');
    } else {
      rationale.push('Satellite-class and public-record-class sources ran but outcomes were not all full success — confidence held at medium.');
    }
    return { overall: agreement ? 'high' : 'medium', rationale, pendingVerification: true };
  }

  rationale.push('Multiple sources ran but the satellite + public-record pair or field-evidence triad was not fully met.');
  return { overall: 'medium', rationale, pendingVerification: true };
}
