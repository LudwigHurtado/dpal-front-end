# DPAL Front-End — Reference for AI & Developers

Last updated: 2026-04-23 (AFOLU project creation flow, calculator AI helper source visibility, Gemini model update)

This file summarizes how the **dpal-front-end** app is built, how it talks to backends, env vars, routing, and notable product/code areas so future sessions stay aligned.

---

## What This Repo Is

- **Stack:** Vite 6 + React 19 + TypeScript + Tailwind (class-based) + `react-router-dom` v7 (`BrowserRouter` in `index.tsx`).
- **State:** Mix of React state, Zustand (`zustand`), and context (`DPALFlowContext`, `LanguageProvider` / i18n).
- **UI:** Large single-tree `App.tsx` switching “views”; Material Web (`@material/web`) in places (e.g. evidence fields, buttons).
- **Deploy:** Typically **Vercel** for the static SPA; API calls go to a **Railway** Node backend (see below).

---

## Canonical Production URLs

| Piece | URL / note |
|--------|------------|
| Front-end (this repo) | `https://dpal-front-end.vercel.app` (example; confirm in Vercel) |
| **API base (Railway)** | `https://web-production-a27b.up.railway.app` |
| Health check | `GET {API_BASE}/health` |
| Reports feed (dashboards) | `GET {API_BASE}/api/reports/feed` |
| Enterprise dashboard | `https://dpal-enterprise-dashboard.vercel.app` — uses `NEXT_PUBLIC_DPAL_API_BASE` |
| Nexus console | `https://dpal-nexus-console-vercel.vercel.app` — same API base pattern |

**Local dev server:** Vite runs on **port 3000** (`vite.config.ts`), `host: 0.0.0.0` for LAN access.

---

## Environment Variables (Front-End)

All Vite-exposed vars must be prefixed with **`VITE_`**. Copy `.env.example` → `.env.local` for local secrets (gitignored).

| Variable | Purpose |
|----------|---------|
| **`VITE_API_BASE`** | Backend origin (no trailing slash). **Required** for predictable API routing; if unset, dev falls back to `http://localhost:3001`, prod to the default Railway URL in `constants.ts`. |
| **`VITE_GEMINI_API_KEY`** | **Optional if using server AI:** client-side Gemini (`services/geminiService.ts`). **Public in bundle** — prefer **`VITE_USE_SERVER_AI`** + Railway **`GEMINI_API_KEY`** for production. |
| **`VITE_USE_SERVER_AI`** | Set to **`true`** on Vercel when AI runs only via **`POST /api/ai/gemini`** (no browser key). **`isAiEnabled()`** is true if this **or** `VITE_GEMINI_API_KEY` is set. Requires **`GEMINI_API_KEY`** on **`VITE_API_BASE`** host and deployed **`/api/ai/gemini`** route (`dpal-ai-server`). |
| **`VITE_OPENAI_API_KEY`** | Politician Transparency: query refine + evidence draft (`services/politicianOpenAiService.ts`). In **dev**, Vite injects the key via **`/openai-proxy`** so the browser bundle does not need the secret. **Production** may need a same-origin proxy if CORS blocks direct OpenAI calls. |
| **`VITE_OPENAI_MODEL`** | Optional; default `gpt-4o-mini`. |
| **`VITE_BRAVE_SEARCH_API_KEY`** | Live web search (`services/braveSearchService.ts`). |
| **`VITE_GOOGLE_MAPS_API_KEY`** | Locator / maps / Places. **`VITE_GOOGLE_MAPS_API_KEY_LOCAL`** optional for localhost if prod key is referrer-locked. |
| **`VITE_LAYOUT_VERSION`** | `v1` \| `v2` — hub layout experiments (`App.tsx`). |
| **`VITE_FEATURE_*`** | `REPUTATION`, `AUDIT_TRAIL`, `BLOCKCHAIN_ANCHOR`, `GOVERNANCE` — see `features/featureFlags.ts`. |
| **`VITE_GAME_URL_*`** | Society Game Hub — external URLs per game id (`societyGames.ts`). |
| **`VITE_ADSENSE_*`** | Optional AdSense slots (`MainMenu.tsx`). |
| **`VITE_VALIDATOR_PORTAL_URL`** | Optional Validator Node destination used by `getValidatorPortalUrl()` in `constants.ts` and the "Validator Node" card in `MainMenu.tsx`. If unset, production host `dpal-front-end.vercel.app` defaults to `https://dpal-reviewer-node.vercel.app`; non-prod host shows a setup warning. |

See **`vite-env.d.ts`** for the full typed list.

### Vite dev proxy (OpenAI)

`vite.config.ts` maps **`/openai-proxy`** → `https://api.openai.com` and sets `Authorization` from `VITE_OPENAI_API_KEY` in `.env.local`. Client code uses `/openai-proxy/v1/...` when `import.meta.env.DEV` is true.

---

## Backend Landscape (Important Distinction)

1. **Production / main app API (Railway)**  
   - URL: **`VITE_API_BASE`** → typically `https://web-production-a27b.up.railway.app`.  
   - Described in code as **MongoDB**-backed for reports, NFT, escrow, AI routes, etc.  
   - **`constants.ts` → `API_ROUTES`** documents expected paths: `/api/reports`, `/api/ai/ask`, **`/api/ai/gemini`**, **`/api/ai/status`**, `/api/nft/*`, `/api/escrow/*`, `/api/beacons`, etc.

2. **Repo folder `backend/`** (Express + **Prisma**)  
   - Separate **local / auxiliary** service: help-center style **`/api/help-reports`**, **`/api/admin/*`**, plus optional **`GET /api/ai/status`** + **`POST /api/ai/gemini`** (`routes/geminiProxy.ts`) for local server-AI testing.  
   - Plus **legacy-compatible** `GET /api/reports` and `GET /api/reports/feed` from Prisma `helpReport` for enterprise dashboard probes.  
   - Default port **3001** (`backend/src/index.ts`).  
   - **Not** the same deployment as production **`dpal-ai-server`** on Railway unless you point **`VITE_API_BASE`** here — do not assume all `API_ROUTES` exist in this folder.

