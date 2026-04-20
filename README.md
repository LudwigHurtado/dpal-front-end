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
| `/missions` | Missions Hub V2 |
| `/directives` | AI Work Directives marketplace |
| `/situation` | Situation Room |
| `/escrow` | Trusted Escrow |
| `/ledger` | Public Blockchain Ledger |
| `/help` | Help Center |
| `/login` `/signup` | Auth (MongoDB users on `dpal-ai-server`) |

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
