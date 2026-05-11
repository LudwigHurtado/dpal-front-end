/**
 * Run after build:
 *   cd backend && npm run build && node dist/services/providerApplicability.selftest.js
 * Or from repo root (tsx):
 *   npx tsx backend/src/services/providerApplicability.selftest.ts
 *
 * These tests confirm that DPAL stays international while still routing U.S.-specific
 * providers correctly. They should pass for every supported coordinate region.
 */
import assert from "node:assert/strict";
import {
  getProviderApplicability,
  isLikelyUsOrTerritoryCoordinate,
  listProviderCapabilities,
} from "./providerApplicability";
import {
  clearProviderCallEventsForTests,
  getRecentProviderCallEvents,
  getTotalsByStatus,
} from "./providerCallMonitor";
import {
  buildProviderRequestKey,
  clearProviderGuardsForTests,
  recordProviderSkip,
  runGuardedProviderCall,
} from "./providerRequestGuards";

type Sample = {
  name: string;
  lat: number;
  lng: number;
  expectUsApplicable: boolean;
  expectNwsApplicable: boolean;
};

const INTERNATIONAL_SAMPLES: Sample[] = [
  // U.S. — providers apply
  { name: "United States / New York", lat: 40.7128, lng: -74.006, expectUsApplicable: true, expectNwsApplicable: true },
  { name: "U.S. / Honolulu (Hawaii)", lat: 21.3069, lng: -157.8583, expectUsApplicable: true, expectNwsApplicable: true },
  { name: "U.S. / San Juan (Puerto Rico)", lat: 18.4655, lng: -66.1057, expectUsApplicable: true, expectNwsApplicable: true },
  { name: "U.S. / Anchorage (Alaska)", lat: 61.2181, lng: -149.9003, expectUsApplicable: true, expectNwsApplicable: true },
  { name: "U.S. / Hagatna (Guam)", lat: 13.4745, lng: 144.7504, expectUsApplicable: true, expectNwsApplicable: true },
  { name: "U.S. / Pago Pago (American Samoa)", lat: -14.2756, lng: -170.7022, expectUsApplicable: true, expectNwsApplicable: true },

  // International — U.S.-specific providers must NOT apply
  { name: "Bolivia / Santa Cruz", lat: -17.7833, lng: -63.1821, expectUsApplicable: false, expectNwsApplicable: false },
  { name: "Europe / Madrid", lat: 40.4168, lng: -3.7038, expectUsApplicable: false, expectNwsApplicable: false },
  { name: "Africa / Nairobi", lat: -1.2921, lng: 36.8219, expectUsApplicable: false, expectNwsApplicable: false },
  { name: "Asia / Tokyo", lat: 35.6762, lng: 139.6503, expectUsApplicable: false, expectNwsApplicable: false },
  { name: "Australia / Sydney", lat: -33.8688, lng: 151.2093, expectUsApplicable: false, expectNwsApplicable: false },
  { name: "South America / São Paulo", lat: -23.5505, lng: -46.6333, expectUsApplicable: false, expectNwsApplicable: false },
];

function testInternationalApplicability(): void {
  for (const s of INTERNATIONAL_SAMPLES) {
    const u = getProviderApplicability("USGS", { lat: s.lat, lng: s.lng });
    const n = getProviderApplicability("NWS", { lat: s.lat, lng: s.lng });
    const f = getProviderApplicability("FloodGuard", { lat: s.lat, lng: s.lng });

    assert.equal(
      u.applicable,
      s.expectUsApplicable,
      `${s.name}: USGS applicable expected ${s.expectUsApplicable}, got ${u.applicable}`,
    );
    assert.equal(
      n.applicable,
      s.expectNwsApplicable,
      `${s.name}: NWS applicable expected ${s.expectNwsApplicable}, got ${n.applicable}`,
    );
    assert.equal(f.applicable, true, `${s.name}: FloodGuard must always apply globally`);

    if (!s.expectUsApplicable) {
      assert.equal(u.applicable, false);
      if (u.applicable === false) {
        assert.equal(u.reason, "outside_region", `${s.name}: USGS reason should be outside_region`);
        assert.ok(u.message && u.message.length > 0, `${s.name}: USGS message should be non-empty`);
      }
    }
    if (!s.expectNwsApplicable) {
      assert.equal(n.applicable, false);
      if (n.applicable === false) {
        assert.equal(n.reason, "outside_region", `${s.name}: NWS reason should be outside_region`);
        assert.ok(n.message && n.message.length > 0, `${s.name}: NWS message should be non-empty`);
      }
    }
  }
}