3. **`dpal-ai-server`** (separate GitHub repo, **not** this tree)  
   - **`LudwigHurtado/dpal-ai-server`** — this is what usually backs **`https://web-production-a27b.up.railway.app`**.  
   - Implements **`/api/ai/ask`**, **`/api/ai/health`**, **`/api/ai/status`**, **`/api/ai/gemini`**, NFT, persona, reports, situation room uploads, carbon MRV, offsets, **water monitor**, **ecology**, etc.
   - **Water Monitor routes** (`/api/water/*`) added in `src/routes/water.routes.ts` — registered in `src/index.ts`. Models in `src/models/Water*.ts`. Satellite adapters in `src/services/adapters/*.adapter.ts`.
   - **Carbon MRV routes** (`/api/carbon/*`) in `src/routes/carbon.routes.ts`.
   - **Offsets routes** (`/api/offsets/*`) in `src/routes/offsets.routes.ts`.
   - **Ecology routes** (`/api/ecology/*`) in `src/routes/ecology.routes.ts` — Landsat 9 foliage scan via Microsoft Planetary Computer STAC. Adapter: `src/services/adapters/landsatEcology.adapter.ts`.

When debugging “API issues,” confirm whether the app is pointed at Railway **`dpal-ai-server`** or local `3001` Prisma backend.

---

## Railway Backend (Production) — Env (Typical)

From deployment notes (verify in Railway dashboard):

- `MONGODB_URI` — DB connection  
- `GEMINI_API_KEY` — **server-side Gemini** (required for **`VITE_USE_SERVER_AI`** / `/api/ai/gemini`)  
- `GEMINI_MODEL` — e.g. `gemini-3-flash-preview` (see `dpal-ai-server` `runGemini`)  
- `GEMINI_MODEL_CHEAP` — optional; prefer a current low-cost model such as **`gemini-2.5-flash`** and avoid retired Gemini variants  
- `FRONTEND_ORIGIN` or `CORS_ORIGINS` — comma-separated allowed web origins (frontend + dashboards)  
- `NODE_ENV=production`
- `COPERNICUS_CLIENT_ID` and `COPERNICUS_CLIENT_SECRET` — backend-only Sentinel Hub / Copernicus OAuth credentials for Sentinel-1 SAR. Set these on Railway, then redeploy or restart the service. Do not place them in Vercel/Vite variables.

Backend should accept both **`FRONTEND_ORIGIN`** and **`CORS_ORIGINS`** naming.

**Smoke checks (production):**

- `GET {API_BASE}/health` → `dpal-ai-server`, DB block.  
- `GET {API_BASE}/api/ai/health` → `hasKey: true` when **`GEMINI_API_KEY`** is set.  
- `GET {API_BASE}/api/ai/status` → **`{ ok: true, gemini: true }`** when server AI is wired (404 = old deploy or wrong service).

---

## Front-End API Helpers

- **`getApiBase()` / `apiUrl(path)`** — `constants.ts`; strips trailing slashes, warns if `VITE_API_BASE` missing.  
- **`API_ROUTES`** — central list of path constants for the main backend.  
- **Enterprise / Nexus:** may use `NEXT_PUBLIC_DPAL_API_BASE` (Next.js) — same Railway URL pattern.

### localStorage override (debugging)

If a dashboard shows “disconnected” or wrong API:

- Key: **`dpal_api_base_override`**  
- Clear: `localStorage.removeItem('dpal_api_base_override')`

---

## Routing & Deep Links

- **`utils/appRoutes.ts`** — maps each `App.tsx` view id ↔ **pathname** (e.g. `politicianTransparency` → `/politician`). **Keep paths stable** — bookmarks and shared links rely on them.  
- **`App.tsx`** syncs `currentView` with `location.pathname` / search / hash (reports, situation room, etc.).  
- Report sharing: **`?reportId=<id>`** and related query params — see `App.tsx` comments around report fetch and anchor.

### Key routes (stable — do not rename)

| View ID | Path | Notes |
|---------|------|-------|
| `mainMenu` | `/` | Main tile grid |
| `categorySelection` | `/categories` | Report category picker |
| `hub` | `/hub` | My Reports + Feed + Map tabs |
| `heroHub` | `/hero` | Hero profile, missions, vault, mint |
| `transparencyDatabase` | `/ledger` | Public blockchain ledger |
| `missionMarketplace` | `/missions` | **Missions Hub V2** (Hub home + sections via `?section=`) |
| `missionAssignmentV2` | `/missions/v2` | Mission workspace engine |
| `createMission` | `/missions/create` | Create a new mission |
| `marketplaceMissionDetail` | `/missions/m/:id` | Mission detail page |
| `aiWorkDirectives` | `/directives` | AI-guided community work marketplace |
| `politicianTransparency` | `/politician` | Public Accountability Engine |
| `helpCenter` | `/help` | Help Center tickets |
| `incidentRoom` | `/situation` | Situation Room (with `?roomId=`) |
| `escrowService` | `/escrow` | Trusted Escrow |
| `dpalLocator` | `/locator` | Family / asset locator |
| `offsetMarketplace` | `/offsets` | Carbon Credit Market (buy, retire, register land, learn) |
| `carbonMRV` | `/carbon` | Carbon MRV Engine (register projects, satellite, score, validator, credits) |
| `waterMonitor` | `/water` | **Water Monitor** (water projects, satellite snapshots, impact score, validator, credits) |
| `ecologicalConservation` | `/ecology` | **Ecological Conservation** (Landsat foliage scan, NDVI, habitat risk, AI chat) |
| `gameHub` | `/games` | **Play & Learn / DPAL Mission Ops** embedded Phaser game |

### Accounts & authentication (MongoDB users on `dpal-ai-server`)

