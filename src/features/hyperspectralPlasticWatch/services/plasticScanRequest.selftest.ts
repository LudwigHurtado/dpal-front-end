/**
 * Run: npx tsx src/features/hyperspectralPlasticWatch/services/plasticScanRequest.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  buildPlasticScanRequestBody,
  isPendingPlasticIndexExtraction,
  normalizePlasticScanResponse,
  parseLocalizedNumber,
  PENDING_PLASTIC_INDEX_STATUS_MESSAGE,
  plasticScanPendingStatusMessage,
  toScanDateOnly,
} from './plasticScanRequest';

assert.equal(parseLocalizedNumber('14,5995'), 14.5995);
assert.equal(parseLocalizedNumber('120,9842'), 120.9842);
assert.equal(parseLocalizedNumber('12'), 12);
assert.equal(toScanDateOnly('2025-11-15T12:00:00.000Z'), '2025-11-15');

const body = buildPlasticScanRequestBody({
  lat: '14,5995',
  lng: 120.9842,
  radiusKm: 12,
  baselineDate: '2025-11-15',
  currentDate: '2026-05-15',
  environmentType: 'coast',
  quickPreset: '6m',
  label: 'Plastic Watch AOI',
});
assert.equal(body.lat, 14.5995);
assert.equal(body.lng, 120.9842);
assert.equal(body.radiusKm, 12);
assert.equal(body.quickPreset, '6mo');
assert.equal(body.baselineDate, '2025-11-15');
assert.equal(body.currentDate, '2026-05-15');

const malformed = normalizePlasticScanResponse({
  ok: true,
  scanId: 'test-scan-1',
  label: 'AOI',
  riskLevel: 'pending_index_extraction',
  plasticRiskScore: null,
  plasticRisk: {
    score: null,
    status: 'pending_index_extraction',
    message: PENDING_PLASTIC_INDEX_STATUS_MESSAGE,
  },
  evidencePacket: {
    status: 'preview',
    claimsLevel: 'narrow_band_metadata',
    limitations: ['No numeric plastic-risk score yet.'],
    nextActions: ['Extract narrow-band indices'],
  },
  limitations: ['Metadata only'],
  generatedAt: new Date().toISOString(),
});
assert.ok(malformed);
assert.equal(malformed?.providers.pace.status, 'unavailable');
assert.ok(isPendingPlasticIndexExtraction(malformed!));
assert.equal(plasticScanPendingStatusMessage(malformed!), PENDING_PLASTIC_INDEX_STATUS_MESSAGE);

assert.equal(normalizePlasticScanResponse({ ok: true }), null);

console.log('plasticScanRequest.selftest: ok');
