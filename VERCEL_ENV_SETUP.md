# Set production API URL on Vercel (one-time)

So **https://dpal-front-end.vercel.app/** uses the same Railway backend as dev.

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
(Or your actual Railway backend URL — no trailing slash.)

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

After this, production and dev both use the same Railway backend + MongoDB.
