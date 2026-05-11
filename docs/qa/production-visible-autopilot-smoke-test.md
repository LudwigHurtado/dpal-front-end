# Production smoke test — Visible Autopilot + Water Alert Evidence Packet

This checklist verifies that the **Vercel** SPA calls a **real deployed backend** for `GET /api/integrations/water/alert-evidence-packet`, not `localhost` (which in the browser means the visitor’s device).

## Required environment variables

### Vercel (front-end)

| Variable | Required | Purpose |
|----------|----------|---------|
| **`VITE_DPAL_API_BASE_URL`** | **Yes (production build)** | Origin of the Node backend that mounts `dpalIntegrations.routes` (no trailing slash), e.g. `https://your-service.up.railway.app`. Production builds **throw** at request time if this is unset. |
| **`VITE_DPAL_API_DEBUG`** | No | Set to `true` temporarily to log final request URL, path, start/complete/fail, and HTTP status (no secrets, no full provider payloads). |

### Railway / backend (Node)

| Variable | Required | Purpose |
|----------|----------|---------|
| **`NODE_ENV`** | Yes | `production` for production CORS behavior. |
| **`CORS_ORIGINS`** or **`FRONTEND_ORIGIN`** | Recommended | Comma-separated allowed browser origins (e.g. `https://dpal-front-end.vercel.app`). Built-in allowlist already includes `https://dpal-front-end.vercel.app` and preview hosts matching `dpal-front-end-*.vercel.app`. |
| **`ENABLE_DEBUG_PROVIDER_USAGE`** | Optional | When `true`, exposes **`GET /api/debug/provider-usage`** in production for temporary operator diagnostics. **Disable after testing** to avoid exposing aggregate provider usage to the public internet. |

## Direct backend test (curl)

Replace `BACKEND_ORIGIN` with the same origin you set in `VITE_DPAL_API_BASE_URL` (no path suffix).

**Santa Cruz, Bolivia** (non–U.S. routing — confirms DPAL is not U.S.-only):

```bash
curl.exe -sS "BACKEND_ORIGIN/api/integrations/water/alert-evidence-packet?lat=-17.78629&lng=-63.18117&label=Santa%20Cruz"
```

**Expected (high level)**

- HTTP **200** and JSON `ok: true` with a `packet` object.
- **Module health / provider routing:** USGS and NWS may show as skipped or not applicable for Bolivia; FloodGuard and GeoLedger paths should still return structured statuses (not a blank error).
- No **500** from the route unless upstream adapters throw; partial provider skips are normal.

**Default demo coordinates (U.S. Potomac)** — optional regression check:

```bash
curl.exe -sS "BACKEND_ORIGIN/api/integrations/water/alert-evidence-packet?lat=38.949&lng=-77.127&label=Potomac&usgsSite=01646500"
```

## Frontend — Visible Autopilot

1. Deploy or run a **production** build with `VITE_DPAL_API_BASE_URL` set to the backend above.
2. Open the Water Alert Evidence route with autopilot query params (as documented in app / Navigator), e.g. `autopilot=true`, `autopilotMode=visible-safe-checks`, coordinates matching your test.
3. Confirm the packet loads (no banner showing only “Failed to fetch”).
4. With **`VITE_DPAL_API_DEBUG=true`**, open the browser devtools console and confirm `[DPAL integrations]` logs show a **final request URL** whose host is your Railway backend, **not** `127.0.0.1` or `localhost`.

## After testing debug endpoints

If you enabled **`ENABLE_DEBUG_PROVIDER_USAGE`** on Railway, set it back to unset/false and redeploy so **`GET /api/debug/provider-usage`** is no longer publicly reachable.
