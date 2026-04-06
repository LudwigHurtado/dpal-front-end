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

## Key implemented behavior

- **Help Center live tickets:** "My Tickets" now reads live data from `/api/help-reports/mine`, includes live refresh/filtering, and supports real attachment uploads after ticket submission.
- **Ledger search now tolerant:** block lookup accepts block/id number combos (example: `#6843021`, `rep-1775421654549`, comma-formatted numbers), then falls back through local and API-backed matching.
- **Situation Room filing images:** users can upload/update and set the main image, while delete controls are disabled in the room UI.
- **Main menu DPAL Work image:** `public/main-screen/dpal-work-network.png` updated to the latest artwork.

## Validator Node routing

The "Validator Node" card in `components/MainMenu.tsx` resolves its URL via `getValidatorPortalUrl()` in `constants.ts`:

- uses `VITE_VALIDATOR_PORTAL_URL` when set,
- otherwise defaults to `https://dpal-reviewer-node.vercel.app` only on `dpal-front-end.vercel.app`,
- otherwise shows an in-app setup warning in non-production host contexts.

## Backend notes

- Primary production API base is typically Railway (`https://web-production-a27b.up.railway.app`).
- Local `backend/` service is a separate Express + Prisma implementation and may not expose every production route.
