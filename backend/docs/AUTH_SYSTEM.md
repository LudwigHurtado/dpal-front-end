# DPAL authentication (local backend)

End-to-end identity lives in **PostgreSQL** via Prisma models `DpalUser` and `RefreshToken`, with **bcrypt** password hashes and **JWT** access tokens plus opaque refresh tokens (hashed at rest).

## Flow

1. **Register** `POST /api/auth/register` — validates uniqueness of `username` / `email`, hashes password, applies `starterDefaults` + `defaultProfileMetadata()`, returns `{ user, accessToken, refreshToken }`.
2. **Login** `POST /api/auth/login` — accepts `identifier` (email or username) + `password`; updates `lastLoginAt`, presence online.
3. **Refresh** `POST /api/auth/refresh` — rotates refresh token row; returns new access + refresh.
4. **Logout** `POST /api/auth/logout` — revokes refresh token hash if provided; marks user offline when access token parses.
5. **Me** `GET /api/auth/me` — Bearer access JWT.
6. **Presence** `POST /api/auth/presence` — `{ onlineStatus }`; client sends heartbeat every ~45s (`AuthContext`).
7. **Profile** `PATCH /api/auth/me` — display name, phone, location, profile image URL.
8. **Change password** `POST /api/auth/change-password` — revokes all refresh tokens.

## Admin

- `GET /api/admin/users` — list/search DPAL users (`attachDpalJwtUser` + `ADMIN_SECRET` **or** JWT user with `role: admin`).
- `PATCH /api/admin/users/:id` — `role`, `accountStatus`.

## Configuration

See `src/config/starterDefaults.ts` and `.env.example` (`JWT_SECRET`, optional `DPAL_STARTER_*`).

## Migrations

After pulling schema changes:

```bash
cd backend && npx prisma migrate dev --name add_dpal_users
```

## Production (Railway / `dpal-ai-server`)

This repo’s `backend/` folder is the **reference implementation** for the same API contract (`/api/auth/*`). Deploy these routes on your Node host with `JWT_SECRET`, `DATABASE_URL`, and CORS origins configured; the Vite app uses `VITE_API_BASE` to reach that host.
