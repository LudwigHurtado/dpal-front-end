# DPAL FloodGuard User Manual

> **Legal / safety**
> *DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.*

This manual is written for new DPAL team members, city pilot operators, validators,
investors reviewing the workflow, and technical testers. It is a step-by-step
walkthrough of what FloodGuard does, how to start it locally, how to use each
dashboard tab, how to generate evidence, how to anchor a record on the local
DPAL ledger, and how to share a public-safe verification link.

No prior knowledge of the codebase or remote-sensing pipelines is assumed.

> **For programmers and continuing developers**, also read:
> - [`FLOODGUARD_DEVELOPER_GUIDE.md`](./FLOODGUARD_DEVELOPER_GUIDE.md) — onboarding, file map, how to extend each stage.
> - [`FLOODGUARD_ARCHITECTURE.md`](./FLOODGUARD_ARCHITECTURE.md) — pipeline diagram and exact hashing recipes.
> - [`FLOODGUARD_PRODUCTION_STATUS.md`](./FLOODGUARD_PRODUCTION_STATUS.md) — current production smoke results and known issues.

---

## Table of contents

1. What DPAL FloodGuard does
2. How to start FloodGuard locally
3. How to confirm the backend is running
4. Dashboard overview
5. City Flood Map tab
6. Live Detection tab
7. Agent Monitor tab
8. Safe mission dispatch
9. Evidence Packet tab
10. Ledger anchoring
11. Public verification page
12. Alert routing preview / dry run
13. Situation Room
14. Public Flood Map
15. Historical tab
16. Live data configuration
17. How to get real results (end-to-end test)
18. API reference for testers
19. Troubleshooting
20. Operator safety checklist
21. Final workflow summary

---

## 1. What DPAL FloodGuard does

DPAL FloodGuard monitors flood risk **per Geo-ID zone** in a city. A Geo-ID
zone is a small named area (a neighborhood, a drainage corridor, a riverside
strip) registered with FloodGuard so all data lines up against the same
boundary.

For each zone, FloodGuard combines:

- **Rainfall intensity** (mm/hr) from a configurable rainfall adapter.
- **Satellite signals** (NDWI, water extent, water expansion %, flood-wet
  confidence) from the AquaScan satellite adapter.
- **Water-level / gauge readings** (river, canal, drainage, reservoir, manual
  gauge) from the water-level adapter.
- **Historical risk** (recurring flood patterns for that zone).
- **Exposure data** (population density, infrastructure, schools / hospitals /
  shelters in or near the zone).
- **Optional camera + citizen detections** (supporting only — *not* the
  starting layer).

These signals feed an **agentic monitor** with eight specialist agents
(rainfall watch, satellite watch, water-level watch, anomaly, mission safety,
mission dispatch, evidence, situation room). The agents produce findings and a
**mission safety classification** so DPAL only recommends missions that can be
performed safely.

The full FloodGuard pipeline:

```
Remote sensing
  → risk scoring
    → agentic evaluation
      → safe mission dispatch
        → routing preview (dry run)
          → evidence packet (SHA-256)
            → ledger anchor (DPAL local mock by default)
              → public verification page (QR-friendly)
```

Every stage produces a **digest** that is folded into the final
**anchoringHash**, so the public verification page can show *what evidence
existed and why the alert existed* without exposing private data.

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*

---

## 2. How to start FloodGuard locally

You need two terminals: one for the backend, one for the frontend.

### Backend

```bash
cd backend
npm install   # first time only
npm run dev
```

The backend listens on **port 3001** by default. You should see:

```
DPAL Backend running on port 3001 [development]
```

### Frontend

In a second terminal, from the repo root:

```bash
npm install   # first time only
npm run dev
```

The Vite dev server in this repo is configured to use **port 3000**. If port
3000 is already in use, Vite will pick the next free port and print the URL on
startup. Some Vite setups default to **5173** — read the actual URL Vite prints,
do not assume.

### Open FloodGuard

Open the app at:

```
http://localhost:3000/floodguard
```

(Substitute the port Vite actually printed if it changed.)

You should land on the FloodGuard dashboard with the **City Flood Map** tab
selected.

---

## 3. How to confirm the backend is running

