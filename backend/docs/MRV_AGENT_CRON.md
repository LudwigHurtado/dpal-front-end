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

## Environment

Same database as the main DPAL Prisma backend:

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes |
| `DIRECT_URL` | Yes (Supabase) |
| `COPERNICUS_CLIENT_ID` / `COPERNICUS_CLIENT_SECRET` | Optional — satellite agent reports configured vs skipped |
| `EARTH_OBSERVATION_LIVE_ENABLED` | Optional — `true` enables EO live hint |

## Flow

1. Cron loads all `MrvAgentSchedule` rows with `enabled: true`.
2. For each schedule, `runMrvSuperAgentMission` runs project → AOI → satellite → evidence → calculation → risk → report → notification agents.
3. Per-project failures are logged; other projects still run.
4. Exit `0` when the runner finishes; exit `1` only on fatal boot errors (e.g. missing `DATABASE_URL`).

## API (main backend)

| Method | Path |
|--------|------|
| `POST` | `/api/mrv/projects/:projectId/agent/run-now` |
| `GET` | `/api/mrv/projects/:projectId/agent/latest-report` |
| `GET` | `/api/mrv/projects/:projectId/agent/runs` |
| `GET` | `/api/mrv/projects/:projectId/notifications` |
| `PUT` | `/api/mrv/projects/:projectId/agent/project-config` — sync Field OS snapshot for cron |

## Safety

- Agents do not invent satellite, carbon, or verification outcomes.
- Notifications are created only for warnings, critical findings, readiness shifts, evidence gaps, integrity issues, or validator review needs — not for quiet successful runs.
- Blockchain anchoring and final packets still require explicit user confirmation in the UI.

## Database migration

From `backend/`:

```bash
npx prisma db push
# or
npx prisma migrate dev --name mrv_super_agent
```
