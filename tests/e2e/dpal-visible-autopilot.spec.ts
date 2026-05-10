import { expect, test } from "@playwright/test";

const AUTOPILOT_PATH =
  "/water-intelligence/water-alert-evidence?lat=-17.7833&lng=-63.1821&navigatorFlow=water-alert&source=dpal-navigator&autopilot=true&autoRun=true&autopilotMode=visible-safe-checks&showCursor=true";

test.describe("DPAL visible autopilot (water alert evidence)", () => {
  test("virtual cursor, control bar, status card, scan, gate, no auto-verified outcome", async ({ page }) => {
    test.setTimeout(120_000);
    await page.route("**/api/integrations/water/alert-evidence-packet**", async (route) => {
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
    });

    await page.goto(AUTOPILOT_PATH);

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
  });
});
