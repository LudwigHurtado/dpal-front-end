import { randomBytes } from 'crypto';
import type {
  AccountabilityProfileType,
  CreateAccountabilityProfileInput,
  DpalAccountabilityProfile,
} from './accountabilityProfileTypes';
import { ACCOUNTABILITY_PROFILE_CORE_LIMITATION, DEFAULT_ACCOUNTABILITY_SAFETY_LABELS } from './accountabilityProfileSafety';
import { calculateAccountabilityRisk } from './accountabilityProfileRisk';

const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  'company',
  'facility',
  'project',
  'site',
  'incident',
  'supplier',
  'property',
  'public_asset',
]);

export function normalizeProfileType(raw: string): AccountabilityProfileType {
  const t = String(raw || '').trim().toLowerCase();
  if (ALLOWED_TYPES.has(t)) return t as AccountabilityProfileType;
  return 'facility';
}

function newProfileId(): string {
  return `ap_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`;
}

export function buildAccountabilityProfile(input: CreateAccountabilityProfileInput): DpalAccountabilityProfile {
  const now = new Date().toISOString();
  const profileType = normalizeProfileType(String(input.profileType));
  const runNow = Boolean(input.runEvidenceNow);
  const status = runNow ? 'evidence_pending' : 'active';

  const base: DpalAccountabilityProfile = {
    profileId: newProfileId(),
    profileType,
    companyName: input.companyName?.trim() || undefined,
    facilityName: input.facilityName?.trim() || undefined,
    facilityId: input.facilityId?.trim() || undefined,
    address: input.address?.trim() || undefined,
    lat: input.lat,
    lng: input.lng,
    radiusKm: input.radiusKm,
    useCaseId: input.useCaseId?.trim() || undefined,
    claimText: input.claimText?.trim() || undefined,
    claimSourceUrl: input.claimSourceUrl?.trim() || undefined,
    status,
    validationStatus: 'pending_verification',
    safetyLabels: { ...DEFAULT_ACCOUNTABILITY_SAFETY_LABELS },
    limitations: [ACCOUNTABILITY_PROFILE_CORE_LIMITATION],
    evidencePacketIds: [],
    situationRoomIds: [],
    projectIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const risk = calculateAccountabilityRisk(base, []);
  const limitations = [...new Set([...base.limitations, ...risk.limitations])];
  return {
    ...base,
    riskLevel: risk.riskLevel,
    anomalySummary: risk.anomalySummary,
    limitations,
    updatedAt: now,
  };
}
