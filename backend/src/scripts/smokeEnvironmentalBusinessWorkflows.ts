/**
 * Smoke: environmental business workflow orchestrator.
 * Run from backend/: `npm run smoke:env-business-workflows`
 */
import {
  __resetAccountabilityProfileStoreForTests,
  getAccountabilityProfileStore,
} from '../environmental-intelligence/accountabilityProfiles/accountabilityProfileStore';
import {
  __resetBusinessWorkflowStoreForTests,
} from '../environmental-intelligence/businessWorkflows/businessWorkflowStore';
import { getBusinessWorkflowTemplates } from '../environmental-intelligence/businessWorkflows/businessWorkflowRegistry';
import { runBusinessWorkflow } from '../environmental-intelligence/businessWorkflows/businessWorkflowRunner';
import { scanWorkflowOutputForForbiddenClaims } from '../environmental-intelligence/businessWorkflows/businessWorkflowSafety';
import {
  __resetEvidencePacketStoreForTests,
  getEvidencePacketStore,
} from '../environmental-intelligence/evidencePackets/evidencePacketStore';
import {
  __resetValidationRequestStoreForTests,
  getValidationRequestStore,
} from '../environmental-intelligence/validation/validationStore';

function assert(c: boolean, m: string): void {
  if (!c) {
    console.error('[smokeEnvironmentalBusinessWorkflows] FAIL:', m);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  __resetAccountabilityProfileStoreForTests();
  __resetEvidencePacketStoreForTests();
  __resetValidationRequestStoreForTests();
  __resetBusinessWorkflowStoreForTests();

  const templates = getBusinessWorkflowTemplates();
  assert(templates.length >= 10, `expected at least 10 templates, got ${templates.length}`);

  const w1 = await runBusinessWorkflow({
    workflowId: 'water_pollution_evidence',
    companyName: 'Test Company',
    facilityName: 'Manila Bay Test Site',
    lat: 14.5995,
    lng: 120.9842,
    radiusKm: 12,
    claimText: 'Screening-only test claim',
    runEvidenceNow: true,
    createValidationRequest: true,
  });
  if (!w1.ok) {
    console.error('[smokeEnvironmentalBusinessWorkflows] FAIL:', w1.error);
    process.exit(1);
  }
  assert(Boolean(w1.workflowRun.workflowRunId), 'workflowRunId');
  assert(Boolean(w1.profile.profileId), 'profileId');
  assert(Boolean(w1.packet?.packetId), 'packetId');
  assert(Boolean(w1.validationRequest?.validationId), 'validationId');

  assert(w1.validationRequest!.safetyLabels.human_verified === false, 'validation request must not claim human_verified');
  assert(w1.packet!.safetyLabels.human_verified === false, 'packet must not be human_verified');
  assert(w1.packet!.safetyLabels.pending_verification === true, 'packet pending_verification');
  assert(w1.profile.safetyLabels.human_verified === false, 'profile must not be human_verified');

  const violations = scanWorkflowOutputForForbiddenClaims(w1);
  assert(violations.length === 0, `forbidden claim scan: ${violations.join(', ')}`);

  const w2 = await runBusinessWorkflow({
    workflowId: 'insurance_environmental_risk',
    companyName: 'Insurance Smoke Co',
    facilityName: 'Test Parcel',
    lat: 37.7749,
    lng: -122.4194,
    radiusKm: 8,
    claimText: 'Screening-only property hazard review',
    runEvidenceNow: true,
    createValidationRequest: false,
  });
  if (!w2.ok) {
    console.error('[smokeEnvironmentalBusinessWorkflows] FAIL:', w2.error);
    process.exit(1);
  }
  assert(!w2.validationRequest, 'insurance path without validation should not create request');
  assert(w2.workflowRun.status === 'evidence_collected', 'expected evidence_collected without validation');

  const v2 = scanWorkflowOutputForForbiddenClaims(w2);
  assert(v2.length === 0, `forbidden scan w2: ${v2.join(', ')}`);

  const persisted = await getValidationRequestStore().get(w1.validationRequest!.validationId);
  assert(persisted != null, 'validation persisted');
  const pkt = await getEvidencePacketStore().get(w1.packet!.packetId);
  assert(pkt != null, 'packet persisted');
  const prof = await getAccountabilityProfileStore().get(w1.profile.profileId);
  assert(prof != null, 'profile persisted');

  console.log('[smokeEnvironmentalBusinessWorkflows] OK', {
    templates: templates.length,
    waterRunId: w1.workflowRun.workflowRunId,
    insuranceRunId: w2.workflowRun.workflowRunId,
  });
}

main().catch((e) => {
  console.error('[smokeEnvironmentalBusinessWorkflows] ERROR', e);
  process.exit(1);
});
