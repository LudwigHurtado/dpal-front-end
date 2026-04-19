// ─── Game dimensions & layout ───────────────────────────────────────────────
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const UI_BAR_HEIGHT = 58;
export const MAP_TOP = UI_BAR_HEIGHT + 2; // content starts below the persistent UI bar

// ─── Scene registry keys ─────────────────────────────────────────────────────
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  WORLD_MAP: 'WorldMapScene',
  MISSION_DETAIL: 'MissionDetailScene',
  MISSION_ACTION: 'MissionActionScene',
  REWARD: 'RewardScene',
  UI: 'UIScene',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];

// ─── Hex palette (Phaser graphics / tints) ───────────────────────────────────
export const C = {
  // Backgrounds
  BG: 0x0b1826,
  PANEL: 0x112030,
  PANEL_LT: 0x1a3048,
  PANEL_BORDER: 0x265070,
  // Buttons
  BTN_PRIMARY: 0x14609a,
  BTN_PRIMARY_HV: 0x1c7abc,
  BTN_SUCCESS: 0x186e3c,
  BTN_SUCCESS_HV: 0x20964e,
  BTN_DANGER: 0x8a2020,
  BTN_DANGER_HV: 0xac2828,
  BTN_NEUTRAL: 0x1e2e3e,
  BTN_NEUTRAL_HV: 0x2a3e52,
  // Category accents
  CAT_ROAD: 0xb86e0c,
  CAT_PETS: 0x1e8a40,
  CAT_ENV: 0x0c7868,
  CAT_EDU: 0x1258a0,
  // Map
  STREET: 0x14263a,
  STREET_MAIN: 0x1c3250,
  ZONE_BORDER: 0x1e4060,
  PARK: 0x164a28,
  WATER: 0x0c3050,
  // Progress
  XP_BAR: 0x14609a,
  POINTS_BAR: 0xb86e0c,
} as const;

// ─── CSS string palette (Phaser Text objects) ─────────────────────────────────
export const TC = {
  PRIMARY: '#cce8f8',
  SECONDARY: '#6aa8c8',
  MUTED: '#3a5868',
  BRIGHT: '#ffffff',
  SUCCESS: '#28d46a',
  WARN: '#d49a0c',
  DANGER: '#cc3838',
  CAT_ROAD: '#d47a0e',
  CAT_PETS: '#24a04a',
  CAT_ENV: '#0e9080',
  CAT_EDU: '#1878c0',
  GOLD: '#d4a80c',
} as const;

// ─── Category → hex & text color lookup ──────────────────────────────────────
export const CATEGORY_COLORS: Record<string, { hex: number; css: string }> = {
  road_hazards: { hex: C.CAT_ROAD, css: TC.CAT_ROAD },
  lost_pets:    { hex: C.CAT_PETS, css: TC.CAT_PETS },
  environmental: { hex: C.CAT_ENV,  css: TC.CAT_ENV },
  education:    { hex: C.CAT_EDU,  css: TC.CAT_EDU },
};
