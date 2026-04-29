# DPAL Good Wheels

Good Wheels is an embedded ride-hailing surface in this repo (`/good-wheels`) with passenger and driver workflows.

## Runtime API contract (`/api/good-wheels/*`)

Served by this repo backend route:

- `backend/src/routes/goodWheels.ts`
- mounted in `backend/src/index.ts` via `app.use('/api/good-wheels', goodWheelsRouter)`

Auth:

- `POST /api/good-wheels/auth/signin` (canonical)
- `POST /api/good-wheels/auth/sign-in` (compatibility alias)
- `POST /api/good-wheels/auth/switch-role`
- `POST /api/good-wheels/auth/signout`

Trips:

- `GET /api/good-wheels/trips/active?userId=...`
- `GET /api/good-wheels/trips/history?userId=...`
- `POST /api/good-wheels/trips/request`
- `POST /api/good-wheels/trips/:tripId/accept`
- `PATCH /api/good-wheels/trips/:tripId/status`
- `POST /api/good-wheels/trips/:tripId/cancel`
- `POST /api/good-wheels/trips/:tripId/complete`
- `GET /api/good-wheels/driver/queue`
- `GET /api/good-wheels/driver/profile`
- `GET /api/good-wheels/driver/history`
- `PATCH /api/good-wheels/driver/availability`
- `GET /api/good-wheels/driver/vehicle`
- `GET /api/good-wheels/driver/performance`

Broadcasts + chat:

- `GET /api/good-wheels/health`
- `GET/POST /api/good-wheels/broadcasts`
- `POST /api/good-wheels/broadcasts/:broadcastId/ack`
- `GET/POST /api/good-wheels/chat/:threadId/messages`

## Lifecycle statuses

Primary statuses used by current lifecycle wiring:

- `requested`
- `broadcasted`
- `matched`
- `accepted`
- `driver_en_route`
- `driver_arrived`
- `passenger_onboard`
- `in_progress`
- `completed`
- `cancelled`

Legacy statuses are still tolerated for compatibility (`driver_assigned`, `driver_arriving`, `arrived`, `canceled`).

## Publish warning (important)

Good Wheels is server-backed through the dpal-front-end backend. If the route currently uses runtime file-backed or in-memory storage, it is suitable for integration testing but should be connected to durable database persistence before full public launch.

Current persistence in this repo backend is file-backed runtime storage under `backend/data/good-wheels/*` (not durable database persistence).

Deployment alignment status:

- Active backend architecture: this repo backend under `backend/`.
- Local known-good host: `http://localhost:3001`.
- For public launch, deploy this backend and point `VITE_API_BASE` to that deployed backend URL.

## Manual smoke checklist (final)

1. Set:
   - `VITE_API_BASE=<Railway URL>`
   - `VITE_GW_DEMO_MODE=false`
   - `VITE_DEMO_MODE=false`
2. Passenger:
   - sign in
   - request ride
   - see active trip
3. Driver:
   - sign in / switch to driver
   - see queue/broadcast
   - listen to broadcast
   - acknowledge broadcast
   - accept ride
   - update status to arrived
   - start ride
   - complete ride
4. Passenger:
   - sees accepted trip
   - sees status changes
   - sends chat
   - receives driver chat
   - sees completion
5. Driver:
   - sends chat
   - receives passenger chat
   - sees completed trip move out of active queue

## API smoke checks

- `GET {VITE_API_BASE}/api/good-wheels/health`
- `POST {VITE_API_BASE}/api/good-wheels/auth/signin`
- `POST {VITE_API_BASE}/api/good-wheels/trips/request`
- `GET {VITE_API_BASE}/api/good-wheels/driver/queue`
- `POST {VITE_API_BASE}/api/good-wheels/trips/:tripId/accept`
- `PATCH {VITE_API_BASE}/api/good-wheels/trips/:tripId/status`
- `GET/POST {VITE_API_BASE}/api/good-wheels/chat/:threadId/messages`
- `GET/POST {VITE_API_BASE}/api/good-wheels/broadcasts`

## Key files

- `src/good-wheels/routes/AppRouter.tsx`
- `src/good-wheels/pages/passenger/*`
- `src/good-wheels/pages/driver/*`
- `src/good-wheels/pages/dispatcher/DriverCommsPage.tsx`
- `src/good-wheels/features/trips/*`
- `src/good-wheels/features/driver/*`
- `src/good-wheels/services/goodWheelsCommsService.ts`
- `backend/src/routes/goodWheels.ts`
