# DPAL — Master Project Reference
> **Last updated:** March 2026  
> Keep this file updated as new services, repos, and URLs are added.

---

## 1. What Is DPAL?

**DPAL — Decentralized Public Accountability Ledger** is a civic-tech platform with three interconnected products:

| Product | Purpose |
|---|---|
| **DPAL Core App** | Public reporting, transparency ledger, private blockchain, help center |
| **DPAL Good Wheels** | Community-first ride-hailing with charity donations (embedded in the app) |
| **DPAL Enterprise HQ** | Internal admin dashboard for oversight, reports, help center management |

---

## 2. Repositories

### 2.1 DPAL Main App (Frontend)
| | |
|---|---|
| **Repo name** | `mother-branch-dpal-system` |
| **Local path** | `C:\dpal-front-end` |
| **GitHub** | *(push remote — check with `git remote -v`)* |
| **Framework** | React 19 + Vite 6 + TypeScript 5.8 |
| **Styling** | Tailwind CSS (CDN) + CSS Modules |
| **State** | Zustand 5 |
| **Router** | React Router DOM 7 |
| **Dev server port** | `http://localhost:3000` |
| **Build command** | `npm run build` |
| **Deploy** | Vercel (auto-deploy from main branch) |

**Key env vars (Vite):**
```
VITE_API_BASE=https://web-production-a27b.up.railway.app
GEMINI_API_KEY=<your-google-ai-key>
```

---

### 2.2 DPAL Enterprise Dashboard
| | |
|---|---|
| **Repo name** | `DPAL-Enterprise-Dash_Board` |
| **Local path** | `C:\DPAL-Enterprise-Dash_Board` |
| **GitHub** | https://github.com/LudwigHurtado/DPAL-Enterprise-Dash_Board |
| **Framework** | Next.js (App Router) + TypeScript |
| **Styling** | Tailwind CSS + Material Design 3 inline tokens |
| **Charts** | Recharts |
| **Dev server port** | `http://localhost:3000` (Next.js default) |
| **Build command** | `npm run build` |
| **Deploy** | Vercel — auto-deploy from main branch |

**Key env vars (Next.js — add to Vercel + `.env.local`):**
```
NEXT_PUBLIC_DPAL_API_BASE=https://web-production-a27b.up.railway.app
NEXT_PUBLIC_DPAL_ADMIN_SECRET=<your-admin-secret>
```

> Copy `.env.local.example` → `.env.local` for local development.

---

### 2.3 DPAL Backend (Express API)
| | |
|---|---|
| **Repo location** | Subfolder of main app: `C:\dpal-front-end\backend` |
| **Package name** | `dpal-backend` |
| **Framework** | Express 4 + TypeScript 5.8 |
| **ORM** | Prisma 5 |
| **Database** | PostgreSQL via Supabase |
| **File storage** | Supabase Storage |
| **Validation** | Zod 3 |
| **Auth** | Supabase Auth + Bearer token for admin routes |
| **Dev server port** | `http://localhost:3001` |
| **Dev command** | `npm run dev` (inside `backend/` folder) |
| **Build command** | `npm run build` |
| **Deploy** | Railway |

