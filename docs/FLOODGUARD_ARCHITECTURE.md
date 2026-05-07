# DPAL FloodGuard — Architecture & Data Flow

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*

This document is the **technical reference** for how data moves through
FloodGuard, what gets hashed where, and which hashes bind into the final
public verification record. Read this together with
[`FLOODGUARD_DEVELOPER_GUIDE.md`](./FLOODGUARD_DEVELOPER_GUIDE.md).

---

## 1. High-level pipeline

```
   ┌────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐
   │  Rainfall adapter  │  │  Satellite adapter  │  │  Water-level adapter │
   │  (12A)             │  │  (12B)              │  │  (12E)               │
   │  live or synthetic │  │  live or synthetic  │  │  live or synthetic   │
   └─────────┬──────────┘  └──────────┬──────────┘  └──────────┬───────────┘
             │                        │                         │
             ▼                        ▼                         ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                    FloodWeatherSignal (per zone)                 │
   │  rainfall + satellite + waterLevel + provenance metadata         │
   └─────────────────────────────────┬────────────────────────────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  Risk score (11)     │
                          │  composite 0–100     │
                          └──────────┬───────────┘
                                     │
                                     ▼
              ┌──────────────────────────────────────────┐
              │  Agentic evaluation (12C, 12E)           │
              │  8 agents → mission safety classification │
              └────────────┬─────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────────────┐
            │  Mission dispatch + DPAL bridge (12F)│
            │  forbidden actions blocked server-side│
            └────────────┬─────────────────────────┘
                         │
                         ▼
              ┌─────────────────────────────────┐
              │  Routing preview / dry run (12G)│
              └────────────┬────────────────────┘
                           │
                           ▼
                ┌─────────────────────────┐
                │  Evidence packet (11+H) │
                │  contentHash (SHA-256)  │
                └────────────┬────────────┘
                             │
                             ▼
                ┌──────────────────────────────┐
                │  Ledger anchor (12H)         │
                │  composite anchoringHash     │
                └────────────┬─────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────┐
              │  Public verification page (12I)  │
              │  /floodguard/verify/:id          │
              └──────────────────────────────────┘
```

Every box on the right side of that flow contributes a **provenance digest**
that ends up bound into the `anchoringHash`. That binding is the
accountability spine: change any input, the hash changes; change the hash
without changing the inputs, the math doesn't reproduce.

---

## 2. Geo-ID zones — the unit of monitoring

Everything in FloodGuard is **per zone**. A zone is identified by a stable
ID like `DPAL-FLOOD-SCZ-ZONE-A-0001`. Each zone has:

- a city (`cityId`),
- a polygon (lat/lng vertices),
- a geohash for fast lookups,
- baseline metadata (population, infrastructure, flood history),
- adapters that fetch real or synthetic signals at that location.

Zones live in `backend/src/services/floodGuard/floodCityZoneService.ts`.
Adding a city or zone is a code change today (no runtime DB).

---

## 3. Remote-sensing layer (Stages 12A, 12B, 12E)

Three independent adapters collect signals per zone and merge them into a
single `FloodWeatherSignal`:

| Adapter | File | Output keys | Live provider | Fallback |
|---------|------|-------------|---------------|----------|
| Rainfall | `floodRainfallAdapter.ts` | `rainfall30mMm`, `rainfall24hMm`, `rainfallMeta` | Open-Meteo | Deterministic synthetic |
| Satellite | `floodSatelliteAdapter.ts` | `ndwiMean`, `waterExtentSqKm`, `waterExpansionPercent`, `floodWetConfidence`, `satelliteMeta` | Sentinel Hub (Copernicus) | AquaScan synthetic |
| Water level | `floodWaterLevelAdapter.ts` | `waterLevelMeters`, `levelPercentOfCritical`, `trend`, `waterLevelMeta` | None wired (USGS/SENAMHI/etc. TBD) | Deterministic synthetic gauge |

Each adapter follows the same contract:

1. read its `FLOODGUARD_LIVE_*_ENABLED` flag,
2. if disabled or credentials missing, return a **deterministic synthetic
   sample**,
3. if enabled, attempt the live call with a short timeout and on any
   error fall back to synthetic,
4. always return a populated `*Meta` object with: `provider`,
   `providerLabel`, `status`, `isLive`, `fetchedAt`, `message`,
   `attribution`, and any provider-specific fields.

The `*Meta` blocks are what feed the ledger digests — so when you add a
new live provider, **populate the meta block fully**, otherwise the
digest will be unstable and "verified by hash" won't actually hold.

---

## 4. Risk score (Stage 11, extended in 12B and 12E)

`floodRiskEngine.ts` computes a 0–100 score from seven signal classes:

| Signal | Source | Weight idea |
|--------|--------|-------------|
| Rainfall intensity | Rainfall adapter | 30m + 24h thresholds |
| Visual water detection | Camera detections (Live Detection tab) | confidence-weighted |
| River / stream gauge rise | Water-level adapter | delta vs baseline |
| Satellite water expansion | Satellite adapter | NDWI, expansion %, flood-wet confidence |
| Citizen reports | Frontend submissions | count + photo bonus |
| Historical flood vulnerability | Static seed | event count in last 24 months |
| Public infrastructure exposure | Static seed | schools, hospitals, roads, residents |