Run these from any terminal. They use the local backend URL:

```bash
curl http://localhost:3001/api/floodguard/cities
curl http://localhost:3001/api/floodguard/alerts/live
curl http://localhost:3001/api/floodguard/agents/monitor
```

**Expected results**

- `/cities` returns a JSON object with at least one city (e.g. Santa Cruz de la
  Sierra, `cityId: "SCZ"`) plus its zones.
- `/alerts/live` returns `{ alerts, integrations }` where `integrations`
  describes the rainfall, satellite, and water-level adapter health.
- `/agents/monitor` returns evaluated zones, integration status, agent
  findings, recommended missions, blocked missions, and the legal disclaimer.

If any of these return a connection error, the backend is not running. Re-run
`npm run dev` in `backend/`.

---

## 4. Dashboard overview

The FloodGuard dashboard has eight tabs:

| Tab | What it is for |
|-----|----------------|
| **City Flood Map** | Map of the city, zones, alert pins, cameras, rivers, roads. |
| **Live Detection** | Camera, satellite, and citizen-report ingestion stream. |
| **Agent Monitor** | Agentic screening, safety gate, safe mission dispatch. |
| **Evidence Packet** | Generate, view, and anchor evidence per alert. |
| **Situation Room** | Coordinate operators, validators, and responders. |
| **Alert Settings** | Thresholds, channels, escalation, **routing preview**. |
| **Public Flood Map** | Public-safe view of flood markers and shelter points. |
| **Historical** | Repeated flood zones and infrastructure failure patterns. |

---

## 5. City Flood Map tab

**What you see**

- A map of the active city with overlay markers for zones.
- Each zone is rendered with its Geo-ID outline and a color reflecting the
  current alert level.
- Pins for cameras, rivers, drainage points, shelters, and active alerts.

**What a Geo-ID zone is**

A Geo-ID zone is a small registered area (e.g. *Equipetrol Norte*) tied to a
fixed `zoneId`. All FloodGuard data — rainfall, satellite NDWI, water level,
agent findings, missions, evidence — is keyed to that `zoneId` so reports can
be cross-checked.

**Steps**

1. Open `/floodguard`. The dashboard loads in **City Flood Map**.
2. Confirm the city banner shows the right city. If you have multiple cities,
   use the city selector.
3. Click a zone polygon or pin to select it. The right-hand panel shows zone
   detail (level, risk score, last update).
4. (Optional) Pan/zoom the map to inspect surroundings.

**Expected result**

You can identify which zones are at higher alert levels and select one for
deeper review in the other tabs.

---

## 6. Live Detection tab

> **Important.** Phone images and videos are **not** the starting layer for
> FloodGuard. The system begins with rainfall, satellite, water-level, and
> agentic monitoring. Camera and citizen detections are *optional supporting
> signals* used to corroborate or sharpen what the upstream layers already
> indicate.

**What you see**

- A live stream of recent detections (camera, citizen, and satellite).
- For each detection: source, confidence, zone, timestamp.
- A panel for submitting test detections during a pilot.

**Steps**

1. Open the **Live Detection** tab.
2. Review the most recent detections.
3. To submit a test camera detection, fill in the test form (camera id, label,
   confidence) and submit. The backend will resolve a zone and may create or
   update an alert.
4. To submit a test citizen report, fill in the description (and optional
   coordinates) and submit.
5. Refresh and observe the zone status and alert lifecycle.

**Expected result**

A test detection is accepted, the resolved zone is shown, the risk score
updates, and (if conditions warrant) an alert is created or its lifecycle
advances.

---

## 7. Agent Monitor tab

This is the operational heart of FloodGuard.

**What you see**

- **Integration cards** at the top showing live/fallback/unavailable status
  for the rainfall, satellite, and water-level adapters.
- **Per-zone evaluations** with:
  - alert level + risk score,
  - **risk reasons** (human-readable list of what is contributing),
  - **agent findings** (one entry per relevant agent, with severity and
    summary),
  - **mission safety classification**,
  - **recommended safe missions** (with dispatch buttons),
  - **blocked missions** (with explicit reasons).

**How to use it**

