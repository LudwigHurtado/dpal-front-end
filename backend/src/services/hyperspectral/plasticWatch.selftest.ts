/**
 * Offline assertions for Hyperspectral Plastic Watch provider readiness + drone prepare.
 * Run: cd backend && npm run test:plastic-watch
 */
import assert from 'node:assert/strict';
import { buildPlasticWatchProviderReadinessPayload } from './providerStatus';
import { buildDroneValidationAcknowledgment, validateDroneRequestBody } from './droneValidationProvider';

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
