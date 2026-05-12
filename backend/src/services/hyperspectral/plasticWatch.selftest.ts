/**
 * Offline assertions for Hyperspectral Plastic Watch provider readiness + drone prepare.
 * Run: cd backend && npm run test:plastic-watch
 */
import assert from 'node:assert/strict';
import { buildPlasticWatchProviderReadinessPayload } from './providerStatus';
import { buildDroneValidationAcknowledgment, validateDroneRequestBody } from './droneValidationProvider';
import { parsePlasticWatchScanRaw } from './scanRequestNormalize';

const saved = { ...process.env };

function restoreEnv() {
  process.env = { ...saved };
}

function clearPlasticEnv() {
  delete process.env.DPAL_PACE_SPECTRAL_ENABLED;
  delete process.env.DPAL_EMIT_L2A_ENABLED;
  delete process.env.NASA_EARTHDATA_TOKEN;
  delete process.env.EARTH_OBSERVATION_LIVE_ENABLED;
  delete process.env.DPAL_DRONE_VALIDATION_ENABLED;
  delete process.env.DPAL_DRONE_PROVIDER_MODE;
  delete process.env.DPAL_DRONE_PROVIDER_API_URL;
  delete process.env.DPAL_DRONE_PROVIDER_API_KEY;
}

function main() {
  clearPlasticEnv();

  const pr = buildPlasticWatchProviderReadinessPayload();
  assert.equal(pr.ok, true);
  assert.equal(pr.pace.status, 'not_enabled');
  assert.equal(pr.emit.status, 'not_enabled');
  assert.equal(pr.drone.status, 'not_enabled');

  const bad = validateDroneRequestBody({});
  assert.equal(bad.ok, false);

  const good = validateDroneRequestBody({
    lat: 1,
    lng: 2,
    radiusKm: 5,
    siteLabel: 'Bay',
  });
  assert.equal(good.ok, true);
  const ack = buildDroneValidationAcknowledgment(good.value);
  assert.equal(ack.dispatched, false);

  const manila = parsePlasticWatchScanRaw({
    lat: 14.5995,
    lng: 120.9842,
    radiusKm: 12,
    baselineDate: '2025-11-25',
    currentDate: '2026-05-12',
    environmentType: 'coast',
    quickPreset: '6mo',
    aoiGeoJson: null,
  });
  assert.equal(manila.ok, true);
  if (manila.ok) {
    assert.equal(manila.value.aoiGeoJson, undefined);
    assert.equal(manila.value.compactScenes, false);
  }

  const longOnly = parsePlasticWatchScanRaw({
    lat: 14.5995,
    longitude: 120.9842,
    radiusKm: 12,
    baselineDate: '2025-11-25',
    currentDate: '2026-05-12',
    environmentType: 'coast',
  });
  assert.equal(longOnly.ok, true);
  if (longOnly.ok) assert.equal(longOnly.value.lng, 120.9842);

  const compactOn = parsePlasticWatchScanRaw({
    lat: 14.5995,
    lng: 120.9842,
    radiusKm: 12,
    baselineDate: '2025-11-25',
    currentDate: '2026-05-12',
    environmentType: 'coast',
    compact: 'true',
  });
  assert.equal(compactOn.ok, true);
  if (compactOn.ok) assert.equal(compactOn.value.compactScenes, true);

  const compactOffWithLinks = parsePlasticWatchScanRaw({
    lat: 14.5995,
    lng: 120.9842,
    radiusKm: 12,
    baselineDate: '2025-11-25',
    currentDate: '2026-05-12',
    environmentType: 'coast',
    compact: 'true',
    includeLinks: 'true',
  });
  assert.equal(compactOffWithLinks.ok, true);
  if (compactOffWithLinks.ok) {
    assert.equal(compactOffWithLinks.value.includeFullSceneLinks, true);
    assert.equal(compactOffWithLinks.value.compactScenes, false);
  }

  restoreEnv();
  console.log('plasticWatch.selftest: all passed');
}

try {
  main();
} catch (e) {
  restoreEnv();
  console.error(e);
  process.exit(1);
}
