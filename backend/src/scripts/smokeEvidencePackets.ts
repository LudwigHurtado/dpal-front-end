/**
 * Smoke: Evidence Packet v2 (builder + store + integrity hash).
 * Run from backend/: `npm run smoke:evidence-packets`
 */
import { buildEvidencePacketFromSourceRun } from '../environmental-intelligence/evidencePackets/evidencePacketBuilder';
import { getEvidencePacketStore, __resetEvidencePacketStoreForTests } from '../environmental-intelligence/evidencePackets/evidencePacketStore';
import { INTEGRITY_HASH_LIMITATION } from '../environmental-intelligence/evidencePackets/evidencePacketSafety';
import { executeEnvironmentalSourceRun } from '../environmental-intelligence/sources/sourceRunService';
import type { EnvironmentalSourceRunResponse } from '../environmental-intelligence/sources/sourceRunService';

function assert(c: boolean, m: string): void {
  if (!c) {
    console.error('[smokeEvidencePackets] FAIL:', m);
    process.exit(1);
  }
}

function scanForbiddenClaims(text: string): void {
  assert(!/\bcarbon credits?\b/i.test(text), 'packet text must not auto-claim carbon credits');
  assert(!/\bviu\b/i.test(text), 'packet text must not claim VIU');
  assert(!/\bregistry approval\b/i.test(text), 'packet text must not claim registry approval');
  assert(!/\blegal (conclusion|liability|enforcement)\b/i.test(text), 'packet text must not assert legal conclusions');
  assert(!/\bchain transaction\b/i.test(text), 'no chain transaction language');
}

async function main(): Promise<void> {
  __resetEvidencePacketStoreForTests();
  const store = getEvidencePacketStore();

  const run = await executeEnvironmentalSourceRun({
    sourceIds: ['QR_EVIDENCE', 'EPA_DATASET', 'WEATHER_DATA'],
    lat: 14.5995,
    lng: 120.9842,
    radiusKm: 12,
    currentDate: '2026-05-12',
  });
  assert(run.ok, 'source run ok');

  const runForPacket: EnvironmentalSourceRunResponse = run;

  const packet = buildEvidencePacketFromSourceRun({
    sourceRunResponse: runForPacket,
    useCaseId: 'plastic_pollution_watch',
    title: 'Manila Bay screening packet',
    locationLabel: 'Manila Bay area',
    lat: 14.5995,
    lng: 120.9842,
    radiusKm: 12,
    currentDate: '2026-05-12',
  });

  assert(packet.packetId.startsWith('ep_'), 'packetId prefix');
  assert(packet.integrityHash.length === 64, 'integrityHash sha256 hex length');
  assert(packet.integrityHashLimitation.includes('not blockchain anchoring'), 'integrity limitation present');
  assert(
    packet.safetyLabels.pending_verification === true &&
      packet.safetyLabels.human_verified === false &&
      packet.safetyLabels.blockchain_anchored === false,
    'safety labels',
  );
  assert(packet.validationStatus === 'pending_verification', 'validationStatus default');

  scanForbiddenClaims(JSON.stringify(packet));
  assert(
    INTEGRITY_HASH_LIMITATION.toLowerCase().includes('not blockchain anchoring'),
    'integrity copy must clarify this is not blockchain anchoring',
  );

  await store.save(packet);

  const got = await store.get(packet.packetId);
  assert(got != null && got.packetId === packet.packetId, 'GET by id');

  const listed = await store.list(20);
  assert(listed.some((p) => p.packetId === packet.packetId), 'list contains packet');

  console.log('[smokeEvidencePackets] OK', { packetId: packet.packetId, integrityHash: packet.integrityHash.slice(0, 12) + '…' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