- **`AppBootstrap.tsx`** wraps **`AuthProvider`** and defines **auth routes first**; the **`*`** route renders the main **`App`**. That way **`/login`**, **`/signup`**, etc. are real URLs and are **not** swallowed by `App.tsx` view state.
- **Paths:** **`/login`**, **`/signup`**, **`/forgot-password`**, **`/reset-password`**, **`/verify-email`**, **`/account`**, **`/account/profile`**, **`/admin`** (admin-only UI). Implemented under **`pages/auth/`**; API calls use **`auth/authApi.ts`** and **`constants.ts`** → **`API_ROUTES.AUTH_*`** against **`VITE_API_BASE`** (must be the Railway **`dpal-ai-server`** instance that exposes **`/api/auth/*`** and **`/api/admin/*`**).
- **User names in the database** are **not** in this repo: they live in MongoDB as **`User`** documents on the API server (**`fullName`**, **`username`**, **`email`**, etc.). After signup, each person can sign in from **`/login`**. Admins (see **`BOOTSTRAP_ADMIN_EMAIL`** on the server) can open **`/admin`** → **Users** to see a paginated list of accounts.
- **Tokens:** access + refresh stored via **`auth/authStorage.ts`**; **`apiFetch`** attaches **`Authorization`** and refreshes on 401 when possible.

Longer cross-repo notes: **`dpal-reviewer-node`** root **`claude.md`** section *Accounts, login, and where user names live*.

---

## Notable Product Areas (Code Anchors)

| Area | Where to look |
|------|----------------|
| Main shell & view switching | `App.tsx` |
| Auth pages, login URL | `AppBootstrap.tsx`, `pages/auth/*`, `auth/AuthContext.tsx` |
| Main menu tiles | `components/MainMenu.tsx` — 20 `PrimaryNavModule` tiles; images live in `public/main-screen/` |
| Category / sector “Next view” | `CategorySelectionView.tsx`, `components/sectors/*`, `sectorDefinitions.ts` — sectors named (Safety, Financial, Health, Government, Property, Digital, Community), `SectorGatewayGrid`, `CategoryMappingPanel` |
| Politician Transparency | `PoliticianTransparencyView.tsx` — **Public Accountability Engine** workflow: target fields → accountability focus grid → evidence query + source filters → DuckDuckGo search; OpenAI refine; evidence lab + localStorage draft |
| Politician OpenAI | `services/politicianOpenAiService.ts` |
| Help center → backend | `services/helpCenterService.ts` → `/api/help-reports` |
| Beacons | `services/beaconService.ts` |
| Gemini / AI errors | `services/geminiService.ts` — **`runGeminiGenerate`**, **`isAiEnabled`**; server proxy **`POST /api/ai/gemini`** |
| Device preview (Cell Mode) | `components/DevicePreviewFrame.tsx` — iframe embed detection |
| Situation room filing images | `components/IncidentRoomView.tsx` — `filingImageHistory`, admin delete env |
| Brave search | `services/braveSearchService.ts` |
| Maps | `services/googleMapsLoader.ts`, Locator / Good Wheels map components |
| i18n | `i18n/` — `useTranslations()`, `translations.ts` |
| Feature flags | `features/featureFlags.ts` |
| Category images / galleries | `categoryCardAssets.ts`, `CategorySelectionView` (`CATEGORY_GALLERY_IMAGES` crossfade for e.g. Police Misconduct) |
| **Missions V2 — Hub** | `features/missions-v2/hub/MissionsHubPage.tsx` — sections: home, marketplace, emergency, myMissions, rewards, local, org, validator, analytics. Section driven by `?section=` URL param. |
| **Missions V2 — Marketplace** | `features/missions-v2/pages/MissionMarketplacePage.tsx` — browse listings; `features/missions-v2/pages/MissionMarketplaceDetailPage.tsx` — detail at `/missions/m/:id` |
| **Missions V2 — Workspace** | `features/missions-v2/pages/MissionAssignmentV2Page.tsx` — assignment engine; phases, escrow, validators, proof |
| **Missions V2 — Create** | `features/missions-v2/pages/CreateMissionView.tsx` — mission creation form |
| **Missions V2 — Services** | `features/missions-v2/services/` — layer services (escrow, evidence, governance, outcome, report, reputation, resolution, validation) + adapters |
| **Missions V2 — Types** | `features/missions-v2/types.ts`, `marketplaceTypes.ts`, `createMissionTypes.ts` |
| **Missions V2 — Theme** | `features/missions-v2/missionWorkspaceTheme.ts` — `mw.*` class helpers (teal/dark palette) |
| **AI Work Directives (Work Network)** | `components/AiWorkDirectivesView.tsx` — AI-guided community work marketplace; 15 categories; in-progress step tracking, proof notes, claim coins flow |
| **Carbon Credit Market** | `components/OffsetMarketplaceView.tsx` — tabs: Market (buy/sell, world map, sparklines), My Credits (retire/certify), Impact Feed, Register Land (4-step wizard), **Learn** (Venn diagram, market data, registry comparison). Buy/retire/join work in demo mode via localStorage simulation (`dpal_cc_local_purchases`). Anonymous purchases also saved to localStorage so portfolio is visible without login. Cross-links to Carbon MRV. |
| **Carbon MRV Engine** | `components/CarbonMRVDashboard.tsx` — tabs: My Projects, Marketplace, Global Ledger. Views: dashboard, create (4-step), project detail (satellite NDVI, MRV score circular gauge, blockchain ledger), validator portal. Cross-links to Carbon Market. |
| **DPAL Water Monitor** | `components/WaterMonitorView.tsx` — tabs: Dashboard, My Projects, Validator Queue, Credits. Views: dashboard (platform stats, WaterGlobe), create project (8 types, GPS polygon), project detail (satellite pull with 5 adapters + Sentinel-1 SAR if backend verifies it, Water Impact Score 0–100, reports), validator review, credit issuance & marketplace. |
| **Water Globe** | `components/WaterGlobe.tsx` — animated world globe for water project pins and alert indicators. |
| **Ecological Conservation** | `components/EcologicalConservationView.tsx` — Landsat 9 OLI-2 foliage/habitat scan at `/ecology`. API: `GET /api/ecology/landsat-scan?lat=&lng=&radiusKm=` → Microsoft Planetary Computer STAC. Demo fallback: `buildDemoScan()` computes deterministic NDVI/risk from coordinates when API is unavailable. Map uses Esri satellite + labels tiles. AI chat via Gemini. |
| **DPAL Mission Ops Phaser game** | `features/mission-game/*`, `features/mission-game/MissionGameView.tsx`, `components/DpalGameHubView.tsx`, `features/mission-game/game/config/worldMapLayout.ts`, `public/games/172e7fa5-6b48-43b2-ba01-6beaa662bc16.png` — embedded mission game with world map, mission detail, action checklist, reward flow, persistent UI overlay, session player state. |

