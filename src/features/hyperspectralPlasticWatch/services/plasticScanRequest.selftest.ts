/**
 * Run: npx tsx src/features/hyperspectralPlasticWatch/services/plasticScanRequest.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  buildPlasticScanRequestBody,
  DEFAULT_PLASTIC_SCAN_PAGE_SIZE,
  isPendingPlasticIndexExtraction,
  normalizePlasticScanResponse,
  parseLocalizedNumber,
  PENDING_PLASTIC_INDEX_STATUS_MESSAGE,
  plasticScanPendingStatusMessage,
  toScanDateOnly,
  validatePlasticScanPageSize,
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
assert.equal('pageSize' in body, false);
assert.equal(validatePlasticScanPageSize(undefined), null);
assert.equal(validatePlasticScanPageSize(DEFAULT_PLASTIC_SCAN_PAGE_SIZE), DEFAULT_PLASTIC_SCAN_PAGE_SIZE);

const bodyWithPage = buildPlasticScanRequestBody({
  lat: 14.5995,
  lng: 120.9842,
  radiusKm: 12,
  baselineDate: '2025-11-15',
  currentDate: '2026-05-15',
  environmentType: 'coast',
  pageSize: 50,
});
assert.equal(bodyWithPage.pageSize, 50);
assert.equal(validatePlasticScanPageSize(101), null);
assert.equal(validatePlasticScanPageSize(0), null);

const paceDiagnostics = normalizePlasticScanResponse({
  ok: true,
  scanId: 'pace-cmr-1',
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
  providers: {
    pace: {
      status: 'available',
      message:
        'NASA CMR returned the first 20 matching PACE granule(s) for this AOI/date range — metadata only. This is a page-limited result, not necessarily the total available observations. No spectral index extraction in this build. Not plastic classification — field validation required.',
      returnedCount: 20,
      totalHits: null,
      pageSize: 20,
      isPageLimited: true,
      queryShortName: 'PACE_OCI_L2_BGC',
      boundingBox: '120.5,14.2,121.5,15.2',
      temporal: '2025-11-15T00:00:00.000Z,2026-05-15T23:59:59.000Z',
      scenes: Array.from({ length: 20 }, (_, i) => ({
        provider: 'PACE' as const,
        collection: 'PACE_OCI_L2_BGC',
        conceptId: `c-${i}`,
        title: `Granule ${i}`,
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-01-01T23:59:59.000Z',
        cloudCover: null,
        source: 'NASA CMR' as const,
      })),
    },
  },
  limitations: ['Metadata only'],
  generatedAt: new Date().toISOString(),
});
assert.ok(paceDiagnostics);
assert.equal(paceDiagnostics?.providers.pace.returnedCount, 20);
assert.equal(paceDiagnostics?.providers.pace.isPageLimited, true);
assert.match(paceDiagnostics?.providers.pace.message ?? '', /first 20 matching/);
assert.equal(paceDiagnostics?.plasticRisk.score, null);

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
