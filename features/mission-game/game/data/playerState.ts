/**
 * PlayerStateManager — session-scoped singleton.
 * Lives in JS module scope; survives scene transitions, destroyed when the game is torn down.
 * Replace this module's data source with API calls to persist across sessions.
 */

export interface BadgeProgress {
  id: string;
  name: string;
  emoji: string;
  current: number;
  required: number;
  earned: boolean;
}

export interface PlayerState {
  level: number;
  xp: number;
  xpToNextLevel: number;
  points: number;
  completedMissionIds: Set<string>;
  badgeProgress: BadgeProgress[];
  inventory: string[];   // relatedItem ids collected during missions
  currentZone: string;
}

function xpThreshold(level: number): number {
  return level * 200;
}

function freshState(): PlayerState {
  return {
    level: 1,
    xp: 0,
    xpToNextLevel: xpThreshold(1),
    points: 0,
    completedMissionIds: new Set(),
    badgeProgress: [
      { id: 'first_responder', name: 'First Responder', emoji: '🏅', current: 0, required: 1,  earned: false },
      { id: 'road_watcher',    name: 'Road Watcher',    emoji: '🛣️', current: 0, required: 3,  earned: false },
      { id: 'pet_finder',      name: 'Pet Finder',      emoji: '🐾', current: 0, required: 2,  earned: false },
      { id: 'eco_guard',       name: 'Eco Guard',       emoji: '🌿', current: 0, required: 3,  earned: false },
      { id: 'edu_hero',        name: 'Edu Hero',        emoji: '📚', current: 0, required: 2,  earned: false },
    ],
    inventory: [],
    currentZone: 'City Map',
  };
}

let _state: PlayerState = freshState();

const CATEGORY_TO_BADGE: Record<string, string> = {
  road_hazards:  'road_watcher',
  lost_pets:     'pet_finder',
  environmental: 'eco_guard',
  education:     'edu_hero',
};

export const PlayerStateManager = {
  get(): Readonly<PlayerState> {
    return _state;
  },

  setZone(zone: string): void {
    _state.currentZone = zone;
  },

  /** Adds XP, handles level-up. Returns whether the player leveled up. */
  addXP(amount: number): { leveled: boolean; newLevel: number } {
    _state.xp += amount;
    let leveled = false;
    while (_state.xp >= _state.xpToNextLevel) {
      _state.xp -= _state.xpToNextLevel;
      _state.level += 1;
      _state.xpToNextLevel = xpThreshold(_state.level);
      leveled = true;
    }
    return { leveled, newLevel: _state.level };
  },

  addPoints(amount: number): void {
    _state.points += amount;
  },

  /**
   * Marks mission as complete, updates badge progress.
   * Returns names of any newly earned badges.
   */
  completeMission(missionId: string, categoryId: string): string[] {
    if (_state.completedMissionIds.has(missionId)) return [];
    _state.completedMissionIds.add(missionId);

    const earned: string[] = [];

    const tick = (badgeId: string) => {
      const b = _state.badgeProgress.find(b => b.id === badgeId);
      if (b && !b.earned) {
        b.current = Math.min(b.current + 1, b.required);
        if (b.current >= b.required) { b.earned = true; earned.push(b.name); }
      }
    };

    tick('first_responder');
    const catBadge = CATEGORY_TO_BADGE[categoryId];
    if (catBadge) tick(catBadge);

    return earned;
  },

  addToInventory(itemId: string): void {
    if (!_state.inventory.includes(itemId)) _state.inventory.push(itemId);
  },

  isMissionCompleted(missionId: string): boolean {
    return _state.completedMissionIds.has(missionId);
  },

  reset(): void {
    _state = freshState();
  },
};
