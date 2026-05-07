# DPAL FloodGuard — Developer Onboarding Guide

> **Audience.** Engineers who will continue development on FloodGuard.
> **Goal.** Give you everything you need in one read so you can work
> confidently without breaking what's already shipped.

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*

For the operator-facing walkthrough, see
[`FLOODGUARD_USER_MANUAL.md`](./FLOODGUARD_USER_MANUAL.md).
For deeper architecture diagrams, see
[`FLOODGUARD_ARCHITECTURE.md`](./FLOODGUARD_ARCHITECTURE.md).
For the latest production smoke results, see
[`FLOODGUARD_PRODUCTION_STATUS.md`](./FLOODGUARD_PRODUCTION_STATUS.md).

---

## Table of contents

1. What FloodGuard is and isn't
2. How the project is laid out
3. The 12-stage build history (what is in the codebase, and why)
4. Backend file map
5. Frontend file map
6. The pipeline at a glance
7. Routes and contracts
8. Persistence model + store versioning
9. Adapters and live-data flags
10. Safety gates that must never be removed
11. Privacy contract on the public verification page
12. How to run locally
13. How to extend FloodGuard
14. Coding conventions used in this module
15. Testing the workflow end-to-end
16. Common pitfalls
17. Pointers for the next stages

---

## 1. What FloodGuard is and isn't

**Is.** A civic flood-intelligence module: per-Geo-ID-zone monitoring that
combines remote sensing (rainfall, satellite NDWI/water expansion, water-level
gauges) with agentic evaluation, safe mission dispatch, evidence packets,
dry-run alert routing, local DPAL ledger anchoring, and a public-safe
verification page.

**Is not.** An emergency-broadcast system. FloodGuard never sends real SMS,
email, or push by default. Every record carries the disclaimer:

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*

If you're tempted to wire real outbound notifications, **don't, until the
project explicitly approves it** and a separate review of legal,
language, and audience controls is done.

---

## 2. How the project is laid out

This repo (`dpal-front-end`) is a React + Vite SPA at the root, with an
Express + Prisma service at `backend/`. FloodGuard lives across both:

