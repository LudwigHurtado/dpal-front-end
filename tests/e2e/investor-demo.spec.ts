import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * E2E coverage for the DPAL Investor Demo flow.
 *
 * Plan (mirrors the requested A–F structure):
 *   A. /investor-demo loads with the hero, subtitle, scenario selector,
 *      evidence pipeline, and business value sections.
 *   B. The five demo scenarios all render with their module label visible
 *      inside the matching scenario card.
 *   C. The three supported "Watch DPAL Work" CTAs deep-link to
 *      `<module>#watch` URLs.
 *   D. CARB / EPA and Field OS scenario cards do NOT render a
 *      "Watch DPAL Work" button (those modules are not in the deep-link
 *      whitelist).
 *   E. The evidence-packet preview disclaimer appears on a watch landing.
 *   F. Opening a `#watch` route does not auto-run any provider scan — no
 *      scan endpoint fires, no "In Progress" UI appears, and the operator
 *      still has a visible action button to start work manually.
 *
 * The spec is offline-stable by construction: every `/api/**` request is
 * intercepted and stubbed in-process, and external map/provider hosts are
 * blocked so live infrastructure is never required for the run.
 */

const SCAN_ENDPOINTS = [
  "/api/forest-integrity/scan",
  "/api/forest-integrity/evidence-packet",
  "/api/hyperspectral-plastic-watch/scan",
  "/api/hyperspectral-plastic-watch/evidence-packet",
  "/api/hyperspectral-plastic-watch/drone/status",
  "/api/hyperspectral-plastic-watch/drone/validation-request",
  "/api/copernicus/statistics",
  "/api/copernicus/process",
  "/api/water/snapshot",
  "/api/water/history",
  "/api/water/satellite-preview",
  "/api/earth-observation/scan",
] as const;

type ScanCounters = Record<string, number>;

const EVIDENCE_DISCLAIMER_TEXT =
  /Preview only\s*[—-]\s*final evidence packet requires live provider response and\/or field validation\./i;

async function stubAllProviders(page: Page): Promise<ScanCounters> {
  const counters: ScanCounters = Object.fromEntries(
    SCAN_ENDPOINTS.map((k) => [k, 0]),
  );

  await page.route("**/api/**", async (route: Route) => {
    const url = route.request().url();
    for (const key of SCAN_ENDPOINTS) {
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

    if (url.includes("/api/hyperspectral-plastic") && url.includes("provider-status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          generatedAt: new Date().toISOString(),
          pace: {
            enabled: false,
            configured: false,
            status: "not_enabled",
            label: "NASA PACE",
            message: "PACE disabled (e2e stub).",
          },
          emit: {
            enabled: false,
            configured: false,
            status: "not_enabled",
            label: "NASA EMIT",
            message: "EMIT disabled (e2e stub).",
          },
          sentinelLandsat: {
            enabled: true,
            configured: false,
            status: "unavailable",
            label: "Sentinel / Landsat fallback",
            message: "EO off in stub.",
          },
          drone: {
            enabled: false,
            configured: false,
            status: "not_enabled",
            label: "Drone Validation",
            message: "Drone connector off in stub.",
          },
          paceConfigured: false,
          emitConfigured: false,
          earthObservationLive: false,
          notes: [],
        }),
      });
      return;
    }

    if (url.includes("/api/hyperspectral-plastic") && url.includes("/drone/status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          generatedAt: new Date().toISOString(),
          enabled: false,
          configured: false,
          status: "not_enabled",
          label: "Drone Validation",
          message: "Drone validation disabled (e2e stub).",
          mode: "manual",
        }),
      });
      return;
    }

    if (
      url.includes("/api/hyperspectral-plastic") &&
      url.includes("/drone/validation-request") &&
      route.request().method() === "POST"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "not_enabled",
          mode: "manual",
          message: "Stub — no dispatch.",
          requestId: "dvr_e2e_stub",
          dispatched: false,
          payloadEcho: { lat: 0, lng: 0, radiusKm: 1 },
        }),
      });
      return;
    }

    if (url.includes("/api/hyperspectral-plastic") && url.includes("/scan")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          scanId: "hpw_e2e_stub",
          label: "Plastic Watch AOI",
          aoi: {
            lat: 14.5995,
            lng: 120.9842,
            radiusKm: 12,
            label: "Plastic Watch AOI",
            baselineDate: "2025-06-01T12:00:00.000Z",
            currentDate: "2026-01-01T23:59:59.999Z",
            environmentType: "coast",
            quickPreset: null,
            aoiGeoJson: null,
          },
          providers: {
            pace: { status: "not_enabled", message: "PACE disabled (e2e stub).", scenes: [] },
            emit: { status: "not_enabled", message: "EMIT disabled (e2e stub).", scenes: [] },
            sentinelLandsatFallback: {
              status: "not_enabled",
              message: "EO off (e2e stub).",
            },
            drone: {
              status: "not_enabled",
              mode: "manual",
              message: "Drone off (e2e stub).",
            },
          },
          spectralSignals: {
            plasticRiskSignal: "none",
            confidence: 0.05,
            swirAnomaly: null,
            visibleAnomaly: null,
            waterConfounders: {
              algae: "low",
              turbidity: "low",
              sediment: "low",
              foam: "unknown",
              cloudsGlint: "low",
            },
            notes: ["e2e stub spectral notes"],
          },
          plasticRiskScore: null,
          riskLevel: "not_computed",
          plasticRisk: {
            score: null,
            status: "not_computed",
            message: "Narrow-band scoring not computed in e2e stub.",
          },
          evidencePacket: {
            status: "preview",
            claimsLevel: "metadata_only",
            limitations: ["e2e stub limitation"],
            nextActions: ["e2e stub next action"],
          },
          evidenceItems: ["e2e stub evidence line"],
          limitations: ["e2e stub scan limitation"],
          generatedAt: new Date().toISOString(),
        }),
      });
      return;
    }

    if (url.includes("/api/hyperspectral-plastic") && url.includes("/evidence-packet")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          integrityHash: "e2e_stub_hash",
          qrPayloadPreview: {
            type: "dpal_hyperspectral_plastic_watch",
            integrityHash: "e2e_stub_hash",
            scanId: "hpw_e2e_stub",
            label: "Plastic Watch AOI",
            generatedAt: new Date().toISOString(),
            plasticRiskScore: null,
            riskLevel: "not_computed",
          },
          packet: { kind: "dpal_hyperspectral_plastic_watch_evidence_v1", generatedAt: new Date().toISOString(), scan: {} },
        }),
      });
      return;
    }

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

    /** Inert default so any unanticipated `/api/**` route never reaches the network. */
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: false }),
    });
  });

  /** Block external tile servers + provider hosts to keep the spec deterministic and offline. */
  await page.route(
    /(server\.arcgisonline\.com|tile\.openstreetmap\.org|nominatim\.openstreetmap\.org|planetarycomputer\.microsoft\.com|sh\.dataspace\.copernicus\.eu|firms\.modaps\.eosdis\.nasa\.gov|earthdata\.nasa\.gov)/,
    (route) => route.abort(),
  );

  return counters;
}

