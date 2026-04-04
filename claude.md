# DPAL Front-End — Reference for AI & Developers

Last updated: 2026-04-02

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
| **`VITE_GEMINI_API_KEY`** | Client-side Gemini (see `services/geminiService.ts`); many flows also hit backend `/api/ai/*`. |
| **`VITE_OPENAI_API_KEY`** | Politician Transparency: query refine + evidence draft (`services/politicianOpenAiService.ts`). In **dev**, Vite injects the key via **`/openai-proxy`** so the browser bundle does not need the secret. **Production** may need a same-origin proxy if CORS blocks direct OpenAI calls. |
| **`VITE_OPENAI_MODEL`** | Optional; default `gpt-4o-mini`. |
| **`VITE_BRAVE_SEARCH_API_KEY`** | Live web search (`services/braveSearchService.ts`). |
| **`VITE_GOOGLE_MAPS_API_KEY`** | Locator / maps / Places. **`VITE_GOOGLE_MAPS_API_KEY_LOCAL`** optional for localhost if prod key is referrer-locked. |
| **`VITE_LAYOUT_VERSION`** | `v1` \| `v2` — hub layout experiments (`App.tsx`). |
| **`VITE_FEATURE_*`** | `REPUTATION`, `AUDIT_TRAIL`, `BLOCKCHAIN_ANCHOR`, `GOVERNANCE` — see `features/featureFlags.ts`. |
| **`VITE_GAME_URL_*`** | Society Game Hub — external URLs per game id (`societyGames.ts`). |
| **`VITE_ADSENSE_*`** | Optional AdSense slots (`MainMenu.tsx`). |

See **`vite-env.d.ts`** for the full typed list.

### Vite dev proxy (OpenAI)

`vite.config.ts` maps **`/openai-proxy`** → `https://api.openai.com` and sets `Authorization` from `VITE_OPENAI_API_KEY` in `.env.local`. Client code uses `/openai-proxy/v1/...` when `import.meta.env.DEV` is true.

---

## Backend Landscape (Important Distinction)

1. **Production / main app API (Railway)**  
   - URL: **`VITE_API_BASE`** → typically `https://web-production-a27b.up.railway.app`.  
   - Described in code as **MongoDB**-backed for reports, NFT, escrow, AI routes, etc.  
   - **`constants.ts` → `API_ROUTES`** documents expected paths: `/api/reports`, `/api/ai/ask`, `/api/nft/*`, `/api/escrow/*`, `/api/beacons`, etc.

2. **Repo folder `backend/`** (Express + **Prisma**)  
   - Separate **local / auxiliary** service: help-center style **`/api/help-reports`**, **`/api/admin/*`**, plus **legacy-compatible** `GET /api/reports` and `GET /api/reports/feed` mapped from Prisma `helpReport` for enterprise dashboard probes.  
   - Default port **3001** (`backend/src/index.ts`).  
   - **Not** the full Mongo API surface — do not assume all `API_ROUTES` exist here.

When debugging “API issues,” confirm whether the app is pointed at Railway or local `3001`.

---

## Railway Backend (Production) — Env (Typical)

From deployment notes (verify in Railway dashboard):

- `MONGODB_URI` — DB connection  
- `GEMINI_API_KEY` — server-side AI  
- `FRONTEND_ORIGIN` or `CORS_ORIGINS` — comma-separated allowed web origins (frontend + dashboards)  
- `NODE_ENV=production`

Backend should accept both **`FRONTEND_ORIGIN`** and **`CORS_ORIGINS`** naming.

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

---

## Notable Product Areas (Code Anchors)

| Area | Where to look |
|------|----------------|
| Main shell & view switching | `App.tsx` |
| Category / sector “Next view” | `CategorySelectionView.tsx`, `components/sectors/*`, `sectorDefinitions.ts` — sectors named (Safety, Financial, Health, Government, Property, Digital, Community), `SectorGatewayGrid`, `CategoryMappingPanel` |
| Politician Transparency | `PoliticianTransparencyView.tsx` — **Public Accountability Engine** workflow: target fields → accountability focus grid → evidence query + source filters → DuckDuckGo search; OpenAI refine; evidence lab + localStorage draft |
| Politician OpenAI | `services/politicianOpenAiService.ts` |
| Help center → backend | `services/helpCenterService.ts` → `/api/help-reports` |
| Beacons | `services/beaconService.ts` |
| Gemini / AI errors | `services/geminiService.ts` |
| Brave search | `services/braveSearchService.ts` |
| Maps | `services/googleMapsLoader.ts`, Locator / Good Wheels map components |
| i18n | `i18n/` — `useTranslations()`, `translations.ts` |
| Feature flags | `features/featureFlags.ts` |
| Category images / galleries | `categoryCardAssets.ts`, `CategorySelectionView` (`CATEGORY_GALLERY_IMAGES` crossfade for e.g. Police Misconduct) |

---

## Recent Front-End Work (Session History)

- **Politician intel section** redesigned as a serious **accountability workflow** (cards, target first, investigation modes, source toggles, results preview column). DuckDuckGo query built from combined fields + focus labels + source hints.  
- **OpenAI** integrated for search query refine and evidence draft; dev uses Vite **`/openai-proxy`**.  
- **Evidence draft auto-save** debounced (~550ms) so **“Draft saved”** does not update on every keystroke (was causing visible flashing / excessive re-renders).  
- **Material Web** + theme bridge for evidence form controls (`MaterialWebEvidenceFields.tsx`, CSS under `styles/`).  
- **Sectors** in category hub: labels, hero assets (`SECTOR_HERO_ASSET`), gateway grid.

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