1. Open the **Agent Monitor** tab.
2. Click **Refresh monitor** to pull a fresh evaluation.
3. Review the rainfall, satellite, and water-level integration cards. Each
   card states whether the adapter is **Live**, in **Fallback** mode, or
   **Unavailable**, plus the upstream provider label.
4. Scroll to the per-zone evaluations.
5. For each zone, review the agent findings and risk reasons.
6. Inspect the mission safety classification.

**Mission safety classifications**

| Classification | Meaning |
|----------------|---------|
| `no_mission_allowed` | Conditions are unsafe. No human dispatch. |
| `remote_only` | Only desk / remote-imagery work is safe. |
| `safe_distance_only` | Field work permitted only at safe distance from water. |
| `post_event_only` | Field work permitted only after the event has fully receded. |
| `validator_review_required` | A validator must review before any dispatch. |
| `mission_allowed` | Conditions are safe; recommended missions can be dispatched. |

Unsafe missions are **rejected server-side** even if the UI tries to send
them. The safety gate is authoritative.

**Expected result**

You can review a zone end-to-end and dispatch only safe DPAL missions.

---

## 8. Safe mission dispatch

FloodGuard recommends only mission types that can be performed safely under
the current classification. When you press **Dispatch** on a recommended
mission, two records are created:

- a **FloodGuard dispatched mission record** (internal lifecycle), and
- a **DPAL mission bridge record** (linked into the broader DPAL mission
  system, with allowed proof types).

**Allowed mission categories**

- `remote_observation`
- `safe_distance_road_status`
- `post_event_infrastructure_check`
- `shelter_status_verification`
- `public_data_collection`
- `drainage_condition_after_recede`
- `validator_desk_review`

**Forbidden actions** (the safety gate will block these unconditionally)

- entering flood water,
- driving through flooded roads,
- approaching fast-moving water,
- entering private property without permission,
- crossing unstable bridges,
- going near damaged electrical infrastructure.

**Steps**

1. In **Agent Monitor**, find a zone with a recommended mission.
2. Press **Dispatch** on the mission you want to create.
3. Wait for the success banner. You should see both a dispatched mission id
   and a DPAL mission id.
4. Open the **Evidence Packet** tab; the linked mission ids will appear there
   when you generate the packet.
5. Use `GET /api/floodguard/missions` (see §18) to confirm the mission
   persisted server-side.

**Expected result**

You can create a safe DPAL mission record from a FloodGuard recommendation,
linked back to the alert and zone.

---

## 9. Evidence Packet tab

**What you see**

- A summary of the selected alert.
- A button to **Generate evidence packet** (or **Regenerate**).
- Once generated:
  - a SHA-256 **content hash** of the packet body,
  - the **anchoring hash** (composite hash, present once anchored),
  - the **ledger record id** (once anchored),
  - the **QR payload**,
  - an action to anchor on the DPAL ledger,
  - the legal disclaimer.

**How to read the packet**

- **Content hash** — SHA-256 over the structured packet body (alert summary,
  signals, agent findings, linked missions, routing-preview digest, etc.).
- **Provenance digests** — separate SHA-256 digests for rainfall, satellite,
  water-level, agent findings, and routing preview. Each digest is built from
  the adapter / evaluation snapshot at packet time.
- **Linked missions** — DPAL mission ids that were dispatched and bridged
  before the packet was generated.
- **Routing preview digest** — a hash of the most recent routing preview (see
  §12).

**Steps**

1. Open the **Evidence Packet** tab.
2. Select an alert (or come from another tab via "View evidence").
3. Click **Generate evidence packet**.
4. Inspect summary, content hash, and provenance digests.
5. Optionally click **Regenerate** after new signals arrive to refresh the
   packet.

**Expected result**

A structured evidence packet exists for the alert with a SHA-256 content hash
and provenance digests. It carries the legal disclaimer.

---

## 10. Ledger anchoring

Once an evidence packet exists, you can anchor it to the **DPAL ledger**.

**What the fields mean**

- **`ledgerRecordId`** — unique id of the ledger record (e.g.
  `dpal-flood-ledger-…`).
