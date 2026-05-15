/**
 * CarbonPura evidence chain smoke — projects, events, draft packet.
 * Run from backend/: `npm run smoke:carbonpura-evidence`
 */
import {
  __resetCarbonPuraEvidenceStoreForTests,
  getActiveCarbonPuraEvidenceStoreMode,
  getCarbonPuraEvidenceStore,
  isDatabaseUrlConfigured,
} from '../services/carbonpura/carbonPuraEvidenceStore';
import { CARBONPURA_DEFAULT_PARTNER_KEY } from '../services/carbonpura/carbonPuraEvidenceTypes';

function assert(c: boolean, m: string): void {
  if (!c) {
    console.error('[smokeCarbonPuraEvidence] FAIL:', m);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  __resetCarbonPuraEvidenceStoreForTests();
  const store = getCarbonPuraEvidenceStore();
  const mode = getActiveCarbonPuraEvidenceStoreMode();
  console.log('[smokeCarbonPuraEvidence] store mode:', mode, 'DATABASE_URL:', isDatabaseUrlConfigured() ? 'set' : 'unset');

  const projectId = `smoke-cp-${Date.now()}`;
  const project = await store.createProject({
    projectId,
    partnerKey: CARBONPURA_DEFAULT_PARTNER_KEY,
    name: 'Smoke CarbonPura Project',
    status: 'draft',
    locationLabel: 'Smoke test',
  });
  assert(project.projectId === projectId, 'project created');

  const event = await store.createEvent({
    projectId,
    partnerKey: CARBONPURA_DEFAULT_PARTNER_KEY,
    moduleId: 'hyperspectralPlasticWatch',
    moduleName: 'Hyperspectral Plastic Watch',
    sourceSuite: 'OC_AOP',
    eventType: 'evidence_source_selected',
    title: 'PACE OC_AOP evidence source',
    summary: 'Smoke evidence source selection only.',
    status: 'evidence_source_selected',
    coordinates: null,
    aoiGeoJson: null,
    provider: null,
    confidenceUse: 'Screening context only — not verified plastic detection.',
    rawPayloadJson: { smoke: true },
    limitationsJson: ['Evidence selection only; scan output attachment pending unless module has exported result.'],
  });
  assert(event.eventId.length > 0 && event.evidenceHash.length === 64, 'event hash');

  const packet = await store.createDraftPacket({
    projectId,
    partnerKey: CARBONPURA_DEFAULT_PARTNER_KEY,
    title: 'Smoke draft packet',
    summary: 'Draft aggregation smoke test.',
    eventIds: [event.eventId],
  });
  assert(packet.status === 'draft', 'packet is draft');
  assert(packet.packetHash.length === 64, 'packet hash');
  assert(packet.qrUrl == null, 'qr pending');

  const listed = await store.listPackets(projectId);
  assert(listed.some((p) => p.packetId === packet.packetId), 'packet listed');

  console.log('[smokeCarbonPuraEvidence] OK', {
    mode,
    projectId,
    eventId: event.eventId,
    packetId: packet.packetId,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
