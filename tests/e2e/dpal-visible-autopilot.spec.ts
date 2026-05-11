import { expect, test, type Route } from "@playwright/test";

const AUTOPILOT_AUTORUN_URL =
  "/water-intelligence/water-alert-evidence?lat=-17.7833&lng=-63.1821&navigatorFlow=water-alert&source=dpal-navigator&autopilot=true&autoRun=true&autopilotMode=visible-safe-checks&showCursor=true";

const GUIDED_FLOW_COORDS_ONLY =
  "/water-intelligence/water-alert-evidence?lat=-17.7833&lng=-63.1821&navigatorFlow=water-alert&source=dpal-navigator";

async function fulfillWaterAlertPacket(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      packet: {
        status: "ok",
        moduleHealth: {
          floodguard: "ok",
          usgsWater: "ok",
          nwsAlerts: "ok",
          geoLedger: "ok",
        },
        summary: { floodRiskLevel: "low", recommendedReviewStatus: "advisory" },
        floodguard: { floodRisk: { level: "low", score: 12 } },
        usgsWater: { status: "ok", readings: [] },
        nwsAlerts: { alertCount: 0, alerts: [] },
        geoLedger: { validationStatus: "ok" },
        evidenceIntegrity: { evidenceHash: "demo-hash" },
        anchorPreview: { anchorStatus: "preview_only" },
        claimSafety: { publicClaimAllowed: false, validatorReviewed: false, warning: "Human review required" },
      },
    }),
  });
}

test.describe("DPAL visible autopilot (water alert evidence)", () => {
  test("virtual cursor, control bar, status card, scan, gate, no auto-verified outcome", async ({ page }) => {
    test.setTimeout(120_000);
    await page.route("**/api/integrations/water/alert-evidence-packet**", fulfillWaterAlertPacket);

    await page.goto(AUTOPILOT_AUTORUN_URL);

    await expect(page.locator('[data-dpal-target="water-coordinates"]')).toBeVisible();
    await expect(page.locator('[data-dpal-target="run-water-evidence-scan"]')).toBeVisible();

    await expect(page.locator("[data-dpal-autopilot-control-bar]")).toBeVisible({ timeout: 20_000 });

    await expect(page.locator("[data-dpal-autopilot-status-card]")).toBeVisible({ timeout: 45_000 });

    await expect(page.locator("[data-dpal-autopilot-cursor]")).toBeVisible({ timeout: 45_000 });

    await expect(page.locator('[data-dpal-target="human-approval-gate"]')).toBeVisible({ timeout: 60_000 });

    await expect(page.getByText(/Read-only · Human approval still required/i)).toBeVisible();

    const body = await page.locator("body").innerText();
    const forbidden = /\bautomatically\s+(verified|published|anchored|certified)\b/i;
    expect(forbidden.test(body)).toBe(false);

    await expect(page).not.toHaveURL(/autoRun=true/);
  });

  test("autoRun=true performs at most one automatic scan per session; second landing does not auto-scan", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    let scanCount = 0;
    await page.route("**/api/integrations/water/alert-evidence-packet**", async (route) => {
      scanCount += 1;
      await fulfillWaterAlertPacket(route);
    });

    await page.goto(AUTOPILOT_AUTORUN_URL);
    await expect(page.locator("[data-dpal-autopilot-status-card]")).toBeVisible({ timeout: 60_000 });
    /** Status card appears as soon as autopilot is running — packet GET runs later at trigger_scan. */
    await expect.poll(() => scanCount, { timeout: 60_000 }).toBe(1);

    await page.goto(AUTOPILOT_AUTORUN_URL);
    await page.waitForTimeout(4000);
    await expect.poll(() => scanCount, { timeout: 5_000 }).toBe(1);

    await expect(page.getByText(/Visible Autopilot already ran for this location/i)).toBeVisible({ timeout: 10_000 });
  });

  test("Begin visible safe checks triggers an intentional second scan", async ({ page }) => {
    test.setTimeout(120_000);
    let scanCount = 0;
    await page.route("**/api/integrations/water/alert-evidence-packet**", async (route) => {
      scanCount += 1;
      await fulfillWaterAlertPacket(route);
    });

    await page.goto(AUTOPILOT_AUTORUN_URL);
    await expect(page.locator("[data-dpal-autopilot-status-card]")).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => scanCount, { timeout: 60_000 }).toBe(1);

    await page.goto(AUTOPILOT_AUTORUN_URL);
    await expect(page.getByRole("button", { name: /Begin visible safe checks/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Begin visible safe checks/i }).click();
    await expect(page.locator("[data-dpal-autopilot-status-card]")).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => scanCount, { timeout: 60_000 }).toBeGreaterThanOrEqual(2);
  });

  test("guided-flow coords URL without autopilot does not auto-call water alert packet", async ({ page }) => {
    test.setTimeout(60_000);
    let scanCount = 0;
    await page.route("**/api/integrations/water/alert-evidence-packet**", async (route) => {
      scanCount += 1;
      await fulfillWaterAlertPacket(route);
    });

    await page.goto(GUIDED_FLOW_COORDS_ONLY);
    await expect(page.locator('[data-dpal-target="run-water-evidence-scan"]')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(5000);
    expect(scanCount).toBe(0);
  });
});