function testUsgsSiteOverridesRegion(): void {
  /**
   * If an explicit USGS site id is provided, USGS applies even if the coordinate is
   * outside U.S. (e.g. operator looking up a specific gauge while pinned to a non-U.S. map).
   */
  const bolivia = { lat: -17.7833, lng: -63.1821 };
  const baseline = getProviderApplicability("USGS", bolivia);
  assert.equal(baseline.applicable, false, "Bolivia baseline USGS must be not_applicable");

  const withSite = getProviderApplicability("USGS", bolivia, { usgsSite: "01646500" });
  assert.equal(withSite.applicable, true, "Explicit usgsSite must make USGS applicable globally");
}

function testForceOverrideAppliesProvider(): void {
  const bolivia = { lat: -17.7833, lng: -63.1821 };
  const forced = getProviderApplicability("NWS", bolivia, { force: true });
  assert.equal(forced.applicable, true, "force=true must override region check for NWS");
}

function testGeoLedgerKeyGating(): void {
  const originalKey = process.env.GEOAPIFY_API_KEY;
  try {
    delete process.env.GEOAPIFY_API_KEY;
    const sansKey = getProviderApplicability("GeoLedger", { lat: 40.0, lng: -74.0 });
    assert.equal(sansKey.applicable, false, "GeoLedger must be not_configured when key missing");
    if (sansKey.applicable === false) {
      assert.equal(sansKey.reason, "missing_api_key");
      assert.ok(sansKey.message.includes("GEOAPIFY_API_KEY"), "missing-key message should mention GEOAPIFY_API_KEY");
    }

    process.env.GEOAPIFY_API_KEY = "test-key-only-for-selftest";
    const withKey = getProviderApplicability("GeoLedger", { lat: 40.0, lng: -74.0 });
    assert.equal(withKey.applicable, true, "GeoLedger must apply when key is set");
  } finally {
    if (originalKey === undefined) delete process.env.GEOAPIFY_API_KEY;
    else process.env.GEOAPIFY_API_KEY = originalKey;
  }
}

function testBoundingBoxHelperEdges(): void {
  assert.equal(isLikelyUsOrTerritoryCoordinate(NaN, 0), false, "NaN must not match any region");
  assert.equal(isLikelyUsOrTerritoryCoordinate(0, NaN), false, "NaN must not match any region");
  assert.equal(isLikelyUsOrTerritoryCoordinate(0, 0), false, "Equator/prime meridian must not match U.S.");
  assert.equal(isLikelyUsOrTerritoryCoordinate(40.7128, -74.006), true, "NYC must match U.S.");
  assert.equal(isLikelyUsOrTerritoryCoordinate(-17.7833, -63.1821), false, "Santa Cruz, Bolivia must not match U.S.");
}

function testCapabilityRegistryComplete(): void {
  const names = listProviderCapabilities().map((c) => c.providerName);
  for (const required of ["FloodGuard", "USGS", "NWS", "GeoLedger"]) {
    assert.ok(names.includes(required), `Capability registry must include ${required}`);
  }
}

