/**
 * Provider-status mapping selftest.
 *
 * Run:
 *   npx tsx src/features/dpalNavigator/providerStatusMapping.selftest.ts
 *
 * Why a plain-script selftest: the frontend repo does not currently install a unit
 * test runner (no vitest / jest in `package.json`). We follow the same pattern the
 * backend uses for `providerRequestGuards.selftest.ts` — a single tsx-runnable file
 * that exercises the pure helper module with `node:assert`.
 *
 * Coverage:
 *   - Bolivia coordinates → USGS/NWS render as "Skipped — not applicable for this region"
 *   - GeoLedger missing key → renders as "Skipped — provider not configured" (and the
 *     legacy `needs_key` alias also produces a clear "missing API key" label)
 *   - `ok` still renders as "Checked" (NOT a misleading default)
 *   - `error` / `unavailable` still render as "Unavailable"
 *   - Cached / stale_fallback render cleanly
 *   - Unknown / null values fall through to "Unavailable" — never silently to "observed"
 */
import assert from "node:assert/strict";
import {
  isProviderStatusHealthy,
  isProviderStatusSkipped,
  moduleHealthToProviderStatus,
  providerStatusKind,
  providerStatusLabel,
  providerStatusShortLabel,
  providerStatusToneClasses,
} from "./providerStatusMapping";
import type { ProviderProgressStatus } from "./types";

function testBoliviaPacketModuleHealth(): void {
  // Mirrors what the backend returns for Bolivia (lat=-17.7833, lng=-63.1821)
  // with GEOAPIFY_API_KEY unset.
  const boliviaModuleHealth = {
    floodguard: "ok",
    usgsWater: "not_applicable",
    nwsAlerts: "not_applicable",
    geoLedger: "not_configured",
  };

  const fg = moduleHealthToProviderStatus(boliviaModuleHealth.floodguard);
  const usgs = moduleHealthToProviderStatus(boliviaModuleHealth.usgsWater);
  const nws = moduleHealthToProviderStatus(boliviaModuleHealth.nwsAlerts);
  const geo = moduleHealthToProviderStatus(boliviaModuleHealth.geoLedger);

  assert.equal(fg, "observed", "FloodGuard ok must map to 'observed'");
  assert.equal(usgs, "not_applicable", "USGS in Bolivia must map to 'not_applicable'");
  assert.equal(nws, "not_applicable", "NWS in Bolivia must map to 'not_applicable'");
  assert.equal(geo, "not_configured", "GeoLedger w/o key must map to 'not_configured'");

  // Honest labels — skipped is neither a check nor a failure.
  assert.equal(providerStatusLabel(fg), "Checked");
  assert.equal(
    providerStatusLabel(usgs),
    "Skipped — not applicable for this region",
    "USGS Bolivia label must be the regional-skip label",
  );
  assert.equal(
    providerStatusLabel(nws),
    "Skipped — not applicable for this region",
    "NWS Bolivia label must be the regional-skip label",
  );
  assert.equal(
    providerStatusLabel(geo),
    "Skipped — provider not configured",
    "GeoLedger label must be the not-configured skip label",
  );

  // Kind taxonomy — skipped must NOT be classified as failure or ok.
  assert.equal(providerStatusKind(fg), "ok");
  assert.equal(providerStatusKind(usgs), "skipped");
  assert.equal(providerStatusKind(nws), "skipped");
  assert.equal(providerStatusKind(geo), "skipped");
  assert.equal(isProviderStatusSkipped(usgs), true);
  assert.equal(isProviderStatusSkipped(nws), true);
  assert.equal(isProviderStatusSkipped(geo), true);
  assert.equal(isProviderStatusHealthy(fg), true);
}

function testNeedsKeyAlias(): void {
  const status = moduleHealthToProviderStatus("needs_key");
  assert.equal(status, "needs_key");
  assert.equal(providerStatusLabel(status), "Skipped — missing API key");
  assert.equal(providerStatusKind(status), "skipped");
}