```
dpal-front-end/
├── App.tsx                                      # main view router (SPA)
├── AppBootstrap.tsx                             # mounts /floodguard/verify/:id
├── utils/appRoutes.ts                           # /floodguard view path
├── components/MainMenu.tsx                      # FloodGuard tile
├── constants.ts                                 # FLOODGUARD_* API_ROUTES
├── src/features/floodGuard/                     # Frontend module (UI)
│   ├── FloodGuardPage.tsx                       # Entry from App.tsx
│   ├── floodGuardTypes.ts                       # FE types (mirrors backend)
│   ├── components/
│   │   ├── FloodGuardDashboard.tsx              # tabs, state, plumbing
│   │   ├── FloodGuardStartPanel.tsx             # Stage 12J onboarding panel
│   │   ├── FloodAgentMonitorPanel.tsx           # Stage 12C/D
│   │   ├── FloodAlertRoutingPanel.tsx           # Stage 12G
│   │   ├── FloodEvidencePacketView.tsx          # Stage 12H ledger block
│   │   ├── FloodLedgerVerificationPage.tsx      # Stage 12I public page
│   │   ├── CityFloodMapView.tsx
│   │   ├── FloodAlertFeed.tsx
│   │   ├── FloodAlertSettingsPanel.tsx
│   │   ├── FloodCameraMonitorPanel.tsx
│   │   ├── FloodHistoricalAnalyticsPanel.tsx
│   │   ├── FloodRiskScoreCard.tsx
│   │   ├── FloodSituationRoomView.tsx
│   │   ├── FloodValidatorWorkflowPanel.tsx
│   │   ├── FloodZoneDetailPanel.tsx
│   │   ├── PublicFloodMapView.tsx
│   │   └── floodGuardUi.ts                      # shared UI helpers/colors
│   ├── mockData/santaCruzFloodData.ts           # Seed alerts/cameras/etc.
│   └── services/
│       ├── floodGuardApi.ts                     # FE API client
│       ├── floodAlertRouter.ts                  # local routing helper
│       ├── floodEvidenceService.ts              # local packet builder (FE)
│       └── floodRiskEngine.ts                   # mirrors backend risk math
└── backend/
    └── src/
        ├── routes/floodGuardRoutes.ts            # Express routes
        └── services/floodGuard/
            ├── floodGuardTypes.ts                # Backend types (source of truth)
            ├── floodGuardStore.ts                # In-memory + JSON persistence
            ├── floodGuardZones.ts (via floodCityZoneService.ts)
            ├── floodCityZoneService.ts           # Cities, zones, polygons
            ├── floodRiskEngine.ts                # Composite risk score
            ├── floodEvidencePacketService.ts     # SHA-256 packet builder
            ├── floodLedgerService.ts             # Ledger digests + anchor
            ├── floodMissionBridgeService.ts      # Stage 12F bridge
            ├── floodAlertRoutingService.ts       # Stage 12G dry run
            ├── floodRainfallAdapter.ts           # Stage 12A
            ├── floodSatelliteAdapter.ts          # Stage 12B
            ├── floodWaterLevelAdapter.ts         # Stage 12E
            └── agents/
                ├── floodAgentConstants.ts
                ├── floodAgentOrchestrator.ts
                ├── floodAnomalyAgent.ts
                ├── floodEvidenceAgent.ts
                ├── floodMissionDispatchAgent.ts
                ├── floodMissionSafetyAgent.ts
                ├── floodRainfallWatchAgent.ts
                ├── floodSatelliteWatchAgent.ts
                ├── floodSituationRoomAgent.ts
                └── floodWaterLevelWatchAgent.ts
```

---

## 3. The 12-stage build history

| Stage | What it added |
|-------|---------------|
| 11 | Backend API skeleton, cities/zones, basic alert lifecycle, evidence packet hashing. |
| 12A | Live rainfall adapter (`floodRainfallAdapter.ts`) with synthetic fallback. |
| 12B | AquaScan satellite water adapter (`floodSatelliteAdapter.ts`). |
| 12C | 8-agent agentic monitor + safe mission dispatch + safety gate. |
| 12D | Agent Monitor UI (`FloodAgentMonitorPanel.tsx`) and FE API client. |
| 12E | Water-level / gauge adapter (`floodWaterLevelAdapter.ts`) + agent + risk score updates. |
| 12F | DPAL mission bridge (`floodMissionBridgeService.ts`) + `/missions` endpoints. |
| 12G | Alert routing preview / dry run (`floodAlertRoutingService.ts`) + `/route-preview`. |
| 12H | Ledger anchoring upgrade — composite `anchoringHash`, persistent `FloodLedgerRecord`. |
| 12I | Public verification page `/floodguard/verify/:ledgerRecordId` + `/public/ledger/:id`. |
| 12J | First-run operator onboarding panel + checklist + helper text. |

**Read commit messages with `feat(floodguard):` prefix** for a precise log of
each stage. Branch: `main`. Last commit at the time of writing: `3f312b8`.

---

## 4. Backend file map (cheat sheet)

