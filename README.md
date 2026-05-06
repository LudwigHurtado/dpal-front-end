# DPAL Front-End

Vite 6 + React 19 + TypeScript SPA: the main DPAL citizen-reporting and environmental monitoring platform. Deployed on **Vercel**; API calls go to a **Railway** Node/MongoDB backend (`dpal-ai-server`).

---

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Use the same API host locally as production:

```bash
# .env.local
VITE_API_BASE=https://web-production-a27b.up.railway.app
VITE_USE_SERVER_AI=true
```

Build for production:

```bash
npm run build
npm run preview
```

Type-check:

```bash
npm run lint
```

---

## Project quality checklist

Run this sequence before merging changes that touch **Field OS**, **Super Agent** (`SuperAgentRuntime`, `CaseWorkspace`, `ExecutionTraceService`, `PlanExecutionBridge`, `DpalLeadAgent`), or **workflow previews** — or when you want a quick regression guard.

```bash
npm run test:super-agent-loop
npm run lint
npm run build
```

Shortcut (same steps in order):

```bash
npm run check:quality
```

### Super Agent Loop E2E (`test:super-agent-loop`)

| | |
|--|--|
| **Command** | `npm run test:super-agent-loop` |
| **Runner** | [`tsx`](https://github.com/privatenumber/tsx) executes `src/field-os/super-agent/dev/runSuperAgentLoopE2e.ts` (dev-only; not bundled in the app). |
| **What it covers** | End-to-end **Dry Run** behavior: `createInvestigationPlan` → `runPlannedWorkflowPreview` → `checkCompletionStatus` / `continueLoop` → `export()`, plus representative goals (water/vegetation, VIU/carbon, Good Wheels), missing-input handling, and all-gates-approved completion. Asserts honest claim language (no false “human verified” / “blockchain anchored” phrasing). |
| **When to run** | After edits to Super Agent runtime, lead agent selection, plan/workflow bridge, or Field OS workflow blueprints used in previews. Also run before release branches if those areas changed. |

> **TODO(CI):** This repo has **no GitHub Actions (or other) CI workflow** checked in yet. When CI is added, run **`npm run test:super-agent-loop` before `npm run lint` and `npm run build`** so the Super Agent loop cannot regress silently.

---

## Environment variables

All Vite-exposed variables must start with `VITE_`. Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_API_BASE` | Yes | Railway backend origin, e.g. `https://web-production-a27b.up.railway.app` |
| `VITE_GEMINI_API_KEY` | Optional* | Client-side Gemini key; exposed in the bundle, so prefer server AI for production |
| `VITE_USE_SERVER_AI` | Optional* | `true` sends AI through `POST /api/ai/gemini` on the backend |
| `VITE_OPENAI_API_KEY` | Optional | Politician Transparency query refinement and evidence drafting |
| `VITE_OPENAI_MODEL` | Optional | Defaults to `gpt-4o-mini` |
| `VITE_BRAVE_SEARCH_API_KEY` | Optional | Live web search |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Locator / Places |
| `VITE_LAYOUT_VERSION` | Optional | `v1` or `v2` hub layout experiment |

\* At least one of `VITE_GEMINI_API_KEY` or `VITE_USE_SERVER_AI=true` is needed for AI features.

Current AI helper note:

- The AFOLU calculator helper now uses `gemini-2.5-flash` through `services/geminiService.ts`
- The helper UI explicitly shows whether each reply came from `Gemini` or a local `Fallback`
- In production, prefer `VITE_USE_SERVER_AI=true` with Railway `GEMINI_API_KEY` instead of shipping a browser Gemini key

Backend-only satellite credentials live on Railway, not in Vercel:

| Railway variable | Purpose |
|------------------|---------|
| `COPERNICUS_CLIENT_ID` | Sentinel Hub / Copernicus OAuth client id |
| `COPERNICUS_CLIENT_SECRET` | Sentinel Hub / Copernicus OAuth client secret |
| `EARTH_OBSERVATION_LIVE_ENABLED` | When `true`, enables live Earth Observation adapter paths on the API host (see `backend/.env.example`) |
| `NASA_EARTHDATA_TOKEN` | Optional Earthdata token for NASA catalog flows used by EO adapters |
| `NASA_FIRMS_MAP_KEY` | Optional NASA FIRMS map key where FIRMS integration is used |
| `GEMINI_API_KEY` | Used by `POST /api/dpal-assistant/project-guide` for optional AI-enriched project guidance (same key pattern as other server Gemini routes) |

After changing Railway variables, redeploy or restart the backend service.

**API routes this SPA expects on `VITE_API_BASE`:** Among others, **`POST /api/earth-observation/scan`** and **`POST /api/dpal-assistant/project-guide`** are implemented in this repo under **`backend/src/routes/`** and must be deployed on whatever backend you point the front-end at (often the same Railway service as `dpal-ai-server`), or proxied there.

---

## Dev = Production parity checklist

Use this checklist when you want local behavior to match production as closely as possible.

1. Set `VITE_API_BASE` in `.env.local` to the same Railway URL used in production.
2. Set `VITE_USE_SERVER_AI=true` so AI calls use backend `POST /api/ai/gemini` like production.
3. Do not rely on localStorage-only fallbacks when validating production behavior.
4. Run smoke checks against the same API base:
   - `GET {VITE_API_BASE}/health`
   - `GET {VITE_API_BASE}/api/ai/status`
5. Restart Vite after env changes (`npm run dev`).

---

## Good Wheels (publish readiness)

Route: `/good-wheels` (embedded module under `src/good-wheels/`).

Current review findings:

- Non-demo auth/trip flows now use server adapters (`/api/good-wheels/*`) while demo mode remains available.
- Trip lifecycle is server-backed for accept/status/cancel/complete in non-demo mode.
- Driver broadcast/chat server contract is now defined under `/api/good-wheels/*` in the repo backend (`backend/src/routes/goodWheels.ts`) and consumed by `src/good-wheels/services/goodWheelsCommsService.ts`.

Expected backend endpoints for production:

- `GET /api/good-wheels/health`
- `POST /api/good-wheels/auth/signin` (canonical)
- `POST /api/good-wheels/auth/sign-in` (alias)
- `POST /api/good-wheels/trips/request`
- `GET /api/good-wheels/driver/queue`
- `POST /api/good-wheels/trips/:tripId/accept`
- `PATCH /api/good-wheels/trips/:tripId/status`
- `POST /api/good-wheels/trips/:tripId/cancel`
- `POST /api/good-wheels/trips/:tripId/complete`
- `GET/POST /api/good-wheels/broadcasts`
- `POST /api/good-wheels/broadcasts/:broadcastId/ack`
- `GET/POST /api/good-wheels/chat/:threadId/messages`

Before publishing Good Wheels:

1. Deploy this repo backend (`backend/src/routes/goodWheels.ts`, mounted by `backend/src/index.ts`) and keep `/api/good-wheels/*` reachable there.
2. Set frontend env to:
   - `VITE_API_BASE=<deployed dpal-front-end backend URL>`
   - `VITE_GW_DEMO_MODE=false`
   - `VITE_DEMO_MODE=false`
3. Connect trips/broadcasts/chat to durable persistent storage.
4. Verify passenger-driver shared trip chat and lifecycle end-to-end on server data.
5. Run `npm run lint`, `npm run build`, and `cd backend && npm run build`.

Publish warning:

Good Wheels is server-backed through the dpal-front-end backend. If the route currently uses runtime file-backed or in-memory storage, it is suitable for integration testing but should be connected to durable database persistence before full public launch.

Production host alignment today:

- Active Good Wheels backend is this repo backend (`backend/src/routes/goodWheels.ts`) mounted at `app.use('/api/good-wheels', goodWheelsRouter)`.
- The frontend must point `VITE_API_BASE` to that deployed backend host.

Good Wheels module docs live at `src/good-wheels/README.md`.

---

## Key product areas

| Route | Feature |
|-------|---------|
| `/` | Main menu - 20 nav tiles |
| `/hub` | My Reports + Feed + Map |
| `/private-hub` | Private Hero Space - profile, contributions, collection, wallet, vault (separate from main categories) |
| `/politician` | Public Accountability Engine |
| `/offsets` | Carbon Credit Market - buy, retire, register land |
| `/carbon` | Carbon MRV Engine - satellite NDVI, score, validator |
| `/water`, `/water/aquascan`, `/water/monitor` | **DPAL Water Command Center:** AquaScan MRV (`AquaScanView`) at `/water` and `/water/aquascan`; **Water Operations Engine** (`WaterMonitorView`) at `/water/monitor` — see **DPAL AquaScan MRV & Water Command Center** below |
| `/ecology` | Ecological Conservation - Landsat foliage scan, NDVI, habitat risk |
| `/earth-observation` | Earth Observation — map + AOI, date range and presets, `POST /api/earth-observation/scan`, scan status (Auto vs Custom dates), DPAL Project Guide (`/api/dpal-assistant/project-guide`) |
| `/afolu` | AFOLU Carbon & Proof Engine |
| `/games` | Play & Learn hub with the embedded DPAL Mission Ops Phaser game |
| `/missions` | Missions Hub V2 |
| `/directives` | AI Work Directives marketplace |
| `/situation` | Situation Room |
| `/escrow` | Trusted Escrow |
| `/ledger` | Public Blockchain Ledger |
| `/help` | Help Center |
| `/login` `/signup` | Auth (MongoDB users on `dpal-ai-server`) |
| `/emissions-integrity-audit` | **EIAS** — emissions integrity audit (facility intake, scope, ADI, production unit for intensity); carbon adapter reads use Railway; server save needs `/api/emissions-audit/*` (see `CLAUDE.md`); workspace also **auto-saves in the browser** (`dpal_eias_workspace_v1`) |

---

## DPAL AquaScan MRV & Water Command Center

**Goal:** A premium **location-first map command center** for satellite water intelligence, AOI-based MRV comparison, evidence packets, and operational follow-up — without removing legacy operational tooling.

### Routes (`utils/appRoutes.ts`)

| Path | View ID | UI |
|------|---------|-----|
| `/water` | `waterMonitor` | `components/AquaScanView.tsx` (primary entry) |
| `/water/aquascan` | `aquaScanWater` | Same AquaScan MRV surface (explicit URL) |
| `/water/monitor` | `waterOperationsEngine` | `components/WaterMonitorView.tsx` (projects, snapshots, Water Impact Score, validator queue, credits, WaterGlobe) |

`App.tsx` wires cross-navigation: AquaScan → **Open Water Operations Engine**; Water Operations Engine → **Open AquaScan MRV**. Environmental Intelligence Hub and DPAL Carbon HQ link both destinations under the umbrella **DPAL Water Command Center**.

### AquaScan layout & state (frontend only)

- **Header:** Title, breadcrumb (**Environmental Intelligence / DPAL Water Command Center / AquaScan MRV**), subtitle, status chips (live-only mode, Copernicus configured/missing, validator), link to Water Operations Engine.
- **Focus Location command bar:** Address/GPS search, **Locate on Map**, **Use My GPS**, **Draw AOI**, **Clear**. **`selectedFocusLocation`** drives map center, marker, synced intake location/GPS fields, MRV/evidence context, AI summary context, and avoids stale demo location labels when the user focuses a new place.
- **Main workspace (desktop):** Three columns — **workflow rail** (Location → Boundary → Layers → Compare → Evidence → Action with step status), **large map** (above the fold), **intelligence panel** (compact cards: risk, AOI, live data, index, confidence, validator, next step).
- **Bottom tabs:** Intake, Layers, MRV Compare, Evidence Packet, Actions — preserves intake, layer selector, Copernicus MRV comparison + history, evidence packet + validator gate, and action center flows.
- **Status cleanup:** Alerts rendered as compact chips/banners with single primary actions (configure backend, draw AOI, change dates, retry live data).
- **Data labeling:** When live water APIs are unavailable, UI avoids presenting synthetic metrics as “live” — prefers labels such as **Live API**, **Saved project data**, **Local draft**, **Pending live data**.
- **Legal copy:** Retains **Indicative MRV estimate - not certified carbon credit** and field/validator verification disclaimers.

### Copernicus / Sentinel (backend proxy)

- The browser calls **`{VITE_API_BASE}/api/copernicus/*`** (see `constants.ts` → `API_ROUTES.COPERNICUS_*`).
- Server-side OAuth and Sentinel Hub calls live in **`backend/src/routes/copernicus.ts`** (token cache, statistics comparison, catalog/process proxies). **Secrets stay on the server** (`COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`, etc. on Railway when this backend is deployed).
- Frontend services: **`services/copernicus/`** (`processService.ts`, `catalogService.ts`, `statisticsService.ts`, `types.ts`). Clients send **`indexType`** (and AOI/date windows); evalscripts are **not** composed in the browser for statistics comparison.

### Related backend (repo `backend/`)

Help-center and auth paths may require **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** so the Node process can boot; this is separate from MongoDB on `dpal-ai-server`. Point **`VITE_API_BASE`** at whichever host actually exposes **`/api/copernicus/*`** and **`/api/water/*`** for your deployment.

### Files (anchors)

- **`components/AquaScanView.tsx`** — command center UI, Focus Location, tabs, MRV, evidence packet, expandable section helpers.
- **`components/WaterMonitorView.tsx`** — operational water engine (unchanged feature set; separate route).
- **`services/copernicus/*`**, **`services/waterAnalysisService.ts`** — API clients.

---

## EIAS notes

- Workspace draft persistence: EIAS restores and autosaves local state using `dpal_eias_workspace_v1`.
- Production normalization: EIAS now tracks an explicit production `outputUnit` for intensity framing in audit payloads.
- API split remains important:
  - `/api/carbon/*` can be read from Railway `dpal-ai-server`
  - `/api/emissions-audit/*` persistence is implemented in this repo's Prisma backend and expects its `DpalUser` JWT auth unless ported.

---

## DPAL Mission Ops Phaser game

The `/games` Play & Learn hub includes **DPAL Mission Ops**, an embedded Phaser mission game mounted through `features/mission-game/MissionGameView.tsx`.

Current flow:

1. The user opens `/games`, chooses Mission Ops, and React mounts the Phaser game inline.
2. `BootScene` launches the persistent `UIScene` overlay and starts `WorldMapScene`.
3. `WorldMapScene` shows the uploaded city map image, renders mission markers from config, and opens `MissionDetailScene` when a marker is clicked.
4. `MissionDetailScene` receives `{ mission, location, allMissions }`, shows mission details, and starts `MissionActionScene` from the Start Mission button.
5. `MissionActionScene` runs a session-only checklist: confirm location, inspect issue, collect related item, upload proof.
6. Completing all tasks unlocks Submit Proof, updates session player state, marks the mission complete, and opens `RewardScene`.
7. `RewardScene` shows earned XP, DPAL points, badge progress, updated community score, and returns to the map.

Map integration:

- Main map asset: `public/games/172e7fa5-6b48-43b2-ba01-6beaa662bc16.png`
- Swappable map settings: `features/mission-game/game/config/worldMapLayout.ts`
- Marker coordinates are kept outside the scene in `WORLD_MAP_MARKER_POSITIONS`, with normalized `x` / `y` values plus `district` and `categoryId`
- The uploaded image already contains district labels, so Phaser does not draw duplicate district text over the map

State is in-session only for now. There is no backend persistence yet.

---

## Recent monitoring updates

- **2026-04-29 — AquaScan live-only hardening + map clarity updates**
  - `/water` no longer presents generated fallback report values when live `/api/water/*` requests fail.
  - Water analysis service now requires live responses for AOI snapshot/history (`services/waterAnalysisService.ts`) and surfaces data-unavailable states instead of synthetic trend values.
  - AquaScan map UX now includes:
    - **What am I seeing?** guidance panel
    - **Map Legend** with overlay meanings
    - overlay click popups (type, meaning, source layer, confidence, coordinates, recommended next action, legal-safe note)
    - stronger tile failure guidance with retry/base-only/date/layer reset actions
    - image/tile status panel and failing-layer visibility
  - Coordinate parsing hardening:
    - malformed coordinate input (e.g. trailing commas) no longer yields `NaN` map jumps
    - invalid coordinates now fall back to **US West** (`[37.25, -119.8]`) with user guidance instead of global default behavior.
  - Envirofacts Geo Intelligence updates stabilized:
    - results table is now full-width and no longer squeezed by right-side panels
    - evidence packet moved to collapsible section below table
    - facility drawer actions/tabs wired with meaningful feedback and non-dead buttons.

- **2026-04-28 — Earth Observation & DPAL Project Guide:** `POST /api/earth-observation/scan` and `POST /api/dpal-assistant/project-guide` documented above; `EarthObservationView` date presets + Auto/Custom badge on comparison basis; repo `backend/` ships Express routes + `earthObservationService` / `dpalAssistant` (deploy on `VITE_API_BASE` host). Details in **Earth Observation & DPAL Project Guide** and **`CLAUDE.md`**.
- Main page monitoring imagery now uses dedicated assets in `public/main-screen/`
- Category card imagery for Earth Observation, Ecological Conservation, and Water Violations points at those same assets through `categoryCardAssets.ts`
- Mineral detector readings now separate verified bedrock/mineral indicators from EMIT dust-source availability
- Water Monitor Sentinel-1 SAR now shows a clearly labeled fallback estimate card when the backend returns `sentinel1.ok: false`
- Git author identity for this repo is set to `LudwigHurtado <49735409+LudwigHurtado@users.noreply.github.com>`

## Recent UX updates (water / AquaScan)

- **2026-04-29 — CARB Investigation Workspace three-workflow split**
  - `src/features/carbEmissionsAudit/CarbEmissionsAuditPage.tsx` now presents three clearly separated workflows:
    1. CARB MRR record review
    2. CARB Pollution Mapping Tool readings
    3. Satellite / map scan via a dedicated **`Satellite / Map Scan Center`** tab
  - Scan Center now includes:
    - locked state text when coordinates are missing: `Satellite scan unavailable — coordinates required.`
    - required coordinate-discovery actions (manual, official source, EPA FRS/GHGRP, pollution-map location, continue without scan)
    - unlocked scan form/actions (lat/lng, radius/AOI, baseline/current dates, NDVI/NDWI/NDMI/NBR, notes, run/save/send)
  - Selected-facility flow now includes:
    - **Historical Data Loader** panel with `Only 2024 CARB records are currently loaded.` + import/config actions
    - year-dropdown helper text clarifying CARB historical years exist but are not loaded yet
    - visible **CARB Pollution Mapping Tool Readings** panel in the overview/report path
    - source reconciliation message near summary: `Source reconciliation needed — different source product and/or reporting year.`
  - `Run Investigation` now provides fallback explanation when coordinates/historical years are missing:
    - `Investigation ran as single-year CARB record review. Satellite scan and trend analysis require coordinates and historical years.`
  - Remote-sensing wording was hardened in `services/carbEnvironmentalReadingsService.ts` to avoid implying NDVI/NDWI/NDMI/NBR are computed from CARB emissions alone.

- **2026-04-28 — CARB Investigation Workspace hardening and layout refactor**
  - Source/data contract hardening:
    - CARB UI now checks `GET /api/carb-data/health` and shows module reachability separate from dataset readiness.
    - Source-mode contract aligned across frontend/backend: `LIVE`, `IMPORTED`, `DEMO_FALLBACK`, `NEEDS_SOURCE`.
  - Investigation workspace UX improvements (`src/features/carbEmissionsAudit/CarbEmissionsAuditPage.tsx`):
    - search-first workflow with clearer investigation guidance and locked-step prerequisites
    - improved no-facility / no-result states and safer step messaging
    - map/AOI section no longer dominates early search flow; advanced tools are de-emphasized
    - manual EPA/GHGRP fallback fields added for cases where CARB-name matching fails.
  - Export/report readiness improvements:
    - CARB evidence payload includes explicit missing evidence and source/readiness metadata
    - report payload includes map evidence metadata (markers/polygon/tasks/layers) for audit traceability.

- **DPAL Water Command Center (dual routes + AquaScan redesign)** — See **DPAL AquaScan MRV & Water Command Center** above. Summary:
  - `/water` and `/water/aquascan` → **`AquaScanView`** (location-first command center, Focus Location, workflow rail, intelligence panel, bottom tabs for Intake / Layers / MRV / Evidence / Actions).
  - `/water/monitor` → **`WaterMonitorView`** (operations dashboard, validator queue, credits) — both water UIs preserved.
  - Copernicus MRV comparison and evidence flows call **`/api/copernicus/*`** on **`VITE_API_BASE`**; backend implementation in **`backend/src/routes/copernicus.ts`** when that host is this repo’s backend.
- **Earlier (2026-04-25) — Private hub & Environmental Intelligence Hub**
  - `/private-hub`, consolidated **Private Hero Space** tile, one-time Environmental Hub entry modal (`dpal-environmental-hub-entry-seen`)

---

## Earth Observation & DPAL Project Guide (2026-04-28)

### Earth Observation (`/earth-observation`)

- **UI:** `components/EarthObservationView.tsx` — observation type, radius slider, map (`ObservationMap`), **start/end date inputs**, quick **range presets** (7 days through 12 months), save AOI, run scan, metric cards, evidence/mission demo toggles, Earth Observation helper chat, and **`DpalProjectGuide`**.
- **Client API:** `POST {VITE_API_BASE}/api/earth-observation/scan` via `API_ROUTES.EARTH_OBSERVATION_SCAN` in `constants.ts`.
- **JSON body:** `analysisType` (`deforestation` \| `agriculture` \| `pollution` \| `carbon` \| `flood_fire` \| `urban` \| `water` \| `heat`), `latitude`, `longitude`, `radiusKm` (1–250), `startDate`, `endDate` (ISO strings).
- **Scan status:** Explains comparison basis (first/last usable scenes in range). Shows a small badge: **Custom dates** after manual date edits, or **Auto · …** (preset label) when a preset is active.
- **Honesty:** Responses describe **scene-level** screening metrics from Planetary Computer item statistics where computed — not parcel-clipped zonal averages unless extended later. **`verified`** / **`partially_verified`** follow backend confidence rules.

### Server implementation in this repo

- **Route:** `backend/src/routes/earthObservation.ts` → `POST /scan`.
- **Logic:** `backend/src/services/earthObservationService.ts` — STAC search, before/after scene selection, statistics-derived indices and deltas, risk and limitations arrays.

### DPAL Project Guide

- **Route:** `POST /api/dpal-assistant/project-guide` — `backend/src/routes/dpalAssistant.ts`.
- **Client:** `API_ROUTES.DPAL_ASSISTANT_PROJECT_GUIDE`; React pieces under `components/dpal-assistant/` (`DpalProjectGuide.tsx`, `projectGuides.ts`, `claimSafety.ts`, hooks/types as applicable).
- **Behavior:** Primarily **rule-based** workflow steps, **`claimSafety`** (safe vs unsafe claim language). If **`GEMINI_API_KEY`** is set on the server, responses may merge Gemini JSON output with the baseline rule payload.

### Local backend dev

- From repo root: `cd backend && npm install && npm run dev` (default port **3001**). Set **`VITE_API_BASE=http://localhost:3001`** in `.env.local` to exercise EO + assistant against the Prisma backend.

---

## Architecture

```text
dpal-front-end  (this repo - Vite SPA on Vercel)
       |
       +-- VITE_API_BASE --> API host on Railway (often dpal-ai-server)
                              |-- /api/auth/*
                              |-- /api/offsets/*           carbon credit market
                              |-- /api/carbon/*            carbon MRV
                              |-- /api/water/*             water monitor
                              |-- /api/copernicus/*        Sentinel Hub proxy (repo backend/)
                              |-- /api/ecology/*           Landsat foliage scan
                              |-- /api/earth-observation/* Earth Observation scan (also in repo backend/)
                              |-- /api/dpal-assistant/*    project workflow guide
                              |-- /api/ai/*                Gemini proxy
                              +-- /api/reports/*
```

Demo / offline mode: the Carbon Credit Market and Ecological Conservation both fall back to localStorage-backed simulation or deterministic demo data when the API is unreachable.

---

## Related repos

| Repo | Purpose |
|------|---------|
| `LudwigHurtado/dpal-ai-server` | Railway backend - MongoDB, Gemini, satellite adapters |
| `dpal-enterprise-dashboard` | Next.js enterprise view |
| `dpal-nexus-console-vercel` | Next.js Nexus console |
| `dpal-reviewer-node` | Validator / reviewer node portal |

---

## Deploying

Push to `main` and Vercel auto-deploys. After updating env vars in the Vercel dashboard, trigger a manual redeploy.

For the Railway backend, push to `main` in `dpal-ai-server` and Railway auto-deploys. Smoke check:

```text
GET https://web-production-a27b.up.railway.app/health
GET https://web-production-a27b.up.railway.app/api/ai/status
```

Recommended git sync flow before deploy:

```bash
git pull --rebase --autostash
git add README.md CLAUDE.md
git commit -m "docs: align dev/prod parity guidance"
git push
```

---

## AFOLU additions

- New route: `/afolu`
- Main entry tile: `Forest Integrity`
- Main screen: `components/AfoluEngineView.tsx`
- New modular detail screens:
  - `components/ProjectDetailView.tsx`
  - `components/MRVResultsView.tsx`

### What `/afolu` now covers

- Investor-facing AFOLU Carbon & Proof command center
- Premium hero with action buttons and a carbon workflow strip
- Investor Narrative, MRV Intelligence, Project Spotlight, Buyer Readiness, Revenue Model, Buyer Marketplace Preview, and Buyer Pipeline sections
- Carbon Pipeline stage cards with a slide-over drill-down drawer
- Credit-Creating Missions section tied directly to the mission deployment flow
- Secondary MRV summary and business-critical carbon metrics
- Lightweight home-dashboard skeleton states so high-value sections load smoothly

### AFOLU workflow interactions

- `Create Project` -> working project setup flow with validation, record creation, and local persistence
- `Launch Mission` -> guided carbon mission launch flow
- `Upload Proof` -> proof upload modal
- `Run MRV Review` -> MRV review record screen
- `Prepare Buyer Package` -> buyer packaging screen
- Buyer marketplace items -> project detail screen
- Buyer pipeline items -> deal detail modal
- MRV Intelligence rows -> filtered tabs or workflow surfaces
- Metric cards -> filtered tabs or detail screens
- Carbon Pipeline stages -> pipeline drawer with related actions
- Mission cards -> Mission Builder with mission type preselected

### AFOLU project creation flow

- `components/AfoluEngineView.tsx` now maintains AFOLU projects in live component state instead of only reading from seeded display data
- `Create Project` opens a real setup form covering:
  - project identity
  - geography
  - steward / community
  - hectares
  - polygon / AOI label
  - governance and consent status
  - commercial defaults
  - project narrative
- New projects are validated before creation
- Successful creation:
  - adds the project to the AFOLU project list
  - updates dashboard totals immediately
  - selects the new project automatically
  - routes the operator into the `Projects` tab
- Project records are currently persisted in browser localStorage under `dpal_afolu_projects_v1`
- This is a working front-end system now, but it is not yet synced to Railway or shared across users

### AFOLU mission launch flow

- Mission flow now starts with `Select Mission Type` instead of a generic form step
- Supported mission types:
  - `Plant Trees`
  - `Patrol Protected Area`
  - `Verify Sample Plot`
  - `Fire Recovery`
  - `Agroforestry`
- Guided steps:
  1. `Select Mission Type`
  2. `Mission Definition`
  3. `Participants & Roles`
  4. `Verification Requirements`
  5. `Monitoring & Tracking`
  6. `Deploy Mission`
- The flow now opens with a deployment brief and shows expected `tCO2e`, impact type, and `what this proves` before deployment
- Mission Definition surfaces linked project, operating area, target, and estimated impact early
- Participants & Roles frames drivers, verifiers, coordinators, and reward logic as part of the operating model
- Deploy Mission ends in a real mission summary instead of a dead-end modal close
- After deploy, the UI opens a `Mission Live View` with active status, progress, submissions, map activity, participants, proof rules, and risk watch panels

### AFOLU MRV review record

- `components/MRVResultsView.tsx` now reads like a review memo rather than a generic dashboard
- Sections are structured as:
  1. `What Was Reviewed`
  2. `What The Engine Found`
  3. `Commercial Meaning`
  4. `What Happens Next`
- Review output explicitly shows:
  - review result
  - confidence score
  - approval recommendation
  - credit package state
  - supported credits
  - modeled carbon status
- The review screen includes an explicit provenance note that the AFOLU Proof Engine flow still uses curated review inputs and does not yet attach a live satellite adapter payload inside this review path

## 2026-04-29 Earth Observation hardening notes

- `components/EarthObservationView.tsx` now uses a single saved AOI state model (`exists`, `isSaved`, center/radius, optional GeoJSON boundary, area, savedAt, source) to drive all AOI/save/readiness behavior.
- Earth Observation scan lifecycle and diagnostics are explicit (`adapter_ready` through `routed_to_situation_room`, plus `no_usable_scenes` and `metric_failed`), with no-usable-imagery explanation and recommended next action.
- Added an in-page **Earth Observation Assistant** (scan summary card, evidence/review panel, and Situation Room handoff summary) with safe claim language and local context-aware Q&A chips.
- Evidence packet draft includes `assistantInterpretation`, AOI/date/provider metadata, scene-search result, limitations, confidence, and recommended action.
- Situation Room routing continues through existing DPAL bridge (`services/situationRoomBridge.ts`) and now includes assistant summary, missing evidence, validator-focus questions, and mission task suggestions.
- `DpalProjectGuide` progress is clamped to `0-100`, and completed guide steps are filtered to active module steps to prevent overflow.
