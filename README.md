# DPAL Front-End

Vite 6 + React 19 + TypeScript SPA — the main DPAL citizen-reporting and environmental monitoring platform. Deployed on **Vercel**; API calls go to a **Railway** Node/MongoDB backend (`dpal-ai-server`).

---

## Quick start

```bash
cp .env.example .env.local   # fill in secrets (see below)
npm install
npm run dev                  # http://localhost:3000
```

Build for production:

```bash
npm run build    # → dist/
npm run preview  # preview the production bundle locally
```

Type-check:

```bash
npm run lint     # tsc --noEmit
```

---

## Environment variables

All Vite-exposed variables must start with `VITE_`. Copy `.env.example` → `.env.local`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_API_BASE` | Yes | Railway backend origin, e.g. `https://web-production-a27b.up.railway.app` |
| `VITE_GEMINI_API_KEY` | Optional* | Client-side Gemini key — exposed in bundle; prefer `VITE_USE_SERVER_AI` for production |
| `VITE_USE_SERVER_AI` | Optional* | `true` → AI goes via `POST /api/ai/gemini` on the backend (no browser key needed) |
| `VITE_OPENAI_API_KEY` | Optional | Politician Transparency — query refine + evidence draft |
| `VITE_OPENAI_MODEL` | Optional | Default `gpt-4o-mini` |
| `VITE_BRAVE_SEARCH_API_KEY` | Optional | Live web search |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Locator / Places |
| `VITE_LAYOUT_VERSION` | Optional | `v1` or `v2` (hub layout experiment) |

\* At least one of `VITE_GEMINI_API_KEY` or `VITE_USE_SERVER_AI=true` is needed for AI features.

---

## Key product areas

| Route | Feature |
|-------|---------|
| `/` | Main menu — 20 nav tiles |
| `/hub` | My Reports + Feed + Map |
| `/politician` | Public Accountability Engine |
| `/offsets` | Carbon Credit Market — buy, retire, register land |
| `/carbon` | Carbon MRV Engine — satellite NDVI, score, validator |
| `/water` | Water Monitor — satellite snapshots, impact score, credits |
| `/ecology` | Ecological Conservation — Landsat foliage scan, NDVI, habitat risk |
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

The `/games` Play & Learn hub now includes **DPAL Mission Ops**, an embedded Phaser mission game mounted through `features/mission-game/MissionGameView.tsx`.

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
- Marker coordinates are kept outside the scene in `WORLD_MAP_MARKER_POSITIONS`, with normalized `x` / `y` values plus `district` and `categoryId`.
- The uploaded image already contains district labels, so Phaser does not draw duplicate district text over the map.

State is in-session only for now through the mission game player state manager. There is no backend persistence yet.

---

## Architecture

```
dpal-front-end  (this repo — Vite SPA on Vercel)
       │
       └─ VITE_API_BASE ──► dpal-ai-server  (Express + MongoDB on Railway)
                             ├── /api/auth/*
                             ├── /api/offsets/*      carbon credit market
                             ├── /api/carbon/*       carbon MRV
                             ├── /api/water/*        water monitor
                             ├── /api/ecology/*      Landsat foliage scan
                             ├── /api/ai/*           Gemini proxy
                             └── /api/reports/*
```

Demo / offline mode: the Carbon Credit Market and Ecological Conservation both fall back to localStorage-backed simulation or deterministic demo data when the API is unreachable, so the full UX is usable without a live backend.

---

## Related repos

| Repo | Purpose |
|------|---------|
| `LudwigHurtado/dpal-ai-server` | Railway backend — MongoDB, Gemini, satellite adapters |
| `dpal-enterprise-dashboard` | Next.js enterprise view (Vercel) |
| `dpal-nexus-console-vercel` | Next.js Nexus console (Vercel) |
| `dpal-reviewer-node` | Validator / reviewer node portal |

---

## Deploying

Push to `main` → Vercel auto-deploys. After updating env vars in the Vercel dashboard, trigger a manual redeploy so the new values are baked in.

For the Railway backend, push to `main` in `dpal-ai-server` → Railway auto-deploys. Smoke check:

```
GET https://web-production-a27b.up.railway.app/health
GET https://web-production-a27b.up.railway.app/api/ai/status   → { ok: true, gemini: true }
```
