# DPAL Front-End

Vite 6 + React 19 + TypeScript SPA: the main DPAL citizen-reporting and environmental monitoring platform. Deployed on **Vercel**; API calls go to a **Railway** Node/MongoDB backend (`dpal-ai-server`).

---

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
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

After changing Railway variables, redeploy or restart the backend service.

---

## Key product areas

| Route | Feature |
|-------|---------|
| `/` | Main menu - 20 nav tiles |
| `/hub` | My Reports + Feed + Map |
| `/politician` | Public Accountability Engine |
| `/offsets` | Carbon Credit Market - buy, retire, register land |
| `/carbon` | Carbon MRV Engine - satellite NDVI, score, validator |
| `/water` | Water Monitor - satellite snapshots, impact score, credits |
| `/ecology` | Ecological Conservation - Landsat foliage scan, NDVI, habitat risk |
| `/afolu` | AFOLU Carbon & Proof Engine |
| `/games` | Play & Learn hub with the embedded DPAL Mission Ops Phaser game |
| `/missions` | Missions Hub V2 |
| `/directives` | AI Work Directives marketplace |
| `/situation` | Situation Room |
| `/escrow` | Trusted Escrow |
| `/ledger` | Public Blockchain Ledger |
| `/help` | Help Center |
| `/login` `/signup` | Auth (MongoDB users on `dpal-ai-server`) |

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

- Main page monitoring imagery now uses dedicated assets in `public/main-screen/`
- Category card imagery for Earth Observation, Ecological Conservation, and Water Violations points at those same assets through `categoryCardAssets.ts`
- Mineral detector readings now separate verified bedrock/mineral indicators from EMIT dust-source availability
- Water Monitor Sentinel-1 SAR now shows a clearly labeled fallback estimate card when the backend returns `sentinel1.ok: false`
- Git author identity for this repo is set to `LudwigHurtado <49735409+LudwigHurtado@users.noreply.github.com>`

---

## Architecture

```text
dpal-front-end  (this repo - Vite SPA on Vercel)
       |
       +-- VITE_API_BASE --> dpal-ai-server  (Express + MongoDB on Railway)
                              |-- /api/auth/*
                              |-- /api/offsets/*      carbon credit market
                              |-- /api/carbon/*       carbon MRV
                              |-- /api/water/*        water monitor
                              |-- /api/ecology/*      Landsat foliage scan
                              |-- /api/ai/*           Gemini proxy
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
