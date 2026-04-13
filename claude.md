# DPAL Front-End — Reference for AI & Developers

Last updated: 2026-04-12 (missions-v2 stabilization, in-progress tracking panel, scroll UX, menu cleanup)

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
   - Implements **`/api/ai/ask`**, **`/api/ai/health`**, **`/api/ai/status`**, **`/api/ai/gemini`**, NFT, persona, reports, situation room uploads, etc.

When debugging “API issues,” confirm whether the app is pointed at Railway **`dpal-ai-server`** or local `3001` Prisma backend.

---

## Railway Backend (Production) — Env (Typical)

From deployment notes (verify in Railway dashboard):

- `MONGODB_URI` — DB connection  
- `GEMINI_API_KEY` — **server-side Gemini** (required for **`VITE_USE_SERVER_AI`** / `/api/ai/gemini`)  
- `GEMINI_MODEL` — e.g. `gemini-3-flash-preview` (see `dpal-ai-server` `runGemini`)  
- `GEMINI_MODEL_CHEAP` — optional; defaults chain to **`gemini-2.0-flash`** (do **not** use retired `gemini-1.5-flash`)  
- `FRONTEND_ORIGIN` or `CORS_ORIGINS` — comma-separated allowed web origins (frontend + dashboards)  
- `NODE_ENV=production`

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
| `offsetMarketplace` | `/offset` | Green Impact marketplace |

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

---

## Recent Front-End Work (Session History)

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
