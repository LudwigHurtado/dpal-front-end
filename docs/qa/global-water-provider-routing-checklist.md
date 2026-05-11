# DPAL Global Water Provider Routing — QA checklist

> **Purpose:** Verify that DPAL builds a useful Water Alert Evidence Packet for any
> coordinate in the world, while still avoiding wasted API calls on providers that
> don't apply to that region.
>
> **Hard rule:** DPAL is **not** U.S.-only. Provider applicability is an optimization,
> never a gate on international users.

---

## 1. Provider scope summary

| Provider | Scope | Applies to | Notes |
|---|---|---|---|
| **FloodGuard** (Open-Meteo + RainViewer) | **global** | every coordinate | Cache-first; coalesced; cooldown protected. |
| **USGS Water Services** | **country_specific** | U.S. + U.S. territories, **or** any coordinate when an explicit `usgsSite` is provided | Otherwise → `not_applicable`, no HTTP call. |
| **NOAA / NWS Active Alerts** | **country_specific** | U.S. + U.S. territories | Otherwise → `not_applicable`, no HTTP call. |
| **GeoLedger** (Geoapify reverse) | **configured_only** | any coordinate **when** `GEOAPIFY_API_KEY` is set | Otherwise → `not_configured`, no HTTP call. |

U.S. + territory bounding boxes are defined in `backend/src/services/providerApplicability.ts`
and cover: continental U.S., Alaska (and Aleutian wrap east of dateline), Hawaii, Puerto Rico,
U.S. Virgin Islands, Guam, Northern Mariana Islands, and American Samoa.

---

## 2. Status taxonomy (per provider, surfaced in `moduleHealth`)

| Status | Meaning | Counted as failure? |
|---|---|---|
| `ok` | provider returned a healthy result | no |
| `cached` | FloodGuard cache hit | no |
| `stale_fallback` | stale-cache fallback because provider is in cooldown | no |
| `unavailable` | provider was reachable but returned no usable data | yes (degraded if any healthy peer exists) |
| `error` | provider call failed (network, 5xx, parse, etc.) | yes |
| `not_applicable` | provider does not apply to this coordinate | **no** |
| `not_configured` | provider requires an API key that is not set on this server | **no** |

Packet-level `status` rules:
- `ok` — every **applicable** provider succeeded.
- `degraded` — at least one applicable provider failed but the packet is still useful.
- `error` — there were no applicable providers at all (very rare; should never happen
  for normal coordinates because FloodGuard is always applicable).

> A packet **must never** be marked `error` just because U.S.-specific providers were
> not applicable, or because GeoLedger was not configured.

---

## 3. International coordinate tests

For each coordinate, expectation is "DPAL still produces a useful packet."

| City | lat | lng | Expected `usgsWater` | Expected `nwsAlerts` | Expected `floodguard` | Expected packet `status` (GEOAPIFY_API_KEY unset) |
|---|---|---|---|---|---|---|
| Santa Cruz, Bolivia | -17.7833 | -63.1821 | `not_applicable` | `not_applicable` | `ok` / `cached` / `stale_fallback` | `ok` |
| Madrid, Europe | 40.4168 | -3.7038 | `not_applicable` | `not_applicable` | `ok` / `cached` | `ok` |
| Nairobi, Africa | -1.2921 | 36.8219 | `not_applicable` | `not_applicable` | `ok` / `cached` | `ok` |
| Tokyo, Asia | 35.6762 | 139.6503 | `not_applicable` | `not_applicable` | `ok` / `cached` | `ok` |
| Sydney, Australia | -33.8688 | 151.2093 | `not_applicable` | `not_applicable` | `ok` / `cached` | `ok` |
| São Paulo, Brazil | -23.5505 | -46.6333 | `not_applicable` | `not_applicable` | `ok` / `cached` | `ok` |

For all international coordinates above, the packet `summary.providerRoutingNotes` must
contain at least:

> "DPAL used global water/flood providers for this location. U.S.-specific providers were marked not applicable and were not called."

If `GEOAPIFY_API_KEY` is also unset:
- `moduleHealth.geoLedger === "not_configured"`
- `summary.providerRoutingNotes` also includes:
  > "GeoLedger location validation is not configured. Set GEOAPIFY_API_KEY to enable this provider."
- Packet `status` is still `ok` (configuration ≠ failure).

---

## 4. U.S. coordinate tests

| City | lat | lng | Expected `usgsWater` | Expected `nwsAlerts` |
|---|---|---|---|---|
| New York, NY | 40.7128 | -74.006 | `ok` (or `error` only if upstream service genuinely failed) | `ok` (or `no_active_alerts`) |
| Honolulu, HI | 21.3069 | -157.8583 | `ok` | `ok` |
| San Juan, PR | 18.4655 | -66.1057 | `ok` | `ok` |
| Anchorage, AK | 61.2181 | -149.9003 | `ok` | `ok` |
| Hagatna, Guam | 13.4745 | 144.7504 | `ok` (or `no_data`) | `ok` |
| Pago Pago, American Samoa | -14.2756 | -170.7022 | `ok` (or `no_data`) | `ok` |

