/**
 * Quick assertions for hub connectivity helpers (run: npx tsx src/services/environmentalHubConnectivity.selftest.ts).
 */
import assert from 'node:assert/strict';
import {
  parseRetryAfterSeconds,
  computeCooldownSecondsAfter429,
  apply429ToPersisted,
  applySuccessToPersisted,
  summarizePillarHubConnectivity,
} from './environmentalHubConnectivity';
import type { HubConnectivityRow } from './environmentalHubConnectivity';

function hdr(init: Record<string, string>) {
  return new Headers(init);
}

assert.equal(parseRetryAfterSeconds(hdr({ 'retry-after': '90' })), 90);

const future = new Date(Date.now() + 125_000).toUTCString();
const ra = parseRetryAfterSeconds(hdr({ 'retry-after': future }));
assert.ok(ra !== null && ra >= 118 && ra <= 132);

assert.equal(computeCooldownSecondsAfter429(1, null), 60);
assert.equal(computeCooldownSecondsAfter429(2, null), 120);
assert.equal(computeCooldownSecondsAfter429(3, null), 300);
assert.equal(computeCooldownSecondsAfter429(4, null), 900);
assert.equal(computeCooldownSecondsAfter429(99, null), 900);
assert.equal(computeCooldownSecondsAfter429(1, 30), 30);
assert.equal(computeCooldownSecondsAfter429(1, 999_999), 15 * 60);

const s0 = applySuccessToPersisted(undefined, 'ok', 'ok');
assert.equal(s0.consecutive429, 0);
const s1 = apply429ToPersisted(s0, null);
assert.equal(s1.consecutive429, 1);
assert.ok(s1.lastSuccessEpochMs != null);
assert.equal(s1.lastSuccessDetail, 'ok');

const row = (partial: Partial<HubConnectivityRow>): HubConnectivityRow => ({
  id: 'carb',
  label: 'CARB',
  status: 'ok',
  detail: 'Reachable',
  lastCheckedAt: new Date(),
  nextRetryAt: null,
  retryAfterSeconds: null,
  lastSuccessfulAt: new Date(),
  lastError: null,
  usingCachedResult: false,
  ...partial,
});

const emptyPillar = summarizePillarHubConnectivity('pollution', []);
assert.match(emptyPillar.adapterStatus, /not loaded/i);
assert.equal(emptyPillar.rateLimitStatus, 'unknown');

const rateLimited: HubConnectivityRow[] = [
  row({ id: 'health', status: 'ok' }),
  row({ id: 'carb', status: 'rate_limited', nextRetryAt: new Date(Date.now() + 60_000), retryAfterSeconds: 60 }),
];
const rl = summarizePillarHubConnectivity('pollution', rateLimited);
assert.equal(rl.rateLimitStatus, 'rate_limited');
assert.match(rl.adapterStatus, /Rate limited/i);
assert.ok(rl.nextRetryAt);

const cooldownRows: HubConnectivityRow[] = [
  row({
    id: 'carb',
    status: 'rate_limited',
    detail: 'Rate limited — waiting before retry. Retry after: 42s',
    nextRetryAt: new Date(Date.now() + 42_000),
    retryAfterSeconds: 42,
  }),
];
const cd = summarizePillarHubConnectivity('pollution', cooldownRows);
assert.equal(cd.rateLimitStatus, 'cooldown');
assert.match(cd.adapterStatus, /cooldown|Dry Run/i);

console.log('environmentalHubConnectivity.selftest: all passed');