| File | Purpose | Stages touched |
|------|---------|----------------|
| `floodGuardTypes.ts` | All shared backend types — **source of truth**. | 11, 12C, 12E–12I |
| `floodGuardStore.ts` | In-memory state, JSON persistence, all mutating methods. | every stage |
| `floodCityZoneService.ts` | Static cities, zones, polygons, geohashes. | 11 |
| `floodRiskEngine.ts` | Composite risk score (rainfall + visual + gauge + satellite + citizen + history + exposure + water level). | 11, 12B, 12E |
| `floodEvidencePacketService.ts` | Builds `FloodEvidencePacket` and its SHA-256 content hash. Folds in agent + mission + routing digests. | 11, 12C, 12F, 12G, 12H |
| `floodLedgerService.ts` | Provenance digests + composite `anchoringHash` + `FloodLedgerRecord`. Mock chain by default. | 12H |
| `floodMissionBridgeService.ts` | Maps FloodGuard mission types to `DpalSafeMissionCategory`; allowed proof types. | 12F |
| `floodAlertRoutingService.ts` | Dry-run routing decisions + audience/channel gating + digest. | 12G |
| `floodRainfallAdapter.ts` | Live rainfall via Open-Meteo (configurable) or synthetic fallback. | 12A |
| `floodSatelliteAdapter.ts` | AquaScan satellite signals via Sentinel Hub or synthetic fallback. | 12B |
| `floodWaterLevelAdapter.ts` | Water-level / gauge readings; deterministic synthetic fallback. | 12E |
| `agents/*` | Eight specialist agents + orchestrator. | 12C, 12E |
| `routes/floodGuardRoutes.ts` | Express routes mounted at `/api/floodguard`. | every stage |

**Three rules when editing the backend:**

1. **Types in `floodGuardTypes.ts` are the contract.** Changing them changes
   the FE contract. Mirror the change to `src/features/floodGuard/floodGuardTypes.ts`.
2. **Mutating methods on `FloodGuardStore` always end with `this.persist();`**
   (existing methods do this — keep the pattern).
3. **`PersistedShape.version` must increase whenever the store schema changes.**
   See §8.

---

## 5. Frontend file map (cheat sheet)

| File | Purpose |
|------|---------|
| `FloodGuardPage.tsx` | Page wrapper mounted from `App.tsx` when `currentView === 'floodGuard'`. |
| `FloodGuardDashboard.tsx` | Tabs, all state, all plumbing. **All cross-tab work happens here.** |
| `FloodGuardStartPanel.tsx` | Stage 12J project card + workflow checklist + helpers. |
| `FloodAgentMonitorPanel.tsx` | Stage 12C/D agent monitor with dispatch + DPAL bridge listing. |
| `FloodAlertRoutingPanel.tsx` | Stage 12G dry-run preview UI. |
| `FloodEvidencePacketView.tsx` | Stage 12H ledger record block, copy controls, "Open verification page". |
| `FloodLedgerVerificationPage.tsx` | Stage 12I public page mounted at `/floodguard/verify/:ledgerRecordId`. |
| `CityFloodMapView.tsx` | Leaflet map for the City Flood Map tab. |
| `FloodAlertFeed.tsx` | Live alerts list. |
| `FloodAlertSettingsPanel.tsx` | Thresholds, escalation rules. The routing preview lives in this tab. |
| `FloodCameraMonitorPanel.tsx` | Live Detection (camera intake + demo test detection). |
| `FloodHistoricalAnalyticsPanel.tsx` | Historical tab. |
| `FloodValidatorWorkflowPanel.tsx` | Validator decisions for an alert. |
| `FloodZoneDetailPanel.tsx` | Selected-zone metadata + signals + history. |
| `FloodSituationRoomView.tsx` | Coordination thread (private; never on public page). |
| `PublicFloodMapView.tsx` | Public Flood Map. |
| `floodGuardUi.ts` | Shared color tokens, time formatting, alert level chips. |
| `services/floodGuardApi.ts` | All FE → BE calls. **Always returns a typed `safeFetch` result** so the UI can fall back. |
| `services/floodRiskEngine.ts` | Frontend mirror of the risk engine for offline / mock mode. |

**Two rules when editing the frontend:**

1. **Never rely on the backend being available.** `safeFetch` returns
   `{ ok: false, ... }` when the backend is missing. Every panel handles
   that case explicitly. Keep that pattern.
2. **Type changes must mirror `backend/src/services/floodGuard/floodGuardTypes.ts`.**
   We don't share types via a package; we copy them.

---

