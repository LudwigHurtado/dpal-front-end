import Phaser from 'phaser';
import { SCENE_KEYS, C, TC, GAME_WIDTH, UI_BAR_HEIGHT } from '../constants';
import { PlayerStateManager } from '../data/playerState';
import { createProgressBar, FONT } from '../ui/UIHelpers';
import type { ProgressBarHandle } from '../ui/UIHelpers';

/**
 * UIScene — persistent overlay that always runs in parallel with the active game scene.
 * Shows: player level, XP bar, DPAL points, current zone.
 * Updates every frame from PlayerStateManager.
 */
export class UIScene extends Phaser.Scene {
  private xpBar!: ProgressBarHandle;
  private levelText!: Phaser.GameObjects.Text;
  private pointsText!: Phaser.GameObjects.Text;
  private zoneText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.UI, active: false });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    // Bar background
    const gfx = this.add.graphics();
    gfx.fillStyle(C.PANEL, 0.97);
    gfx.fillRect(0, 0, GAME_WIDTH, UI_BAR_HEIGHT);
    gfx.lineStyle(1, C.PANEL_BORDER, 1);
    gfx.lineBetween(0, UI_BAR_HEIGHT, GAME_WIDTH, UI_BAR_HEIGHT);

    // DPAL logo / title
    this.add.text(18, UI_BAR_HEIGHT / 2, '◈ DPAL MISSION OPS', {
      fontSize: '14px',
      color: TC.SECONDARY,
      fontFamily: FONT,
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0, 0.5);

    // Level circle
    const lvlGfx = this.add.graphics();
    const lx = 250, ly = UI_BAR_HEIGHT / 2;
    lvlGfx.lineStyle(2, C.XP_BAR, 1);
    lvlGfx.strokeCircle(lx, ly, 18);
    lvlGfx.fillStyle(C.BTN_NEUTRAL, 1);
    lvlGfx.fillCircle(lx, ly, 16);

    this.levelText = this.add.text(lx, ly, '1', {
      fontSize: '15px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(lx + 24, ly - 8, 'LEVEL', {
      fontSize: '9px',
      color: TC.MUTED,
      fontFamily: FONT,
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0, 0.5);

    // XP bar
    const xpBarX = 310, xpBarW = 200, xpBarH = 10;
    this.xpBar = createProgressBar(this, xpBarX, UI_BAR_HEIGHT / 2 - xpBarH / 2, xpBarW, xpBarH, 0, C.XP_BAR);

    this.xpText = this.add.text(xpBarX + xpBarW + 8, UI_BAR_HEIGHT / 2, '0 / 200 XP', {
      fontSize: '11px',
      color: TC.MUTED,
      fontFamily: FONT,
    }).setOrigin(0, 0.5);

    // Points
    this.add.text(570, UI_BAR_HEIGHT / 2, '◆', {
      fontSize: '14px',
      color: TC.GOLD,
    }).setOrigin(0, 0.5);

    this.pointsText = this.add.text(590, UI_BAR_HEIGHT / 2, '0 pts', {
      fontSize: '14px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // Zone
    this.add.text(700, UI_BAR_HEIGHT / 2, '📍', {
      fontSize: '13px',
    }).setOrigin(0, 0.5);

    this.zoneText = this.add.text(722, UI_BAR_HEIGHT / 2, 'City Map', {
      fontSize: '13px',
      color: TC.SECONDARY,
      fontFamily: FONT,
    }).setOrigin(0, 0.5);

    // Version tag (far right)
    this.add.text(GAME_WIDTH - 12, UI_BAR_HEIGHT / 2, 'v0.1 PROTOTYPE', {
      fontSize: '10px',
      color: TC.MUTED,
      fontFamily: FONT,
    }).setOrigin(1, 0.5);

    // Keep UI on top whenever a new scene launches
    this.scene.bringToTop(SCENE_KEYS.UI);
  }

  update(): void {
    const ps = PlayerStateManager.get();

    this.levelText.setText(String(ps.level));
    this.xpBar.setProgress(ps.xp / ps.xpToNextLevel);
    this.xpText.setText(`${ps.xp} / ${ps.xpToNextLevel} XP`);
    this.pointsText.setText(`${ps.points} pts`);
    this.zoneText.setText(ps.currentZone);

    // Stay on top each frame (cheap call, no visual change if already topmost)
    this.scene.bringToTop(SCENE_KEYS.UI);
  }
}
