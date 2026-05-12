import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * E2E coverage for the DPAL Investor Demo flow.
 *
 * Hard guarantees this spec defends:
 *   1. `/investor-demo` renders the hero, sub-headline, scenario cards, business
 *      value, and evidence pipeline sections.
 *   2. Supported "Watch DPAL Work" buttons (AquaScan / Forest / Plastic) navigate
 *      to the destination module with `#watch` preserved in the URL.
 *   3. Unsupported scenarios (CARB / EPA, Field OS) only show "Open Demo".
 *   4. NO provider scan auto-runs on arrival at any `#watch` route — verified via
 *      route interception counters AND by asserting no "In Progress" running-state
 *      UI appears.
 *   5. The evidence-packet preview disclaimer appears on the watch landing pages.
 *
 * Tests are stable by construction: every `/api/**` request is intercepted and
 * stubbed in-process. External tile servers, geocoders, and provider APIs are
 * blocked so the spec never depends on live infrastructure.
 */

const SCAN_ENDPOINT_KEYS = [
  "/api/forest-integrity/scan",
  "/api/forest-integrity/evidence-packet",
  "/api/hyperspectral-plastic/scan",
  "/api/hyperspectral-plastic/evidence-packet",
  "/api/copernicus/statistics",
  "/api/copernicus/process",
  "/api/water/snapshot",
  "/api/water/history",
  "/api/water/satellite-preview",
  "/api/earth-observation/scan",
] as const;

type ScanCounters = Record<string, number>;

const EVIDENCE_DISCLAIMER =
  /Preview only\s*[—-]\s*final evidence packet requires live provider response and\/or field validation\./i;

async function setupStubsAndCounters(page: Page): Promise<ScanCounters> {
  const counters: ScanCounters = Object.fromEntries(
    SCAN_ENDPOINT_KEYS.map((k) => [k, 0]),
  );

  // Catch-all for `/api/**` so the spec never touches real Railway/external APIs.
  await page.route("**/api/**", async (route: Route) => {
    const url = route.request().url();

    for (const key of SCAN_ENDPOINT_KEYS) {
      if (url.includes(key)) {
        counters[key] = (counters[key] ?? 0) + 1;
      }
    }

    if (url.includes("/api/forest-integrity/provider-status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          generatedAt: new Date().toISOString(),
          earthObservationLive: false,
          nasaFirmsConfigured: false,
          gfwConfigured: false,
          gediImplemented: false,
          copernicusConfigured: false,
          notes: [],
        }),
      });
      return;
    }

    if (url.includes("/api/hyperspectral-plastic/provider-status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          generatedAt: new Date().toISOString(),
          paceConfigured: false,
          emitConfigured: false,
          earthObservationLive: false,
          notes: [],
        }),
      });
      return;
    }

    if (url.includes("/api/copernicus/status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          configured: false,
          missing: [],
          enabled: true,
          source: "backend_proxy",
          message: "demo stub",
        }),
      });
      return;
    }

    /** Safe inert default for any other `/api/**` (health probes, integrations, etc.). */
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: false }),
    });
  });

  /** Block external map tiles + geocoder so the spec is offline-stable. */
  await page.route(
    /(server\.arcgisonline\.com|tile\.openstreetmap\.org|nominatim\.openstreetmap\.org|planetarycomputer\.microsoft\.com|sh\.dataspace\.copernicus\.eu|firms\.modaps\.eosdis\.nasa\.gov|earthdata\.nasa\.gov)/,
    (route) => route.abort(),
  );

  return counters;
}

function assertNoScansFired(counters: ScanCounters) {
  const violations = Object.entries(counters)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${key}=${count}`);
  expect(
    violations,
    `Provider scan endpoints should not fire automatically on #watch arrival, but observed: ${violations.join(", ")}`,
  ).toEqual([]);
}