## 6. The pipeline at a glance

```
Remote sensing (rainfall + satellite + water-level)
  → composite risk score (floodRiskEngine.ts)
    → agentic evaluation (8 agents in agents/*)
      → mission safety classification + safe-mission dispatch
        → DPAL mission bridge (Stage 12F)
          → routing preview / dry run (Stage 12G)
            → evidence packet (SHA-256 + provenance digests)
              → DPAL ledger anchor (Stage 12H, composite anchoringHash)
                → public verification page (Stage 12I)
```

Each output of every step contributes a **digest** that ends up bound to
the final `anchoringHash`. That's the accountability spine of FloodGuard:
nothing in the public verification page can be changed without the
content hash and the anchoring hash diverging.

See [`FLOODGUARD_ARCHITECTURE.md`](./FLOODGUARD_ARCHITECTURE.md) for a
diagram + each digest's exact recipe.

---

## 7. Routes and contracts

All backend routes are mounted at `/api/floodguard`. The complete list:

| Method | Path | Stage | Purpose |
|--------|------|-------|---------|
| GET | `/cities` | 11 | List FloodGuard cities. |
| GET | `/cities/:cityId/zones` | 11 | Geo-ID zones for a city. |
| GET | `/zones/:zoneId/status` | 11 | Snapshot for a single zone. |
| GET | `/alerts/live` | 11 | Live alerts + integrations. |
| GET | `/alerts/:alertId` | 11 | One alert. |
| POST | `/camera-alert` | 11 | Submit a camera detection. |
| POST | `/citizen-report` | 11 | Submit a citizen report. |
| POST | `/generate-evidence-packet` | 11+12C/F/G/H | Build/refresh the evidence packet for an alert. |
| POST | `/anchor-alert` | 11→12H | Upgrade: now returns full `FloodLedgerRecord`. |
| GET | `/ledger/:ledgerRecordId` | 12H | Internal ledger record by id. |
| GET | `/alerts/:alertId/ledger` | 12H | All ledger records for an alert (newest first). |
| GET | `/public/ledger/:ledgerRecordId` | 12I | Public-safe verification view. |
| GET | `/agents/monitor` | 12C | Full agentic evaluation. |
| POST | `/agents/dispatch-mission` | 12C | Dispatch a safe mission with server-side gate. |
| GET | `/missions` | 12F | DPAL bridge missions. |
| GET | `/missions/:missionId` | 12F | One mission. |
| POST | `/alerts/:alertId/route-preview` | 12G | Dry-run routing preview. |
| GET | `/alerts/:alertId/routing` | 12G | Preview history. |

The frontend wraps these in `services/floodGuardApi.ts`. **Add new
endpoints in both places** and remember to bump `FLOODGUARD_ROUTES`.

---

## 8. Persistence model + store versioning

`backend/src/services/floodGuard/floodGuardStore.ts` defines `PersistedShape`
and writes JSON to `backend/data/floodguard/store.json`.

Versions so far:

| `PersistedShape.version` | Added |
|--------------------------|-------|
| 1 | Stage 11 baseline. |
| 2 | Stage 12C — `dispatchedMissions` array. |
| 3 | Stage 12F — `dpalMissions` array. |
| 4 | Stage 12G — `routingByAlert` map. |
| 5 | Stage 12H — `ledgerRecords` map + `ledgerByAlert` index. |

When you change the schema:

1. Bump the union in `PersistedShape.version`.
2. Update `emptyPersisted()` to include the new field.
3. Update the migration branch in `loadOrSeed()` so older versions still
   load. Keep the migration backward-compatible — never drop fields from
   older versions.
4. Default any new fields to safe values when loading older stores.

**Hosting note.** Railway's default container filesystem is ephemeral.
For durable persistence on production, attach a Railway Volume to the
container at the directory containing `store.json`, or migrate to a
database. The current store does its writes through `persist()` which
swallows errors — so a broken filesystem will not crash the server, but
records will be lost on restart.

