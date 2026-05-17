/**
 * USGS 3DEP service unit checks (no live HTTP).
 * Run: npx tsx backend/src/services/usgs3depService.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  get3depProviderStatus,
  parseUsgsEpqsElevation,
  validateLatLng,
} from './usgs3depService';

function testProviderStatus(): void {
  process.env.USGS_3DEP_ENABLED = 'true';
  process.env.USGS_3DEP_ELEVATION_POINT_QUERY = 'https://epqs.nationalmap.gov/v1';
  const status = get3depProviderStatus();
  assert.equal(status.enabled, true);
  assert.equal(status.provider, 'USGS_3DEP');
  assert.equal(status.requiresApiKey, false);
  assert.ok(status.elevationEndpointConfigured);
  assert.ok(status.capabilities.includes('point_elevation'));
}

function testValidation(): void {
  const badLat = validateLatLng(95, -118);
  assert.ok('ok' in badLat && badLat.ok === false);
  if ('ok' in badLat && badLat.ok === false) {
    assert.equal(badLat.error, 'USGS_3DEP_VALIDATION_ERROR');
  }
  const good = validateLatLng(34.05, -118.24);
  assert.ok(!('ok' in good));
  assert.equal((good as { lat: number }).lat, 34.05);
}

function testParseLegacyEpqs(): void {
  const parsed = parseUsgsEpqsElevation({
    USGS_Elevation_Point_Query_Service: {
      Elevation_Query: {
        x: -118.24,
        y: 34.05,
        Elevation: 71.2,
        Units: 'Meters',
        Data_Source: 'NED 1/3 arc-second',
      },
    },
  });
  assert.ok(parsed);
  assert.equal(parsed!.elevation, 71.2);
  assert.equal(parsed!.elevationUnit, 'Meters');
}

function testParseV1Epqs(): void {
  const parsed = parseUsgsEpqsElevation({
    value: '82.5',
    resolution: 1,
  });
  assert.ok(parsed);
  assert.equal(parsed!.elevation, 82.5);
}

async function main(): Promise<void> {
  testProviderStatus();
  testValidation();
  testParseLegacyEpqs();
  testParseV1Epqs();
  console.log('usgs3depService.selftest: all checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
