# Set production API URL on Vercel (one-time)

So **https://dpal-front-end.vercel.app/** talks to the repo **`backend/`** service (`dpal-backend` on `/health`), not a separate “Deepal AI server.”

**DPAL** = Decentralized Public Accountability Ledger (**D-P-A-L**).

---

## Option A: Vercel CLI (fastest — run in this folder)

```bash
# 1. Install Vercel CLI if you don't have it
npm i -g vercel

# 2. Log in (if needed)
vercel login

# 3. Add the env var for Production (paste when prompted)
vercel env add VITE_API_BASE production
```
When prompted for the value, paste:
```
https://web-production-a27b.up.railway.app
```
Use your deployed **`backend/`** Railway URL (must return `"service":"dpal-backend"` on `/health`). No trailing slash. Do **not** point at legacy **`dpal-ai-server`** MongoDB-only hosts unless you know you still need them.

```bash
# 4. Redeploy so the new env is used
vercel --prod
```

---

## Option B: Vercel Dashboard (manual)

1. Open https://vercel.com/dashboard → project **dpal-front-end**
2. **Settings** → **Environment Variables**
3. **Add New**  
   - Name: `VITE_API_BASE`  
   - Value: `https://web-production-a27b.up.railway.app`  
   - Environment: **Production** (and **Preview** if you want)
4. **Save**
5. **Deployments** → **⋯** on latest deployment → **Redeploy**

---

After this, production uses the same **`backend/`** API as local dev (Prisma + Express). `vercel.json` also rewrites same-origin `/api/*` to that host when the SPA uses relative API paths.

Redeploy **`backend/`** on Railway after pulling changes so routes like `/api/deepal/chat` exist in production.