---

## 9. Adapters and live-data flags

All three remote-sensing adapters share the same shape:

- read env flags up front,
- if disabled or credentials missing, return deterministic synthetic data,
- if enabled, attempt a live call with a short timeout, on any error fall
  back to synthetic.

| Adapter | Env flag | Provider env |
|---------|----------|--------------|
| Rainfall | `FLOODGUARD_LIVE_RAINFALL_ENABLED` | `FLOODGUARD_RAINFALL_PROVIDER=open-meteo` |
| Satellite | `FLOODGUARD_LIVE_SATELLITE_ENABLED` | `COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`, `COPERNICUS_BASE_URL` |
| Water level | `FLOODGUARD_LIVE_WATER_LEVEL_ENABLED` | `FLOODGUARD_WATER_LEVEL_PROVIDER=synthetic` (live providers TBD) |

Every adapter response carries provenance metadata
(`provider`, `providerLabel`, `status`, `isLive`, `fetchedAt`,
`message`, `attribution`). That metadata is what feeds the SHA-256
provenance digests on the evidence packet and ledger record. **Do not
strip provenance fields when adding a new provider.**

---

## 10. Safety gates that must never be removed

These are non-negotiable. Even when refactoring, keep them:

1. **Server-side mission safety gate** — `floodMissionSafetyAgent.ts` and the
   `dispatchMission` method in the store. The client cannot bypass classification.
2. **Forbidden mission actions** — `floodMissionBridgeService.ts`
   (entering flood water, driving through flooded roads, etc.). The
   server rejects these regardless of UI.
3. **Routing preview is dry-run only** — `floodAlertRoutingService.ts`
   never calls real outbound channels. Channels named `*_preview` are
   labeled as such in the UI.
4. **Mock-ledger labeling** — `floodLedgerService.ts` keeps the
   `dpal_local_mock` provider as the default. The UI must show
   *"Local DPAL mock ledger record — not a public blockchain transaction."*
   on every ledger record block.
5. **Legal disclaimer on every product surface** —
   *"DPAL FloodGuard provides verified civic flood intelligence and does not
   replace official government emergency alerts."*
   Searchable everywhere; do not delete it.

---

## 11. Privacy contract on the public verification page

`store.toPublicLedgerRecord(record)` builds the public-safe view and is the
single point of trust for the public endpoint. It deliberately **excludes**:

- private citizen reports,
- private contact info,
- internal Situation Room messages,
- preview message bodies for outbound channels,
- operator-only notes.

It includes only:

- ids (`ledgerRecordId`, `alertId`, `evidencePacketId`),
- zone + city ids and human-readable names,
- `contentHash`, `anchoringHash`,
- provenance digests (rainfall / satellite / water-level / agent findings / routing preview),
- linked DPAL mission ids,
- mock/live status, chain provider label, anchor status,
- `qrPayload`,
- `publicSummary`, `verificationStatus`, `privacyNotice`,
- `legalDisclaimer`.

When you add new data to the ledger record, **decide explicitly whether
it belongs on the public page**, then mirror that decision in
`toPublicLedgerRecord`. Default to excluding.

---

## 12. How to run locally

### One-time

```bash
cd dpal-front-end
npm install
cd backend
npm install
```

### Each session

Two terminals:

```bash
# Terminal 1 (backend)
cd backend
npm run dev

# Terminal 2 (frontend, from repo root)
npm run dev
```

Backend listens on **port 3001**. Frontend (Vite) on **port 3000** (read
the URL Vite prints — it may pick another free port). Open
`http://localhost:3000/floodguard`.

