import { buildAccountabilityProfile } from '../accountabilityProfiles/accountabilityProfileBuilder';
import type { CreateAccountabilityProfileInput } from '../accountabilityProfiles/accountabilityProfileTypes';
import { calculateAccountabilityRisk } from '../accountabilityProfiles/accountabilityProfileRisk';
import { runEvidenceForProfile } from '../accountabilityProfiles/accountabilityProfileRoutes';
import { getAccountabilityProfileStore } from '../accountabilityProfiles/accountabilityProfileStore';
import { getEvidencePacketStore } from '../evidencePackets/evidencePacketStore';
import type { DpalEvidencePacket } from '../evidencePackets/evidencePacketTypes';
import { createValidationRequestService } from '../validation/validationService';
import type { DpalValidationRequest } from '../validation/validationTypes';
import { newWorkflowRunId, resolveBusinessWorkflowInput } from './businessWorkflowBuilder';
import { getBusinessWorkflowTemplate } from './businessWorkflowRegistry';
import { getBusinessWorkflowLimitations, getBusinessWorkflowSafetyLabels } from './businessWorkflowSafety';
import { getBusinessWorkflowStore } from './businessWorkflowStore';
import type { BusinessWorkflowInput, BusinessWorkflowRun, BusinessWorkflowStatus } from './businessWorkflowTypes';
import type { DpalAccountabilityProfile } from '../accountabilityProfiles/accountabilityProfileTypes';

export type RunBusinessWorkflowOk = {
  ok: true;
  workflowRun: BusinessWorkflowRun;
  profile: DpalAccountabilityProfile;
  packet?: DpalEvidencePacket;
  validationRequest?: DpalValidationRequest;
  risk: ReturnType<typeof calculateAccountabilityRisk>;
  safetyLabels: ReturnType<typeof getBusinessWorkflowSafetyLabels>;
  limitations: string[];
};

export type RunBusinessWorkflowErr = { ok: false; error: string };

export async function runBusinessWorkflow(input: BusinessWorkflowInput): Promise<RunBusinessWorkflowOk | RunBusinessWorkflowErr> {
  const template = getBusinessWorkflowTemplate(input.workflowId?.trim() ?? '');
  if (!template) {
    return { ok: false, error: `Unknown workflowId: ${input.workflowId}` };
  }

  const workflowRunId = newWorkflowRunId();
  const resolved = resolveBusinessWorkflowInput(template, input);

  const profIn: CreateAccountabilityProfileInput = {
    profileType: String(resolved.profileType),
    companyName: resolved.companyName,
    facilityName: resolved.facilityName,
    facilityId: resolved.facilityId,
    address: resolved.address,
    lat: resolved.lat,
    lng: resolved.lng,
    radiusKm: resolved.radiusKm,
    useCaseId: resolved.useCaseId,
    claimText: resolved.claimText,
    claimSourceUrl: resolved.claimSourceUrl,
    runEvidenceNow: false,
  };

  let profile = buildAccountabilityProfile(profIn);
  const ps = getAccountabilityProfileStore();
  profile = await ps.save(profile);

  let packet: DpalEvidencePacket | undefined;
  let evidenceError: string | undefined;
  const evidenceRefsForRun = Array.isArray(resolved.evidenceRefs) ? (resolved.evidenceRefs as unknown[]) : undefined;

  if (resolved.runEvidenceNow) {
    try {
      const ran = await runEvidenceForProfile(profile.profileId, { evidenceRefs: evidenceRefsForRun });
      if (ran) {
        packet = ran.packet;
        profile = ran.profile;
      } else {
        evidenceError = 'Evidence run returned no profile result.';
        const again = await ps.get(profile.profileId);
        if (again) profile = again;
      }
    } catch (e) {
      evidenceError = e instanceof Error ? e.message : 'Evidence run failed';
      const again = await ps.get(profile.profileId);
      if (again) profile = again;
    }
  }

  let validationRequest: DpalValidationRequest | undefined;
  let validationError: string | undefined;
  if (resolved.createValidationRequest) {
    const vr = await createValidationRequestService({
      packetId: packet?.packetId,
      profileId: profile.profileId,
      useCaseId: resolved.useCaseId,
      requestType: String(resolved.validationRequestType ?? 'human_review'),
      priority: resolved.priority,
    });
    if (vr.ok) {
      validationRequest = vr.request;
      await ps.update(profile.profileId, { status: 'validation_requested' });
      const refreshed = await ps.get(profile.profileId);
      if (refreshed) profile = refreshed;
    } else {
      validationError = vr.error;
    }
  }

  const es = getEvidencePacketStore();
  const packetsLoaded = (await Promise.all(profile.evidencePacketIds.map((id) => es.get(id)))).filter(Boolean) as DpalEvidencePacket[];
  const risk = calculateAccountabilityRisk(profile, packetsLoaded);

  const outputSummary: Record<string, unknown> = {
    profileId: profile.profileId,
    packetId: packet?.packetId,
    validationId: validationRequest?.validationId,
    riskLevel: risk.riskLevel,
    anomalySummary: risk.anomalySummary,
    rationale: risk.rationale,
    templateSafetyLanguage: template.safetyLanguage,
    evidencePartial: Boolean(evidenceError && packet),
  };
  if (evidenceError) outputSummary.evidenceError = evidenceError;
  if (validationError) outputSummary.validationError = validationError;
  if (packet?.skippedSources?.length) outputSummary.skippedSources = packet.skippedSources;

  let status: BusinessWorkflowStatus = 'completed';
  if (validationRequest) status = 'validation_requested';
  else if (resolved.runEvidenceNow) status = 'evidence_collected';

  const limitations = [...getBusinessWorkflowLimitations(template.workflowId)];
  for (const L of risk.limitations) {
    if (L && !limitations.includes(L)) limitations.push(L);
  }
  if (packet) {
    for (const L of packet.limitations) {
      if (L && !limitations.includes(L)) limitations.push(L);
    }
  }

  const now = new Date().toISOString();
  const workflowRun: BusinessWorkflowRun = {
    workflowRunId,
    workflowId: template.workflowId,
    workflowName: template.name,
    status,
    profileId: profile.profileId,
    packetId: packet?.packetId,
    validationId: validationRequest?.validationId,
    useCaseId: resolved.useCaseId,
    companyName: resolved.companyName,
    facilityName: resolved.facilityName,
    claimText: resolved.claimText,
    lat: resolved.lat,
    lng: resolved.lng,
    radiusKm: resolved.radiusKm,
    input: resolved,
    outputSummary,
    safetyLabels: getBusinessWorkflowSafetyLabels(),
    limitations,
    createdAt: now,
    updatedAt: now,
  };

  const saved = await getBusinessWorkflowStore().save(workflowRun);

  return {
    ok: true,
    workflowRun: saved,
    profile,
    packet,
    validationRequest,
    risk,
    safetyLabels: getBusinessWorkflowSafetyLabels(),
    limitations,
  };
}