- **`anchoringHash`** — composite SHA-256 binding the content hash, alert id,
  zone id, city id, evidence packet id, all available digests
  (rainfall / satellite / water-level / agent findings / routing preview), and
  the sorted linked-mission ids. This is what the public verification page
  shows.
- **`anchorStatus`**:
  - `pending` — not anchored yet,
  - `anchored_mock` — anchored on the local DPAL mock chain,
  - `anchored_live` — anchored on a real chain (only when configured),
  - `failed` — anchor attempt failed,
  - `superseded` — replaced by a newer anchor for the same alert.
- **`chainProvider`** — the provider that anchored the record.
  `dpal_local_mock` is the default and means **the record is local-only**;
  no public blockchain transaction was created.

> *Local DPAL mock ledger record — not a public blockchain transaction.*

**Steps**

1. In the **Evidence Packet** tab, click **Anchor on DPAL ledger** (or
   **Re-anchor on DPAL ledger** if a previous record exists).
2. Read the success banner. The packet view now shows the ledger record id,
   anchoring hash, anchor status, chain provider label, and a Mock/Live badge.
3. Confirm the Mock/Live badge matches your environment. By default it is
   **Mock**.

**Expected result**

A persistent ledger record exists for the evidence packet. The dashboard shows
the full record. Older records for the same alert are automatically marked
`superseded`.

---

## 11. Public verification page

The public verification page lets a city official, validator, investor, or
public viewer open one URL and see a privacy-safe view of the ledger record.

**Route**

```
/floodguard/verify/:ledgerRecordId
```

So a real link looks like:

```
http://localhost:3000/floodguard/verify/dpal-flood-ledger-1a2b3c4d5e6f7080
```

**How to open it**

1. In **Evidence Packet**, after anchoring, click **Open verification page**
   inside the ledger record block. The page opens in a new tab.
2. Or paste the URL directly. Or scan the QR payload (which encodes
   `dpal://floodguard/ledger/{alertId}#{anchoringHash[0..24]}`).

**What the page shows**

- `ledgerRecordId`
- `alertId`
- Geo-ID zone (`zoneId` and `zoneName` if available)
- City (`cityId` and `cityName` if available)
- `evidencePacketId`
- `contentHash` (with copy button)
- `anchoringHash` (with copy button)
- Provenance digests:
  - rainfall digest,
  - satellite digest,
  - water-level digest,
  - agent findings digest,
  - routing preview digest.
- Linked DPAL mission ids
- QR payload (with copy button)
- Mock / Live badge + chain provider label
- Verification status (`verified_anchored_mock`, `verified_anchored_live`,
  `pending_anchor`, `superseded`, `failed`, or `unknown`)
- Privacy notice
- Legal disclaimer

**What the page does *not* expose**

- private citizen reports,
- private contact information,
- internal Situation Room messages,
- preview message bodies for outbound channels (email/SMS/webhook previews),
- operator-only notes.

**Expected result**

You can share the verification URL or QR with a city official or external
reviewer and they can verify the alert hash, zone, provenance digests, linked
missions, and mock/live anchor status without seeing private data.

> *Local DPAL mock ledger record — not a public blockchain transaction.*

---

## 12. Alert routing preview / dry run

Routing preview lives inside the **Alert Settings** tab (Routing Preview
panel). It is **always preview-only by default**: no real SMS, email, push,
webhook, or emergency notifications are sent.

**Modes**

| Mode | What it does |
|------|--------------|
| `dry_run` | Default. Generates routing decisions without contacting any external service. |
| `preview_only` | Like `dry_run`; UI explicitly labels outbound channels as preview. |
| `internal_only` | Generates only internal-channel decisions (dashboard, situation room, mission bridge). |
| `external_disabled` | All outbound preview channels are blocked at the gate. |

**Audiences**

- `dpal_operator`
- `city_validator`
- `city_official`
- `emergency_contact`
- `school_admin`
- `hospital_admin`
- `shelter_operator`
- `community_group`
- `public_dashboard`
- `situation_room`

**Channels**

- `dashboard`
- `situation_room`
- `email_preview`
- `sms_preview`
- `webhook_preview`
- `public_map`
- `mission_bridge`

All `*_preview` channels are clearly labeled **"Preview only · no send"** in
the UI.

