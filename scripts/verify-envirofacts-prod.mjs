import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const BASE = 'https://dpal-front-end.vercel.app';
const ROUTES = [
  '/environmental-intelligence/envirofacts-map',
  '/environmental/envirofacts-map',
  '/environmental-intelligence/epa-ghg',
];

const OUT_DIR = path.resolve('artifacts', 'envirofacts-prod');

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
    routes: {},
    checks: {},
    consoleErrors: [],
    pageErrors: [],
    epaNetwork: [],
    screenshots: {},
    notes: [],
  };

  // Use installed Edge to avoid browser download issues in this environment.
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 980 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => report.pageErrors.push(String(err)));
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('data.epa.gov/efservice')) {
      report.epaNetwork.push({ url, status: res.status() });
    }
  });

  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
    report.routes[route] = { status: resp?.status() ?? null, finalUrl: page.url() };
  }

  await page.goto(`${BASE}/environmental-intelligence/envirofacts-map`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  report.screenshots.initial = path.join(OUT_DIR, '01-initial-envirofacts-page.png');
  await page.screenshot({ path: report.screenshots.initial, fullPage: true });

  // Legal banner + source panel existence.
  report.checks.legalBanner = await page.getByText('Source: U.S. EPA Envirofacts public data', { exact: false }).isVisible();
  report.checks.dataSourcesPanel = await page.getByText('How this data fits together', { exact: false }).isVisible();
  report.checks.layerToggles = await page.getByText('Layer visibility', { exact: false }).isVisible();

  const zipInput = page.locator('input[placeholder="e.g. 60085"]').first();
  await zipInput.waitFor({ state: 'visible', timeout: 45000 });
  await zipInput.fill('60085');
  await page.getByRole('button', { name: 'Search Official EPA Records' }).click();

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2200);

  report.screenshots.searchResults = path.join(OUT_DIR, '02-zip-60085-results.png');
  await page.screenshot({ path: report.screenshots.searchResults, fullPage: true });

  const statusConnected = await page.getByText('Status · Connected', { exact: false }).isVisible().catch(() => false);
  const resultsSection = page.locator('section', { hasText: 'Results' }).first();
  const hasResultsHeading = await resultsSection.isVisible().catch(() => false);
  const hasEvidencePanel = await page.getByText('Evidence packet import', { exact: false }).isVisible().catch(() => false);
  const hasMockFallbackText = await page.getByText('Mock fallback data — not live EPA data', { exact: false }).isVisible().catch(() => false);

  report.checks.apiStatusConnected = statusConnected;
  report.checks.resultsTableVisible = hasResultsHeading;
  report.checks.evidencePanelVisible = hasEvidencePanel;
  report.checks.mockFallbackVisible = hasMockFallbackText;

  // Cluster presence check from leaflet-markercluster.
  const clusterCount = await page.locator('.marker-cluster').count();
  const markerCount = await page.locator('.leaflet-marker-icon').count();
  report.checks.clusterNodeCount = clusterCount;
  report.checks.markerNodeCount = markerCount;
  report.checks.clusteredMapLikely = clusterCount > 0 || markerCount > 0;

  report.screenshots.clusterMap = path.join(OUT_DIR, '03-map-clusters.png');
  const mapSection = page.locator('section', { hasText: 'Geographic map' }).first();
  await mapSection.screenshot({ path: report.screenshots.clusterMap });

  // Open details from first table row.
  const openButtons = page.locator('button:has-text("Open Details")');
  const openCount = await openButtons.count();
  if (openCount > 0) {
    await openButtons.first().scrollIntoViewIfNeeded().catch(() => {});
    await openButtons.first().click();
    await page.waitForTimeout(1000);
    report.checks.drawerOpened = await page.locator('aside', { hasText: 'Official EPA Record' }).first().isVisible().catch(() => false);
    report.screenshots.drawer = path.join(OUT_DIR, '04-detail-drawer.png');
    await page.screenshot({ path: report.screenshots.drawer, fullPage: true });
    await page.getByRole('button', { name: 'Close' }).click().catch(() => {});
  } else {
    report.checks.drawerOpened = false;
    report.notes.push('No "Open Details" button found in results table.');
  }

  // Add to evidence and open JSON.
  const addButtons = page.getByRole('button', { name: 'Add to Evidence Packet' });
  const addCount = await addButtons.count();
  if (addCount > 0) {
    await addButtons.first().click();
    await page.waitForTimeout(700);
    const viewJsonButtons = page.getByRole('button', { name: 'View JSON' });
    if ((await viewJsonButtons.count()) > 0) {
      await viewJsonButtons.first().click();
      await page.waitForTimeout(500);
      report.checks.evidenceJsonVisible = await page.getByText('"source": "EPA Envirofacts"', { exact: false }).isVisible().catch(() => false);
    } else {
      report.checks.evidenceJsonVisible = false;
    }
  } else {
    report.checks.evidenceJsonVisible = false;
    report.notes.push('No "Add to Evidence Packet" button found.');
  }

  report.screenshots.evidencePanel = path.join(OUT_DIR, '05-evidence-panel.png');
  const evidenceSection = page.locator('section', { hasText: 'Evidence packet import' }).first();
  await evidenceSection.screenshot({ path: report.screenshots.evidencePanel });

  report.screenshots.apiAndSources = path.join(OUT_DIR, '06-api-status-and-data-sources.png');
  const apiSection = page.locator('section', { hasText: 'Live API status' }).first();
  const sourcesSection = page.locator('section', { hasText: 'How this data fits together' }).first();
  const apiBox = await apiSection.boundingBox();
  const srcBox = await sourcesSection.boundingBox();
  if (apiBox && srcBox) {
    const x = Math.floor(Math.min(apiBox.x, srcBox.x));
    const y = Math.floor(Math.min(apiBox.y, srcBox.y));
    const right = Math.ceil(Math.max(apiBox.x + apiBox.width, srcBox.x + srcBox.width));
    const bottom = Math.ceil(Math.max(apiBox.y + apiBox.height, srcBox.y + srcBox.height));
    await page.screenshot({
      path: report.screenshots.apiAndSources,
      clip: { x, y, width: right - x, height: bottom - y },
    });
  } else {
    await page.screenshot({ path: report.screenshots.apiAndSources, fullPage: true });
  }

  // Mobile sanity check (no hard break / major missing sections).
  const mobileContext = await browser.newContext({
    ...devices['iPhone 13'],
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE}/environmental-intelligence/envirofacts-map`, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1500);
  report.checks.mobileHeaderVisible = await mobilePage.getByRole('heading', { name: 'Envirofacts Geo Intelligence' }).isVisible();
  report.screenshots.mobile = path.join(OUT_DIR, '07-mobile-envirofacts.png');
  await mobilePage.screenshot({ path: report.screenshots.mobile, fullPage: true });
  await mobileContext.close();

  report.finishedAt = nowIso();
  report.epaNetworkCount = report.epaNetwork.length;
  report.epaNetwork2xx = report.epaNetwork.filter((n) => n.status >= 200 && n.status < 300).length;

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
