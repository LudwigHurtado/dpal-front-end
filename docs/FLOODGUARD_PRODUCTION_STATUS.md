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

Time of run: **2026-05-07** (FloodGuard Stage 12J shipped + pushed).

| Stage | Surface | Endpoint or page | Result |
|-------|---------|------------------|--------|
| 12J  | Frontend | `GET /floodguard` | OK — renders Start Panel, "Local fallback" mode chips, 1 active alert, 4 zones in scope. |
| 12I  | Frontend | `GET /floodguard/verify/<id>` | HTTP 200 — route mounts standalone via `AppBootstrap`. |
| 11   | Backend | `GET /api/floodguard/cities` | OK — returns Santa Cruz (SCZ) and Denver (DEN). |
| 11   | Backend | `GET /api/floodguard/alerts/live` | OK — 5 alerts (Santa Cruz Plan 3000 corridor at L3 Flood Alert; others L0–L2). |
| 12C+12E | Backend | `GET /api/floodguard/agents/monitor` | OK — full agentic evaluation, water-level integration present. |
| 12F  | Backend | `GET /api/floodguard/missions` | OK — empty list, includes legal disclaimer. |
| 12I  | Backend | `GET /api/floodguard/public/ledger/test-not-real` | Proper 404 (`{"error":"Ledger record not found","code":"not_found"}`) — endpoint deployed. |
| 12H  | Backend | `GET /api/floodguard/alerts/<id>/ledger` | Proper 404 against in-memory alert id (see §4). |
| 11   | Backend | **`POST /api/floodguard/generate-evidence-packet`** | **500 Internal server error** — write-path issue (see §4). |
| 12G  | Backend | **`POST /api/floodguard/alerts/<id>/route-preview`** | **500 Internal server error.** |
| 12H  | Backend | **`POST /api/floodguard/anchor-alert`** | **500 Internal server error.** |
| -    | Adapters | rainfall / satellite / water-level | All running in synthetic fallback mode (expected — live env flags off). |
| 12H  | Adapters | ledger | `dpal_local_mock` provider (expected for now). |

**Summary.** Reads are healthy across stages 11–12J. Writes that touch the
store on production currently 500. The frontend is fully shipped (Stage
12J UI is rendering on Vercel).

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

This is the end-to-end "real result" path. It currently 500s on the
write step on production — see §4. Locally (`http://localhost:3001`)
it should succeed.

```powershell
$BASE = "https://web-production-a27b.up.railway.app/api/floodguard"
$ALERT = (curl.exe -s "$BASE/alerts/live" | ConvertFrom-Json).alerts[0].alertId
Write-Host "alert: $ALERT"

# 1. Generate the evidence packet
curl.exe -s -X POST "$BASE/generate-evidence-packet" `
  -H "Content-Type: application/json" `
  -d "{`"alertId`":`"$ALERT`",`"generatedBy`":`"smoke`"}"

# 2. Routing preview (dry run)
curl.exe -s -X POST "$BASE/alerts/$ALERT/route-preview" `
  -H "Content-Type: application/json" `
  -d "{`"mode`":`"dry_run`",`"generatedBy`":`"smoke`"}"

# 3. Anchor on the local mock ledger
$LEDGER = (curl.exe -s -X POST "$BASE/anchor-alert" `
  -H "Content-Type: application/json" `
  -d "{`"alertId`":`"$ALERT`",`"createdBy`":`"smoke`"}" | ConvertFrom-Json).ledgerRecordId
Write-Host "ledgerRecordId: $LEDGER"

# 4. Public verification
curl.exe -s "$BASE/public/ledger/$LEDGER"
Write-Host ""
Write-Host "Open: https://dpal-front-end.vercel.app/floodguard/verify/$LEDGER"
```

If step 1, 2, or 3 returns `{"error":"Internal server error"}`, see §4.

---

## 4. Known production issue — write endpoints return 500

### Symptom

The reads listed in §2 all succeed. These write endpoints currently
respond with `500 {"error":"Internal server error"}`:

- `POST /api/floodguard/generate-evidence-packet`
- `POST /api/floodguard/alerts/:alertId/route-preview`
- `POST /api/floodguard/anchor-alert`

### What we know

- `/health` reports `service: dpal-backend, version: 1.0.0, env:
  production` — Railway is running this repo's `backend/` code.
- All Stage 12C–12J **read** routes are deployed (cities, alerts/live,
  agents/monitor, missions, public/ledger/:id).
- The store's `persist()` swallows filesystem errors with `try/catch`
  ([`floodGuardStore.ts` lines 309–316][persist]) — so a filesystem
  issue alone would not cause a 500 from the route handler. The 500
  must originate **before** persistence (in the orchestrator, packet
  builder, ledger builder, or routing service), most likely on a code
  path that's only exercised by writes.
- Alert IDs in production are timestamped (`...-205744`,
  `...-205745`, etc.) and are regenerated at process restart, so a
  stale `store.json` in the persistent directory could include
  references to alerts that no longer exist in memory.

[persist]: ../backend/src/services/floodGuard/floodGuardStore.ts

### Triage steps for the next engineer

1. **Open the Railway logs** for `dpal-backend` and re-run §3.2's smoke
   commands. Capture the stack trace from the first 500.
2. **Check the persisted store** at the deploy's data directory
   (`backend/data/floodguard/store.json`). If the file exists from a
   prior version with an incompatible shape, deleting or migrating it
   may unblock writes.
3. **Verify Railway has a Volume mounted** at the data directory. If
   not, add one — otherwise Railway's container filesystem is
   ephemeral and `persist()` can't keep state across restarts.
4. **Reproduce locally** with the same env:

    ```bash
    cd backend
    NODE_ENV=production npm run build
    NODE_ENV=production node dist/index.js
    # in another terminal:
    curl http://localhost:3001/api/floodguard/cities
    # then re-run §3.2 with BASE=http://localhost:3001/api/floodguard
    ```

   If it succeeds locally, the issue is environmental (filesystem,
   timeouts, env vars). If it 500s locally too, the bug is in the
   deployed commit and you can debug with full stack traces.

5. **Once fixed,** add a runtime smoke job (or a CI step) that runs
   the §3.2 commands against production after every deploy and fails
   if any step is non-2xx. That way write-path regressions can't ship
   silently again.

### What is NOT broken

- Frontend is fully deployed; Stage 12J onboarding panel renders.
- Alerts, agents, missions, and the public verification endpoint are
  all responding to GETs.
- Live-data flags are intentionally off (`Local fallback`,
  `Synthetic rainfall fallback`, `AquaScan satellite fallback`,
  `Mock ledger`, `Preview routing only`) — that is the expected pilot
  posture, not a bug.

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

If any of those fails, follow §4 and check Railway logs.

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*
