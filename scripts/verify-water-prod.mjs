import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const BASE = 'https://dpal-front-end.vercel.app';
const ROUTE = '/water';
const OUT_DIR = path.resolve('artifacts', 'water-prod');

function nowIso() {
  return new Date().toISOString();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function run() {
  await ensureDir(OUT_DIR);
  const report = {
    startedAt: nowIso(),
    base: BASE,
    route: ROUTE,
    routeStatus: null,
    checks: {},
    consoleErrors: [],
    pageErrors: [],
    network: {
      gibs: [],
      nominatim: [],
      tileErrors: [],
    },
    screenshots: {
      initial: path.join(OUT_DIR, '01-water-initial.png'),
      desktopMap: path.join(OUT_DIR, '02-water-desktop-map.png'),
      mobile: path.join(OUT_DIR, '03-water-mobile.png'),
    },
    notes: [],
  };

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => report.pageErrors.push(String(err)));
  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    if (url.includes('gibs.earthdata.nasa.gov')) {
      report.network.gibs.push({ url, status });
      if (status >= 400) report.network.tileErrors.push({ url, status });
    }
    if (url.includes('nominatim.openstreetmap.org')) {
      report.network.nominatim.push({ url, status });
    }
  });

  const resp = await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  report.routeStatus = resp?.status() ?? null;
  await page.waitForTimeout(2500);

  await page.screenshot({ path: report.screenshots.initial, fullPage: true });

  report.checks.noBlankScreen = (await page.locator('body *').count()) > 10;
  report.checks.headerVisible = await page.locator('span:text-is("DPAL AquaScan")').first().isVisible();
  report.checks.mapSectionVisible = await page.getByText('AquaScan Map & GPS', { exact: false }).isVisible();

  const mapViewport = page.locator('div.relative.overflow-hidden.rounded-xl.border.border-slate-700').first();
  report.checks.mapContainerVisible = await mapViewport.isVisible().catch(() => false);
  const mapBox = await mapViewport.boundingBox();
  report.checks.mapHeightPx = mapBox ? Math.round(mapBox.height) : null;
  report.checks.mapWidthPx = mapBox ? Math.round(mapBox.width) : null;
  report.checks.mapHeightAtLeast500 = Boolean(mapBox && mapBox.height >= 500);

  const leafletContainer = page.locator('.leaflet-container').first();
  report.checks.leafletContainerVisible = await leafletContainer.isVisible().catch(() => false);

  const tileCount = await page.locator('.leaflet-tile').count();
  report.checks.tileDomCount = tileCount;
  report.checks.tilesRendered = tileCount > 0;

  const controlPanel = page.locator('section', { hasText: 'AquaScan Map & GPS' }).first();
  await controlPanel.screenshot({ path: report.screenshots.desktopMap });

  // Satellite layer selector interaction.
  const selectorSection = page.locator('article', { hasText: 'Satellite Layer Selector' }).first();
  report.checks.layerSelectorVisible = await selectorSection.isVisible().catch(() => false);
  const layerButtons = selectorSection.locator('button');
  const layerCount = await layerButtons.count();
  report.checks.layerOptionCount = layerCount;
  if (layerCount > 0) {
    await layerButtons.nth(Math.min(1, layerCount - 1)).click();
    await page.waitForTimeout(800);
    report.checks.layerToggleInteracted = true;
  } else {
    report.checks.layerToggleInteracted = false;
  }

  // Map interactions via provided controls.
  const clickButton = async (name) => {
    const btn = page.getByRole('button', { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(500);
      return true;
    }
    return false;
  };

  report.checks.zoomInButton = await clickButton('Zoom +');
  report.checks.zoomOutButton = await clickButton('Zoom -');
  report.checks.centerOnProject = await clickButton('Center on project');
  report.checks.resetView = await clickButton('Reset view');
  report.checks.gpsButtonClicked = await clickButton('Use current GPS');

  // Click-to-inspect map and check metadata update block exists.
  if (mapBox) {
    await page.mouse.click(mapBox.x + mapBox.width * 0.5, mapBox.y + mapBox.height * 0.55);
    await page.waitForTimeout(700);
  }
  report.checks.metadataPanelVisible = await page.getByText('Selection mode:', { exact: false }).isVisible().catch(() => false);
  report.checks.selectedCoordinatesVisible = await page.getByText('Selected coordinates:', { exact: false }).isVisible().catch(() => false);

  // AOI draw/create points.
  const drawBtn = page.getByRole('button', { name: 'Draw AOI points' }).first();
  if (await drawBtn.isVisible().catch(() => false)) {
    await drawBtn.click();
    await page.waitForTimeout(200);
    if (mapBox) {
      await page.mouse.click(mapBox.x + 120, mapBox.y + 120);
      await page.mouse.click(mapBox.x + 240, mapBox.y + 170);
      await page.mouse.click(mapBox.x + 180, mapBox.y + 260);
      await page.waitForTimeout(800);
    }
    report.checks.aoiDrawInteracted = true;
    report.checks.aoiSaveButtonVisible = await page.getByRole('button', { name: 'Save AOI' }).isVisible().catch(() => false);
  } else {
    report.checks.aoiDrawInteracted = false;
  }

  // Location search (Nominatim request should appear).
  const searchInput = page.getByPlaceholder('Search location').first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill('Waukegan, IL');
    const searchBtn = page.getByRole('button', { name: 'Search' }).first();
    await searchBtn.click();
    await page.waitForTimeout(1800);
    report.checks.locationSearchAttempted = true;
  } else {
    report.checks.locationSearchAttempted = false;
  }

  // Refresh imagery safe state.
  report.checks.refreshImageryClicked = await clickButton('Refresh imagery');
  report.checks.imageryLoadingBannerSeen = await page.getByText('Loading latest available satellite-connected imagery', { exact: false }).isVisible().catch(() => false);

  // Responsive/mobile.
  const mobileContext = await browser.newContext({ ...devices['iPhone 13'] });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1800);
  await mobilePage.screenshot({ path: report.screenshots.mobile, fullPage: true });
  report.checks.mobileHeaderVisible = await mobilePage.locator('span:text-is("DPAL AquaScan")').first().isVisible().catch(() => false);
  report.checks.mobileMapSectionVisible = await mobilePage.getByText('AquaScan Map & GPS', { exact: false }).isVisible().catch(() => false);
  await mobileContext.close();

  // Basic navigation/back stability check.
  await page.goto(`${BASE}/environmental-intelligence/envirofacts-map`, { waitUntil: 'domcontentloaded' });
  await page.goBack({ waitUntil: 'domcontentloaded' });
  report.checks.backNavigationStable = page.url().includes('/water');

  report.finishedAt = nowIso();
  report.network.gibs2xx = report.network.gibs.filter((r) => r.status >= 200 && r.status < 300).length;
  report.network.nominatimCount = report.network.nominatim.length;
  report.network.tileErrorCount = report.network.tileErrors.length;

  const reportPath = path.join(OUT_DIR, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  await context.close();
  await browser.close();

  console.log(`Artifacts written to: ${OUT_DIR}`);
  console.log(`Report: ${reportPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