---

## Recent Front-End Work (Session History)

### 2026-04-21 — AFOLU command center, mission deployment flow, MRV review record

#### AFOLU route and entry point
- New view id: `afoluEngine`
- New stable route: `/afolu` in `utils/appRoutes.ts`
- Main menu tile: `Forest Integrity` in `components/MainMenu.tsx`
- Main shell wiring: `App.tsx` imports and renders `components/AfoluEngineView.tsx`

#### AFOLU home/dashboard
- `components/AfoluEngineView.tsx` now acts as the investor-facing AFOLU Carbon & Proof command center
- Hero now includes:
  - product framing for verified, buyer-ready carbon assets
  - action buttons for project creation, mission launch, proof upload, MRV review, and buyer package prep
  - a compact carbon workflow strip under the hero
- Home view emphasizes business-critical carbon metrics:
  - active projects
  - hectares monitored
  - estimated tCO2e
  - credits ready
  - survival rate
  - verification confidence
  - buyer interest
  - projected revenue
- Added product framing sections:
  - Investor Narrative
  - MRV Intelligence
  - Carbon Pipeline
  - Credit-Creating Missions
  - Project Spotlight
  - Buyer Readiness
  - Revenue Model
  - Buyer Marketplace Preview
  - Buyer Pipeline
  - secondary MRV summary
- Added lightweight loading skeletons for the AFOLU home dashboard so the command-center sections load with intent instead of snapping in

#### New modular AFOLU detail screens
- `components/ProjectDetailView.tsx`
  - header with status badge and action buttons
  - metrics grid
  - map placeholder + project metadata
  - carbon timeline table
  - evidence gallery with clickable preview
  - MRV summary
  - credit package summary
  - buyer activity list
- `components/MRVResultsView.tsx`
  - MRV review record header
  - What Was Reviewed
  - What The Engine Found
  - Commercial Meaning
  - What Happens Next
  - explicit review result, recommendation, package state, supported credits, and modeled carbon status
  - provenance note clarifying that the AFOLU review flow is still using curated inputs and is not yet attaching a live satellite adapter payload

#### AFOLU interactions and UX behavior
- Metric cards now open detail views or switch dashboard sections
- MRV Intelligence rows are clickable and route to filtered tabs or workflow surfaces
- Carbon pipeline stages open a slide-over drawer with related actions
- Buttons trigger workflow actions:
  - `Create Project` -> project setup workflow with validation and record creation
  - `Launch Mission` -> guided carbon mission launch flow
  - `Upload Proof` -> proof upload modal
  - `Run MRV Review` -> `MRVResultsView`
  - `Prepare Buyer Package` -> buyer packaging screen
- Buyer marketplace items open project detail flow
- Buyer pipeline items open deal detail modal
- Mission cards open Mission Builder with the correct mission type preselected
- Added loading overlays and smoother transitions so navigation feels active rather than static

#### AFOLU mission launch flow
- `components/AfoluEngineView.tsx` now includes a guided carbon mission creation sequence instead of a generic mission-builder form
- New launch sequence:
  1. `Select Mission Type`
  2. `Mission Definition`
  3. `Participants & Roles`
  4. `Verification Requirements`
  5. `Monitoring & Tracking`
  6. `Deploy Mission`
- Supported mission types:
  - `Plant Trees`
  - `Patrol Protected Area`
  - `Verify Sample Plot`
  - `Fire Recovery`
  - `Agroforestry`
- Flow now opens with a deployment brief that states the expected `tCO2e` outcome before launch
- Mission Definition now surfaces:
  - mission name
  - linked project
  - operating area
  - target
  - expected impact
- Participants & Roles now frames:
  - community members as drivers
  - validators as verifiers
  - supervisors as coordinators
  - rewards as tokens or payment per task
- Verification Requirements now explicitly carries the proof logic that supports carbon trust
  - participants
  - proof rules
  - risk watch panels

#### AFOLU mission launch detail note
- Each mission type now shows:
  - impact type (`Sequestration`, `Avoided Emissions`, `Verification Boost`)
  - expected `tCO2e`
  - what this proves

#### Verification notes
- Production bundle verified with `npm run build`
  - “what this proves”
- Deployment now redirects to an in-app `MissionLiveView` surface with:
  - active status
  - progress bar
  - incoming submissions
  - live activity map placeholder


### 2026-04-23 — AFOLU project creation and calculator AI helper hardening

#### AFOLU project creation flow
- `components/AfoluEngineView.tsx`
  - replaced the placeholder `Create Project` modal body with a working setup form
  - added fields for project identity, geography, steward/community, hectares, polygon label, registry target, governance status, price assumptions, and narrative
  - validates required fields before creating a project
  - creates a usable `AfoluProject` record immediately and prepends it to the live project list
  - auto-selects the new project and routes the operator into the `projects` tab
- AFOLU project state now lives in component state backed by localStorage key `dpal_afolu_projects_v1`
- Dashboard totals in `AfoluEngineView.tsx` are now derived from live project state rather than a fixed seeded array
- This is a real front-end workflow now, but it is still local-only and not yet synced to Railway / `dpal-ai-server`

#### AFOLU calculator AI helper
- `components/DpalCarbonViuCalculator.tsx`
  - helper answer cards now explicitly show `Source: Gemini` or `Source: Fallback`
  - helper status badges no longer blur the distinction between provider output and local fallback text
  - fallback error state now surfaces the actual Gemini failure message for debugging instead of only showing a generic warning
  - specific AOI-definition fallback matching was moved ahead of the generic location/AOI branch so prompts like `what does AOI stand for` are handled more directly
