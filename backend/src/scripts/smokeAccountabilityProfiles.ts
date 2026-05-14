/**
 * Smoke: accountability profiles (store + run-evidence pipeline, no HTTP server).
 * Run from backend/: `npm run smoke:accountability-profiles`
 */
import { buildAccountabilityProfile } from '../environmental-intelligence/accountabilityProfiles/accountabilityProfileBuilder';
import { calculateAccountabilityRisk } from '../environmental-intelligence/accountabilityProfiles/accountabilityProfileRisk';
import {
  __resetAccountabilityProfileStoreForTests,
  getAccountabilityProfileStore,
} from '../environmental-intelligence/accountabilityProfiles/accountabilityProfileStore';
import { __resetEvidencePacketStoreForTests, getEvidencePacketStore } from '../environmental-intelligence/evidencePackets/evidencePacketStore';
import { recalculateAndPersistProfileRisk, runEvidenceForProfile } from '../environmental-intelligence/accountabilityProfiles/accountabilityProfileRoutes';

function assert(c: boolean, m: string): void {
  if (!c) {
    console.error('[smokeAccountabilityProfiles] FAIL:', m);
    process.exit(1);
  }
}

function scanForbidden(text: string): void {
  assert(!/\bcarbon credits? (issuance|approved|verified)\b/i.test(text), 'no affirmative carbon credit claim');
  assert(!/\bviu\b/i.test(text), 'no VIU claim');
  assert(!/\bregistry approval\b/i.test(text), 'no registry approval');
  assert(!/\blegal (conclusion|liability|enforcement|guilt)\b/i.test(text), 'no legal conclusion language');
  assert(!/\bhuman verified\b/i.test(text), 'no human verified claim');
  assert(!/\bchain transaction\b/i.test(text), 'no chain transaction');
}

async function main(): Promise<void> {
  __resetAccountabilityProfileStoreForTests();
  __resetEvidencePacketStoreForTests();

  const profileStore = getAccountabilityProfileStore();
  const evidenceStore = getEvidencePacketStore();

  let profile = buildAccountabilityProfile({
    profileType: 'facility',
    companyName: 'Test Company',
    facilityName: 'Manila Bay Test Site',
    lat: 14.5995,
    lng: 120.9842,
    radiusKm: 12,
    useCaseId: 'plastic_pollution_watch',
    claimText: 'Test claim for screening only',
  });
  profile = await profileStore.save(profile);

  assert(profile.profileId.startsWith('ap_'), 'profileId prefix');
  assert(
    profile.safetyLabels.pending_verification === true &&
      profile.safetyLabels.human_verified === false &&
      profile.safetyLabels.blockchain_anchored === false,
    'safety labels strict',
  );
  assert(profile.validationStatus === 'pending_verification', 'validation pending');
  scanForbidden(`${profile.claimText ?? ''} ${profile.companyName ?? ''}`);

  const ran = await runEvidenceForProfile(profile.profileId, {});
  assert(ran != null, 'run evidence');
  const r = ran!;
  const afterRun = r.profile;
  assert(afterRun.evidencePacketIds.length >= 1, 'packet attached');
  const pkt = await evidenceStore.get(afterRun.evidencePacketIds[0]!);
  assert(pkt != null, 'packet exists in evidence store');

  scanForbidden(`${afterRun.anomalySummary ?? ''} ${afterRun.riskLevel ?? ''}`);
  scanForbidden(JSON.stringify(r.risk));
  assert(afterRun.riskLevel != null, 'riskLevel set');
  assert(!/\bfraud\b/i.test(afterRun.anomalySummary ?? ''), 'no fraud wording');
  assert(afterRun.validationStatus === 'pending_verification', 'validation stays pending');

  const got = await profileStore.get(profile.profileId);
  assert(got?.profileId === profile.profileId, 'GET by id');

  const listed = await profileStore.list(20);
  assert(listed.some((p) => p.profileId === profile.profileId), 'list contains profile');

  const riskDirect = calculateAccountabilityRisk(got!, [pkt!]);
  scanForbidden(JSON.stringify(riskDirect));

  const recalc = await recalculateAndPersistProfileRisk(profile.profileId);
  assert(recalc != null, 'recalculate');

  console.log('[smokeAccountabilityProfiles] OK', {
    profileId: profile.profileId,
    packetId: afterRun.evidencePacketIds[0],
    riskLevel: afterRun.riskLevel,
    storeMode: profileStore.mode,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
