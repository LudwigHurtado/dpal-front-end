# DPAL FloodGuard — Production Status & Smoke Checks

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*

This document captures the **current production deployment state** of
FloodGuard plus the canonical smoke-check recipes you can paste into a
terminal to verify the live site at any time.

Companion docs:

- [`FLOODGUARD_USER_MANUAL.md`](./FLOODGUARD_USER_MANUAL.md) — operator manual.
- [`FLOODGUARD_DEVELOPER_GUIDE.md`](./FLOODGUARD_DEVELOPER_GUIDE.md) — dev onboarding.
- [`FLOODGUARD_ARCHITECTURE.md`](./FLOODGUARD_ARCHITECTURE.md) — pipeline + hashing recipes.

---

## 1. Canonical production URLs

| Surface | URL |
|---------|-----|
| Frontend (Vercel SPA) | `https://dpal-front-end.vercel.app` |
| FloodGuard dashboard | `https://dpal-front-end.vercel.app/floodguard` |
| Public verification page (template) | `https://dpal-front-end.vercel.app/floodguard/verify/<ledgerRecordId>` |
| Backend API (Railway) | `https://web-production-a27b.up.railway.app` |
| FloodGuard API base | `https://web-production-a27b.up.railway.app/api/floodguard` |

`/health` on the backend currently reports:

```json
{"ok":true,"service":"dpal-backend","version":"1.0.0","env":"production"}
```

---

## 2. Latest production smoke results

Time of run: **2026-05-15** (write-path fix deployed on `main`, commits
`76fa94a` + `f3c08fe`).

| Stage | Surface | Endpoint or page | Result |
|-------|---------|------------------|--------|
| 12J  | Frontend | `GET /floodguard` | OK — renders Start Panel, "Local fallback" mode chips, active alerts, zones in scope. |
| 12I  | Frontend | `GET /floodguard/verify/<id>` | HTTP 200 — route mounts standalone via `AppBootstrap`. |
| 11   | Backend | `GET /api/floodguard/cities` | OK — returns Santa Cruz (SCZ) and Denver (DEN). |
| 11   | Backend | `GET /api/floodguard/alerts/live` | OK — alerts with lifecycle + signal snapshots. |
| 12C+12E | Backend | `GET /api/floodguard/agents/monitor` | OK — full agentic evaluation, water-level integration present. |
| 12F  | Backend | `GET /api/floodguard/missions` | OK — includes legal disclaimer. |
| 12I  | Backend | `GET /api/floodguard/public/ledger/test-not-real` | Proper 404 (`{"error":"Ledger record not found","code":"not_found"}`). |
| 11   | Backend | **`POST /api/floodguard/generate-evidence-packet`** | **HTTP 200** — `ok: true`, `packetStatus: generated_unanchored`, `blockchainAnchored: false`. |
| 12G  | Backend | **`POST /api/floodguard/alerts/<id>/route-preview`** | **HTTP 200** — `ok: true`, `previewStatus: generated`, `mode: dry_run`, routes + blocked populated. |
| 12H  | Backend | **`POST /api/floodguard/anchor-alert`** | **HTTP 200** — `ok: true`, `anchorStatus: pending_anchor`, `ledgerMode: mock`, `blockchainAnchored: false`. |
| -    | Adapters | rainfall / satellite / water-level | Synthetic fallback mode (expected — live env flags off). |
| 12H  | Adapters | ledger | `dpal_local_mock` provider (expected for now). |

**Summary.** Reads and writes are healthy on production. Write endpoints
return structured **200** responses with explicit degraded/mock flags
instead of **500**. The frontend is fully shipped (Stage 12J UI on Vercel).

**Prior run (2026-05-07):** the three POST endpoints returned **500** before
the safe-wrapper patch and malformed-JSON handler (see §4).

---

## 3. How to re-run the smoke check yourself

PowerShell on Windows aliases `curl` to `Invoke-WebRequest`. Use
`curl.exe` (or run inside a real Bash). All commands below are written
for `curl.exe`.

### 3.1 Quick sanity (reads only)

```powershell
curl.exe -s https://web-production-a27b.up.railway.app/health
curl.exe -s https://web-production-a27b.up.railway.app/api/floodguard/cities
curl.exe -s https://web-production-a27b.up.railway.app/api/floodguard/alerts/live -o nul -w "HTTP %{http_code} | %{size_download} bytes`n"
curl.exe -s https://web-production-a27b.up.railway.app/api/floodguard/agents/monitor -o nul -w "HTTP %{http_code} | %{size_download} bytes`n"
curl.exe -s https://web-production-a27b.up.railway.app/api/floodguard/missions
curl.exe -s "https://web-production-a27b.up.railway.app/api/floodguard/public/ledger/none"
```

Expected: `200 OK` for everything except the last line, which should
return the `{"error":"Ledger record not found","code":"not_found"}`
shape (Stage 12I deployed).

### 3.2 Full write smoke (anchor + verify)

This is the end-to-end "real result" path. On Windows, prefer
`--data-binary @file.json` for POST bodies — inline `-d "{...}"` often
produces invalid JSON and triggers **400** `validation_error` (not 500).

```powershell
$BASE = "https://web-production-a27b.up.railway.app/api/floodguard"
$ALERT = (curl.exe -s "$BASE/alerts/live" | ConvertFrom-Json).alerts[0].alertId
Write-Host "alert: $ALERT"

# Write JSON bodies to temp files (avoids PowerShell escaping bugs)
@{"alertId"=$ALERT;"generatedBy"="smoke"} | ConvertTo-Json | Set-Content smoke-evidence.json
@{"mode"="dry_run";"generatedBy"="smoke"} | ConvertTo-Json | Set-Content smoke-route.json
@{"alertId"=$ALERT;"createdBy"="smoke"} | ConvertTo-Json | Set-Content smoke-anchor.json

