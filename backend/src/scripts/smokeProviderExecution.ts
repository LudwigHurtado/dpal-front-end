/**
 * Smoke: provider execution + use-case runner (no HTTP server).
 * Run from backend/: `npm run smoke:provider-execution`
 */
import { runProviderAdapter } from '../environmental-intelligence/sources/providerAdapterRegistry';
import { assertSafetyInvariants } from '../environmental-intelligence/sources/safetyRules';
import { executeEnvironmentalSourceRun } from '../environmental-intelligence/sources/sourceRunService';

const MANILA_BAY = { lat: 14.5995, lng: 120.9842, radiusKm: 25 };

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('[smokeProviderExecution] FAIL:', msg);
    process.exit(1);
  }
}

function assertGlobalSafety(s: {
  pending_verification: boolean;
  human_verified: boolean;
  blockchain_anchored: boolean;
}): void {
  assert(s.pending_verification === true, 'response safetyLabels.pending_verification must stay true');
  assert(s.human_verified === false, 'response safetyLabels.human_verified must stay false');
  assert(s.blockchain_anchored === false, 'response safetyLabels.blockchain_anchored must stay false');
}

function assertResultSafety(
  results: Array<{
    safetyLabels: { pending_verification: boolean; human_verified: boolean; blockchain_anchored: boolean };
  }>,
): void {
  for (const r of results) {
    assertGlobalSafety(r.safetyLabels);
  }
}

function limitationsBlob(parts: string[][]): string {
  return parts.flat().join('\n');
}

async function main(): Promise<void> {
  assert(assertSafetyInvariants(), 'assertSafetyInvariants() failed');

  const epa = await executeEnvironmentalSourceRun({
    sourceIds: ['EPA_DATASET'],
    ...MANILA_BAY,
  });
  assert(epa.ok, 'EPA batch ok');
  assert(epa.results.some((r) => r.sourceId === 'EPA_DATASET'), 'expected EPA_DATASET result');
  assertResultSafety(epa.results);
  assertGlobalSafety(epa.safetyLabels);

  const wx = await executeEnvironmentalSourceRun({
    sourceIds: ['WEATHER_DATA'],
    ...MANILA_BAY,
  });
  assert(wx.ok && wx.results.some((r) => r.sourceId === 'WEATHER_DATA'), 'WEATHER_DATA run');

  const qrEmpty = await executeEnvironmentalSourceRun({
    sourceIds: ['QR_EVIDENCE'],
    ...MANILA_BAY,
    evidenceRefs: [],
  });
  const qrRow = qrEmpty.results.find((r) => r.sourceId === 'QR_EVIDENCE');
  assert(qrRow != null && qrRow.status !== 'success', 'QR_EVIDENCE with no refs must not report success');

  const fut = await runProviderAdapter('ESA_BIOMASS', { ...MANILA_BAY });
  assert(fut.status === 'future', `expected future for ESA_BIOMASS, got ${fut.status}`);

  const com = await runProviderAdapter('GHGSAT', { ...MANILA_BAY });
  assert(
    com.status === 'commercial_required' || com.status === 'not_configured',
    `expected commercial gating for GHGSAT, got ${com.status}`,
  );

  const plastic = await executeEnvironmentalSourceRun({
    useCaseId: 'plastic_pollution_watch',
    ...MANILA_BAY,
  });
  assert(plastic.ok, 'plastic use case run ok');
  assert(
    Boolean(plastic.skippedSources?.length),
    'expected skipped optional/required sources for plastic_pollution_watch',
  );
  const aisSkip = plastic.skippedSources!.find((s) => s.sourceId === 'AIS_VESSEL_DATA');
  assert(Boolean(aisSkip), 'expected AIS_VESSEL_DATA to be skipped with a reason');

  const scan = limitationsBlob([
    plastic.limitations,
    ...plastic.results.map((r) => r.limitations),
    plastic.normalizedEvidenceLanes.map((l) => l.detail ?? ''),
    plastic.confidence.rationale,
  ]);
  assert(!/\bcarbon credits?\b/i.test(scan), 'limitations must not auto-claim carbon credits');
  assert(!/\bhuman verified\b/i.test(scan), 'limitations must not claim human verification');
  assert(!/\bviu\b/i.test(scan), 'limitations must not claim VIU');
  assert(!/\blegal (conclusion|determination|enforcement)\b/i.test(scan), 'limitations must not assert legal conclusions');

  assertResultSafety(plastic.results);
  assertGlobalSafety(plastic.safetyLabels);

  console.log('[smokeProviderExecution] OK', {
    epaStatus: epa.results.find((r) => r.sourceId === 'EPA_DATASET')?.status,
    skipped: plastic.skippedSources?.length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
