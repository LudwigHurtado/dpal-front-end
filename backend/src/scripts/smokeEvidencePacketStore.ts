/**
 * Optional smoke: which evidence packet store is active + round-trip when DB is configured.
 * Run from backend/: `npm run smoke:evidence-packet-store`
 */
import { buildEvidencePacketFromSourceRun } from '../environmental-intelligence/evidencePackets/evidencePacketBuilder';
import {
  __resetEvidencePacketStoreForTests,
  getActiveEvidencePacketStoreMode,
  getEvidencePacketStore,
  isDatabaseUrlConfigured,
} from '../environmental-intelligence/evidencePackets/evidencePacketStore';
import { PROVIDER_RUN_SAFETY } from '../environmental-intelligence/sources/providerAdapters';
import type { EnvironmentalSourceRunResponse } from '../environmental-intelligence/sources/sourceRunService';

function assert(c: boolean, m: string): void {
  if (!c) {
    console.error('[smokeEvidencePacketStore] FAIL:', m);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  __resetEvidencePacketStoreForTests();

  if (!isDatabaseUrlConfigured()) {
    console.warn('[smokeEvidencePacketStore] DATABASE_URL not set — using in-memory fallback (expected in some dev setups).');
    const store = getEvidencePacketStore();
    assert(store.mode === 'memory', 'expected memory store without DATABASE_URL');
    console.log('[smokeEvidencePacketStore] OK (memory fallback only)');
    return;
  }

  const store = getEvidencePacketStore();
  const mode = getActiveEvidencePacketStoreMode();
  assert(mode === 'prisma', `expected prisma store when DATABASE_URL is set, got ${mode}`);

  const minimalRun: EnvironmentalSourceRunResponse = {
    ok: true,
    runId: `smoke-store-run-${Date.now()}`,
    requestedSources: [],
    results: [],
    normalizedEvidenceLanes: [],
    confidence: { overall: 'pending', rationale: ['smoke'], pendingVerification: true },
    safetyLabels: PROVIDER_RUN_SAFETY,
    limitations: [],
  };

  const packet = buildEvidencePacketFromSourceRun({
    sourceRunResponse: minimalRun,
    title: 'smoke evidence packet store',
  });

  await store.save(packet);
  const got = await store.get(packet.packetId);
  assert(got != null && got.packetId === packet.packetId, 'prisma get by packetId');
  const listed = await store.list(10);
  assert(listed.some((p) => p.packetId === packet.packetId), 'prisma list');

  console.log('[smokeEvidencePacketStore] OK', { mode: store.mode, packetId: packet.packetId });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
