import type { ProviderRunResult } from './providerAdapters';

export type EvidenceConfidenceLevel = 'low' | 'medium' | 'high' | 'pending';

export type EvidenceConfidenceSummary = {
  overall: EvidenceConfidenceLevel;
  rationale: string[];
  pendingVerification: boolean;
};

const COUNTABLE: ReadonlySet<ProviderRunResult['status']> = new Set(['success', 'partial']);

export function calculateEvidenceConfidence(results: ProviderRunResult[]): EvidenceConfidenceSummary {
  const rationale: string[] = [];
  const effective = results.filter((r) => COUNTABLE.has(r.status));
  if (effective.length === 0) {
    return {
      overall: 'pending',
      rationale: ['No successful or partial provider runs — confidence remains pending.'],
      pendingVerification: true,
    };
  }
  if (effective.length === 1) {
    rationale.push('Only one screening source executed — confidence capped at medium.');
    return { overall: 'medium', rationale, pendingVerification: true };
  }
  const ids = new Set(effective.map((r) => r.sourceId));
  const hasSatellite = [...ids].some((id) =>
    /^(PACE|SWOT|SENTINEL|LANDSAT|NASA_HLS|VIIRS|MODIS|GEDI|ICESAT|ECOSTRESS|OCO|GRACE|SMAP|DYNAMIC)/i.test(id),
  );
  const hasPublic = [...ids].some((id) => /EPA|CARB|DISCLOSURE|ESG|REGULATORY|WEATHER|RIVER|COMMUNITY|INCIDENT/i.test(id));
  const hasField = [...ids].some((id) => /FIELD|LAB|DRONE|QR/i.test(id));
  if (hasSatellite && hasPublic && hasField) {
    rationale.push('Satellite screening, public record, and field-class sources all contributed executed runs.');
    return { overall: 'high', rationale, pendingVerification: true };
  }
  rationale.push('Multiple sources ran but triad (satellite + public record + field evidence) not all present.');
  return { overall: 'medium', rationale, pendingVerification: true };
}
