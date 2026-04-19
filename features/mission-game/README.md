# DPAL Mission Ops: Zone Control

A browser-based 2D mission game built with **Phaser 4** and designed to embed cleanly inside the React/Vite DPAL front-end.

---

## Quick Start

```bash
# From the dpal-front-end root:
npm install          # phaser is already listed in package.json
npm run dev          # Vite dev server on http://localhost:3000
```

Navigate to `/missions-game` (or mount `MissionGameView` anywhere in the app) to play.

---

## How to embed in a React page

```tsx
import { MissionGameView } from 'features/mission-game/MissionGameView';

function MyPage() {
  return (
    <MissionGameView
      height={600}
      onMissionCompleted={({ missionId, xp, points }) =>
        console.log('completed:', missionId, xp, points)
      }
    />
  );
}
```

The component lazy-loads Phaser via a dynamic `import()` so it stays out of
the initial bundle. It mounts/unmounts cleanly — no global state leaks.

---

## EventBridge callbacks

| Callback              | Payload                                              |
|-----------------------|------------------------------------------------------|
| `onGameReady`         | `undefined`                                          |
| `onMissionSelected`   | `{ missionId, locationId }`                          |
| `onMissionStarted`    | `{ missionId }`                                      |
| `onMissionCompleted`  | `{ missionId, xp, points }`                          |
| `onRewardGranted`     | `{ xp, points, newLevel, newBadges }`                |

You can also subscribe directly from anywhere in the app:

```ts
import { EventBridge } from 'features/mission-game/game/EventBridge';
const unsub = EventBridge.on('mission_completed', ({ missionId }) => { … });
// cleanup:
unsub();
```

---

## File Structure

```
features/mission-game/
├── MissionGameView.tsx          React wrapper (mount/unmount Phaser cleanly)
├── README.md
└── game/
    ├── main.ts                  DPALGame class — entry point for React host
    ├── constants.ts             Dimensions, scene keys, hex/CSS palette
    ├── EventBridge.ts           Typed event bus (Phaser ↔ React)
    ├── data/
    │   ├── categories.ts        4 mission categories
    │   ├── locations.ts         8 map locations (normalized x/y)
    │   ├── missions.ts          8 missions with checklists
    │   ├── relatedItems.ts      16 related items (tools, evidence, contacts)
    │   ├── playerState.ts       Session-scoped player state singleton
    │   └── index.ts             Re-exports
    ├── ui/
    │   └── UIHelpers.ts         Reusable: panels, buttons, progress bars, badges
    └── scenes/
        ├── BootScene.ts         Loading splash → launches WorldMap + UI
        ├── WorldMapScene.ts     City map with clickable zone markers
        ├── MissionDetailScene.ts  Mission info card (category, rewards, items)
        ├── MissionActionScene.ts  Checklist task flow + submit
        ├── RewardScene.ts       XP counter, badge progress, level-up
        └── UIScene.ts           Persistent top bar (level, XP, points, zone)
```

---

## Scene Flow

```
BootScene
  │
  └─► WorldMapScene  ←──────────────────────────────────┐
          │  (click marker)                              │
          ▼                                              │
      MissionDetailScene  ──(Back)──────────────────────┘
          │  (Start Mission)
          ▼
      MissionActionScene  ──(Back)──► MissionDetailScene
          │  (Submit Proof)
          ▼
      RewardScene  ──(Return to Map)──► WorldMapScene

UIScene runs in parallel with all scenes above (persistent HUD).
```

---

## Data Model (mock — replace with API calls later)

| File             | Replace with…                                      |
|------------------|----------------------------------------------------|
| `missions.ts`    | `GET /api/missions`                                |
| `locations.ts`   | `GET /api/locations` (add real lat/lng → nx/ny)    |
| `categories.ts`  | `GET /api/categories`                              |
| `playerState.ts` | `GET /api/player/me` + `POST /api/player/progress` |

The `PlayerStateManager` singleton can be swapped for an API-backed store by
replacing its internal `_state` initialization with a fetched value and wiring
`addXP` / `completeMission` calls to API mutations.

---

## Future Expansion Ideas

- **Real GPS locations** — convert lat/lng to `nx/ny` using map bounds
- **Live DPAL missions** — fetch from `/api/missions?status=active`
- **Photo proof upload** — open native camera via `<input type="file">` overlay
- **Leaderboard** — add a `LeaderboardScene` or external React panel via `onRewardGranted`
- **Tile-based map** — replace the drawn city with a Phaser Tilemap (Tiled editor)
- **Multiplayer pins** — WebSocket feed showing other players' active zones
- **Mission expiry** — add `expiresAt` field and countdown timers on markers
- **Admin mode** — allow map editors to drag-drop new location pins