**Key env vars (backend `.env` — never commit):**
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]
SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_STORAGE_BUCKET=help-attachments
PORT=3001
NODE_ENV=production
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
ADMIN_SECRET=change-this-in-production
```

> `dpal-enterprise-dashboard.vercel.app` and `dpal-front-end.vercel.app` are  
> **always allowed by built-in CORS** — no need to add them to `CORS_ORIGINS`.

---

## 3. Live URLs

| Service | URL | Notes |
|---|---|---|
| **DPAL App (Production)** | https://dpal-front-end.vercel.app | Vercel — auto-deploys from main |
| **Enterprise Dashboard** | https://dpal-enterprise-dashboard.vercel.app/enterprise | Vercel — auto-deploys from main |
| **Backend API (Railway)** | https://web-production-a27b.up.railway.app | Railway — Express server |
| **Backend Health Check** | https://web-production-a27b.up.railway.app/health | Returns `{ ok: true, service: "dpal-backend" }` |
| **Reports Feed** | https://web-production-a27b.up.railway.app/api/reports/feed | Legacy feed for dashboard |

---

## 4. Cloud Services

### 4.1 Vercel
| | |
|---|---|
| **Dashboard** | https://vercel.com/dashboard |
| **DPAL App project** | Look for `mother-branch-dpal-system` or `dpal-front-end` |
| **Enterprise Dashboard project** | Look for `DPAL-Enterprise-Dash_Board` |
| **What to configure** | Environment Variables → add `NEXT_PUBLIC_DPAL_API_BASE` + `NEXT_PUBLIC_DPAL_ADMIN_SECRET` |

### 4.2 Railway
| | |
|---|---|
| **Dashboard** | https://railway.app/dashboard |
| **Service name** | `dpal-backend` (or `web`) |
| **Live URL** | https://web-production-a27b.up.railway.app |
| **Root directory** | Set to `backend` in Railway service settings |
| **Start command** | `npm run start` (runs `node dist/index.js`) |
| **Build command** | `npm run build` (runs `tsc`) |
| **What to configure** | Add all backend env vars listed in Section 2.3 under the Variables tab |

### 4.3 Supabase
| | |
|---|---|
| **Dashboard** | https://supabase.com/dashboard |
| **Used for** | PostgreSQL database + Auth + File Storage |
| **Database** | PostgreSQL — managed, PgBouncer connection pooling |
| **Storage bucket** | `help-attachments` (for Help Center evidence uploads) |
| **ORM layer** | Prisma 5 — schema at `backend/prisma/schema.prisma` |
| **Connection** | `DATABASE_URL` (pooled) + `DIRECT_URL` (direct, for migrations) |
| **What to configure** | Settings → Database → copy connection strings into Railway env vars |

> **Note:** MongoDB is NOT used in this project. The database is **PostgreSQL via Supabase**.

---

## 5. API Endpoints — Full Reference

### Public Endpoints (no auth required)
```
GET  /health
     → { ok: true, service: "dpal-backend", version, timestamp, env }

POST /api/help-reports
     → Create a new help center report
     Body: { category, title, description, urgency, contact: {...}, location: {...}, tags: [...] }

POST /api/help-reports/:id/attachments
     → Upload evidence files (multipart/form-data)

GET  /api/help-reports/:id
     → Fetch report details (owner or admin only)

GET  /api/help-reports/mine
     → Logged-in user's own reports

GET  /api/reports
     → Legacy: list reports in DB (dashboard compatibility)

GET  /api/reports/feed?limit=25
     → Legacy feed mapped to ReportItem shape (used by Enterprise HQ overview)
```

### Admin Endpoints (require Bearer token = ADMIN_SECRET)
```
GET    /api/admin/help-reports?status=&urgency=&category=&search=&page=&limit=
       → Paginated, filtered list of all reports

GET    /api/admin/help-reports/stats
       → { total, todayCount, byStatus, byUrgency, byCategory }

GET    /api/admin/help-reports/:id
       → Full report detail with notes, history, attachments, assignments

PATCH  /api/admin/help-reports/:id/status
       Body: { status, reason? }

PATCH  /api/admin/help-reports/:id/assign
       Body: { assignedTo, team? }

POST   /api/admin/help-reports/:id/note
       Body: { body, noteType? }
```

---

## 6. Database Schema (Supabase PostgreSQL via Prisma)

```
help_reports              — main report record
help_report_contact       — reporter contact info
help_report_location      — geo/address data
help_report_attachments   — uploaded files (path stored, file in Supabase Storage)
help_report_status_history — every status change with actor + reason
help_report_notes         — internal staff notes
help_report_assignments   — assigned staff/team
ReportCounter             — auto-incrementing HC-YYYY-NNNNNN report numbers
```

**Report status flow:**
```
submitted → under_review → awaiting_contact / awaiting_documents
         → assigned → in_progress → referred_out / resolved / closed
         → rejected / duplicate
```

**Prisma commands (run inside `backend/` folder):**
```bash
npx prisma generate          # regenerate client after schema change
npx prisma migrate dev       # create + apply new migration
npx prisma db push           # push schema without migration history (dev only)
npx prisma studio            # visual DB browser at localhost:5555
```

---

## 7. DPAL Good Wheels — Module Structure

Good Wheels is **embedded inside the DPAL app** as a React sub-application with its own memory router.

**Entry point:** `src/good-wheels/routes/AppRouter.tsx`  
**Styles:** `src/good-wheels/styles/globals.css`

### App Routes
```
/auth/sign-in                — Login (starting screen)
/auth/sign-up                — Registration
/auth/role                   — Choose role: Passenger / Driver / Worker
/auth/onboarding             — Setup wizard

/app/passenger/dashboard     — Passenger home (map + bottom sheet)
/app/passenger/request       — Request a ride
/app/passenger/active        — Live trip tracking
/app/passenger/history       — Past rides
/app/passenger/places        — Saved locations
/app/passenger/charities     — Charity browse
/app/passenger/donations     — Donation history