**Steps**

1. Open the **Alert Settings** tab.
2. In the routing preview panel, select an alert.
3. Choose a routing mode.
4. Click **Generate preview**.
5. Review the decisions. Each decision is either *Routable* (would route in a
   live system) or *Blocked* with a reason code.
6. Click **Refresh history** to see prior previews for the alert.

**Why a decision may be blocked**

- evidence packet incomplete,
- alert not yet human-verified,
- alert level too low for the chosen audience,
- mission safety classification is `no_mission_allowed`,
- `external_disabled` mode forbids outbound channels,
- audience requires field-recipient confirmation that has not been satisfied.

**Expected result**

You can preview *who would receive an alert and why* the route is allowed or
blocked, without sending any real notification.

---

## 13. Situation Room

**What you see**

- A coordination view tied to a specific alert.
- Linked context: agent findings, evidence packet status, dispatched
  missions, routing-preview history.
- A message thread for operators / validators / responders.

**What it is for**

The Situation Room is a coordination surface — it lets the relevant DPAL
roles align on what is happening for an alert. It does **not** replace
official emergency systems, and its messages are intentionally **not** exposed
on the public verification page.

**Steps**

1. From an alert (any tab) open Situation Room.
2. Review the linked context.
3. Add messages or status updates as needed.

**Expected result**

You can review the coordination context for an alert and contribute updates.

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*

---

## 14. Public Flood Map

**What you see**

- A public-safe map view (no private reports, no contact information).
- Indicators that may include safe routes, blocked roads, shelter points, and
  public markers.
- Plain-language explanations rather than operational jargon.

**What to remember**

The Public Flood Map is *informational only*. It does not direct people into
flood zones, and it does not replace official instructions from city
authorities or emergency services. Public users should follow official
guidance for any evacuation or emergency action.

**Expected result**

A public viewer can see relevant public-safe flood information without
exposing internal data.

---

## 15. Historical tab

**What you see**

- Repeated flood zones (which zones flood again and again).
- Drainage issues that recur in the same locations.
- Slow-response patterns by ward or operator group.
- Aggregated infrastructure accountability indicators.

**What it is for**

Historical context tells city operators *which zones deserve structural
fixes* (drainage, river maintenance, levees) versus *which zones are
event-driven*. It also helps validators interpret today's signals.

**Expected result**

You can review repeated flood-risk patterns and infrastructure trends.

---

## 16. Live data configuration

By default, FloodGuard runs with **all live adapters disabled**, so the
system can boot anywhere without paid credentials. When live adapters are off
or credentials are missing, every adapter falls back to deterministic
synthetic data so the UI continues to behave correctly.

The integration cards in **Agent Monitor** show one of three states for each
adapter:

- **Live** — connected to a real provider, with a real fetched timestamp.
- **Fallback** — synthetic deterministic data is being used.
- **Unavailable** — adapter could not produce data; clearly flagged.

### Environment flags

Add the following to `backend/.env` (or your deployment env) only when you
want to enable live providers:

```bash
# Rainfall
FLOODGUARD_LIVE_RAINFALL_ENABLED=true
FLOODGUARD_RAINFALL_PROVIDER=open-meteo

# Satellite (Sentinel Hub / Copernicus)
FLOODGUARD_LIVE_SATELLITE_ENABLED=true
COPERNICUS_CLIENT_ID=...
COPERNICUS_CLIENT_SECRET=...
COPERNICUS_BASE_URL=https://services.sentinel-hub.com

# Water level / gauges
FLOODGUARD_LIVE_WATER_LEVEL_ENABLED=true
FLOODGUARD_WATER_LEVEL_PROVIDER=synthetic
```

### Behavior summary

- **Flag off** → adapter runs in fallback mode with synthetic deterministic
  data. Integration card shows **Fallback**.
- **Flag on, credentials missing** → adapter cannot authenticate; falls back
  to synthetic data and reports **Unavailable** on the integration card with
  a clear message.
- **Flag on, credentials valid** → adapter runs live; integration card shows
  **Live** and the upstream provider label.

After changing env values, restart the backend (`Ctrl+C`, then `npm run dev`)
so the new values are picked up.

---

