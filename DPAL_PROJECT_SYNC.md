# DPAL front-end — project sync & handoff

This file is the **living notes** for what this codebase is, how it is structured, and **recent work** so assistants and humans stay aligned. **Update it** when you add routes, env vars, or major UX flows.

---

## What this app is

- **DPAL** (“mother-branch-dpal-system”) is a large **React** single-page app: civic reporting, transparency tools, missions, intelligence views, games-adjacent hubs, and many feature-specific screens.
- **Routing:** `react-router-dom` with **`BrowserRouter`** in `index.tsx`. View state in `App.tsx` is kept in sync with the URL via `utils/appRoutes.ts` (`VIEW_PATHS`, `pathToView`, `viewToPath`). **Paths are stable** — bookmarks and shared links depend on them.
- **i18n:** `LanguageProvider` wraps the app (`i18n/`).
- **Global flow:** `DPALFlowProvider` (`context/DPALFlowContext.tsx`).
- **Errors:** `AppErrorBoundary` wraps the tree.
- **Preview:** `DevicePreviewFrame` can wrap the app for device framing during dev.

---

## Stack (high level)

| Area | Choice |
|------|--------|
| UI | React 19, TypeScript, Vite 6 |
| Styling | Tailwind-style utility classes in components (see `index.css` / theme CSS) |
| Components | Mix of custom components + **Material Web** (`@material/web`) in places (e.g. evidence fields) |
| State | React state, some **Zustand** |
| AI | **Google Gemini** (`@google/genai`, `services/geminiService.ts` and related) |
| Maps | `@googlemaps/js-api-loader` |
| Router | `react-router-dom` v7 |

---

## Local development

- **Install:** `npm install`
- **Dev server:** `npm run dev` (Vite, default port **3000**, `host: 0.0.0.0` in `vite.config.ts`)
- **Build:** `npm run build` / `npm run preview`
- **Gemini:** README mentions `GEMINI_API_KEY` in `.env.local`; Vite also injects `process.env.GEMINI_API_KEY` via `vite.config.ts` `define`.

---

## Environment variables (non-exhaustive)

| Variable | Role |
|----------|------|
| `GEMINI_API_KEY` | Gemini / AI Studio flows (see README + vite `define`) |
| `VITE_OPENAI_API_KEY` | Politician Transparency: OpenAI for query refine + evidence draft (dev proxy injects `Authorization` header) |
| `VITE_OPENAI_MODEL` | Optional override; default `gpt-4o-mini` in `services/politicianOpenAiService.ts` |
| API base | `vercel:env` script references a Railway API URL for production-style config |

**OpenAI dev proxy:** `vite.config.ts` proxies `/openai-proxy` → `https://api.openai.com` so the browser can call `/openai-proxy/v1/chat/completions` without putting the key in client bundles (see `politicianOpenAiService.ts`). Production may need a same-origin backend if CORS blocks direct calls.

---

## URL ↔ view mapping

- **Source of truth:** `utils/appRoutes.ts` — `VIEW_PATHS` maps internal view ids (e.g. `politicianTransparency`) to paths (e.g. **`/politician`**).
- When adding a new top-level screen, **add the path here** and wire navigation in `App.tsx` consistently.

---

## Politician Transparency (`/politician`)

- **Component:** `components/PoliticianTransparencyView.tsx`
- **Purpose:** Civic accountability workflow: **public web discovery** (DuckDuckGo JSON API), **evidence workspace** (SAID vs DID style content), optional **OpenAI** assist, local draft + “ledger” style localStorage helpers.
- **Intel section:** `#intel-search` — redesigned as a **Public Accountability Engine** workflow (not a generic search + chips):
  1. **Identify target** — official name, office/role, jurisdiction
  2. **Accountability focus** — grid of investigation modes (Promise vs Vote, Statement vs Action, etc.) with stable ids in `ACCOUNTABILITY_FOCUS`
  3. **Evidence query** — textarea + **source filter** toggles (`SOURCE_FILTERS`, default set `DEFAULT_SOURCE_FILTER_IDS`)
  4. Actions: **Run investigation** (DDG), **Build evidence packet** / **Compare statement vs record** (scroll to `#evidence-lab`; packet pre-fills evidence **subject** from target name when empty), **Refine query (AI)** when configured, **Reset filters**
  5. **Investigation results** preview column (copy explains outputs before results load)
- **Query assembly:** `investigationQueryLine` combines target fields, `aiQuery`, focus labels, and source hints; `buildFreePoliticianSearchQuery` enriches for public-record style search; DDG fetch remains best-effort.
- **OpenAI service:** `services/politicianOpenAiService.ts` — `refinePoliticianSearchQuery({ query, targetLine, focusLabels, sourceHints, ... })`, `suggestEvidenceDraftFromNotes`, etc.
- **Assets:** Section banners under `public/politician-viewpoints/` (e.g. `banner-intel-search.png`, `illustration-empty-search.png`) referenced in `SECTION_IMG`.

### Fix applied (draft “flashing”)

- Evidence **auto-save** to `localStorage` previously ran on **every keystroke** and called `setLastDraftSavedAt` each time, so **“Draft saved …”** updated every keypress and caused visible **flicker**.
- **Change:** debounced draft save (~**550ms**) so timestamp/state updates after typing pauses.

---

## Category selection & sectors (Next view)

- **Component:** `components/CategorySelectionView.tsx`
- **Classic vs Next:** Toggle stores preference in `localStorage` (`VIEW_MODE_STORAGE_KEY` from `components/sectors/sectorDefinitions.ts`).
- **Sectors:** Defined in `components/sectors/sectorDefinitions.ts` — `SECTORS` (keys: `safety`, `financial`, `health`, `government`, `property`, `digital`, `community`), labels, subtitles, emoji, category lists; `SECTOR_HERO_ASSET` maps sector → hero image under `public/next-view/` etc.; `CATEGORY_MAPPINGS` for compatibility table.
- **UI pieces:** `SectorGatewayGrid`, `SectorHeroBanner`, `CategoryMappingPanel`, `ViewModeOnboardingPrompt`.
- **Category cards:** `categoryCardAssets.ts` — images, optional `CATEGORY_GALLERY_IMAGES` crossfade for some categories.

---

## Git workflow (team rule)

- After meaningful changes: **stage** → **commit** with a clear message → **push** to remote, unless the user explicitly asks to skip push.

---

## Recent commits / themes (conversation-aligned)

1. **Politician intel search** — accountability workflow UI, unified focus + source filters, DDG + OpenAI refine wiring, results preview, copy updates.
2. **`refinePoliticianSearchQuery`** — extended with `targetLine`, `focusLabels`, `sourceHints` (legacy chip arrays still optional).
3. **Evidence draft debounce** — stops “Draft saved” UI flashing on every keystroke.

---

## How to keep this file useful

- After a **new route**: add to `utils/appRoutes.ts` and add a line under **URL ↔ view mapping**.
- After a **new env var**: add to the table and `.env.example` if you maintain one.
- After a **major feature**: add a short subsection with file paths and behavior.
- Avoid duplicating full API contracts — link to `services/` files instead.

---

*Last updated: 2026-04-02 (assistant-maintained; amend dates when you edit).*