- `services/geminiService.ts`
  - `runGeminiPrompt()` now targets `gemini-2.5-flash`

#### Deployment implication
- If the live AFOLU helper still appears to answer with stale Bolivia-centered text or generic fallback language after these changes, verify:
  - Vercel is serving the latest commit
  - Gemini env is configured for the live deployment
  - the response card source label says `Gemini` rather than `Fallback`

### 2026-04-20 — Monitoring images, mineral detector, Sentinel SAR fallback, deployment identity

#### Main page and category imagery
- Added three monitoring assets under `public/main-screen/`:
  - `land-mineral-monitoring.png`
  - `water-project-monitoring.png`
  - `satellite-water-analysis.png`
- `components/MainMenu.tsx` now uses:
  - `satellite-water-analysis.png` for **Earth Observation**
  - `land-mineral-monitoring.png` for **Ecological Conservation**
  - `land-mineral-monitoring.png` for **Carbon MRV Engine**
  - `water-project-monitoring.png` for **Water Satellite Monitor**
- `categoryCardAssets.ts` now maps:
  - `Category.EarthObservation` → `satellite-water-analysis.png`
  - `Category.EcologicalConservation` → `land-mineral-monitoring.png`
  - `Category.WaterViolations` → `water-project-monitoring.png`

#### Mineral detector readings
- `backend/src/services/adapters/mineral.adapter.ts` now queries Macrostrat mapped geology and infers mineral indicators from lithology when available.
- The mineral response separates verified geology/mineral indicators from EMIT dust-source area.
- `components/CarbonMRVDashboard.tsx` now derives `primaryMineral`, composition entries, and `primaryMineralShare` from the backend response.
- UI now shows a verified mineral read panel, specific mineral card, composition share card, and a separate dust-source-area card.
- Example Los Angeles smoke result after the change: Quartz, Feldspar, Clay Minerals, Calcite with Quartz as the primary mineral indicator; dust-source area remains separate when EMIT/AOD is unavailable.

#### Water Monitor Sentinel-1 SAR behavior
- Production `/api/water/satellite-preview` can return `sentinel1.ok: false` with fallback SAR fields such as `waterFraction`, `vvMeanDb`, and `floodRisk`.
- `components/WaterMonitorView.tsx` now displays those values as **SAR Water Detection Estimate** instead of hiding the whole SAR section.
- Verified SAR still requires backend `sentinel1.ok === true` and a real live Sentinel-1 scene/capture.
- Railway backend needs `COPERNICUS_CLIENT_ID` and `COPERNICUS_CLIENT_SECRET` set and the service redeployed/restarted. If the secret contains `+` or other special characters, backend token requests must form-encode credentials with `URLSearchParams` or equivalent.

#### GitHub / Vercel deployment identity
- The local repo previously had placeholder Git author config: `Your Name <you@domain.com>`.
- GitHub/Vercel mapped that placeholder identity to an unexpected GitHub user in deployment UI.
- Local repo config was corrected to `LudwigHurtado <49735409+LudwigHurtado@users.noreply.github.com>`.
- Empty commit `dd0d48c` was pushed to trigger a fresh Vercel deployment with corrected author attribution.

---

### 2026-04-20 — DPAL Mission Ops Phaser game

#### Access path and React mount
- The Play & Learn route is `/games` (`gameHub` view). The main menu has a Play & Learn entry that leads there.
- `components/DpalGameHubView.tsx` exposes the Mission Ops access button and mounts `features/mission-game/MissionGameView.tsx` inline.
- `MissionGameView` owns the Phaser game instance and keeps the React + Phaser boundary contained.

#### Phaser scene flow
- `BootScene` starts the game by launching persistent `UIScene`, then starting `WorldMapScene`.
- `UIScene` is a session overlay with player level, XP, DPAL points, current zone, Leaderboard, and Inventory controls. It reads mock/session state and is designed so React can connect to it later.
- `WorldMapScene` renders the city map and mission markers. Clicking a marker starts `MissionDetailScene` with `{ mission, location, allMissions }`.
- `MissionDetailScene` shows mission title, category, description, urgency, reward points, reward XP, proof required, related items, and a 0% progress bar. Start Mission launches `MissionActionScene`; Back to Map returns to `WorldMapScene`.
- `MissionActionScene` is session-only for now. It uses checklist tasks: confirm location, inspect issue, collect related item, upload proof. Clicking buttons completes tasks and updates visual progress. Submit Proof unlocks only after all tasks are complete.
- Successful submission updates session player state, marks the mission complete, emits the completion event, and opens `RewardScene`.
- `RewardScene` shows earned XP, earned points, badge progress, updated community score, and a Return to Map button. Returning to map keeps completed missions visually distinct.

#### Uploaded map image and marker layout
- Main asset: `public/games/172e7fa5-6b48-43b2-ba01-6beaa662bc16.png`.
- Swappable map constants live in `features/mission-game/game/config/worldMapLayout.ts`:
  - `WORLD_MAP_TEXTURE_KEY`
  - `WORLD_MAP_ASSET_PATH`
  - `WORLD_MAP_SOURCE_SIZE`
  - `WORLD_MAP_MARKER_POSITIONS`
  - `WORLD_MAP_MARKER_BY_ID`
- Marker positions are normalized against the image, so replacing the map or tuning markers should happen in `worldMapLayout.ts`, not inside `WorldMapScene`.
- Each marker config includes `id`, `x`, `y`, `district`, and `categoryId`. Mission/location data still comes from the existing mission game data files.
- The uploaded map image already has district labels baked in. `WorldMapScene` no longer draws Phaser district labels over the image, which fixes duplicate text such as Westside, Central, Industrial, Riverside, City Park, and School District.
- Marker labels for specific locations still render under markers, and marker clicks continue to open the correct mission/location data.

