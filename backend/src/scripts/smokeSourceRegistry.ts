import { getBackendSourceRegistry } from '../environmental-intelligence/sources/sourceRegistry';
import { getAllBusinessUseCases } from '../environmental-intelligence/sources/businessUseCasesBackend';
import { assertSafetyInvariants, getSafetyRulesSummary } from '../environmental-intelligence/sources/safetyRules';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('[smokeSourceRegistry] FAIL:', msg);
    process.exit(1);
  }
}

const reg = getBackendSourceRegistry();
const ids = new Set(reg.map((r) => r.sourceId));

assert(ids.has('PACE_OCI'), 'PACE_OCI missing');
assert(ids.has('SENTINEL_5P_TROPOMI'), 'SENTINEL_5P_TROPOMI missing');
assert(ids.has('EPA_DATASET'), 'EPA_DATASET missing');
assert(ids.has('QR_EVIDENCE'), 'QR_EVIDENCE missing');
assert(reg.length >= 25, `expected >= 25 sources, got ${reg.length}`);

const ucs = getAllBusinessUseCases();
assert(ucs.length >= 20, `expected >= 20 use cases, got ${ucs.length}`);

assert(assertSafetyInvariants(), 'safety invariant check failed');
const sr = getSafetyRulesSummary();
assert(sr.blocksAutomaticClaims.includes('viu'), 'expected VIU block in safety summary');

console.log('[smokeSourceRegistry] OK', { sources: reg.length, useCases: ucs.length, safety: sr.blocksAutomaticClaims.length });
