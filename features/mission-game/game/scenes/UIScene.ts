import * as Phaser from 'phaser';
import { SCENE_KEYS, C, TC, GAME_WIDTH, UI_BAR_HEIGHT } from '../constants';
import { PlayerStateManager } from '../data/playerState';
import { getRelatedItemsByIds } from '../data/relatedItems';
import { createButton, createProgressBar, FONT } from '../ui/UIHelpers';
import type { ProgressBarHandle } from '../ui/UIHelpers';

type OverlayPanel = 'leaderboard' | 'inventory' | null;

/**
 * UIScene is a persistent HUD overlay launched by BootScene.
 * It reads the session-scoped PlayerStateManager, so React can later mirror the
 * same state through DPALGame.getPlayerState() or EventBridge callbacks.
 */
export class UIScene extends Phaser.Scene {
  private xpBar!: ProgressBarHandle;
  private levelText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private pointsText!: Phaser.GameObjects.Text;
  private zoneText!: Phaser.GameObjects.Text;
  private activePanel: OverlayPanel = null;
  private panelContainer?: Phaser.GameObjects.Container;
  private lastSnapshot = '';

  constructor() {
    super({ key: SCENE_KEYS.UI, active: false });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.buildHudShell();
    this.buildStatCluster();
    this.buildActionButtons();
    this.refreshFromPlayerState(true);
    this.scene.bringToTop(SCENE_KEYS.UI);
  }

  update(): void {
    this.refreshFromPlayerState();
    this.scene.bringToTop(SCENE_KEYS.UI);
  }