#### Verification notes
- TypeScript/lint was checked with `npm run lint` after the mission game and map changes.
- Phaser imports use `import * as Phaser from 'phaser'` so the game works with the current Phaser ESM build.
- Current state is intentionally session-based only. There is no backend persistence for mission completion, rewards, inventory, or leaderboard yet.

---

### 2026-04-18 — Carbon Market functional demo mode + Ecological Conservation live backend

#### Carbon Credit Market (`/offsets`) — `components/OffsetMarketplaceView.tsx` — commit `e03b94e`

**Problem:** Demo projects (`DEMO-1` … `DEMO-6`) were purely client-side. Clicking Buy/Retire sent those IDs to the API which returned 404 "Project not found". Portfolio tab returned nothing for anonymous users.

**Fix — localStorage-backed simulation:**
- Added `localPurchases` state initialised from `localStorage` key `dpal_cc_local_purchases`.
- **Demo mode** (`isDemoMode === true`): Buy simulates 700 ms latency, creates a `DEMO-xxx` purchaseId, decrements `availableUnits` in local state, saves to localStorage. Retire generates a local `demo-cert-*` hash and saves to localStorage.
- **Real mode (anonymous or signed-in)**: After a successful API buy, the purchase is also written to localStorage so the portfolio tab shows immediately without needing a hero account.
- `displayPortfolio` merges API purchases + localStorage purchases (deduped by `purchaseId`), sorted newest-first.
- `portfolioTotals` and the My Credits tab are both driven by `displayPortfolio`.
- Anonymous notice updated: "Purchases are saved locally. Sign in to sync your portfolio across devices."

#### Ecological Conservation (`/ecology`) — commits `bd9f3d1`, `abd521a`, `e7face9`

**Problem:** `GET /api/ecology/landsat-scan` didn't exist anywhere in `dpal-ai-server`. The frontend fell back to a dead error notice with no data. The map used dark CARTO tiles and rendered with only half the tiles filled.

**Fix — backend route (dpal-ai-server commit `cfffd42`):**
- New `src/services/adapters/landsatEcology.adapter.ts` — queries Microsoft Planetary Computer STAC for Landsat-9 (fallback Landsat-8) Collection 2 Level-2 scenes, reads red + NIR band statistics via the PC Data Item Statistics API, computes NDVI, classifies foliage health / canopy change / habitat risk. Logs `🌿 Landsat ecology scan (lat,lng): NDVI=x risk=y` on every call.
- New `src/routes/ecology.routes.ts` — `GET /api/ecology/landsat-scan?lat=&lng=&radiusKm=`. On adapter error returns a structured JSON body (not a crash) so the frontend can gracefully fall back.
- Registered as `app.use('/api/ecology', ecologyRoutes)` in `src/index.ts`. No new env vars required — uses public Planetary Computer endpoints.

**Fix — frontend demo fallback:**
- `buildDemoScan(lat, lng)` computes a deterministic NDVI (0.15–0.80) and risk level from coordinates using `Math.sin(lat * 127.1 + lng * 311.7)` — same location always gives the same reading.
- `runScan()` now calls demo on any API error/non-ok, shows a yellow notice banner: "Could not reach the Landsat backend — showing a demo estimate for this location."

**Fix — map:**
- Replaced dark CARTO tiles with Esri World Imagery + World Boundaries and Places reference overlay (same as Water Monitor).
- Fixed half-tile render: replaced `className="h-80"` + `style={{ height: '100%' }}` with `style={{ height: '480px' }}` on both the wrapper div and the `MapContainer`. Leaflet ignores percentage heights set via Tailwind classes — explicit px on the MapContainer is required.

---

### 2026-04-17 — Sentinel-1 SAR + Sentinel-2 NDVI live integration

#### Copernicus Data Space Statistical API — critical integration notes

The Sentinel Hub Statistical API at `sh.dataspace.copernicus.eu/api/v1/statistics` has several non-obvious requirements engineers must know:

| Issue | Wrong | Correct |
|-------|-------|---------|
| Resolution params | `resx: 10, resy: 10` (ignored silently) | `width: 128, height: 128` (pixel dimensions) |
| CRS declaration | geometry only | must add `bounds.properties.crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84"` |
| Status filter | `d.status === "OK"` | omit status check — field is often empty; use `sampleCount > 0` only |
| Sentinel-1 polarization | `polarization: "DV"` | remove filter — let API return any available polarization |
| Sentinel-1 orbit direction | `orbitDirection: "BOTH"` | remove — `"BOTH"` is not a valid enum value |
| Time window | 30 days | 60 days — more likely to find valid acquisitions |

Without `bounds.properties.crs`, `resx`/`resy` are silently ignored and the API treats the entire bbox as 1 pixel, producing "11122.63 meters per pixel exceeds 1500 m/px" errors.

#### Backend changes (`dpal-ai-server`) — commits `c93c242` → `b767ef1`

**`src/services/adapters/sentinel1.adapter.ts`**
- Removed `orbitDirection: "BOTH"` (invalid enum)
- Added `properties.crs` to bounds geometry
- Switched `resx/resy: 10` → `width: 128, height: 128`
- Removed `polarization: "DV"` filter
- Extended time window 30 → 60 days
- Dropped `status === "OK"` filter; use `sampleCount > 0` only
- Improved error logging to show entry-level debug info

**`src/services/adapters/copernicus.adapter.ts`**
- Added `properties.crs` to bounds geometry
- Switched `resx/resy: 10` → `width: 128, height: 128`
- Dropped `status === "OK"` filter for NDVI; use `sampleCount > 0` only

**`src/models/Directive.ts`, `EvidenceArtifact.ts`, `ValidatorReview.ts`**
- Removed duplicate `index: true` on fields that also had `schema.index()` calls
- Eliminates Mongoose startup warnings: "Duplicate schema index on directiveId/reportId"

#### Frontend changes (`dpal-front-end`) — commit `e9b295f`

