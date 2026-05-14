import { randomBytes } from 'crypto';
import { DEFAULT_VALIDATION_REQUEST_SAFETY, VALIDATION_REQUEST_CORE_LIMITATIONS } from './validationSafety';
import type {
  CreateValidationRequestInput,
  DpalValidationRequest,
  EnvironmentalValidationRequestType,
  EnvironmentalValidationTargetType,
} from './validationTypes';

function newValidationId(): string {
  const t = Date.now().toString(36);
  const r = randomBytes(6).toString('hex');
  return `vr_${t}_${r}`;
}

function normalizeRequestType(v: string): EnvironmentalValidationRequestType {
  const allowed: EnvironmentalValidationRequestType[] = [
    'human_review',
    'field_inspection',
    'drone_survey',
    'lab_sample',
    'sensor_check',
    'community_followup',
    'document_review',
    'expert_review',
  ];
  const s = String(v || '').trim();
  if (allowed.includes(s as EnvironmentalValidationRequestType)) return s as EnvironmentalValidationRequestType;
  return 'human_review';
}

export function resolveTarget(
  packetId?: string,
  profileId?: string,
): { targetType: EnvironmentalValidationTargetType; targetId: string; packetId?: string; profileId?: string } | null {
  const p = packetId?.trim();
  const r = profileId?.trim();
  if (p && r) return { targetType: 'combined', targetId: `${p}|${r}`, packetId: p, profileId: r };
  if (p) return { targetType: 'evidence_packet', targetId: p, packetId: p };
  if (r) return { targetType: 'accountability_profile', targetId: r, profileId: r };
  return null;
}

export function buildValidationRequest(input: CreateValidationRequestInput): DpalValidationRequest {
  const t = resolveTarget(input.packetId, input.profileId);
  if (!t) {
    throw new Error('Provide packetId and/or profileId (at least one required).');
  }
  const now = new Date().toISOString();
  const refs = input.evidenceRefs ?? { packetIds: t.packetId ? [t.packetId] : [], profileIds: t.profileId ? [t.profileId] : [] };
  return {
    validationId: newValidationId(),
    targetType: t.targetType,
    targetId: t.targetId,
    profileId: t.profileId,
    packetId: t.packetId,
    useCaseId: input.useCaseId?.trim() || undefined,
    requestType: normalizeRequestType(input.requestType),
    status: 'open',
    priority: (input.priority ?? 'normal').trim() || 'normal',
    requestedBy: input.requestedBy?.trim() || undefined,
    validationResult: 'pending',
    safetyLabels: { ...DEFAULT_VALIDATION_REQUEST_SAFETY },
    limitations: [...VALIDATION_REQUEST_CORE_LIMITATIONS],
    evidenceRefs: refs,
    createdAt: now,
    updatedAt: now,
  };
}
