# Testing DPAL locally (dev) with repo backend

**DPAL** = Decentralized Public Accountability Ledger (**D-P-A-L**, not “Deepal”).

Production deploys the **`backend/`** folder from this repo (`service: "dpal-backend"`). To test **on your machine** with the same API surface, run **`backend/`** locally (recommended) or optionally point at a remote deployed backend.

**Dev server URL (remember):** When you run `npm run dev`, the app is available at:
- **On this machine:** http://localhost:3000/
- **On your network (e.g. phone, other PC):** http://192.168.0.10:3000/

---

## 1. Prerequisites

- **Node.js** 18+ (check: `node -v`)
- **npm** (comes with Node; check: `npm -v`)

---

## 2. Open the project

In a terminal:

```bash
cd c:\DPAL_Front_End
```

(Or open that folder in Cursor/VS Code and use the integrated terminal.)

---

## 3. Install dependencies

```bash
npm install
```

Wait until it finishes (no red errors).

---

## 4. Start the repo backend (recommended)

In a **second** terminal:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Confirm: `curl http://127.0.0.1:3001/health` → `"service":"dpal-backend"`.

## 5. Front-end env (optional)

Create **`.env.local`** in the project root (`copy .env.example .env.local`).

**Default local path:** leave `VITE_API_BASE` unset — Vite proxies `/api` → `http://127.0.0.1:3001`.

Or set explicitly:

```env
VITE_API_BASE=http://127.0.0.1:3001
VITE_USE_SERVER_AI=true
```

Set `GEMINI_API_KEY` in **`backend/.env`** for server AI (`POST /api/ai/gemini`, DPAL Assistant). Do **not** use `VITE_DPAL_AI_SERVER_URL` (deprecated).

**Optional remote backend:** only if you need production data:

```env
VITE_API_BASE=https://YOUR-DEPLOYED-BACKEND.up.railway.app
```

Must be a **`dpal-backend`** host from this repo’s `backend/`, not legacy **`dpal-ai-server`**.

---

## 6. Start the dev server

```bash
npm run dev
```

You should see something like:

```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.0.10:3000/
```

---

## 6. Open the app in the browser

1. Open **http://localhost:3000** (or **http://192.168.0.10:3000** from another device on your network) in Chrome, Edge, or Firefox.
2. You should see the DPAL main menu. The app is running **locally**; API calls go to **Railway** (and thus Railway MongoDB) because of `VITE_API_BASE` in `.env.local`.

---

## 7. What you’re testing

- **Frontend:** Runs on your PC (Vite dev server).
- **Backend / DB:** Still on Railway (same as production). No need to run MongoDB or the backend on your machine.

To confirm the backend URL in the UI: open the Mint Station or any screen that shows “API_Node” — it should display the URL from `VITE_API_BASE`.

---

## 8. Stop the dev server

In the terminal where `npm run dev` is running, press **Ctrl+C**.

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| `npm install` fails | Run `node -v` (need 18+). Delete `node_modules` and run `npm install` again. |
| Blank page or errors | Open DevTools (F12) → Console. Check for red errors and fix the reported file/line. |
| API calls fail (e.g. NFT, AI) | Confirm `VITE_API_BASE` in `.env.local` is exactly your Railway URL (no trailing slash). Restart `npm run dev` after changing `.env.local`. |
| “CORS” errors in console | Backend on Railway must allow your origin. For local dev, backend CORS should allow `http://localhost:5173`. |

---

## Optional: build and preview (production-like)

```bash
npm run build
npm run preview
```

Then open the URL shown (e.g. `http://localhost:4173`). This serves the **built** app locally; API base still comes from `.env.local` at build time.
