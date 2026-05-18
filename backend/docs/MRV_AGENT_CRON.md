# MRV Super Agent — Railway cron worker

Scheduled MRV readiness checks run on the **backend** (`backend/`), not in the browser. Use a separate Railway service so cron does not block the main API process.

## Service name

**`dpal-mrv-agent-cron`**

## Command

```bash
npm run agent:mrv-cron
```

Compiled alternative (after `npm run build`):

```bash
npm run agent:mrv-cron:dist
```

## Cron schedule (UTC)

Railway evaluates cron in **UTC**. For daily **08:00 Bolivia** (`America/La_Paz`, UTC−4):

```text
0 12 * * *
```

## Deployment checklist

From the repo `backend/` directory:

1. `npx prisma db push` (or `npx prisma migrate dev`) — creates `mrv_*` tables
2. `npx prisma generate`
3. `npm run build` — must pass with zero TypeScript errors
4. **API service:** confirm `DATABASE_URL` and `DIRECT_URL` (Supabase)
5. **Cron service:** same `DATABASE_URL` / `DIRECT_URL` as the API
6. **Frontend (Vercel):** `VITE_API_BASE` → deployed Prisma backend origin (not Mongo filing API unless ported)
7. **Railway cron service:** root directory `backend/`, start command `npm run agent:mrv-cron`, schedule `0 12 * * *`
8. Smoke-test routes below against a real `projectId`

## Environment

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes |
| `DIRECT_URL` | Yes (Supabase) |
| `COPERNICUS_CLIENT_ID` / `COPERNICUS_CLIENT_SECRET` | Optional — satellite agent reports configured vs skipped |
| `EARTH_OBSERVATION_LIVE_ENABLED` | Optional — `true` enables EO live hint |

## Route mount (main API)

In `backend/src/index.ts`:

```typescript
app.use('/api/mrv/projects', mrvProjectRouter);
app.use('/api/mrv/projects/:projectId/agent', mrvAgentRouter);
```

## API smoke tests (curl)

Replace `API_BASE` and `PROJECT_ID`:

```bash
set API_BASE=https://your-backend.up.railway.app
set PROJECT_ID=dmrv-carbon-land-forest-land-use
```

**Latest report + last run**

```bash
curl.exe -s "%API_BASE%/api/mrv/projects/%PROJECT_ID%/agent/latest-report"
```

**Schedule (auto-creates default if missing)**

```bash
curl.exe -s "%API_BASE%/api/mrv/projects/%PROJECT_ID%/agent/schedule"
```

**Manual Super Agent run**

```bash
curl.exe -s -X POST "%API_BASE%/api/mrv/projects/%PROJECT_ID%/agent/run-now" ^
  -H "Content-Type: application/json" ^
  -d "{}"
```

With project snapshot (recommended after Field OS save):

```bash
curl.exe -s -X POST "%API_BASE%/api/mrv/projects/%PROJECT_ID%/agent/run-now" ^
  -H "Content-Type: application/json" ^
  -d "{\"configJson\":{\"projectId\":\"%PROJECT_ID%\",\"projectName\":\"Smoke test\"}}"
```

**Run history**

```bash
curl.exe -s "%API_BASE%/api/mrv/projects/%PROJECT_ID%/agent/runs?limit=10"
```

**Notifications**

```bash
curl.exe -s "%API_BASE%/api/mrv/projects/%PROJECT_ID%/notifications"
```

**Sync project config (Field OS → server for cron)**

```bash
curl.exe -s -X PUT "%API_BASE%/api/mrv/projects/%PROJECT_ID%/agent/project-config" ^
  -H "Content-Type: application/json" ^
  -d "{\"configJson\":{\"projectId\":\"%PROJECT_ID%\",\"projectName\":\"Field OS sync\"}}"
```

Expected: HTTP 200 with `"ok": true`. HTTP 404 on agent paths → route not mounted or wrong `VITE_API_BASE`. HTTP 500 → check Railway logs and Prisma migration.

## Flow

1. Cron loads all `MrvAgentSchedule` rows with `enabled: true`.
2. For each schedule, `runMrvSuperAgentMission` runs project → AOI → satellite → evidence → calculation → risk → report → notification agents.
3. Per-project failures are logged; other projects still run.
4. Exit `0` when the runner finishes; exit `1` only on fatal boot errors (e.g. missing `DATABASE_URL`).

## API reference

| Method | Path |
|--------|------|
| `GET` | `/api/mrv/projects/:projectId/agent/schedule` |
| `PUT` | `/api/mrv/projects/:projectId/agent/schedule` |
| `PUT` | `/api/mrv/projects/:projectId/agent/project-config` |
| `POST` | `/api/mrv/projects/:projectId/agent/run-now` |
| `GET` | `/api/mrv/projects/:projectId/agent/latest-report` |
| `GET` | `/api/mrv/projects/:projectId/agent/runs` |
| `GET` | `/api/mrv/projects/:projectId/notifications` |

## Safety

- Agents do not invent satellite, carbon, or verification outcomes.
- Notifications are created only for warnings, critical findings, readiness shifts, evidence gaps, integrity issues, or validator review needs — not for quiet successful runs.
- Blockchain anchoring and final packets still require explicit user confirmation in the UI.

## Database migration

```bash
cd backend
npx prisma db push
# or
npx prisma migrate dev --name mrv_super_agent
```