**`components/WaterMonitorView.tsx`**
- Added SAR fields to `WaterSnapshot` interface (`sarWaterFraction`, `sarVvDb`, `sarFloodRisk`, `sarCaptureDate`, `sarSource`)
- Each MetricTile in the "Latest Satellite Snapshot" panel now shows its satellite source:
  - Soil Moisture → `NASA SMAP`
  - Surface Water Level → `NASA / ESA SWOT`
  - Water Storage Trend → `NASA GRACE-FO`
  - Drought Risk → `Copernicus`
  - Vegetation Stress → `NASA GIBS / MODIS`
  - Confidence Score → `6-adapter average`
- Added SAR Water Coverage tile (conditional, shown when `sarSource === "sentinel-1-sar"`)
- Added `SatelliteAiInsight` AI analyst panel below snapshot tiles — plain-English breakdown + follow-up Q&A via Gemini

#### How to verify the satellite integration is working

```bash
# From browser console on /water page:
fetch('https://web-production-a27b.up.railway.app/api/water/satellite-preview?lat=34.05&lng=-118.25')
  .then(r => r.json())
  .then(d => {
    console.log('sentinel1:', d.adapters?.sentinel1);   // expect ok:true, captureDate set
    console.log('copernicus:', d.adapters?.copernicus); // expect ndviMean set (sentinel-2-live)
  })
```

Railway logs to check after a request:
- `🔑 Copernicus token refreshed` — credentials working
- `📡 Sentinel-1 SAR (lat,lng): VV=...dB waterFrac=...% floodRisk=...%` — SAR live
- `🛰️  Sentinel-2 L2A (lat,lng): NDVI mean=...` — NDVI live