/app/driver/dashboard        — Driver home
/app/driver/queue            — Incoming ride requests
/app/driver/active           — Active trip controls
/app/driver/history          — Completed trips
/app/driver/vehicle          — Vehicle info + color/type selector
/app/driver/earnings         — Earnings placeholder
/app/driver/comms            — Driver Communication Center (chat + broadcast)

/app/worker/dashboard        — Worker home
/app/worker/tasks            — Task queue
/app/worker/dispatch         — Dispatch coordination
/app/worker/cases/:id        — Support case detail
/app/worker/history          — Completed tasks
/app/worker/impact           — Community impact stats
```

### Key Features
- **Google Maps API** — autocomplete, routes, real-time vehicle animation
- **Bidding system** — passenger sets max price, driver accepts first
- **Vehicle map markers** — SVG markers matching driver's actual vehicle color + type
- **Route-locked animation** — marker follows Google polyline, never jumps off road
- **Charity donations** — 85% driver / 10% charity / 5% infrastructure split
- **Driver Communication Center** — direct chat + broadcast alerts

---

## 8. DPAL Core App — Main Screens

| Screen | `currentView` value | Description |
|---|---|---|
| Main Menu | `home` | Hero video, nav tiles, recent activity |
| Report Submission | `reportSubmission` | Full report builder by category |
| Public Ledger | `transparencyDatabase` | Search reports, blockchain entries |
| Report Complete | `reportComplete` | Certificate + QR + blockchain block info |
| Help Center | `helpCenter` | Ticket submission + status tracking |
| Blockchain Status | *(panel in ledger)* | Chain health, block explorer |

### Report Categories (35+)
Police Misconduct, Environmental Hazard, Workplace Safety, Accidents & Road Hazards, Food Safety, Animal Cruelty, Noise Pollution, Human Rights, Infrastructure Failure, and more.

---

## 9. DPAL Private Blockchain

The DPAL app runs its own **private, SHA-256 linked-block chain** — fully owned by DPAL, no public chain dependency.

| | |
|---|---|
| **Service file** | `services/dpalChainService.ts` |
| **Storage** | `localStorage` (client) + synced to Railway backend |
| **Chain ID** | `DPAL_PRIVATE_CHAIN_v1` |
| **Block structure** | `{ index, timestamp, reportId, dataHash, previousHash, hash, nonce, chain }` |
| **Hash algorithm** | SHA-256 via Web Crypto API |
| **Genesis block** | Block #0 (created automatically on first report) |
| **First real report** | Block #1 |
| **Verification** | `verifyChain()` — recomputes all hashes to check integrity |
| **Backend sync** | Non-blocking POST to `/api/chain/block` (Railway) |
| **Export** | "Export Chain" button → downloads `.json` file |

---

## 10. Development — Local Setup

### Run the DPAL app
```bash
cd C:\dpal-front-end
npm install
npm run dev
# → http://localhost:3000
```

### Run the backend
```bash
cd C:\dpal-front-end\backend
npm install
# copy .env.example → .env and fill in credentials
npm run dev
# → http://localhost:3001
```

### Run the Enterprise Dashboard
```bash
cd C:\DPAL-Enterprise-Dash_Board
npm install
# copy .env.local.example → .env.local and fill in credentials
npm run dev
# → http://localhost:3000 (change Next.js port if conflict: next dev -p 3002)
```

### Run the Prisma DB Studio
```bash
cd C:\dpal-front-end\backend
npx prisma studio
# → http://localhost:5555  (visual table browser)
```

---

## 11. Key Source Files — Quick Reference

### DPAL App (`C:\dpal-front-end`)
```
App.tsx                                  Main router + view manager
components/MainMenu.tsx                  Home screen with hero video
components/Header.tsx                    Top bar + scrollable icon nav
components/ReportCompleteView.tsx        Certificate + PDF + blockchain display
components/CategorySelectionView.tsx     Report category grid
components/HelpCenterView.tsx            Help center UI (ticket submit)
components/BlockchainStatusPanel.tsx     Chain health dashboard
components/DevicePreviewFrame.tsx        Cell-mode preview toggle
services/dpalChainService.ts             DPAL Private Chain engine
services/helpCenterService.ts           Frontend API client for help reports
services/vehicleMapMarker.ts            Dynamic SVG vehicle map markers
categoryCardAssets.ts                   Category → image mapping