function assertNoScansFired(counters: ScanCounters) {
  const violations = Object.entries(counters)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`);
  expect(
    violations,
    `No provider scan should auto-run on #watch arrival, but observed: ${violations.join(", ")}`,
  ).toEqual([]);
}

/**
 * Five demo scenarios in the same order they appear in
 * `src/features/environmentalIntelligence/shared/demoScenarios.ts`.
 *
 * `titleMatch` is a unique substring of the card heading — used to scope a
 * `getByRole('article')` filter to exactly one card without colliding with
 * prose mentions elsewhere on the page.
 */
const SCENARIOS = [
  {
    moduleLabel: "AquaScan Water Intelligence",
    titleMatch: /Cedar River watershed/i,
    supportsWatch: true,
    watchUrl: /\/water\/aquascan#watch$/,
  },
  {
    moduleLabel: "Forest Integrity",
    titleMatch: /Amazon tributary/i,
    supportsWatch: true,
    watchUrl: /\/forest-integrity#watch$/,
  },
  {
    moduleLabel: "Hyperspectral Plastic Watch",
    titleMatch: /Manila Bay/i,
    supportsWatch: true,
    watchUrl: /\/hyperspectral-plastic-watch#watch$/,
  },
  {
    /** Page renders this label as "CARB / EPA Compliance". */
    moduleLabel: /CARB \/ EPA Compliance/i,
    titleMatch: /Richmond refinery/i,
    supportsWatch: false,
  },
  {
    /** Page renders this label with a middle-dot ("Field OS · Situation Room"). Match either separator. */
    moduleLabel: /Field OS[^A-Za-z]+Situation Room/i,
    titleMatch: /Field OS Super Agent/i,
    supportsWatch: false,
  },
] as const;