Required Railway env vars: `COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`
Get credentials: [dataspace.copernicus.eu](https://dataspace.copernicus.eu) → Settings → OAuth Clients → Add client (Client credentials grant)

---

### 2026-04-17 — Carbon MRV mock-data cleanup

#### Carbon MRV Engine (`/carbon`) — air quality + mineral scans
- **No fabricated scan readings:** `backend/src/services/adapters/carbonGas.adapter.ts` no longer returns random CO2 / CH4 / NO2 fallback values or labels them as mock data.
- **OCO-2 metadata lookup:** carbon gas scans query NASA CMR for a matching OCO-2 granule and attempt to sample live `xco2` from an available OPeNDAP link. If no readable sample is available, the API returns `null` readings plus a clear status message instead of invented numbers.
- **Trace-gas limitations are explicit:** CH4 and NO2 currently return `null` until dedicated trace-gas product readers are configured.
- **No fabricated mineral results:** `backend/src/services/adapters/mineral.adapter.ts` no longer returns hard-coded minerals, random composition percentages, random dust-source areas, or `EMIT / ASTER (Mock Data)`.
- **EMIT metadata lookup:** mineral scans query NASA CMR for matching EMIT granule metadata. Mineral composition remains unavailable until an Earthdata spectral-product reader is configured.
- **Frontend unavailable states:** `components/CarbonMRVDashboard.tsx` renders `Not available` and shows the backend source/status message for missing air-quality or mineral scan values.

#### Current blockers unrelated to the cleanup
- `App.tsx` still contains unresolved merge conflict markers and must be resolved before frontend TypeScript can pass.
- Local backend TypeScript still reports missing `rewardsRouter` and local `axios` resolution in this workspace.

---

### 2026-04-13 — Water Monitor MVP + Carbon investor UX

#### Carbon Credit Market (`/offsets`) — `OffsetMarketplaceView.tsx`
- **Demo data fallback:** 6 global showcase projects (Amazon, Borneo, Congo, Kenya, Sumatra, Patagonia) render when API is unavailable. "Showcase Mode" banner makes state transparent.
- **Investor hero copy:** hero banner updated — "$2B → $50B by 2030" market opportunity messaging.
- **`📚 Learn` tab added:** full investor education section — Credits vs Offsets Venn diagram (3-column styled component), market growth bar chart (2018–2030), 5 key concept definitions (Additionality, MRV, NDVI, Retirement, tCO₂e), ecosystem sequestration rates, DPAL vs Verra VCS vs Gold Standard comparison table, dual CTA cards (For Buyers / For Landowners).
- **Cross-navigation:** `onGoToMRV` prop → "MRV Engine" button in header + "use full Carbon MRV Engine →" in Register tab.
- **`Why Carbon Markets Matter`** investor panel in Register Land tab.

#### Carbon MRV Engine (`/carbon`) — `CarbonMRVDashboard.tsx`
- **Cross-navigation:** `onGoToMarket` prop → "Carbon Market" button in header.
- **Better empty state:** My Projects tab now shows a 6-step MRV workflow diagram instead of blank text.
- **Fallback stats:** platform stats show `—` instead of `0` when API is cold.

#### DPAL Water Monitor (`/water`) — **NEW full MVP**
- **Frontend:** `components/WaterMonitorView.tsx` (2 052 lines), `components/WaterGlobe.tsx`
  - 5 internal views: dashboard, create project, project detail, validator queue, credits marketplace
  - 8 project types: farm_irrigation, reservoir_monitoring, wetland_restoration, leak_reduction, community_conservation, drought_response, school_or_facility_savings, other
  - Satellite pull triggers all 5 adapters in parallel; anomaly flags surface inline
  - Water Impact Score circular gauge (0–100, A–F grade, 5 component bars)
  - Validator workflow: approve / reject / request evidence
  - DPAL Verified Water Impact Credits: issue, list, retire with blockchain hash placeholder
- **Backend** (in `dpal-ai-server`):
  - **Models:** `WaterProject`, `WaterSnapshot`, `WaterImpactReport`, `WaterCredit`, `WaterTransaction`
  - **Adapters:** `smap.adapter.ts`, `swot.adapter.ts`, `grace.adapter.ts`, `gibs.adapter.ts`, `copernicus.adapter.ts` — all return realistic mock data; TODO comments show exact NASA/Copernicus API integration points
  - **Score service:** `waterImpactScore.service.ts` — 5-component 0–100 scoring (baseline improvement 30 pts, moisture stability 20 pts, drought risk reduction 15 pts, proof completeness 15 pts, validator confidence 20 pts)
  - **Routes:** `water.routes.ts` registered at `/api/water` — 18 endpoints (project CRUD, mock-refresh, report generate, validator queue/review, credit issue/list/retire, stats, activity feed)
- **Constants:** `API_ROUTES.WATER_*` + helper functions `WATER_PROJECT_DETAIL`, `WATER_MOCK_REFRESH`, etc. in `constants.ts`
- **Routing:** `waterMonitor` view at `/water` in `utils/appRoutes.ts`; `App.tsx` renders `<WaterMonitorView />`; MainMenu tile "Water Satellite Monitor" navigates to `waterMonitor`
- **All credits labelled** "DPAL Verified Water Impact Credits" — not real regulated commodities

#### App.tsx wiring
- `OffsetMarketplaceView` receives `onGoToMRV={() => setCurrentView('carbonMRV')}`
- `CarbonMRVDashboard` receives `onGoToMarket={() => setCurrentView('offsetMarketplace')}`
- `WaterMonitorView` wired at `currentView === 'waterMonitor'`

#### Build status
- Frontend TypeScript: 10 pre-existing errors (hero.id, Users icon, runGeminiGenerate) — unchanged, zero new errors
- All water monitor JSX duplicate-`className` errors fixed (6 locations in `WaterMonitorView.tsx`)

---

### 2026-04-12 — Missions V2 stabilization + UX fixes

- **Missions V2 shell shipped:** `features/missions-v2/` now has a full Hub (`/missions`), Marketplace (`/missions` → `?section=marketplace`), detail page (`/missions/m/:id`), workspace (`/missions/v2`), and create flow (`/missions/create`). All wired through `App.tsx` and `utils/appRoutes.ts`.
- **Mission Categories scroll UX fixed** (`components/AiWorkDirectivesView.tsx`): replaced hidden `no-scrollbar` row with left/right `ChevronLeft`/`ChevronRight` arrow buttons as **flex siblings** (not absolutely positioned — avoids clipping by parent overflow) + a visible thin scrollbar at the bottom. Works on all screen sizes including mobile.
- **Start Mission now has a real tracking panel** (`components/AiWorkDirectivesView.tsx`): clicking Start Mission opens an in-progress tracking panel with: pulsing “Mission In Progress” indicator, checkable step list from AI packet steps or objectives, proof required reminder, field notes / proof textarea, and “Mark Complete & Claim Coins” button that runs the audit hash. Button label changes to “Track Progress” when mission is already running. Replaces the dead-end “steps will appear once activated” message.
- **Community Timeline tile removed** from `components/MainMenu.tsx`. The tile navigated to `hub/work_feed` and is no longer needed.
- **Community guidelines link removed** from `components/MyReportsList.tsx` sidebar — it was a dead button with no handler.
- **Main menu “Missions” tile** now uses `dpal-work-network.png` and navigates to `missionMarketplace` (Missions Hub). The separate “DPAL Work Network” tile navigates to `aiWorkDirectives` (AI-guided work marketplace).

### 2026-04-06 — Help center + ledger + situation room

- **Help Center made live:** `components/HelpCenterView.tsx` now uses real `/api/help-reports/mine` ticket data, live status filtering/refresh, and real attachment upload flow via `services/helpCenterService.ts` (`uploadHelpReportAttachments`).
- **Ledger lookup improved:** block search now accepts flexible combos (`#6843021`, `rep-177...`, comma formats, partial numeric tokens) and falls back through exact block match → local keyword match → API feed match → direct `rep-` fetch (`App.tsx`, `utils/blockchainLookup.ts`, `components/BlockchainStatusPanel.tsx`).
- **Situation Room media safety:** in-room filing images can be uploaded/updated and “set main”, while delete controls were removed from the user-facing gallery (`components/IncidentRoomView.tsx`, `App.tsx`).
- **Main menu work tile image updated:** `public/main-screen/dpal-work-network.png` replaced with the latest provided artwork.
- **Server-side Gemini path:** `VITE_USE_SERVER_AI`, **`POST /api/ai/gemini`** on **`dpal-ai-server`**, optional removal of **`VITE_GEMINI_API_KEY`** from Vercel after verification.
- **Politician intel section** redesigned as a serious **accountability workflow** (cards, target first, investigation modes, source toggles, results preview column). DuckDuckGo query built from combined fields + focus labels + source hints.
- **OpenAI** integrated for search query refine and evidence draft; dev uses Vite **`/openai-proxy`**.
- **Evidence draft auto-save** debounced (~550ms) so **”Draft saved”** does not update on every keystroke (was causing visible flashing / excessive re-renders).
- **Material Web** + theme bridge for evidence form controls (`MaterialWebEvidenceFields.tsx`, CSS under `styles/`).
- **Sectors** in category hub: labels, hero assets (`SECTOR_HERO_ASSET`), gateway grid.

---

## Cross-repo memory

Longer **multi-repo** notes (Reviewer Node + `dpal-ai-server` + deploy verification) live in **`claude.md`** at the root of **`LudwigHurtado/dpal-reviewer-node`** (or `DPAL Reviewer Node` on disk).

---

## Scripts

```bash
npm run dev      # Vite, port 3000
npm run build    # production bundle → dist/
npm run lint     # tsc --noEmit
npm run preview  # preview production build
```

Backend folder:

```bash
cd backend && npm run dev   # Express + Prisma, port 3001 (see backend README if present)
```

---

## Security & Ops Reminders

- Rotate any keys that may have been exposed in chat or screenshots (Gemini, Maps, OpenAI, etc.).  
- **`VITE_*`** values are **public in the built client** — never put true secrets there unless you accept browser exposure (OpenAI in prod should ideally go through your backend).  
- After changing env on Vercel/Railway, **redeploy** so new vars apply.

---

## Related Repos (Not in This Tree)

- **Enterprise dashboard** and **Nexus console** — separate Next/Vercel apps; they share the Railway API base via their own `NEXT_PUBLIC_*` vars.

---

*Keep this file updated when you add major routes, env vars, or backend contracts.*