function testOkStillRendersAsChecked(): void {
  for (const ok of ["ok", "checked", "observed", "OK", "Checked"]) {
    const status = moduleHealthToProviderStatus(ok);
    assert.equal(status, "observed", `"${ok}" must map to 'observed'`);
    assert.equal(providerStatusLabel(status), "Checked");
    assert.equal(providerStatusKind(status), "ok");
  }
}

function testErrorAndUnavailableStillSignalFailure(): void {
  for (const v of ["error", "failed", "FAILED", "Provider error"]) {
    const status = moduleHealthToProviderStatus(v);
    assert.equal(status, "error", `"${v}" must map to 'error'`);
    assert.equal(providerStatusLabel(status), "Unavailable");
    assert.equal(providerStatusKind(status), "failure");
  }
  for (const v of ["unavailable", "no_data", "offline", "Unavailable"]) {
    const status = moduleHealthToProviderStatus(v);
    assert.equal(status, "unavailable", `"${v}" must map to 'unavailable'`);
    assert.equal(providerStatusLabel(status), "Unavailable");
    assert.equal(providerStatusKind(status), "failure");
  }
}

function testCachedAndStaleFallback(): void {
  assert.equal(moduleHealthToProviderStatus("cached"), "cached");
  assert.equal(providerStatusLabel("cached"), "Cached");
  assert.equal(providerStatusKind("cached"), "ok", "Cached is still a healthy observation");

  assert.equal(moduleHealthToProviderStatus("stale_fallback"), "stale_fallback");
  assert.equal(providerStatusLabel("stale_fallback"), "Stale fallback");
  assert.equal(providerStatusKind("stale_fallback"), "ok");
}

function testUnknownDefaultsToUnavailableNotObserved(): void {
  // Pre-fix bug: any unknown string was treated as "observed" and a skipped provider
  // looked like a successful check. The post-fix mapping must NEVER fall through to
  // "observed" for unrecognized values — that would mask real provider state.
  for (const v of [null, undefined, "", "n/a", "🤷", "totally_unknown_status"]) {
    const status = moduleHealthToProviderStatus(v);
    assert.equal(status, "unavailable", `Unknown value ${JSON.stringify(v)} must NOT map to observed`);
  }
}

function testToneClassesAreNonEmpty(): void {
  const all: ProviderProgressStatus[] = [
    "pending",
    "checking",
    "observed",
    "cached",
    "stale_fallback",
    "unavailable",
    "error",
    "not_applicable",
    "not_configured",
    "needs_key",
  ];
  for (const s of all) {
    const tone = providerStatusToneClasses(s);
    assert.ok(tone && tone.length > 0, `tone for ${s} must be non-empty`);
    assert.ok(providerStatusShortLabel(s).length > 0, `short label for ${s} must be non-empty`);
  }
}

function testSkippedToneDoesNotLookLikeSuccessOrFailure(): void {
  /**
   * Skipped tones must be slate (neutral) — not emerald (success) and not rose (failure).
   * We verify by checking the substring of the tailwind class string.
   */
  for (const s of ["not_applicable", "not_configured", "needs_key"] as ProviderProgressStatus[]) {
    const tone = providerStatusToneClasses(s);
    assert.ok(tone.includes("slate"), `${s} tone must use slate (neutral)`);
    assert.ok(!tone.includes("emerald"), `${s} tone must NOT use emerald (success)`);
    assert.ok(!tone.includes("rose"), `${s} tone must NOT use rose (failure)`);
  }
}

function main(): void {
  testBoliviaPacketModuleHealth();
  testNeedsKeyAlias();
  testOkStillRendersAsChecked();
  testErrorAndUnavailableStillSignalFailure();
  testCachedAndStaleFallback();
  testUnknownDefaultsToUnavailableNotObserved();
  testToneClassesAreNonEmpty();
  testSkippedToneDoesNotLookLikeSuccessOrFailure();
  console.log("providerStatusMapping.selftest: all passed");
}

main();