### Smoke checks

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/floodguard/cities
curl http://localhost:3001/api/floodguard/agents/monitor
```

### Production smoke checks

See [`FLOODGUARD_PRODUCTION_STATUS.md`](./FLOODGUARD_PRODUCTION_STATUS.md)
for the canonical curl recipes against Railway and Vercel, and the latest
known-issue triage.

---

## 13. How to extend FloodGuard

A short recipe-book of the most common extensions:

### Add a new city

1. Append a `FloodCity` entry in `floodCityZoneService.ts`.
2. Add zones in `ZONES_BY_CITY` with polygons and geohashes.
3. Add seed weather entries in `INITIAL_WEATHER` if you want non-zero
   defaults before the first adapter pull.
4. The frontend mock data (`mockData/santaCruzFloodData.ts`) is
   Santa-Cruz-specific. If you want fallback mock alerts for the new
   city, add a parallel mock module and wire it from
   `FloodGuardDashboard.tsx`'s fallback branch.

### Add a new agent

1. Create `agents/floodMyAgent.ts` exporting a function
   `evaluateMyAgent(input): FloodAgentFinding`.
2. Wire it in `floodAgentOrchestrator.ts` inside `evaluateZoneForAgents`.
3. If it produces a new safety classification, extend
   `FloodMissionSafetyClassification` and update
   `floodMissionSafetyAgent.ts`.
4. Write the finding's text so it's deterministic enough to digest stably.

### Add a new mission category

1. Add to `ALLOWED_DPAL_MISSION_CATEGORIES` in `floodMissionBridgeService.ts`.
2. Map it in `mapToDpalCategory` and `allowedProofTypesFor`.
3. Add it to the recommended-mission selector inside the orchestrator
   (only when the safety gate allows).
4. **Add it to the user manual table.**

### Add a new routing audience or channel

1. Extend `FloodRoutingAudience` / `FloodRoutingChannel` in
   `floodGuardTypes.ts` (and mirror on the FE).
2. Add an entry to `DEFAULT_ROUTES` in `floodAlertRoutingService.ts`.
3. Update `evaluateGate` to enforce when the new audience/channel can
   route.
4. **Outbound channels are labeled `*_preview` and must remain dry-run
   only** unless legal review approves a real outbound wiring.

### Add a new ledger digest

1. Add the digest builder in `floodLedgerService.ts` next to
   `buildRainfallDigest` etc.
2. Include the digest in `anchorEvidenceFull`'s `composite` object.
3. Add the field to `FloodLedgerRecord` and `FloodPublicLedgerRecord`.
4. Render it in `FloodEvidencePacketView.tsx` and
   `FloodLedgerVerificationPage.tsx`.
5. Decide whether the digest is public-safe and update
   `toPublicLedgerRecord` accordingly.

### Add a new persisted store field

1. Bump `PersistedShape.version`.
2. Add the field with a safe default in `emptyPersisted()`.
3. Migrate older versions in `loadOrSeed()`.
4. Add a getter/setter method on `FloodGuardStore` and call `persist()`
   inside the setter.

---

## 14. Coding conventions used in this module

- **TypeScript strict.** No `any`. Use union types for status enums.
- **Pure helpers vs stateful methods.** Builders (`buildXxx`,
  `evaluateXxx`) live as standalone functions. Stateful operations
  (mutations, persistence) live as methods on `FloodGuardStore`.
- **Stable JSON.** Anything fed into a SHA-256 digest goes through
  `stableStringify` (sorted keys). This keeps digests deterministic
  across deploys. See `floodLedgerService.ts`.
- **API client returns `safeFetch` results.** `services/floodGuardApi.ts`
  always returns `{ ok: true, data } | { ok: false, status, message, code? }`.
- **No throwing across the API boundary.** Adapters always recover to
  fallback. The store's `persist()` swallows filesystem errors. Routes
  validate input and return JSON 4xx, never crash.
- **Tailwind + DPAL CSS variables.** Components use `var(--dpal-*)`
  tokens for theming so light/dark and accent palettes stay consistent.
- **Material Design tokens** are preferred over raw colors for app
  chrome (per project rules in `.cursor/rules/material-design-stacks.mdc`).

---

## 15. Testing the workflow end-to-end

The full test sequence is in
[`FLOODGUARD_USER_MANUAL.md` §17](./FLOODGUARD_USER_MANUAL.md#17-how-to-get-real-results-end-to-end-test).

For developers, the equivalent curl-only smoke is:

```bash
BASE=http://localhost:3001/api/floodguard