## 17. How to get real results (end-to-end test)

This is the recommended sequence to demonstrate FloodGuard end-to-end during
a pilot or investor walkthrough.

1. Start the backend: `cd backend && npm run dev`.
2. Start the frontend: `npm run dev` (from the repo root).
3. Open `http://localhost:3000/floodguard`.
4. Confirm the city zones load on the **City Flood Map** tab.
5. Open the **Agent Monitor** tab.
6. Click **Refresh monitor**.
7. Review the rainfall, satellite, and water-level integration cards.
8. Select a zone with elevated risk.
9. If a recommended mission is shown and the safety classification allows,
   press **Dispatch** to create a safe DPAL mission.
10. Open the **Evidence Packet** tab and select the same alert.
11. Click **Generate evidence packet**.
12. Open **Alert Settings** → routing preview, select the alert, choose
    `dry_run`, and click **Generate preview**.
13. Return to **Evidence Packet** and click **Regenerate** so the routing
    digest is folded into the packet.
14. Click **Anchor on DPAL ledger** to create the ledger record.
15. Click **Open verification page** in the ledger block. A new tab loads
    `/floodguard/verify/{ledgerRecordId}`.
16. On the verification page, confirm the content hash, anchoring hash,
    provenance digests, linked mission ids, and the **Mock** badge are all
    present.

**Expected result**

You have demonstrated the complete FloodGuard workflow from monitoring
through public verification — without sending any real external alerts and
without using any paid service.

---

## 18. API reference for testers

All endpoints below are mounted under `/api/floodguard` on the backend
(`http://localhost:3001` locally).

### Cities and zones

| Endpoint | Purpose |
|----------|---------|
| `GET /cities` | List FloodGuard cities. |
| `GET /cities/:cityId/zones` | List Geo-ID zones for a city. |
| `GET /zones/:zoneId/status` | Latest snapshot of a zone (signals, alert, risk). |

**Example**

```bash
curl http://localhost:3001/api/floodguard/cities
```

Returns at least one city with its zones.

### Alerts

| Endpoint | Purpose |
|----------|---------|
| `GET /alerts/live` | All currently live alerts plus integration health. |
| `GET /alerts/:alertId` | One alert by id. |

**Example**

```bash
curl http://localhost:3001/api/floodguard/alerts/live
```

### Evidence and ledger

| Endpoint | Purpose |
|----------|---------|
| `POST /generate-evidence-packet` | Build (or rebuild) the evidence packet for an alert. |
| `POST /anchor-alert` | Anchor the latest evidence packet on the DPAL ledger. |
| `GET /ledger/:ledgerRecordId` | Internal ledger record by id. |
| `GET /alerts/:alertId/ledger` | All ledger records for an alert (newest first). |
| `GET /public/ledger/:ledgerRecordId` | Public-safe verification view (no private data). |

**Examples**

```bash
curl -X POST http://localhost:3001/api/floodguard/generate-evidence-packet \
  -H 'Content-Type: application/json' \
  -d '{"alertId":"<alert id>"}'

curl -X POST http://localhost:3001/api/floodguard/anchor-alert \
  -H 'Content-Type: application/json' \
  -d '{"alertId":"<alert id>","createdBy":"DPAL Operator"}'

curl http://localhost:3001/api/floodguard/public/ledger/<ledgerRecordId>
```

The public response strips citizen reports, contact details, situation-room
messages, and preview message bodies. It keeps hashes, digests, mock/live
labeling, and the legal disclaimer.

### Agentic monitoring and missions

| Endpoint | Purpose |
|----------|---------|
| `GET /agents/monitor` | Full agentic evaluation across zones. |
| `POST /agents/dispatch-mission` | Dispatch a safe mission (server-side safety gate). |
| `GET /missions` | List dispatched DPAL bridge missions. |
| `GET /missions/:missionId` | One mission by id. |

**Example**

```bash
curl -X POST http://localhost:3001/api/floodguard/agents/dispatch-mission \
  -H 'Content-Type: application/json' \
  -d '{"alertId":"<alert id>","zoneId":"<zone id>","missionType":"remote_observation","safetyClassification":"remote_only"}'
```

