# QA — DPAL Visible Autopilot (Water Alert Evidence)

Manual checklist when Playwright is not run or for stakeholder walkthroughs.

## Exact URL

```
/water-intelligence/water-alert-evidence?lat=-17.7833&lng=-63.1821&navigatorFlow=water-alert&source=dpal-navigator&autopilot=true&autoRun=true&autopilotMode=visible-safe-checks&showCursor=true
```

Full example: `http://127.0.0.1:3000` + path above (Vite dev default port 3000).

## Expected visual behavior

1. Coordinate fields are prefilled from `lat` / `lng`.
2. A **virtual** pointer (`data-dpal-autopilot-cursor`) moves over targets — this is **not** the Windows OS cursor.
3. Spotlight ring (`data-dpal-autopilot-spotlight`) highlights the active target.
4. Bottom **Autopilot control bar** (`data-dpal-autopilot-control-bar`) shows step progress, Pause / Stop / Take Control.
5. **Autopilot status card** (`data-dpal-autopilot-status-card`) lists FloodGuard, USGS, NWS, GeoLedger progress and packet status when the scan returns.
6. Flow ends at **Human approval** copy on the evidence integrity panel (`data-dpal-target="human-approval-gate"`).

## Expected network behavior

- One `GET` to `/api/integrations/water/alert-evidence-packet` with `lat`, `lng`, and optional `label` / `usgsSite` (same as manual **Run Water Evidence Scan**).
- In dev, the browser console may log `[DPAL water alert evidence] scan completed` with `packetStatus` and `moduleHealthKeys` (no secrets).

## Expected provider status behavior

- While the scan runs, provider chips show **Checking** then **Observed** or **Unavailable** depending on `packet.moduleHealth` (or equivalent paths in the JSON).

## Expected final gate

- Autopilot status should become **Completed** after the human-approval step dwell.
- Control bar copy must still say that **human approval** is required for publication, anchoring, payments, or escalation.

## Manual mode regression

1. Open the same path **without** `autopilot=true` (or with `autopilot=false`).
2. Click **Run Water Evidence Scan** — same API as autopilot; page should load packet data as before.
3. Confirm no autopilot control bar appears when autopilot query flags are absent.

## Screenshots to capture (optional)

1. Navigator with **Watch DPAL Run Safe Checks** visible (water flood scenario).
2. Dashboard with virtual cursor on coordinates.
3. Status card with provider row states.
4. Human approval gate panel with amber advisory copy.

## Dev-only diagnostics

With `import.meta.env.DEV` true, expand **Autopilot Diagnostics** on the dashboard and confirm timeline events (`scan_triggered`, `scan_request_completed`, `human_approval_gate_reached`, etc.). In the browser console, `window.__DPAL_AUTOPILOT_TIMELINE__` lists the same events.
