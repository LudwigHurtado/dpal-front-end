/**
 * In-process Express smoke: GET/POST /scan share normalization (no external CMR when lanes are off).
 * Run: cd backend && npx tsx src/services/hyperspectral/plasticWatch.routeScan.selftest.ts
 */
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import hyperspectralRouter from '../../routes/hyperspectralPlasticWatch';

const saved = { ...process.env };

function restoreEnv() {
  process.env = { ...saved };
}

function clearPlasticAndEoEnv() {
  delete process.env.DPAL_PACE_SPECTRAL_ENABLED;
  delete process.env.DPAL_EMIT_L2A_ENABLED;
  delete process.env.NASA_EARTHDATA_TOKEN;
  delete process.env.EARTH_OBSERVATION_LIVE_ENABLED;
  delete process.env.DPAL_DRONE_VALIDATION_ENABLED;
  delete process.env.DPAL_DRONE_PROVIDER_MODE;
}

const manilaQuery =
  'lat=14.5995&lng=120.9842&radiusKm=12&baselineDate=2025-11-25&currentDate=2026-05-12&environmentType=coast&quickPreset=6mo';

const manilaBody = {
  lat: 14.5995,
  lng: 120.9842,
  radiusKm: 12,
  baselineDate: '2025-11-25',
  currentDate: '2026-05-12',
  environmentType: 'coast',
  quickPreset: '6mo',
  aoiGeoJson: null,
};

function assertScanShape(json: unknown) {
  assert.ok(json && typeof json === 'object');
  const o = json as Record<string, unknown>;
  assert.equal(o.ok, true);
  assert.ok(o.providers && typeof o.providers === 'object');
  const p = o.providers as Record<string, unknown>;
  assert.ok(p.pace && typeof p.pace === 'object');
  assert.ok(p.emit && typeof p.emit === 'object');
  assert.ok(p.drone && typeof p.drone === 'object');
  assert.ok(o.plasticRisk && typeof o.plasticRisk === 'object');
  assert.ok(o.evidencePacket && typeof o.evidencePacket === 'object');
  assert.equal(o.plasticRiskScore, null);
}

async function main() {
  clearPlasticAndEoEnv();

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/hyperspectral-plastic-watch', hyperspectralRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no listen address');

  const base = `http://127.0.0.1:${addr.port}/api/hyperspectral-plastic-watch`;

  try {
    const getRes = await fetch(`${base}/scan?${manilaQuery}`);
    assert.equal(getRes.status, 200);
    const getJson = (await getRes.json()) as Record<string, unknown>;
    assertScanShape(getJson);

    const postRes = await fetch(`${base}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manilaBody),
    });
    assert.equal(postRes.status, 200);
    const postJson = (await postRes.json()) as Record<string, unknown>;
    assertScanShape(postJson);

    const postLongRes = await fetch(`${base}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: 14.5995,
        longitude: 120.9842,
        radiusKm: 12,
        baselineDate: '2025-11-25',
        currentDate: '2026-05-12',
        environmentType: 'coast',
        quickPreset: '6mo',
        aoiGeoJson: null,
      }),
    });
    assert.equal(postLongRes.status, 200);
    assertScanShape(await postLongRes.json());

    const compactRes = await fetch(`${base}/scan?${manilaQuery}&compact=true`);
    assert.equal(compactRes.status, 200);
    const compactJson = (await compactRes.json()) as Record<string, unknown>;
    assertScanShape(compactJson);
    const paceBlock = (compactJson.providers as Record<string, unknown>).pace as Record<string, unknown>;
    const scenes = paceBlock.scenes as unknown[] | undefined;
    if (scenes?.length) {
      const s0 = scenes[0] as Record<string, unknown>;
      assert.equal('links' in s0, false);
      assert.ok(typeof s0.conceptId === 'string');
    }
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    restoreEnv();
  }

  console.log('plasticWatch.routeScan.selftest: all passed');
}

main().catch((e) => {
  console.error(e);
  restoreEnv();
  process.exit(1);
});