src/good-wheels/
  routes/AppRouter.tsx                   Good Wheels router (memory-based)
  routes/paths.ts                        All GW route constants
  pages/passenger/PassengerRideHomePage  Map + bottom sheet + bidding
  pages/auth/RoleSelectPage.tsx          Role selection with images
  pages/driver/DriverDashboardPage.tsx   Driver home
  pages/dispatcher/DriverCommsPage.tsx   Chat + broadcast center
  features/trips/                        Shared trip workflow layer
  features/driver/                       Driver state + components
  features/charity/                      Charity selector + donation panel
  styles/globals.css                     All Good Wheels CSS
```

### Backend (`C:\dpal-front-end\backend`)
```
src/index.ts                             Express app entry + CORS + routes
src/routes/helpReports.ts               Public help report endpoints
src/routes/admin.ts                     Admin-only endpoints
src/lib/prisma.ts                       Prisma client singleton
src/lib/supabase.ts                     Supabase client + file upload
src/lib/reportNumber.ts                 HC-YYYY-NNNNNN generator
src/lib/duplicateDetector.ts            Duplicate report detection
src/schemas/helpReport.ts               Zod schemas for all payloads
src/middleware/auth.ts                  requireAdmin middleware
src/middleware/validate.ts             validateBody / validateQuery
prisma/schema.prisma                    Full DB schema
.env.example                            Template for all env vars
```

### Enterprise Dashboard (`C:\DPAL-Enterprise-Dash_Board`)
```
pages/MasterEnterpriseDashboard.tsx     Main M3 dashboard shell
pages/HelpCenterAdminTab.tsx            Help reports admin table + detail
src/lib/apiBase.ts                      Shared URL resolver (localStorage → env)
src/lib/dpal-api.ts                     Health, probes, reports feed client
src/lib/help-center-api.ts             Admin help-report API client
.env.local.example                      Template for all env vars
```

---

## 12. Deployment Checklist

### When deploying a new backend build to Railway:
- [ ] Ensure `DATABASE_URL` and `DIRECT_URL` are set in Railway Variables
- [ ] Ensure `ADMIN_SECRET` matches what's in the Enterprise Dashboard
- [ ] Ensure `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set
- [ ] Run `npx prisma migrate deploy` (or `db push`) before starting
- [ ] Test `/health` endpoint returns `{ ok: true }`
- [ ] Test `/api/reports/feed` returns `{ ok: true, items: [] }` or actual data

### When deploying Enterprise Dashboard to Vercel:
- [ ] Set `NEXT_PUBLIC_DPAL_API_BASE` = Railway URL (no trailing slash)
- [ ] Set `NEXT_PUBLIC_DPAL_ADMIN_SECRET` = same as backend `ADMIN_SECRET`
- [ ] Verify dashboard connects by clicking Settings → Connect API

### When deploying DPAL App to Vercel:
- [ ] Set `VITE_API_BASE` = Railway URL
- [ ] Set `GEMINI_API_KEY` = Google AI Studio key (for AI features)
- [ ] Test report submission creates a blockchain block
- [ ] Test PDF certificate prints correctly (no nav bar showing)

---

## 13. Team & Ownership

| Area | Owner |
|---|---|
| Overall platform, product decisions | Ludwig Hurtado (CEO) |
| DPAL App shell + routing | App shell dev |
| Good Wheels — Passenger | Passenger dev |
| Good Wheels — Driver | Driver dev |
| Good Wheels — Worker | Worker dev |
| Trip workflow engine | Ride logic dev |
| Map & location | Map engineer |
| Backend API + DB | Integration/API dev |
| Enterprise Dashboard | Dashboard dev |
| Blockchain service | Infrastructure dev |

---

## 14. Important Notes

1. **No MongoDB.** All structured data is in **Supabase PostgreSQL** via Prisma.
2. **No public blockchain.** DPAL uses its own **private SHA-256 chain** stored in `localStorage` and synced to Railway.
3. **Good Wheels is embedded** inside the main DPAL app — it is NOT a separate deployed app yet. The memory router means it can be extracted later as a standalone app without changes.
4. **Two frontends, one backend.** The DPAL App and the Enterprise Dashboard both talk to the same Railway backend API.
5. **Admin secret** is a simple Bearer token for now. Replace with Supabase Auth roles in production.
6. **CORS** — `dpal-enterprise-dashboard.vercel.app` and `dpal-front-end.vercel.app` are hardcoded as always-allowed origins in `backend/src/index.ts`.
7. **Video assets** stored in `/public/` of the DPAL App:
   - `/dpal-hero.mp4` — main screen hero video
   - `/dpal-ledger-hero.mp4` — ledger/library page video
   - `/dpal-share-1.mp4`, `/dpal-share-2.mp4` — held for future use