Packet `summary.providerRoutingNotes` for U.S. coordinates should NOT contain the
international-skipped banner.

---

## 5. Override tests

| Test | Setup | Expected |
|---|---|---|
| Explicit `usgsSite` on Bolivia | `?lat=-17.7833&lng=-63.1821&usgsSite=01646500` | USGS runs (no `skipped_not_applicable`); USGS response status follows whatever USGS actually returns for that site. NWS still `not_applicable`. |
| GEOAPIFY_API_KEY set, Bolivia | env `GEOAPIFY_API_KEY=…` | GeoLedger runs and returns `matched` / `no_match` / `error`. Packet status follows normal rules. |
| GEOAPIFY_API_KEY unset, U.S. | env unset | GeoLedger → `not_configured`. Packet status still `ok` if USGS+NWS+FloodGuard healthy. |

---

## 6. Provider monitor expectations — `/api/debug/provider-usage`

After requesting `GET /api/integrations/water/alert-evidence-packet?lat=-17.7833&lng=-63.1821`
(no `GEOAPIFY_API_KEY` set), the **recentEvents** list MUST contain:

- `FloodGuard` — one of `cache_hit`, `completed`, `completed_unavailable`, `coalesced`
- `USGS` — exactly `skipped_not_applicable`
- `NWS` — exactly `skipped_not_applicable`
- `GeoLedger` — exactly `skipped_missing_key`
- `WaterAlertPacket` — `completed` (or `coalesced` for concurrent duplicate)

And it MUST NOT contain:
- any `started` / `completed` / `failed` / `rate_limited` entry for `USGS` for that lat/lng
- any `started` / `completed` / `failed` / `rate_limited` entry for `NWS` for that lat/lng
- any `started` / `completed` / `failed` / `rate_limited` entry for `GeoLedger` when key is missing

`totalsByStatus` should include non-zero counts for at least:
- `skipped_not_applicable`
- `skipped_missing_key`
- one of `cache_hit` / `completed` / `coalesced` / `completed_unavailable`

---

## 7. New monitor statuses introduced

| Status | When emitted |
|---|---|
| `skipped_not_applicable` | Provider does not apply to this coordinate (USGS / NWS outside U.S.) |
| `skipped_missing_key` | Provider requires an API key that is not configured (GeoLedger without `GEOAPIFY_API_KEY`) |
| `completed_with_provider_error` | Provider call completed but returned `{ status: "error" }` |
| `completed_unavailable` | Provider call completed but returned `{ status: "unavailable" }` |
| `completed_not_configured` | Provider call completed but returned `{ status: "not_configured" }` |
| `completed_needs_key` | Provider call completed but returned `{ status: "needs_key" }` |

`recordProviderSkip(...)` from `providerRequestGuards.ts` emits the two `skipped_*`
statuses synthetically (no HTTP call).

---

## 8. API call safety rules

- **Never** call USGS or NWS for an obviously non-U.S. coordinate (and no `usgsSite`).
- **Never** call Geoapify when `GEOAPIFY_API_KEY` is missing.
- **Never** mark a packet `error` solely because a regional provider was skipped.
- **Never** install a cooldown for `not_applicable` / `not_configured` / `needs_key`.
- **Always** install a cooldown for true rate-limit responses and thrown network errors.
- **Always** route through `runGuardedProviderCall` for live HTTP calls so coalescing,
  cooldowns, and per-minute caps are honored.
- **Always** prefer FloodGuard cache hits to live calls when the entry is fresh.

---

## 9. Manual test commands

> Replace `$BASE` with `http://localhost:3001` for local dev or your Railway URL for prod.

```bash
# Bolivia — international
curl "$BASE/api/integrations/water/alert-evidence-packet?lat=-17.7833&lng=-63.1821" | jq '.packet.status, .packet.moduleHealth, .packet.providerRouting'

# New York — U.S.
curl "$BASE/api/integrations/water/alert-evidence-packet?lat=40.7128&lng=-74.006" | jq '.packet.status, .packet.moduleHealth, .packet.providerRouting'

# Bolivia with explicit USGS site — USGS should still run
curl "$BASE/api/integrations/water/alert-evidence-packet?lat=-17.7833&lng=-63.1821&usgsSite=01646500" | jq '.packet.moduleHealth.usgsWater'

# Provider usage debug
curl "$BASE/api/debug/provider-usage?enable=$ENABLE_DEBUG_PROVIDER_USAGE" | jq '.totalsByStatus'
```

---

## 10. Selftest commands

```bash
cd backend
npm run build
node dist/services/providerRequestGuards.selftest.js
node dist/services/providerApplicability.selftest.js
```

Expected output:
```
providerRequestGuards.selftest: all passed
providerApplicability.selftest: all passed
```
