import Phaser from 'phaser';
import { C, TC } from '../constants';

// ─── Shared font stack ────────────────────────────────────────────────────────
export const FONT = '"Segoe UI", Arial, sans-serif';

// ─── Panel ────────────────────────────────────────────────────────────────────
export interface PanelOptions {
  bg?: number;
  bgAlpha?: number;
  border?: number;
  borderWidth?: number;
  radius?: number;
}

export function drawPanel(
  gfx: Phaser.GameObjects.Graphics,
  x: number, y: number,
  w: number, h: number,
  opts: PanelOptions = {},
): void {
  const { bg = C.PANEL, bgAlpha = 1, border = C.PANEL_BORDER, borderWidth = 1, radius = 10 } = opts;
  gfx.fillStyle(bg, bgAlpha);
  gfx.fillRoundedRect(x, y, w, h, radius);
  if (borderWidth > 0) {
    gfx.lineStyle(borderWidth, border, 1);
    gfx.strokeRoundedRect(x, y, w, h, radius);
  }
}

export function createPanel(
  scene: Phaser.Scene,
  x: number, y: number,
  w: number, h: number,
  opts: PanelOptions = {},
): Phaser.GameObjects.Graphics {
  const gfx = scene.add.graphics();
  drawPanel(gfx, x, y, w, h, opts);
  return gfx;
}

// ─── Button ───────────────────────────────────────────────────────────────────
export interface ButtonConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  bg?: number;
  bgHover?: number;
  textColor?: string;
  fontSize?: number;
  radius?: number;
  disabled?: boolean;
  onClick: () => void;
}

export function createButton(scene: Phaser.Scene, cfg: ButtonConfig): Phaser.GameObjects.Container {
  const {
    x, y, w, h, label,
    bg = C.BTN_PRIMARY,
    bgHover = C.BTN_PRIMARY_HV,
    textColor = TC.BRIGHT,
    fontSize = 15,
    radius = 7,
    disabled = false,
    onClick,
  } = cfg;

  const container = scene.add.container(x, y);
  const gfx = scene.add.graphics();

  const paint = (color: number, alpha = 1) => {
    gfx.clear();
    gfx.fillStyle(color, alpha);
    gfx.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    gfx.lineStyle(1, disabled ? 0x304050 : C.PANEL_BORDER, 0.6);
    gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  };

  paint(disabled ? C.BTN_NEUTRAL : bg, disabled ? 0.5 : 1);

  const txt = scene.add.text(0, 0, label, {
    fontSize: `${fontSize}px`,
    color: disabled ? TC.MUTED : textColor,
    fontFamily: FONT,
    fontStyle: 'bold',
  }).setOrigin(0.5);

  if (!disabled) {
    const hit = scene.add.rectangle(0, 0, w, h, 0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover',  () => paint(bgHover));
    hit.on('pointerout',   () => paint(bg));
    hit.on('pointerdown',  () => { paint(bgHover); onClick(); });
    container.add([gfx, txt, hit]);
  } else {
    container.add([gfx, txt]);
  }

  return container;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
export interface ProgressBarHandle {
  container: Phaser.GameObjects.Container;
  /** Update fill to progress 0–1 */
  setProgress(p: number): void;
}

export function createProgressBar(
  scene: Phaser.Scene,
  x: number, y: number,
  w: number, h: number,
  initialProgress: number,
  fillColor: number = C.XP_BAR,
  bgColor: number = C.BTN_NEUTRAL,
): ProgressBarHandle {
  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();
  bg.fillStyle(bgColor, 1);
  bg.fillRoundedRect(0, 0, w, h, h / 2);
  bg.lineStyle(1, C.PANEL_BORDER, 0.8);
  bg.strokeRoundedRect(0, 0, w, h, h / 2);

  const fill = scene.add.graphics();
  const drawFill = (p: number) => {
    fill.clear();
    const fw = Math.max(0, (w - 4) * Math.min(1, p));
    if (fw > 0) {
      fill.fillStyle(fillColor, 1);
      fill.fillRoundedRect(2, 2, fw, h - 4, (h - 4) / 2);
    }
  };
  drawFill(initialProgress);
  container.add([bg, fill]);

  return { container, setProgress: drawFill };
}

// ─── Category badge chip ──────────────────────────────────────────────────────
export function createCategoryBadge(
  scene: Phaser.Scene,
  x: number, y: number,
  emoji: string,
  name: string,
  hexColor: number,
  cssColor: string,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const h = 28;
  const pad = 14;

  const label = `${emoji} ${name}`;
  const txt = scene.add.text(0, 0, label, {
    fontSize: '13px',
    color: cssColor,
    fontFamily: FONT,
    fontStyle: 'bold',
  }).setOrigin(0.5);

  const w = txt.width + pad * 2;
  const bg = scene.add.graphics();
  bg.fillStyle(hexColor, 0.18);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  bg.lineStyle(1, hexColor, 0.7);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);

  container.add([bg, txt]);
  return container;
}

// ─── Urgency pill ─────────────────────────────────────────────────────────────
export function urgencyStyle(urgency: string): { hex: number; css: string } {
  switch (urgency) {
    case 'critical': return { hex: 0xa01818, css: '#e04040' };
    case 'high':     return { hex: 0xa05010, css: '#e07020' };
    case 'medium':   return { hex: 0x908010, css: '#d4b010' };
    default:         return { hex: 0x187a30, css: '#22cc60' };
  }
}

export function createUrgencyPill(
  scene: Phaser.Scene,
  x: number, y: number,
  urgency: string,
): Phaser.GameObjects.Container {
  const { hex, css } = urgencyStyle(urgency);
  const label = `● ${urgency.toUpperCase()}`;
  return createCategoryBadge(scene, x, y, '', label, hex, css);
}

// ─── Dim overlay ──────────────────────────────────────────────────────────────
export function createDimOverlay(
  scene: Phaser.Scene,
  alpha = 0.72,
  depth = 0,
): Phaser.GameObjects.Graphics {
  const { width, height } = scene.scale;
  const gfx = scene.add.graphics().setDepth(depth);
  gfx.fillStyle(0x000000, alpha);
  gfx.fillRect(0, 0, width, height);
  return gfx;
}

// ─── Section header ───────────────────────────────────────────────────────────
export function sectionHeader(
  scene: Phaser.Scene,
  x: number, y: number,
  title: string,
  hexColor: number,
  cssColor: string,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const gfx = scene.add.graphics();
  gfx.fillStyle(hexColor, 0.6);
  gfx.fillRect(0, -1, 3, 18);
  const txt = scene.add.text(10, 0, title, {
    fontSize: '13px',
    color: cssColor,
    fontFamily: FONT,
    fontStyle: 'bold',
    letterSpacing: 1,
  }).setOrigin(0, 0.5);
  container.add([gfx, txt]);
  return container;
}
