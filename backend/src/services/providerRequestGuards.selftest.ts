/**
 * Run after build:
 *   cd backend && npm run build && node dist/services/providerRequestGuards.selftest.js
 * Or from repo root (tsx):
 *   npx tsx backend/src/services/providerRequestGuards.selftest.ts
 */
import assert from "node:assert/strict";
import {
  clearProviderCallEventsForTests,
  getTotalsByStatus,
  recordProviderCallEvent,
} from "./providerCallMonitor.js";
import {
  buildProviderRequestKey,
  clearProviderGuardsForTests,
  getProviderCooldownStatus,
  runGuardedProviderCall,
  setProviderCooldown,
} from "./providerRequestGuards.js";

async function testCoalesce(): Promise<void> {
  clearProviderGuardsForTests();
  clearProviderCallEventsForTests();
  const key = buildProviderRequestKey("TestProvider", "demo_op", { x: "1" });
  let externalStarts = 0;
  const fn = async () => {
    externalStarts += 1;
    await new Promise((r) => setTimeout(r, 60));
    return "done";
  };
  const [a, b] = await Promise.all([
    runGuardedProviderCall({
      key,
      providerName: "TestProvider",
      operation: "demo_op",
      fn,
      onCooldown: async () => "cooldown",
      rateLimitCooldownMs: 60_000,
      errorCooldownMs: 60_000,
      perMinuteLimit: 0,
    }),
    runGuardedProviderCall({
      key,
      providerName: "TestProvider",
      operation: "demo_op",
      fn,
      onCooldown: async () => "cooldown",
      rateLimitCooldownMs: 60_000,
      errorCooldownMs: 60_000,
      perMinuteLimit: 0,
    }),
  ]);
  assert.equal(a, "done");
  assert.equal(b, "done");
  assert.equal(externalStarts, 1);
  const totals = getTotalsByStatus();
  assert.ok((totals.coalesced ?? 0) >= 1);
}

async function testCooldownSkipsFn(): Promise<void> {
  clearProviderGuardsForTests();
  clearProviderCallEventsForTests();
  const key = buildProviderRequestKey("TestProvider", "cool_op", { y: "2" });
  setProviderCooldown("TestProvider", key, "manual", 120_000);
  let called = false;
  const out = await runGuardedProviderCall({
    key,
    providerName: "TestProvider",
    operation: "cool_op",
    fn: async () => {
      called = true;
      return "live";
    },
    onCooldown: async () => "skipped",
    rateLimitCooldownMs: 60_000,
    errorCooldownMs: 60_000,
    perMinuteLimit: 0,
  });
  assert.equal(out, "skipped");
  assert.equal(called, false);
}

function testMonitorStatusCounts(): void {
  clearProviderCallEventsForTests();
  const t0 = new Date().toISOString();
  recordProviderCallEvent({
    providerName: "MonitorTest",
    operation: "x",
    requestKey: "k1",
    startedAt: t0,
    completedAt: t0,
    durationMs: 0,
    status: "cache_hit",
    errorType: null,
    source: "selftest",
    latRounded3: "1.000",
    lngRounded3: "2.000",
  });
  const totals = getTotalsByStatus();
  assert.equal(totals.cache_hit, 1);
}

async function test429SetsCooldown(): Promise<void> {
  clearProviderGuardsForTests();
  clearProviderCallEventsForTests();
  const key = buildProviderRequestKey("TestProvider", "rl_op", { z: "3" });
  try {
    await runGuardedProviderCall({
      key,
      providerName: "TestProvider",
      operation: "rl_op",
      fn: async () => {
        throw new Error("HTTP 429 from example.com — too many");
      },
      onCooldown: async () => "skip",
      rateLimitCooldownMs: 120_000,
      errorCooldownMs: 60_000,
      perMinuteLimit: 0,
    });
    assert.fail("expected throw");
  } catch {
    /* expected */
  }
  const st = getProviderCooldownStatus("TestProvider", key);
  assert.equal(st.active, true);
  assert.equal(st.reason, "rate_limited");
}

async function main(): Promise<void> {
  testMonitorStatusCounts();
  await testCoalesce();
  await testCooldownSkipsFn();
  await test429SetsCooldown();
  console.log("providerRequestGuards.selftest: all passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
