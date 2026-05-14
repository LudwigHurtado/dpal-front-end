/**
 * Smoke: environmental validation workflow (memory stores; no HTTP server).
 * Run from backend/: `npm run smoke:env-validation`
 */
import { buildAccountabilityProfile } from '../environmental-intelligence/accountabilityProfiles/accountabilityProfileBuilder';
import { runEvidenceForProfile } from '../environmental-intelligence/accountabilityProfiles/accountabilityProfileRoutes';
import {
  __resetAccountabilityProfileStoreForTests,
  getAccountabilityProfileStore,
} from '../environmental-intelligence/accountabilityProfiles/accountabilityProfileStore';
import { __resetEvidencePacketStoreForTests, getEvidencePacketStore } from '../environmental-intelligence/evidencePackets/evidencePacketStore';
import {
  assignValidationRequestService,
  completeValidationRequestService,
  createValidationRequestService,
  startValidationRequestService,
} from '../environmental-intelligence/validation/validationService';
import {
  __resetValidationRequestStoreForTests,
  getValidationRequestStore,
} from '../environmental-intelligence/validation/validationStore';

function assert(c: boolean, m: string): void {
  if (!c) {
    console.error('[smokeEnvironmentalValidation] FAIL:', m);
    process.exit(1);
  }
}

function scanForbidden(text: string): void {
  assert(!/\bcarbon credits? (issuance|approved|verified)\b/i.test(text), 'no affirmative carbon credit claim');
  assert(!/\bviu eligible\b|\bviu approval\b|\bverified viu\b/i.test(text), 'no affirmative VIU claim');
  assert(!/\bregistry approval\b/i.test(text), 'no registry approval');
  assert(!/\blegal (conclusion|liability|enforcement|guilt)\b/i.test(text), 'no legal conclusion language');
  assert(!/\bhuman verified\b/i.test(text), 'no human verified claim');
  assert(!/\bchain transaction\b/i.test(text), 'no chain transaction');
}

async function main(): Promise<void> {
  __resetAccountabilityProfileStoreForTests();
  __resetEvidencePacketStoreForTests();
  __resetValidationRequestStoreForTests();

  const ps = getAccountabilityProfileStore();
  const es = getEvidencePacketStore();

  let profile = buildAccountabilityProfile({
    profileType: 'facility',
    companyName: 'Validation Smoke Co',
    facilityName: 'Manila Bay Test Site',
    lat: 14.5995,
    lng: 120.9842,
    radiusKm: 12,
    useCaseId: 'plastic_pollution_watch',
    claimText: 'Screening-only claim for validation smoke',
  });
  profile = await ps.save(profile);

  const ran = await runEvidenceForProfile(profile.profileId, {});
  assert(ran != null, 'run evidence');
  const packetId = ran!.packet.packetId;
  const pktAfterRun = await es.get(packetId);
  assert(pktAfterRun != null, 'packet in store');
  assert(pktAfterRun!.safetyLabels.human_verified === false, 'packet not human verified before workflow');
  scanForbidden(`${pktAfterRun!.title} ${profile.claimText ?? ''}`);

  const created = await createValidationRequestService({
    packetId,
    profileId: profile.profileId,
    requestType: 'human_review',
    priority: 'normal',
  });
  if (!created.ok) {
    console.error('[smokeEnvironmentalValidation] FAIL:', created.error);
    process.exit(1);
  }
  assert(created.request.safetyLabels.human_verified === false, 'request does not imply verification');

  const vid = created.request.validationId;

  const assigned = await assignValidationRequestService(vid, {
    assignedTo: 'reviewer-1',
    reviewerName: 'Pat Example',
    reviewerRole: 'field_reviewer',
  });
  assert(assigned.ok && assigned.request.status === 'assigned', 'assigned');

  const started = await startValidationRequestService(vid);
  assert(started.ok && started.request.status === 'in_progress', 'in progress');

  const completed = await completeValidationRequestService(vid, {
    validationResult: 'validated',
    reviewNotes: 'Human-reviewed evidence packet; screening workflow only.',
  });
  assert(completed.ok && completed.request.status === 'completed', 'completed validated');

  const pktVerified = await es.get(packetId);
  assert(pktVerified?.validationStatus === 'human_verified', 'packet validation status');
  assert(
    pktVerified?.safetyLabels.pending_verification === false &&
      pktVerified?.safetyLabels.human_verified === true &&
      pktVerified?.safetyLabels.blockchain_anchored === false,
    'packet safety labels after validated completion',
  );

  const profVerified = await ps.get(profile.profileId);
  assert(profVerified?.validationStatus === 'human_verified', 'profile validation status');
  assert(profVerified?.safetyLabels.human_verified === true, 'profile human reviewed flag');
  scanForbidden(JSON.stringify(pktVerified));
  scanForbidden(JSON.stringify(profVerified));

  __resetAccountabilityProfileStoreForTests();
  __resetEvidencePacketStoreForTests();
  __resetValidationRequestStoreForTests();
  const ps2 = getAccountabilityProfileStore();
  const es2 = getEvidencePacketStore();

  let p2 = buildAccountabilityProfile({
    profileType: 'facility',
    companyName: 'Reject Path Co',
    facilityName: 'Site B',
    lat: 14.6,
    lng: 120.99,
    radiusKm: 10,
    useCaseId: 'plastic_pollution_watch',
  });
  p2 = await ps2.save(p2);
  const ran2 = await runEvidenceForProfile(p2.profileId, {});
  assert(ran2 != null, 'run evidence 2');
  const pid2 = ran2!.packet.packetId;

  const cr2 = await createValidationRequestService({
    packetId: pid2,
    profileId: p2.profileId,
    requestType: 'document_review',
  });
  if (!cr2.ok) {
    console.error('[smokeEnvironmentalValidation] FAIL:', cr2.error);
    process.exit(1);
  }
  const vid2 = cr2.request.validationId;
  await assignValidationRequestService(vid2, { reviewerName: 'Alex Review', reviewerRole: 'analyst' });
  await startValidationRequestService(vid2);
  const rej = await completeValidationRequestService(vid2, {
    validationResult: 'rejected',
    reviewNotes: 'Insufficient evidence for continued screening.',
  });
  assert(rej.ok, 'complete rejected');

  const pkt2 = await es2.get(pid2);
  assert(pkt2?.validationStatus === 'rejected', 'packet rejected');
  assert(pkt2?.safetyLabels.human_verified === false, 'packet human_verified remains false when rejected');

  await getValidationRequestStore().list(10);

  console.log('[smokeEnvironmentalValidation] OK', {
    validatedPacketId: packetId,
    rejectedPacketId: pid2,
    validationStore: getValidationRequestStore().mode,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