curl $BASE/cities
ALERT=$(curl -s $BASE/alerts/live | jq -r '.alerts[0].alertId')
echo "alert: $ALERT"

curl -s -X POST $BASE/generate-evidence-packet \
  -H 'Content-Type: application/json' \
  -d "{\"alertId\":\"$ALERT\"}" | jq '.packet.contentHash'

curl -s -X POST $BASE/alerts/$ALERT/route-preview \
  -H 'Content-Type: application/json' \
  -d '{"mode":"dry_run","generatedBy":"dev"}' | jq '.totalDecisions'

LEDGER=$(curl -s -X POST $BASE/anchor-alert \
  -H 'Content-Type: application/json' \
  -d "{\"alertId\":\"$ALERT\",\"createdBy\":\"dev\"}" | jq -r '.ledgerRecordId')

curl -s $BASE/public/ledger/$LEDGER | jq '.record.anchoringHash'
```

If any step 5xx's, check `backend/data/floodguard/store.json` for shape
issues and the backend log for the stack trace.

---

## 16. Common pitfalls

- **Frontend `safeFetch` returns `message`, not `error`.** That used to
  be a TS bug in the verification page (now fixed). When introducing new
  callers, use the typed shape.
- **`PowerShell` aliases `curl` to `Invoke-WebRequest`.** Use `curl.exe`
  on Windows when feeding JSON bodies via the shell.
- **Don't stringify `Date` objects.** Always use ISO-8601 strings on the
  type boundary so digests are stable.
- **Remember to mirror types.** The FE and BE keep separate copies of
  `floodGuardTypes.ts`. A change in one without the other will compile
  but produce mysterious runtime mismatches.
- **`anchorEvidenceOnLedger` is the legacy single-hash anchor.** New code
  uses `anchorEvidenceFull`. Don't reintroduce the old function in store
  paths — it doesn't fold provenance digests.
- **Public verification page must not import private services.**
  `FloodLedgerVerificationPage.tsx` only depends on
  `services/floodGuardApi.ts` and types — keep it that way so it can be
  shipped as a standalone bundle later.
- **`store.json` is not a real database.** It's good for pilots and
  demos; it's not durable on Railway's default ephemeral filesystem.
  Plan to swap in Postgres/Prisma when going to scale.

---

## 17. Pointers for the next stages

When the team picks the next stage, the natural candidates are:

- **Live ledger anchor.** Replace `dpal_local_mock` with a real chain
  provider (DPAL chain, EVM, Bitcoin OP_RETURN). The provider plumbing
  is already in place via `FloodLedgerChainProvider` — just add a real
  client and set `chainProvider` accordingly.
- **Real outbound routing.** Wire SMS / email / push / webhook providers
  behind `floodAlertRoutingService.ts` once legal review approves.
  Change preview channels to live channels selectively; keep the
  `*_preview` channels for dry-run testing.
- **Multi-tenant cities.** Move cities/zones into a database table so
  city onboarding doesn't require a code deploy.
- **Persistent store.** Swap `floodGuardStore.ts`'s JSON file for Prisma
  models. Keep the public store API the same so call sites don't change.
- **Live water-level providers.** USGS for the US, AdH/SENAMHI/etc. for
  Latin America. Plug them into `floodWaterLevelAdapter.ts`.
- **Ledger record explorer.** A dashboard tab that lists all
  `FloodLedgerRecord`s for the city, with diff tooling for `superseded`
  records.
- **Validator signing.** Have validators sign the `anchoringHash` and
  attach signatures to the ledger record so verifiers can confirm
  human review beyond the lifecycle flag.

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*
