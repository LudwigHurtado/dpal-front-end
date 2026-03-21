/** Society-impact minigames: instruction art lives in /public; play URLs are optional env-based. */

export type SocietyGameId =
  | 'investigation-network'
  | 'investigate-observe-intelligent'
  | 'beacon-community'
  | 'clean-zone-restore-earth'
  | 'safe-reporting'
  | 'take-the-walk-share-moment'
  | 'kitty-comfort-visits'
  | 'silent-observer';

export interface SocietyGameDef {
  id: SocietyGameId;
  /** Full-size instruction / how-to-play image */
  instructionImageSrc: string;
}

export const SOCIETY_GAMES: SocietyGameDef[] = [
  {
    id: 'investigation-network',
    instructionImageSrc: '/report-protect/main-panel-investigation-network-board.png',
  },
  {
    id: 'investigate-observe-intelligent',
    instructionImageSrc: '/games/investigate-observe-intelligent.png',
  },
  {
    id: 'beacon-community',
    instructionImageSrc: '/report-protect/main-panel-beacon-community-guide.png',
  },
  {
    id: 'clean-zone-restore-earth',
    instructionImageSrc: '/games/clean-zone-restore-earth.png',
  },
  {
    id: 'safe-reporting',
    instructionImageSrc: '/report-protect/main-panel-series-05-report-protect-mobile.png',
  },
  {
    id: 'take-the-walk-share-moment',
    instructionImageSrc: '/games/take-the-walk-share-moment.png',
  },
  {
    id: 'kitty-comfort-visits',
    instructionImageSrc: '/games/kitty-comfort-visits.png',
  },
  {
    id: 'silent-observer',
    instructionImageSrc: '/games/silent-observer-instructions.png',
  },
];

export function getSocietyGamePlayUrl(id: SocietyGameId): string | undefined {
  const raw: Record<SocietyGameId, string | undefined> = {
    'investigation-network': import.meta.env.VITE_GAME_URL_INVESTIGATION_NETWORK,
    'investigate-observe-intelligent': import.meta.env.VITE_GAME_URL_INVESTIGATE_OBSERVE_INTELLIGENT,
    'beacon-community': import.meta.env.VITE_GAME_URL_BEACON_COMMUNITY,
    'clean-zone-restore-earth': import.meta.env.VITE_GAME_URL_CLEAN_ZONE_RESTORE_EARTH,
    'safe-reporting': import.meta.env.VITE_GAME_URL_SAFE_REPORTING,
    'take-the-walk-share-moment': import.meta.env.VITE_GAME_URL_TAKE_THE_WALK_SHARE_MOMENT,
    'kitty-comfort-visits': import.meta.env.VITE_GAME_URL_KITTY_COMFORT_VISITS,
    'silent-observer': import.meta.env.VITE_GAME_URL_SILENT_OBSERVER,
  };
  const u = raw[id]?.trim();
  return u || undefined;
}