If the server-side safety gate disagrees with the client's classification,
the mission is rejected with a reason — **no unsafe mission is ever created**.

### Routing preview

| Endpoint | Purpose |
|----------|---------|
| `POST /alerts/:alertId/route-preview` | Generate a dry-run routing preview. |
| `GET /alerts/:alertId/routing` | List previously generated previews for the alert. |

**Example**

```bash
curl -X POST http://localhost:3001/api/floodguard/alerts/<alertId>/route-preview \
  -H 'Content-Type: application/json' \
  -d '{"mode":"dry_run","generatedBy":"DPAL Operator"}'
```

The response is a `FloodRoutingPreviewSummary` with per-decision fields and
an aggregate digest. **No external notifications are sent.**

---

## 19. Troubleshooting

**Frontend loads but data looks local / mock.**
*Cause.* Backend is not running, or live adapters are off (which is the
default).
*Fix.* Start the backend with `cd backend && npm run dev` and refresh the
page. If you wanted live data, see §16.

**Routing preview does not actually send messages.**
*Cause.* This is the intended behavior. Routing is preview / dry-run only.
*Fix.* None needed. Use the preview to confirm *who would have received what*
before any production wiring.

**Ledger says Mock.**
*Cause.* The local DPAL mock chain provider is in use. This is the default.
*Fix.* None needed. *Local DPAL mock ledger record — not a public blockchain
transaction.* If you want to wire a real chain, that requires additional
work outside the default install.

**Live satellite shows Unavailable.**
*Cause.* `FLOODGUARD_LIVE_SATELLITE_ENABLED` is not set, or
`COPERNICUS_CLIENT_ID` / `COPERNICUS_CLIENT_SECRET` are missing or invalid.
*Fix.* Set the credentials per §16, restart the backend.

**Mission dispatch was rejected by the server.**
*Cause.* The server-side safety gate blocked it, the mission type is not in
the allowed list, or the client's `safetyClassification` was looser than the
server's evaluation.
*Fix.* Re-evaluate the zone in **Agent Monitor**; only dispatch what the
server-side classification permits.

**Public verification page says "not found".**
*Cause.* The `ledgerRecordId` in the URL is wrong, or the alert was never
anchored.
*Fix.* Check the ledger block in the **Evidence Packet** tab for the correct
id, or anchor the alert first.

**Backend curl fails with connection error.**
*Cause.* Backend is not running on port 3001, or it crashed during startup.
*Fix.* Re-run `cd backend && npm run dev` and read the startup logs for
errors.

---

## 20. Operator safety checklist

Before using FloodGuard in any pilot, confirm each of the following:

- [ ] The legal disclaimer *"DPAL FloodGuard provides verified civic flood
      intelligence and does not replace official government emergency
      alerts."* is visible in the dashboard, evidence packet, and public
      verification page.
- [ ] Routing is **preview-only**. No real SMS, email, push, or webhook is
      enabled.
- [ ] No live emergency-broadcast wiring is connected.
- [ ] The mission safety gate is active. Try dispatching an unsafe-looking
      mission and confirm the server rejects it.
- [ ] Mock ledger records are clearly labeled with the **Mock** badge and the
      disclaimer *"Local DPAL mock ledger record — not a public blockchain
      transaction."*.
- [ ] The public verification page does not expose private citizen reports,
      contact details, Situation Room messages, preview message bodies, or
      operator notes.
- [ ] Integration cards clearly show **Live**, **Fallback**, or
      **Unavailable** status — no fallback data is being presented as live.
- [ ] Public-facing copy never instructs end users to enter unsafe areas
      (flood water, flooded roads, fast-moving water, damaged infrastructure,
      unstable bridges).

---

## 21. Final workflow summary

DPAL FloodGuard monitors flood conditions by Geo-ID zone, combines rainfall,
satellite, and water-level data, runs agentic risk and safety evaluation,
recommends only safe missions, creates evidence packets, previews routing
decisions in dry-run mode, anchors evidence locally on the DPAL mock ledger,
and exposes a public-safe verification page that anyone can open with a QR or
link.

> *DPAL FloodGuard provides verified civic flood intelligence and does not
> replace official government emergency alerts.*