# 1. Generate the evidence packet
curl.exe -s -w "`nHTTP %{http_code}`n" -X POST "$BASE/generate-evidence-packet" `
  -H "Content-Type: application/json" --data-binary "@smoke-evidence.json"

# 2. Routing preview (dry run)
curl.exe -s -w "`nHTTP %{http_code}`n" -X POST "$BASE/alerts/$ALERT/route-preview" `
  -H "Content-Type: application/json" --data-binary "@smoke-route.json"

# 3. Anchor on the local mock ledger
curl.exe -s -X POST "$BASE/anchor-alert" `
  -H "Content-Type: application/json" --data-binary "@smoke-anchor.json" -o anchor-out.json
$LEDGER = (Get-Content anchor-out.json -Raw | ConvertFrom-Json).ledgerRecordId
Write-Host "ledgerRecordId: $LEDGER"

# 4. Public verification
curl.exe -s "$BASE/public/ledger/$LEDGER"
Write-Host ""
Write-Host "Open: https://dpal-front-end.vercel.app/floodguard/verify/$LEDGER"
```

Expected: **HTTP 200** on steps 1–3 with `ok: true` and explicit
`blockchainAnchored: false` / `ledgerMode: mock` flags. Step 4 returns the
public-safe ledger record.

---

## 4. Resolved issue — write endpoints returned 500 (fixed 2026-05-15)

### Symptom (historical, 2026-05-07)

The reads listed in §2 all succeeded, but these write endpoints returned
`500 {"error":"Internal server error"}`:

- `POST /api/floodguard/generate-evidence-packet`
- `POST /api/floodguard/alerts/:alertId/route-preview`
- `POST /api/floodguard/anchor-alert`

### Root causes

1. **Malformed JSON on Windows smoke tests** — PowerShell `curl -d "{...}"`
   often produced invalid JSON; Express's `express.json()` threw before
   route handlers, surfacing as **500**. Fix: global handler returns **400**
   `validation_error` for bad JSON (`backend/src/index.ts`, commit `f3c08fe`).
   Smoke recipes now use `--data-binary @file.json` (see §3.2).

2. **Unhandled exceptions on write paths** — orchestrator/store errors could
   bubble to Express. Fix: safe wrappers in `floodGuardStore.ts` and
   structured **200** degraded responses in `floodGuardRoutes.ts` (commit
   `76fa94a`). Responses always include `ok`, status fields, and
   `blockchainAnchored: false` where applicable.

### Current status

All three POST endpoints return **HTTP 200** on production as of
**2026-05-15** (see §2). Re-run §3.2 after each deploy to confirm.

### If writes regress

1. Check Railway logs for `[evidence_packet_generation]`, `[route_preview_logic]`,
   or `[ledger_anchoring]` prefixes.
2. Confirm smoke bodies are valid JSON (`--data-binary @file.json`).
3. Check `backend/data/floodguard/store.json` for stale shape — `loadOrSeed()`
   heals versions 1–5 automatically.
4. Verify a Railway Volume is mounted if you need persistence across restarts.

### What is NOT broken (expected pilot posture)

- Frontend is fully deployed; Stage 12J onboarding panel renders.
- Live-data flags are intentionally off (`Local fallback`,
  `Synthetic rainfall fallback`, `AquaScan satellite fallback`,
  `Mock ledger`, `Preview routing only`) — not a bug.

---

## 5. Live-data configuration checklist (when you want real numbers)

| Capability | Env vars | Cost / risk |
|------------|----------|-------------|
| Live rainfall (Open-Meteo) | `FLOODGUARD_LIVE_RAINFALL_ENABLED=true`, `FLOODGUARD_RAINFALL_PROVIDER=open-meteo` | Free/community tier; verify ToS. |
| Live satellite (Sentinel Hub) | `FLOODGUARD_LIVE_SATELLITE_ENABLED=true`, `COPERNICUS_CLIENT_ID=...`, `COPERNICUS_CLIENT_SECRET=...`, `COPERNICUS_BASE_URL=https://services.sentinel-hub.com` | Paid quotas after free tier. |
| Live water level | `FLOODGUARD_LIVE_WATER_LEVEL_ENABLED=true`, `FLOODGUARD_WATER_LEVEL_PROVIDER=...` | Provider integration is currently TBD; synthetic gauge is the default. |
| Real ledger anchor | `FLOODGUARD_LEDGER_PROVIDER=external_evm | bitcoin_op_return | dpal_chain` plus signer/key vars | Network fees + key custody. |

Restart the backend after changing env vars. The integrations panel in
`/api/floodguard/alerts/live` will report the new provider, and the
ledger digest seal will flip from `isMock: true` to `isMock: false`.

---

## 6. Operator status checklist

A short version of "is FloodGuard healthy right now":

- [ ] `GET /health` returns `ok: true`.
- [ ] `GET /api/floodguard/cities` returns at least one city.
- [ ] `GET /api/floodguard/alerts/live` returns alerts with `lifecycle`
      and `signalSnapshot`.
- [ ] `GET /api/floodguard/agents/monitor` returns
      `missionSafetyClassification` for each zone.
- [ ] `POST /api/floodguard/generate-evidence-packet` returns a
      `contentHash`.
- [ ] `POST /api/floodguard/anchor-alert` returns a `ledgerRecordId`
      and `anchoringHash`.
- [ ] `GET /api/floodguard/public/ledger/<id>` returns the public-safe
      record.
- [ ] `https://dpal-front-end.vercel.app/floodguard/verify/<id>` renders
      the verification page.

If any of those fails, follow §4 (regression triage) and check Railway logs.

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*