test.describe("DPAL Investor Demo (/investor-demo)", () => {
  test("loads with hero, scenarios, business value, evidence pipeline, and revenue tracks", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await setupStubsAndCounters(page);
    await page.goto("/investor-demo");

    /** Hero */
    await expect(
      page.getByRole("heading", {
        name: /DPAL Environmental Intelligence Investor Demo/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /From location → signal → verification → evidence packet → response\./i,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Open Environmental Intelligence Hub/i }).first(),
    ).toBeVisible();

    /**
     * Demo scenario selector — match scenario titles via headings so we never
     * collide with prose mentions ("Manila Bay" appears in business-value copy).
     */
    await expect(
      page.getByRole("heading", { name: /Cedar River watershed/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Amazon tributary/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Manila Bay/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Richmond refinery/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Field OS Super Agent/i }),
    ).toBeVisible();

    /**
     * Business value section. Use `{ exact: true }` so capability labels do not
     * collide with prose mentions of "satellite monitoring" in the hero blurb.
     */
    await expect(
      page.getByRole("heading", { name: /Business value/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Satellite monitoring", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Evidence packets", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Provider status strips", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("MRV / VIU readiness", { exact: true }),
    ).toBeVisible();

    /** Evidence Pipeline section */
    await expect(
      page.getByRole("heading", { name: /Evidence Pipeline/i }),
    ).toBeVisible();
    await expect(page.getByText("Provider data").first()).toBeVisible();
    await expect(page.getByText("Risk score").first()).toBeVisible();
    await expect(page.getByText("Evidence packet").first()).toBeVisible();
    await expect(page.getByText("Mission / response").first()).toBeVisible();

    /** Revenue / partnership tracks */
    await expect(
      page.getByRole("heading", { name: /Revenue model & partnership tracks/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Enterprise compliance", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("MRV / VIU partnerships", { exact: true }),
    ).toBeVisible();
  });

  test("CARB / EPA and Field OS scenario cards do not show Watch DPAL Work", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await setupStubsAndCounters(page);
    await page.goto("/investor-demo");

    const carbCard = page
      .getByRole("article")
      .filter({ hasText: "Richmond refinery" });
    await expect(carbCard).toBeVisible();
    await expect(
      carbCard.getByRole("button", { name: /Open Demo/i }),
    ).toBeVisible();
    await expect(
      carbCard.getByRole("button", { name: /Watch DPAL Work/i }),
    ).toHaveCount(0);

    const fieldOsCard = page
      .getByRole("article")
      .filter({ hasText: "Field OS Super Agent" });
    await expect(fieldOsCard).toBeVisible();
    await expect(
      fieldOsCard.getByRole("button", { name: /Open Demo/i }),
    ).toBeVisible();
    await expect(
      fieldOsCard.getByRole("button", { name: /Watch DPAL Work/i }),
    ).toHaveCount(0);
  });

  test("AquaScan Watch DPAL Work navigates to /water/aquascan#watch with no auto-scan", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const counters = await setupStubsAndCounters(page);
    await page.goto("/investor-demo");

    const aquaCard = page
      .getByRole("article")
      .filter({ hasText: "Cedar River watershed" });
    await aquaCard.getByRole("button", { name: "Watch DPAL Work" }).click();

    await expect(page).toHaveURL(/\/water\/aquascan#watch$/, {
      timeout: 15_000,
    });

    /**
     * Workflow rail nav has `aria-label="AquaScan workflow rail"`. It is hidden on
     * narrow viewports (`lg:flex`) but Playwright's Desktop Chrome default viewport
     * is wide enough to surface it.
     */
    await expect(
      page.getByRole("navigation", { name: "AquaScan workflow rail" }),
    ).toBeVisible({ timeout: 10_000 });

    /** No running-state UI appears just from opening #watch. */
    await expect(page.getByText(/^In Progress$/i)).toHaveCount(0);

    /** Investor explainer + evidence packet preview disclaimer should be rendered. */
    await expect(page.getByText(EVIDENCE_DISCLAIMER)).toBeVisible();

    /** Allow microtasks + queued effects to settle before asserting counters. */
    await page.waitForTimeout(4_000);
    assertNoScansFired(counters);
  });

  test("Forest Integrity Watch DPAL Work navigates to /forest-integrity#watch with no auto-scan", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const counters = await setupStubsAndCounters(page);
    await page.goto("/investor-demo");

    const forestCard = page
      .getByRole("article")
      .filter({ hasText: "Amazon tributary" });
    await forestCard.getByRole("button", { name: "Watch DPAL Work" }).click();

    await expect(page).toHaveURL(/\/forest-integrity#watch$/, {
      timeout: 15_000,
    });

    /**
     * `#watch` should open the side drawer (`<div role="dialog" aria-labelledby="forest-watch-title">`)
     * with all steps in `Pending` — no provider call should have started a `running` step.
     */
    await expect(
      page.getByRole("dialog", { name: /Watch DPAL Work/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Pending").first()).toBeVisible();
    await expect(page.getByText(/^In Progress$/i)).toHaveCount(0);

    await expect(page.getByText(EVIDENCE_DISCLAIMER)).toBeVisible();

    await page.waitForTimeout(4_000);
    assertNoScansFired(counters);
  });

  test("Hyperspectral Plastic Watch DPAL Work navigates to /hyperspectral-plastic-watch#watch with no auto-scan", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const counters = await setupStubsAndCounters(page);
    await page.goto("/investor-demo");

    const plasticCard = page
      .getByRole("article")
      .filter({ hasText: "Manila Bay" });
    await plasticCard.getByRole("button", { name: "Watch DPAL Work" }).click();

    await expect(page).toHaveURL(/\/hyperspectral-plastic-watch#watch$/, {
      timeout: 15_000,
    });

    await expect(
      page.getByRole("dialog", { name: /Watch DPAL Work/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/^In Progress$/i)).toHaveCount(0);

    await expect(page.getByText(EVIDENCE_DISCLAIMER)).toBeVisible();

    await page.waitForTimeout(4_000);
    assertNoScansFired(counters);
  });

  test("hero CTA opens the Environmental Intelligence Hub", async ({ page }) => {
    test.setTimeout(45_000);
    await setupStubsAndCounters(page);
    await page.goto("/investor-demo");

    await page
      .getByRole("button", { name: /Open Environmental Intelligence Hub/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/environmental-intelligence$/, {
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { name: /Investor Demo Scenarios/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