test.describe("DPAL Investor Demo (/investor-demo)", () => {
  test("A. page loads with hero, subtitle, scenarios, pipeline, and business value", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await stubAllProviders(page);
    await page.goto("/investor-demo");

    await expect(
      page.getByRole("heading", {
        name: /DPAL Environmental Intelligence Investor Demo/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "From location → signal → verification → evidence packet → response.",
      ),
    ).toBeVisible();

    /**
     * Section headings — keep these as exact heading matches so prose mentions
     * elsewhere on the page can never collide with strict mode.
     */
    await expect(
      page.getByRole("heading", { name: /Investor Demo Scenarios/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Evidence Pipeline/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Business Value/i }),
    ).toBeVisible();
  });

  test("B. all five demo scenarios render with their module label", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await stubAllProviders(page);
    await page.goto("/investor-demo");

    for (const scenario of SCENARIOS) {
      /**
       * Filter by a heading inside the card so "Manila Bay" mentioned in
       * unrelated business-value prose (also an <article>) cannot collide.
       */
      const card = page.getByRole("article").filter({
        has: page.getByRole("heading", { name: scenario.titleMatch }),
      });
      await expect(
        card,
        `Expected exactly one scenario card matching ${scenario.titleMatch}`,
      ).toHaveCount(1);
      await expect(card.getByText(scenario.moduleLabel).first()).toBeVisible();
    }
  });

  test("C. AquaScan Watch DPAL Work navigates to /water/aquascan#watch", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await stubAllProviders(page);
    await page.goto("/investor-demo");

    const aquaCard = page
      .getByRole("article")
      .filter({ hasText: /Cedar River watershed/i });
    await aquaCard.getByRole("button", { name: "Watch DPAL Work" }).click();

    await expect(page).toHaveURL(/\/water\/aquascan#watch$/, {
      timeout: 15_000,
    });

    /**
     * AquaScan has no `<dialog>` panel — instead it scrolls its workflow rail
     * (`aria-label="AquaScan workflow rail"`) into view. Confirming the rail is
     * visible proves the page mounted and the #watch hash was honored.
     */
    await expect(
      page.getByRole("navigation", { name: "AquaScan workflow rail" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("C. Forest Integrity Watch DPAL Work navigates to /forest-integrity#watch", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await stubAllProviders(page);
    await page.goto("/investor-demo");

    const forestCard = page
      .getByRole("article")
      .filter({ hasText: /Amazon tributary/i });
    await forestCard.getByRole("button", { name: "Watch DPAL Work" }).click();

    await expect(page).toHaveURL(/\/forest-integrity#watch$/, {
      timeout: 15_000,
    });
    await expect(
      page.getByRole("dialog", { name: /Watch DPAL Work/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("C. Hyperspectral Plastic Watch DPAL Work navigates to /hyperspectral-plastic-watch#watch", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await stubAllProviders(page);
    await page.goto("/investor-demo");

    const plasticCard = page
      .getByRole("article")
      .filter({ hasText: /Manila Bay/i });
    await plasticCard.getByRole("button", { name: "Watch DPAL Work" }).click();

    await expect(page).toHaveURL(/\/hyperspectral-plastic-watch#watch$/, {
      timeout: 15_000,
    });
    await expect(
      page.getByRole("dialog", { name: /Watch DPAL Work/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("D. CARB / EPA and Field OS scenario cards do not render Watch DPAL Work", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await stubAllProviders(page);
    await page.goto("/investor-demo");

    const carbCard = page
      .getByRole("article")
      .filter({ hasText: /Richmond refinery/i });
    await expect(carbCard).toHaveCount(1);
    await expect(
      carbCard.getByRole("button", { name: /Open Demo/i }),
    ).toBeVisible();
    await expect(
      carbCard.getByRole("button", { name: /Watch DPAL Work/i }),
    ).toHaveCount(0);

    const fieldOsCard = page
      .getByRole("article")
      .filter({ hasText: /Field OS Super Agent/i });
    await expect(fieldOsCard).toHaveCount(1);
    await expect(
      fieldOsCard.getByRole("button", { name: /Open Demo/i }),
    ).toBeVisible();
    await expect(
      fieldOsCard.getByRole("button", { name: /Watch DPAL Work/i }),
    ).toHaveCount(0);
  });

  test("E. evidence packet preview disclaimer appears on a watch landing", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await stubAllProviders(page);
    await page.goto("/investor-demo");

    const forestCard = page
      .getByRole("article")
      .filter({ hasText: /Amazon tributary/i });
    await forestCard.getByRole("button", { name: "Watch DPAL Work" }).click();

    await expect(page).toHaveURL(/\/forest-integrity#watch$/, {
      timeout: 15_000,
    });

    /** Disclaimer is rendered by `EvidencePacketPreview` (embedded via `InvestorDemoExplainer`). */
    await expect(page.getByText(EVIDENCE_DISCLAIMER_TEXT)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("F. opening a #watch route does not auto-run a scan", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const counters = await stubAllProviders(page);
    await page.goto("/investor-demo");

    const forestCard = page
      .getByRole("article")
      .filter({ hasText: /Amazon tributary/i });
    await forestCard.getByRole("button", { name: "Watch DPAL Work" }).click();

    /** 1. Page loaded. */
    await expect(page).toHaveURL(/\/forest-integrity#watch$/, {
      timeout: 15_000,
    });
    await expect(
      page.getByRole("dialog", { name: /Watch DPAL Work/i }),
    ).toBeVisible({ timeout: 10_000 });

    /** 2. No visible "running" / "in progress" state appears immediately. */
    await expect(page.getByText(/^In Progress$/i)).toHaveCount(0);
    await expect(page.getByText(/^Pending$/).first()).toBeVisible();

    /**
     * 3. Operator still has a visible action button — the Forest watch panel
     *    surfaces "Restart Scan" enabled and "Stop Scan" disabled until the
     *    operator chooses to begin.
     */
    await expect(
      page.getByRole("button", { name: /Restart Scan/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Restart Scan/i }),
    ).toBeEnabled();

    /** Settle window for any deferred effects, then assert no scan endpoint fired. */
    await page.waitForTimeout(4_000);
    assertNoScansFired(counters);
  });
});