The output is `riskScore: 0–100` plus a list of `contributingSources` and
`reasons`. The risk score sets the alert level (`Normal` → `Critical
Flood`).

---

## 5. Agentic evaluation (Stage 12C, extended in 12E)

`agents/floodAgentOrchestrator.ts` runs eight agents per zone and combines
their findings into a single `FloodZoneAgentEvaluation`:

| Agent | File | What it answers |
|-------|------|-----------------|
| Rainfall Watch | `floodRainfallWatchAgent.ts` | Is rainfall intensity unusual right now? |
| Satellite Watch | `floodSatelliteWatchAgent.ts` | Is water expanding faster than baseline? |
| Water-Level Watch | `floodWaterLevelWatchAgent.ts` | How close to the critical threshold is the gauge? |
| Anomaly | `floodAnomalyAgent.ts` | Are signals diverging from history? |
| Evidence | `floodEvidenceAgent.ts` | Is the evidence stack strong enough to act on? |
| Mission Dispatch | `floodMissionDispatchAgent.ts` | What missions, if any, should run? |
| Mission Safety | `floodMissionSafetyAgent.ts` | Are conditions safe enough to dispatch humans? |
| Situation Room | `floodSituationRoomAgent.ts` | What does the operator need to coordinate next? |

The orchestrator merges these into:

```ts
interface FloodZoneAgentEvaluation {
  evaluatedAt: ISO8601;
  agentFindings: { agentId; severity; summary; details[] }[];
  missionSafetyClassification: 'safe' | 'caution' | 'unsafe' | 'forbidden';
  safetyRationale: string;
  recommendedMissions: { missionType; safetyClassification; ... }[];
  blockedMissions: { missionType; reason }[];
  ...
}
```

The `missionSafetyClassification` is **enforced server-side** when
dispatching a mission. The frontend has no override.

---

## 6. Mission bridge (Stage 12F)

`floodMissionBridgeService.ts` maps FloodGuard mission types to the
broader DPAL `safe_mission` category and defines:

- `ALLOWED_DPAL_MISSION_CATEGORIES` — what can be created from
  FloodGuard.
- `mapToDpalCategory(missionType)` — maps FloodGuard → DPAL.
- `allowedProofTypesFor(missionType)` — what proof artifacts are
  acceptable (photos, sensor reading, validator confirmation, etc.).
- `forbiddenActions` — actions that are **always blocked** regardless of
  classification (entering flood water, driving through flooded roads,
  removing debris from active currents, etc.).

When a mission is created via `POST /api/floodguard/agents/dispatch-mission`,
the store builds a `FloodDispatchedMission` record and a parallel
`FloodDpalMission` record exposed via `/api/floodguard/missions`.

---

## 7. Routing preview (Stage 12G)

`floodAlertRoutingService.ts` takes an alert, an evidence packet, and an
agent evaluation, then **simulates** routing to audiences via channels
**without sending any real notifications**.

### Audience matrix

| Audience | Triggered when |
|----------|----------------|
| `city_officials` | Any alert ≥ Level 1. |
| `validators` | Any alert (so validators always see the queue). |
| `public_users` | Alert ≥ Level 3 (Flood Alert) **and** the safety classification is at most `caution`. |
| `schools_hospitals` | Alert ≥ Level 3 in zones with public-infrastructure exposure. |
| `community_groups` | Alert ≥ Level 3 with active citizen reports. |

### Channel matrix

| Channel | Used by | Note |
|---------|---------|------|
| `dashboard` | Always — the FloodGuard dashboard itself. | Live (in-app). |
| `email_preview` | City officials + validators. | Dry run only. |
| `webhook_preview` | City + validator integrations. | Dry run only. |
| `push_preview` | Public users + community groups. | Dry run only. |
| `sms_preview` | Schools/hospitals contacts. | Dry run only. |

The output is a `FloodRoutingPreviewSummary` with a SHA-256 `digest`
over the canonical decision list, which is what feeds the ledger
digest.

---

## 8. Evidence packet (Stages 11 + 12H)

`floodEvidencePacketService.ts` builds a `FloodEvidencePacket`:

- alert summary,
- zone summary,
- weather signal,
- camera detections,
- citizen reports,
- agent evaluation,
- linked missions,
- routing preview (latest),
- legal disclaimer,
- `contentHash` = SHA-256 over the canonical packet body.

The packet is the immediate, human-readable record. The ledger record
(next section) is the long-lived, hash-bound record.

---

## 9. Ledger anchor (Stage 12H) — exact recipe

Defined in `floodLedgerService.ts`. The composite `anchoringHash` is
computed as:

