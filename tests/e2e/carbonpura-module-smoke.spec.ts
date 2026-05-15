import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * CarbonPura Phase 3 — render-only route smoke.
 * Does not trigger live provider scans; stubs /api/** with shapes modules expect on load.
 */

const SCAN_ENDPOINTS = [
  '/api/hyperspectral-plastic-watch/scan',
  '/api/hyperspectral-plastic-watch/evidence-packet',
  '/api/forest-integrity/scan',
  '/api/forest-integrity/evidence-packet',
  '/api/earth-observation/scan',
  '/api/water/satellite-preview',
  '/api/copernicus/statistics',
] as const;

const CARBONPURA_BANNER = /Opened from CarbonPura workspace/i;

const PLASTIC_PROVIDER_STUB = {
  ok: true,
  generatedAt: new Date().toISOString(),
  pace: {
    enabled: false,
    configured: true,
    status: 'partial',
    label: 'NASA PACE',
    message: 'PACE disabled (e2e stub).',
  },
  emit: {
    enabled: false,
    configured: false,
    status: 'not_enabled',
    label: 'NASA EMIT',
    message: 'EMIT disabled (e2e stub).',
  },
  sentinelLandsat: {
    enabled: true,
    configured: false,
    status: 'unavailable',
    label: 'Sentinel / Landsat fallback',
    message: 'EO off in stub.',
  },
  drone: {
    enabled: false,
    configured: false,
    status: 'not_enabled',
    label: 'Drone Validation',
    message: 'Drone connector off in stub.',
  },
  paceConfigured: true,
  emitConfigured: false,
  earthObservationLive: false,
  notes: [],
};

const FOREST_PROVIDER_STUB = {
  ok: true,
  generatedAt: new Date().toISOString(),
  earthObservationLive: false,
  nasaFirmsConfigured: false,
  gfwConfigured: false,
  gediImplemented: false,
  copernicusConfigured: false,
  notes: [],
};

async function stubApiNoScans(page: Page): Promise<Record<string, number>> {
  const scanHits: Record<string, number> = Object.fromEntries(SCAN_ENDPOINTS.map((k) => [k, 0]));

  await page.route('**/api/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    for (const key of SCAN_ENDPOINTS) {
      if (url.includes(key) && method !== 'GET') {
        scanHits[key] = (scanHits[key] ?? 0) + 1;
      }
    }

    if (url.includes('/health')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, service: 'e2e-stub' }),
      });
      return;
    }

    if (url.includes('/api/hyperspectral-plastic') && url.includes('provider-status')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PLASTIC_PROVIDER_STUB),
      });
      return;
    }

    if (url.includes('/api/hyperspectral-plastic') && url.includes('drone/status')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          generatedAt: new Date().toISOString(),
          enabled: false,
          configured: false,
          status: 'not_enabled',
          label: 'Drone Validation',
          message: 'Drone validation disabled (e2e stub).',
          mode: 'manual',
        }),
      });
      return;
    }

    if (url.includes('/api/forest-integrity') && url.includes('provider-status')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FOREST_PROVIDER_STUB),
      });
      return;
    }

    if (url.includes('/api/water/projects')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, projects: [] }),
      });
      return;
    }

    if (url.includes('/api/water/stats')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          stats: {
            totalProjects: 0,
            approvedProjects: 0,
            totalCreditsKL: 0,
            listedCredits: 0,
          },
        }),
      });
      return;
    }

    if (url.includes('/api/water/activity')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, feed: [] }),
      });
      return;
    }

    // GET on load — 404 triggers WaterMonitorView deterministic fallback (no adapter crash).
    if (url.includes('/api/water/satellite-preview')) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'not found' }),
      });
      return;
    }

    if (url.includes('/api/copernicus') || url.includes('copernicus')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, configured: false, message: 'e2e stub' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, stub: true }),
    });
  });

  return scanHits;
}

function assertNoScans(scanHits: Record<string, number>): void {
  const fired = Object.entries(scanHits).filter(([, n]) => n > 0);
  expect(fired, `Scan endpoints should not fire on load: ${JSON.stringify(fired)}`).toHaveLength(0);
}

async function expectPageRenders(page: Page): Promise<void> {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByText(/^Something went wrong$/)).toHaveCount(0);
}

test.describe('CarbonPura live module smoke', () => {
  test('CarbonPura workspace renders', async ({ page }) => {
    test.setTimeout(60_000);
    const scanHits = await stubApiNoScans(page);
    await page.goto('/partners/carbonpura');
    await expectPageRenders(page);
    await expect(page.getByRole('heading', { name: /PACE Product Intelligence Layer/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: /Live module verification matrix/i })).toBeVisible();
    assertNoScans(scanHits);
  });

  test('Water Operations Engine with CarbonPura context renders and shows banner', async ({ page }) => {
    test.setTimeout(90_000);
    const scanHits = await stubApiNoScans(page);
    await page.goto('/water/monitor?partner=carbonpura&projectId=carbonpura-demo-001');
    await expectPageRenders(page);
    await expect(page.getByText(/Water Operations Engine/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(CARBONPURA_BANNER)).toBeVisible();
    assertNoScans(scanHits);
  });

  test('Water Monitor survives malformed satellite-preview payload', async ({ page }) => {
    test.setTimeout(90_000);
    const scanHits = await stubApiNoScans(page);
    await page.route('**/api/water/satellite-preview**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.goto('/water/monitor?partner=carbonpura&projectId=carbonpura-demo-001');
    await expectPageRenders(page);
    await expect(page.getByText(/Water Operations Engine|Water Monitor|DPAL Water Monitor/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/Satellite preview response was incomplete|deterministic demo readings/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    assertNoScans(scanHits);
  });

  test('AquaScan with CarbonPura context renders and shows banner', async ({ page }) => {
    test.setTimeout(90_000);
    const scanHits = await stubApiNoScans(page);
    await page.goto('/water/aquascan?partner=carbonpura&projectId=carbonpura-demo-001&sourceSuite=OC_IOP');
    await expectPageRenders(page);
    await expect(page.getByText(/AquaScan/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(CARBONPURA_BANNER)).toBeVisible();
    assertNoScans(scanHits);
  });

  test('Plastic Watch with CarbonPura context renders and shows banner', async ({ page }) => {
    test.setTimeout(90_000);
    const scanHits = await stubApiNoScans(page);
    await page.goto(
      '/hyperspectral-plastic-watch?partner=carbonpura&projectId=carbonpura-demo-001&sourceSuite=OC_AOP',
    );
    await expectPageRenders(page);
    await expect(page.getByText(/Plastic Watch|Hyperspectral/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(CARBONPURA_BANNER)).toBeVisible();
    assertNoScans(scanHits);
  });

  test('Forest Integrity with CarbonPura context renders without crash (banner optional)', async ({ page }) => {
    test.setTimeout(90_000);
    const scanHits = await stubApiNoScans(page);
    await page.goto('/forest-integrity?partner=carbonpura&projectId=carbonpura-demo-001&sourceSuite=LANDVI');
    await expectPageRenders(page);
    await expect(page.getByText(/Forest Integrity|Forest/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(CARBONPURA_BANNER)).toHaveCount(0);
    assertNoScans(scanHits);
  });
});
