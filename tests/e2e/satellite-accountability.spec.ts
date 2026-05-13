import { expect, test, type Page, type Route } from "@playwright/test";

async function stubSatelliteAccountabilityApi(page: Page): Promise<void> {
  await page.route("**/api/satellite-accountability/**", async (route: Route) => {
    const url = route.request().url();
    if (url.includes("/provider-status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          mode: "preview",
          lanes: [{ id: "PACE_OCI", status: "metadata_only", detail: "e2e stub" }],
          providerSummary: {
            liveCount: 0,
            partialCount: 1,
            metadataOnlyCount: 1,
            previewOnlyCount: 0,
            plannedOrFutureCount: 0,
            unavailableCount: 0,
            notConfiguredCount: 0,
            warnings: [],
          },
          providers: [],
          warnings: [],
        }),
      });
      return;
    }
    if (url.includes("/module-status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, mode: "preview", modules: [] }),
      });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });
}

test.describe("Satellite Intelligence + Disclosure Integrity", () => {
  test("canonical route loads infographic title and preview copy", async ({ page }) => {
    test.setTimeout(90_000);
    await stubSatelliteAccountabilityApi(page);
    await page.goto("/environmental-intelligence/satellite-accountability", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /DPAL Satellite Intelligence \+ Blockchain Accountability/i }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Preview scenario/).first()).toBeVisible();
    await expect(page.getByText("Connected DPAL Modules")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Provider Readiness")).toBeVisible();
    await expect(page.getByText("Cross-Module Signal Summary")).toBeVisible();
    await expect(page.getByText("Example mapping — not a live finding.").first()).toBeVisible();
    await expect(page.getByText("fraud proven")).toHaveCount(0);
    await expect(page.getByText("company lied")).toHaveCount(0);
    await expect(page.getByText("dishonest company confirmed")).toHaveCount(0);
    await expect(
      page.getByText(
        /Satellite-derived and public-record evidence is not automatically a final legal, regulatory, or carbon-credit determination/i,
      ),
    ).toBeVisible();
  });

  test("alias /satellite-accountability resolves", async ({ page }) => {
    test.setTimeout(90_000);
    await stubSatelliteAccountabilityApi(page);
    await page.goto("/satellite-accountability", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Accountability Engine/i })).toBeVisible({ timeout: 60_000 });
  });

  test("Environmental Intelligence Hub shows accountability card", async ({ page }) => {
    test.setTimeout(90_000);
    await stubSatelliteAccountabilityApi(page);
    await page.goto("/environmental-intelligence", { waitUntil: "domcontentloaded" });
    const enter = page.getByRole("button", { name: /Enter Hub/i });
    if (await enter.isVisible().catch(() => false)) {
      await enter.click();
    }
    await expect(page.getByText("Satellite Intelligence + Disclosure Integrity")).toBeVisible({ timeout: 60_000 });
  });
});