```
anchoringHash = sha256(
  stableStringify({
    contentHash: <evidence packet content hash>,
    alertId,
    zoneId,
    cityId,
    evidencePacketId,
    rainfallDigest,        // sha256 of rainfallMeta canonical JSON
    satelliteDigest,       // sha256 of satelliteMeta canonical JSON
    waterLevelDigest,      // sha256 of waterLevelMeta canonical JSON
    agentFindingsDigest,   // sha256 of agent classification + findings
    routingPreviewDigest,  // sha256 of routing preview canonical digest
    linkedMissionIds: <sorted>,
    legalDisclaimer: FLOODGUARD_LEDGER_LEGAL,
    chainProvider,         // 'dpal_local_mock' by default
    isMock,
    createdAt,
  })
)
```

Each per-source digest is itself a stable hash over that source's full
provenance (`provider`, `providerLabel`, `status`, `isLive`,
`fetchedAt`, `attribution`, `message`, plus the actual measurements).
That means **changing the data source attribution alone changes the
anchoring hash** — provenance is part of the seal.

Returned record (`FloodLedgerRecord`) includes:

- `ledgerRecordId` = `dpal-flood-ledger-<anchoringHash[0..16]>`
- `qrPayload` = `dpal://floodguard/ledger/<alertId>#<anchoringHash[0..24]>`
- `chainProvider` (default `dpal_local_mock`)
- `chainProviderLabel`
- `isMock` (true for the default provider)
- `anchorStatus` (`anchored_mock` for the mock provider)
- `verificationUrl` (set when a real chain is configured)
- All five digests above so the public page can print them.

The store keeps every ledger record (not just the latest); previous
records for the same alert are marked `superseded` so the audit trail
isn't lost.

---

## 10. Public verification page (Stage 12I) — privacy contract

`store.toPublicLedgerRecord(record)` builds the public-safe view. It
**always strips** anything personal or operator-only.

Fields the public page **shows**:

- ids (`ledgerRecordId`, `alertId`, `evidencePacketId`),
- zone + city ids and human-readable names,
- `contentHash`, `anchoringHash`,
- per-source digests (rainfall / satellite / water-level / agent / routing),
- linked DPAL mission ids,
- mock/live status, chain provider label, anchor status,
- `qrPayload`,
- `publicSummary`,
- `verificationStatus`,
- `privacyNotice`,
- `legalDisclaimer`.

Fields the public page **never shows**:

- private citizen reports,
- private contact info,
- internal Situation Room messages,
- preview message bodies for outbound channels (subject lines included),
- operator-only notes.

Frontend route: `/floodguard/verify/:ledgerRecordId` →
`FloodLedgerVerificationPage.tsx`. It is mounted in `AppBootstrap.tsx`
at the **top level** so it can render without the main app's auth gate
or view state — that's important for QR-code use cases.

---

## 11. Persistence map

```
backend/data/floodguard/store.json
├── version: 1 → 5
├── alerts:                    Map<alertId, FloodAlert>
├── activeByZone:              Map<zoneId, alertId | null>
├── weather:                   Map<zoneId, FloodWeatherSignal>
├── detections:                Map<zoneId, FloodCameraDetection[]>
├── citizenReports:            Map<zoneId, FloodCitizenReport[]>
├── evidenceByAlert:           Map<alertId, FloodEvidencePacket>
├── dispatchedMissions:        FloodDispatchedMission[]   (v2+)
├── dpalMissions:              FloodDpalMission[]         (v3+)
├── routingByAlert:            Map<alertId, FloodRoutingPreviewSummary[]> (v4+)
├── ledgerRecords:             Map<ledgerRecordId, FloodLedgerRecord>      (v5+)
└── ledgerByAlert:             Map<alertId, ledgerRecordId[]>              (v5+)
```

When the schema changes:

1. bump `PersistedShape.version`,
2. add a default in `emptyPersisted()`,
3. handle the older versions in `loadOrSeed()`,
4. keep the migration backward-compatible (don't delete old fields).

> **Hosting note.** Default Railway containers are ephemeral. To keep
> ledger records across restarts in production you must mount a Volume
> at `backend/data/floodguard/` or migrate this file to a real database.

---

## 12. End-to-end identity diagram

```
┌──────────────┐
│  alertId     │ ───────┐
└──────────────┘        │
┌──────────────┐        │
│ evidencePacket│ ──┐   │      contentHash = sha256(packet body)
└──────────────┘   │   │
┌──────────────┐   ▼   ▼
│   FloodGuard │  ┌────────────┐    anchoringHash = sha256({
│   ledger     │  │ composite  │      contentHash, alertId, zoneId,
│   record     │  │ stableJSON │      cityId, evidencePacketId,
└──────────────┘  └────────────┘      rainfallDigest, satelliteDigest,
                                      waterLevelDigest, agentFindingsDigest,
                                      routingPreviewDigest,
                                      linkedMissionIds, legalDisclaimer,
                                      chainProvider, isMock, createdAt
                                    })
       │
       ▼
       ledgerRecordId = "dpal-flood-ledger-" + anchoringHash[0..16]
       qrPayload      = "dpal://floodguard/ledger/<alertId>#<anchoringHash[0..24]>"
       publicUrl      = "/floodguard/verify/<ledgerRecordId>"
```

That's the whole accountability seal: change any of the inputs, the
hash doesn't reproduce.

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*