function testRecordProviderSkipEmitsMonitorStatus(): void {
  clearProviderCallEventsForTests();
  recordProviderSkip({
    providerName: "USGS",
    operation: "water_packet_snapshot",
    requestKey: "key-1",
    status: "skipped_not_applicable",
    reason: "outside_region",
    source: "selftest",
  });
  recordProviderSkip({
    providerName: "GeoLedger",
    operation: "water_packet_reverse",
    requestKey: "key-2",
    status: "skipped_missing_key",
    reason: "missing_api_key",
    source: "selftest",
  });
  const totals = getTotalsByStatus();
  assert.equal(totals.skipped_not_applicable ?? 0, 1, "skipped_not_applicable should be recorded");
  assert.equal(totals.skipped_missing_key ?? 0, 1, "skipped_missing_key should be recorded");
  const recent = getRecentProviderCallEvents();
  assert.ok(
    recent.some((e) => e.providerName === "USGS" && e.status === "skipped_not_applicable"),
    "USGS skipped_not_applicable event must be in recent events",
  );
  assert.ok(
    recent.some((e) => e.providerName === "GeoLedger" && e.status === "skipped_missing_key"),
    "GeoLedger skipped_missing_key event must be in recent events",
  );
}

async function testRunGuardedDetectsResultStatuses(): Promise<void> {
  /**
   * runGuardedProviderCall must surface structured result statuses into the monitor.
   * fn() does not throw, but returns { status: "error" | "unavailable" | … }.
   */
  const cases: Array<{
    resultStatus: string;
    expectedMonitorStatus: string;
  }> = [
    { resultStatus: "error", expectedMonitorStatus: "completed_with_provider_error" },
    { resultStatus: "unavailable", expectedMonitorStatus: "completed_unavailable" },
    { resultStatus: "needs_key", expectedMonitorStatus: "completed_needs_key" },
    { resultStatus: "not_applicable", expectedMonitorStatus: "skipped_not_applicable" },
    { resultStatus: "not_configured", expectedMonitorStatus: "completed_not_configured" },
  ];

  for (const c of cases) {
    clearProviderGuardsForTests();
    clearProviderCallEventsForTests();
    const key = buildProviderRequestKey("TestProvider", `op_${c.resultStatus}`, { v: c.resultStatus });
    const out = await runGuardedProviderCall<{ status: string }>({
      key,
      providerName: "TestProvider",
      operation: `op_${c.resultStatus}`,
      fn: async () => ({ status: c.resultStatus, hint: "selftest" } as { status: string }),
      onCooldown: async () => ({ status: "cooldown" }),
      rateLimitCooldownMs: 60_000,
      errorCooldownMs: 60_000,
      perMinuteLimit: 0,
    });
    assert.equal(out.status, c.resultStatus);
    const recent = getRecentProviderCallEvents();
    assert.ok(
      recent.some((e) => e.status === c.expectedMonitorStatus),
      `${c.resultStatus} result should emit monitor status ${c.expectedMonitorStatus}`,
    );
    /**
     * not_applicable / not_configured / needs_key MUST NOT trigger a cooldown — that would
     * defeat the purpose of cleanly re-checking configuration on the very next request.
     */
    if (
      c.resultStatus === "not_applicable" ||
      c.resultStatus === "not_configured" ||
      c.resultStatus === "needs_key"
    ) {
      // (Cooldown is verified by absence: a subsequent call with the same key must call fn again.)
      let secondCallRanFn = false;
      await runGuardedProviderCall<{ status: string }>({
        key,
        providerName: "TestProvider",
        operation: `op_${c.resultStatus}`,
        fn: async () => {
          secondCallRanFn = true;
          return { status: c.resultStatus };
        },
        onCooldown: async () => ({ status: "cooldown" }),
        rateLimitCooldownMs: 60_000,
        errorCooldownMs: 60_000,
        perMinuteLimit: 0,
      });
      assert.equal(
        secondCallRanFn,
        true,
        `${c.resultStatus} result must NOT install a cooldown that blocks the next call`,
      );
    }
  }
}

async function main(): Promise<void> {
  testInternationalApplicability();
  testUsgsSiteOverridesRegion();
  testForceOverrideAppliesProvider();
  testGeoLedgerKeyGating();
  testBoundingBoxHelperEdges();
  testCapabilityRegistryComplete();
  testRecordProviderSkipEmitsMonitorStatus();
  await testRunGuardedDetectsResultStatuses();
  console.log("providerApplicability.selftest: all passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
