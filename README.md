<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DPAL Front-End

React + Vite front-end for DPAL reporting, public record search, Situation Room collaboration, Help Center support, and category-driven civic workflows.

## Run locally

Prerequisites:
- Node.js 20+
- npm

1. Install dependencies:
   `npm install`
2. Copy env template:
   `cp .env.example .env.local`
3. Set required env values in `.env.local`:
   - `VITE_API_BASE` (recommended; if unset app falls back to `http://localhost:3001` in dev)
   - `VITE_VALIDATOR_PORTAL_URL` (optional; used by the "Validator Node" tile)
   - `VITE_USE_SERVER_AI=true` for server Gemini mode (recommended for production)
4. Start development server:
   `npm run dev`

App default dev URL: `http://localhost:3000`

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - production build into `dist/`
- `npm run lint` - TypeScript type-check (`tsc --noEmit`)
- `npm run preview` - preview production build

## Key areas

| Feature | Entry point | Notes |
|---------|-------------|-------|
| Main menu | `components/MainMenu.tsx` | 20 tile grid; images in `public/main-screen/` |
| Missions Hub V2 | `features/missions-v2/hub/MissionsHubPage.tsx` | `/missions` — home, marketplace, emergency, rewards, local, org, validator, analytics sections via `?section=` |
| Mission Marketplace | `features/missions-v2/pages/MissionMarketplacePage.tsx` | Browse + filter listings |
| Mission detail | `features/missions-v2/pages/MissionMarketplaceDetailPage.tsx` | `/missions/m/:id` |
| Mission workspace | `features/missions-v2/pages/MissionAssignmentV2Page.tsx` | `/missions/v2` — phased assignment engine |
| AI Work Marketplace | `components/AiWorkDirectivesView.tsx` | `/directives` — 15 categories, AI-generated assignments, in-progress step tracking |
| Help Center | `components/HelpCenterView.tsx` | Live tickets from `/api/help-reports/mine`, attachment uploads |
| Public Ledger | `components/TransparencyDatabaseView.tsx` + `utils/blockchainLookup.ts` | Flexible block/ID search |
| Situation Room | `components/IncidentRoomView.tsx` | Filing images upload/set-main; delete disabled for users |
| Politician Transparency | `components/PoliticianTransparencyView.tsx` | Public Accountability Engine — OpenAI + DuckDuckGo |
| Auth | `pages/auth/*`, `auth/AuthContext.tsx` | `/login`, `/signup`, `/account`, `/admin` |

## Implemented behavior — what works today

- **Missions V2 Hub & Marketplace:** full shell at `/missions` with sectioned navigation, marketplace browse, and detail pages. Workspace at `/missions/v2`.
- **AI Work Directives in-progress tracking:** clicking "Start Mission" opens a step checklist, field notes textarea, proof reminder, and "Mark Complete & Claim Coins" — no more dead-end after starting.
- **Mission Categories scroll:** left/right arrow buttons + visible thin scrollbar on the AI Work Marketplace category row. Works on mobile.
- **Help Center live tickets:** "My Tickets" reads live data from `/api/help-reports/mine`, includes live refresh/filtering, and supports real attachment uploads.
- **Ledger search flexible:** block lookup accepts `#6843021`, `rep-1775421654549`, comma-formatted numbers; falls through exact → local keyword → API feed → direct `rep-` fetch.
- **Situation Room filing images:** upload/update and set the main image; delete controls are disabled in the room UI.

## Validator Node routing

The "Validator Node" card in `components/MainMenu.tsx` resolves its URL via `getValidatorPortalUrl()` in `constants.ts`:

- uses `VITE_VALIDATOR_PORTAL_URL` when set,
- otherwise defaults to `https://dpal-reviewer-node.vercel.app` only on `dpal-front-end.vercel.app`,
- otherwise shows an in-app setup warning in non-production host contexts.

## Missions V2 architecture

```
features/missions-v2/
├── hub/              MissionsHubPage.tsx + missionsHubSections.ts
├── pages/            MissionAssignmentV2Page, MissionMarketplacePage,
│                     MissionMarketplaceDetailPage, CreateMissionView
├── components/       Sector cards (Details, Header, Tasks, Proof, Progress…)
├── services/         Layer services: escrow, evidence, governance, outcome,
│                     report, reputation, resolution, validation
├── data/             Mock listings + adapters
├── hooks/            useMissionWorkspaceV2
├── types.ts          Core V2 types
├── marketplaceTypes.ts
├── createMissionTypes.ts
└── missionWorkspaceTheme.ts   mw.* class helpers (teal dark palette)
```

Routes: `/missions` → Hub, `/missions/v2` → Workspace, `/missions/m/:id` → Detail, `/missions/create` → Create.

## Backend notes

- Primary production API base is Railway (`https://web-production-a27b.up.railway.app`).
- Local `backend/` (Express + Prisma, port 3001) is a separate auxiliary service — it does not expose every production route.
- For API path reference see `constants.ts` → `API_ROUTES`.
