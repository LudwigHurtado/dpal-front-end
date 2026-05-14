import type { DpalAccountabilityProfile } from './accountabilityProfileTypes';
import type { DpalEvidencePacket } from '../evidencePackets/evidencePacketTypes';
import type { ProviderRunResult } from '../sources/providerAdapters';

export type AccountabilityRiskLevel = 'unknown' | 'low' | 'moderate' | 'elevated' | 'requires_validation';

export type AccountabilityRiskResult = {
  riskLevel: AccountabilityRiskLevel;
  anomalySummary: string;
  rationale: string[];
  limitations: string[];
};

const COUNTABLE: ReadonlySet<ProviderRunResult['status']> = new Set(['success', 'partial']);
const WEAK: ReadonlySet<ProviderRunResult['status']> = new Set([
  'unavailable',
  'not_configured',
  'future',
  'commercial_required',
]);

function isSatelliteLaneSource(id: string): boolean {
  return /^(PACE|SWOT|SENTINEL|LANDSAT|NASA_HLS|VIIRS|MODIS|GEDI|ICESAT|ECOSTRESS|OCO|GRACE|SMAP|DYNAMIC|NASA_EMIT|TEMPO)/i.test(
    id,
  );
}

function isPublicRecordSource(id: string): boolean {
  return /^(EPA|CARB|DISCLOSURE|ESG|REGULATORY|WEATHER|RIVER|COMMUNITY|INCIDENT|NASA_FIRMS)/i.test(id);
}

function isFieldClassSource(id: string): boolean {
  return /^(FIELD|LAB|DRONE|QR)/i.test(id);
}

function aggregatePacketResults(packets: DpalEvidencePacket[]): {
  effectiveCount: number;
  weakOnly: boolean;
  hasSatellite: boolean;
  hasPublic: boolean;
  hasField: boolean;
  hasMixedOutcomes: boolean;
} {
  let effectiveCount = 0;
  let weakOnly = true;
  let hasSatellite = false;
  let hasPublic = false;
  let hasField = false;
  const statuses: ProviderRunResult['status'][] = [];

  for (const p of packets) {
    for (const r of p.providerResults) {
      statuses.push(r.status);
      if (COUNTABLE.has(r.status)) {
        effectiveCount += 1;
        weakOnly = false;
        if (isSatelliteLaneSource(r.sourceId)) hasSatellite = true;
        if (isPublicRecordSource(r.sourceId)) hasPublic = true;
        if (isFieldClassSource(r.sourceId)) hasField = true;
      } else if (!WEAK.has(r.status) && r.status !== 'error') {
        weakOnly = false;
      }
    }
  }

  const hasSuccess = statuses.includes('success');
  const hasPartial = statuses.includes('partial');
  const hasError = statuses.includes('error');
  const hasMixedOutcomes = hasError && (hasSuccess || hasPartial);

  return { effectiveCount, weakOnly, hasSatellite, hasPublic, hasField, hasMixedOutcomes };
}

/**
 * Screening-oriented risk framing only — not legal, fraud, or enforcement conclusions.
 */
export function calculateAccountabilityRisk(
  profile: DpalAccountabilityProfile,
  evidencePackets: DpalEvidencePacket[],
): AccountabilityRiskResult {
  const rationale: string[] = [];
  const limitations: string[] = [
    'Risk banding reflects screening coverage and signal mix only. It does not establish wrongdoing, fraud, or regulatory non-compliance.',
  ];

  if (!evidencePackets.length) {
    rationale.push('No evidence packets are attached yet — screening coverage is unknown.');
    return {
      riskLevel: 'unknown',
      anomalySummary: 'Insufficient attached screening outputs to characterize signal mix.',
      rationale,
      limitations,
    };
  }

  const agg = aggregatePacketResults(evidencePackets);
  if (agg.weakOnly) {
    rationale.push('Attached packets contain no successful or partial provider outputs — signals are not yet actionable for screening triage.');
    return {
      riskLevel: 'unknown',
      anomalySummary: 'Provider outputs were unavailable, not configured, or otherwise non-informative for this profile.',
      rationale,
      limitations,
    };
  }

  if (agg.hasMixedOutcomes) {
    rationale.push('Mixed provider outcomes (errors alongside partial or success runs) suggest inconsistent screening inputs or transient provider issues.');
  }

  const claimPresent = Boolean(profile.claimText?.trim());
  const claimStress =
    claimPresent &&
    agg.hasPublic &&
    agg.hasSatellite &&
    (agg.hasMixedOutcomes || (agg.effectiveCount >= 2 && evidencePackets.length >= 1));

  if (claimStress) {
    rationale.push(
      'A stated claim is present alongside multi-source screening outputs with uneven completeness — human review is appropriate before drawing any comparative conclusion.',
    );
    return {
      riskLevel: 'requires_validation',
      anomalySummary:
        'Screening signals warrant structured review against the stated claim; this is not an inconsistency determination.',
      rationale,
      limitations: [
        ...limitations,
        'Possible claim-to-signal alignment should be assessed by qualified reviewers with domain context.',
      ],
    };
  }

  if (agg.hasSatellite && agg.hasPublic && agg.hasField && evidencePackets.length >= 2) {
    rationale.push('Satellite-class, public-record-class, and field-class evidence contributed across attached packets.');
    return {
      riskLevel: 'elevated',
      anomalySummary: 'Broader screening coverage is available; outcomes should be interpreted as preliminary screening only.',
      rationale,
      limitations,
    };
  }

  if (agg.hasSatellite && agg.hasPublic) {
    rationale.push('Satellite-class and public-record-class sources contributed usable screening output.');
    return {
      riskLevel: 'moderate',
      anomalySummary: 'Multiple independent screening families contributed; continue with field validation where claims are material.',
      rationale,
      limitations,
    };
  }

  if (agg.effectiveCount === 1) {
    rationale.push('Only one informative provider outcome was observed across attached packets.');
    return {
      riskLevel: 'low',
      anomalySummary: 'Limited independent screening corroboration; expand sources or repeat runs as appropriate.',
      rationale,
      limitations,
    };
  }

  rationale.push('Some screening outputs are usable but triad coverage (satellite + public record + field) is incomplete.');
  return {
    riskLevel: 'low',
    anomalySummary: 'Preliminary screening context only; additional packets or sources may change this view.',
    rationale,
    limitations,
  };
}