  private buildHudShell(): void {
    const bg = this.add.graphics();
    bg.fillStyle(C.PANEL, 0.98);
    bg.fillRect(0, 0, GAME_WIDTH, UI_BAR_HEIGHT);
    bg.lineStyle(1, C.PANEL_BORDER, 1);
    bg.lineBetween(0, UI_BAR_HEIGHT - 1, GAME_WIDTH, UI_BAR_HEIGHT - 1);

    this.add.text(18, UI_BAR_HEIGHT / 2, 'DPAL MISSION OPS', {
      fontSize: '14px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(170, UI_BAR_HEIGHT / 2, 'Civic field console', {
      fontSize: '10px',
      color: TC.MUTED,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
  }

  private buildStatCluster(): void {
    const cy = UI_BAR_HEIGHT / 2;
    const levelX = 310;

    const levelRing = this.add.rectangle(levelX, cy, 38, 30, C.BTN_NEUTRAL, 1);
    levelRing.setStrokeStyle(1, C.XP_BAR, 0.95);

    this.add.text(levelX - 54, cy, 'LEVEL', {
      fontSize: '10px',
      color: TC.MUTED,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.levelText = this.add.text(levelX, cy, '1', {
      fontSize: '15px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const xpBarX = 350;
    const xpBarW = 190;
    this.xpBar = createProgressBar(this, xpBarX, cy - 6, xpBarW, 12, 0, C.XP_BAR);
    this.xpText = this.add.text(xpBarX + xpBarW + 10, cy, '0 / 200 XP', {
      fontSize: '11px',
      color: TC.SECONDARY,
      fontFamily: FONT,
    }).setOrigin(0, 0.5);

    this.add.text(650, cy, 'DPAL POINTS', {
      fontSize: '10px',
      color: TC.MUTED,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.pointsText = this.add.text(744, cy, '0', {
      fontSize: '15px',
      color: TC.GOLD,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(825, cy, 'ZONE', {
      fontSize: '10px',
      color: TC.MUTED,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.zoneText = this.add.text(866, cy, 'City Map', {
      fontSize: '13px',
      color: TC.SECONDARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
  }

  private buildActionButtons(): void {
    const cy = UI_BAR_HEIGHT / 2;

    createButton(this, {
      x: GAME_WIDTH - 245,
      y: cy,
      w: 132,
      h: 34,
      label: 'Leaderboard',
      bg: C.BTN_NEUTRAL,
      bgHover: C.BTN_NEUTRAL_HV,
      textColor: TC.SECONDARY,
      fontSize: 11,
      onClick: () => this.togglePanel('leaderboard'),
    });

    createButton(this, {
      x: GAME_WIDTH - 96,
      y: cy,
      w: 126,
      h: 34,
      label: 'Inventory',
      bg: C.BTN_PRIMARY,
      bgHover: C.BTN_PRIMARY_HV,
      textColor: TC.BRIGHT,
      fontSize: 11,
      onClick: () => this.togglePanel('inventory'),
    });
  }

  private refreshFromPlayerState(force = false): void {
    const ps = PlayerStateManager.get();
    const snapshot = [
      ps.level,
      ps.xp,
      ps.xpToNextLevel,
      ps.points,
      ps.currentZone,
      ps.inventory.join(','),
    ].join('|');

    if (!force && snapshot === this.lastSnapshot) return;
    this.lastSnapshot = snapshot;

    this.levelText.setText(String(ps.level));
    this.xpBar.setProgress(ps.xp / ps.xpToNextLevel);
    this.xpText.setText(`${ps.xp} / ${ps.xpToNextLevel} XP`);
    this.pointsText.setText(String(ps.points));
    this.zoneText.setText(ps.currentZone);

    if (this.activePanel) {
      this.renderPanel(this.activePanel);
    }
  }

  private togglePanel(panel: Exclude<OverlayPanel, null>): void {
    this.activePanel = this.activePanel === panel ? null : panel;
    this.renderPanel(this.activePanel);
  }

  private renderPanel(panel: OverlayPanel): void {
    this.panelContainer?.destroy();
    this.panelContainer = undefined;
    if (!panel) return;

    const panelW = 320;
    const panelH = panel === 'leaderboard' ? 238 : 214;
    const panelX = GAME_WIDTH - panelW - 20;
    const panelY = UI_BAR_HEIGHT + 12;
    const container = this.add.container(panelX, panelY).setDepth(200);
    this.panelContainer = container;

    const bg = this.add.rectangle(0, 0, panelW, panelH, C.PANEL, 0.98).setOrigin(0);
    bg.setStrokeStyle(1, C.PANEL_BORDER, 0.95);
    const strip = this.add.rectangle(0, 0, panelW, 4, panel === 'leaderboard' ? C.POINTS_BAR : C.BTN_PRIMARY, 1).setOrigin(0);

    const title = this.add.text(18, 20, panel === 'leaderboard' ? 'Community Leaderboard' : 'Field Inventory', {
      fontSize: '15px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    });

    const close = this.add.text(panelW - 18, 20, 'Close', {
      fontSize: '11px',
      color: TC.MUTED,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.togglePanel(panel));

    container.add([bg, strip, title, close]);

    if (panel === 'leaderboard') {
      this.renderLeaderboard(container);
    } else {
      this.renderInventory(container);
    }
  }

  private renderLeaderboard(container: Phaser.GameObjects.Container): void {
    const ps = PlayerStateManager.get();
    const rows = [
      { rank: 1, name: 'You', points: ps.points, active: true },
      { rank: 2, name: 'Neighborhood Team', points: Math.max(80, ps.points - 30), active: false },
      { rank: 3, name: 'Civic Scouts', points: 65, active: false },
      { rank: 4, name: 'River Watch', points: 40, active: false },
    ].sort((a, b) => b.points - a.points);

    rows.forEach((row, index) => {
      const y = 58 + index * 36;
      const bg = this.add.rectangle(16, y, 288, 28, row.active ? C.BTN_PRIMARY : C.PANEL_LT, row.active ? 0.28 : 0.58).setOrigin(0);
      bg.setStrokeStyle(1, row.active ? C.BTN_PRIMARY : C.PANEL_BORDER, row.active ? 0.8 : 0.4);

      const text = this.add.text(28, y + 14, `${index + 1}. ${row.name}`, {
        fontSize: '12px',
        color: row.active ? TC.BRIGHT : TC.SECONDARY,
        fontFamily: FONT,
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      const points = this.add.text(292, y + 14, `${row.points}`, {
        fontSize: '12px',
        color: TC.GOLD,
        fontFamily: FONT,
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      container.add([bg, text, points]);
    });
  }

  private renderInventory(container: Phaser.GameObjects.Container): void {
    const ids = PlayerStateManager.get().inventory;
    const items = getRelatedItemsByIds(ids);

    if (items.length === 0) {
      const empty = this.add.text(18, 62, 'No field items collected yet.', {
        fontSize: '12px',
        color: TC.MUTED,
        fontFamily: FONT,
      });
      const hint = this.add.text(18, 88, 'Start a mission and collect related items to fill this panel.', {
        fontSize: '11px',
        color: TC.SECONDARY,
        fontFamily: FONT,
        wordWrap: { width: 280 },
      });
      container.add([empty, hint]);
      return;
    }

    items.slice(0, 4).forEach((item, index) => {
      const y = 58 + index * 34;
      const bg = this.add.rectangle(16, y, 288, 26, C.PANEL_LT, 0.6).setOrigin(0);
      bg.setStrokeStyle(1, C.PANEL_BORDER, 0.4);

      const name = this.add.text(28, y + 13, item.name, {
        fontSize: '12px',
        color: TC.PRIMARY,
        fontFamily: FONT,
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      const type = this.add.text(292, y + 13, item.type.toUpperCase(), {
        fontSize: '10px',
        color: TC.SECONDARY,
        fontFamily: FONT,
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      container.add([bg, name, type]);
    });
  }
}
