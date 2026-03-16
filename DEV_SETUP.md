# Testing DPAL locally (dev) with Railway backend

Everything runs on Railway in production. To test **on your machine** while still using the **Railway backend and MongoDB**, follow these steps.

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

## 4. Point the app at your Railway backend

Create or edit **`.env.local`** in the project root (same folder as `package.json`).

**If you don’t have `.env.local`:** copy from the example:

```bash
copy .env.example .env.local
```

Then edit `.env.local` and set your **real Railway backend URL**:

```env
VITE_API_BASE=https://YOUR-RAILWAY-APP.up.railway.app
```

- Replace `YOUR-RAILWAY-APP` with your actual Railway service URL (from Railway dashboard → your backend service → Settings → Domains).
- If your backend is already `https://web-production-a27b.up.railway.app`, you can keep that.

Optional (only if you use AI features from the frontend):

```env
VITE_GEMINI_API_KEY=your_key_here
```

Save the file.

---

## 5. Start the dev server

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
