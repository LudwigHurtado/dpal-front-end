import * as Phaser from 'phaser';
import { SCENE_KEYS, C, TC, GAME_WIDTH, GAME_HEIGHT, MAP_TOP, CATEGORY_COLORS } from '../constants';
import { Mission, cloneChecklist, ChecklistItem } from '../data/missions';
import { Location } from '../data/locations';
import { getCategoryById } from '../data/categories';
import { getRelatedItemsByIds } from '../data/relatedItems';
import { PlayerStateManager } from '../data/playerState';
import {
  createPanel, createButton, createProgressBar, sectionHeader, FONT,
} from '../ui/UIHelpers';
import type { ProgressBarHandle } from '../ui/UIHelpers';
import { EventBridge } from '../EventBridge';

interface SceneData { mission: Mission; location: Location; }

const PANEL_W = 680;
const PANEL_X = (GAME_WIDTH - PANEL_W) / 2;
const PANEL_Y = MAP_TOP + 20;

export class MissionActionScene extends Phaser.Scene {
  private mission!: Mission;
  private location!: Location;
  private checklist: ChecklistItem[] = [];

  private progressBar!: ProgressBarHandle;
  private progressText!: Phaser.GameObjects.Text;
  private submitBtn?: Phaser.GameObjects.Container;
  private checkRows: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: SCENE_KEYS.MISSION_ACTION });
  }

  init(data: SceneData): void {
    this.mission = data.mission;
    this.location = data.location;
    this.checklist = cloneChecklist(this.mission);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.BG);
    this.drawBackground();
    this.buildUI();
  }

  // ─── Background ──────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, C.STREET, 0.3);
    for (let y = MAP_TOP; y < GAME_HEIGHT; y += 70) { gfx.moveTo(0, y); gfx.lineTo(GAME_WIDTH, y); }
    for (let x = 0; x < GAME_WIDTH; x += 90) { gfx.moveTo(x, MAP_TOP); gfx.lineTo(x, GAME_HEIGHT); }
    gfx.strokePath();

    // Left info column background
    const colX = 20, colY = MAP_TOP + 10;
    const colW = PANEL_X - 40, colH = GAME_HEIGHT - colY - 20;
    createPanel(this, colX, colY, colW, colH, { bg: C.PANEL, radius: 10 });
    this.buildInfoColumn(colX, colY, colW, colH);

    // Right column background
    const rColX = PANEL_X + PANEL_W + 20, rColY = MAP_TOP + 10;
    const rColW = GAME_WIDTH - rColX - 20, rColH = colH;
    if (rColW > 80) {
      createPanel(this, rColX, rColY, rColW, rColH, { bg: C.PANEL, radius: 10 });
      this.buildItemsColumn(rColX, rColY, rColW, rColH);
    }
  }

  private buildInfoColumn(x: number, y: number, w: number, _h: number): void {
    const cat = getCategoryById(this.mission.categoryId);
    const hex = cat?.hexColor ?? C.BTN_PRIMARY;
    const css = cat?.cssColor ?? TC.SECONDARY;
    let cy = y + 20;

    this.add.text(x + w / 2, cy, cat?.emoji ?? '📍', {
      fontSize: '28px', fontFamily: '"Segoe UI Emoji", Arial, sans-serif',
    }).setOrigin(0.5);
    cy += 38;

    this.add.text(x + w / 2, cy, cat?.name ?? '', {
      fontSize: '12px', color: css, fontFamily: FONT, fontStyle: 'bold', align: 'center',
      wordWrap: { width: w - 16 },
    }).setOrigin(0.5);
    cy += 26;

    const gfx = this.add.graphics();
    gfx.lineStyle(1, hex, 0.4);
    gfx.lineBetween(x + 16, cy, x + w - 16, cy);
    cy += 14;

    sectionHeader(this, x + 12, cy, 'LOCATION', hex, css);
    cy += 22;
    this.add.text(x + 12, cy, this.location.name, {
      fontSize: '12px', color: TC.PRIMARY, fontFamily: FONT,
      wordWrap: { width: w - 24 },
    });
    cy += 32;

    sectionHeader(this, x + 12, cy, 'ZONE', hex, css);
    cy += 22;
    this.add.text(x + 12, cy, this.location.zoneName, {
      fontSize: '12px', color: TC.SECONDARY, fontFamily: FONT,
    });
    cy += 34;

    sectionHeader(this, x + 12, cy, 'REWARD', hex, css);
    cy += 22;
    this.add.text(x + 12, cy, `✦ ${this.mission.rewardXp} XP`, {
      fontSize: '13px', color: TC.CAT_EDU, fontFamily: FONT, fontStyle: 'bold',
    });
    cy += 20;
    this.add.text(x + 12, cy, `◆ ${this.mission.rewardPoints} pts`, {
      fontSize: '13px', color: TC.GOLD, fontFamily: FONT, fontStyle: 'bold',
    });
  }

  private buildItemsColumn(x: number, y: number, w: number, _h: number): void {
    const items = getRelatedItemsByIds(this.mission.relatedItemIds);
    const cat = getCategoryById(this.mission.categoryId);
    const hex = cat?.hexColor ?? C.BTN_PRIMARY;
    const css = cat?.cssColor ?? TC.SECONDARY;
    let cy = y + 18;

    sectionHeader(this, x + 12, cy, 'ITEMS', hex, css);
    cy += 26;

    items.forEach(item => {
      const gfx = this.add.graphics();
      gfx.fillStyle(C.PANEL_LT, 0.6);
      gfx.fillRoundedRect(x + 8, cy - 4, w - 16, 38, 6);

      this.add.text(x + 18, cy + 15, item.emoji, {
        fontSize: '16px', fontFamily: '"Segoe UI Emoji", Arial, sans-serif',
      }).setOrigin(0, 0.5);

      this.add.text(x + 38, cy + 8, item.name, {
        fontSize: '12px', color: TC.PRIMARY, fontFamily: FONT, fontStyle: 'bold',
      });
      this.add.text(x + 38, cy + 22, item.description, {
        fontSize: '10px', color: TC.MUTED, fontFamily: FONT,
        wordWrap: { width: w - 50 },
      });

      // Collect button — x is centered, so subtract half-width to right-align
      createButton(this, {
        x: x + w - 14 - 28,
        y: cy + 15,
        w: 56, h: 24,
        label: 'COLLECT',
        fontSize: 10,
        bg: C.BTN_NEUTRAL,
        bgHover: C.BTN_NEUTRAL_HV,
        textColor: TC.SECONDARY,
        onClick: () => PlayerStateManager.addToInventory(item.id),
      });

      cy += 46;
    });
  }

  // ─── Main checklist UI ───────────────────────────────────────────────────────

  private buildUI(): void {
    const panelH = 100 + this.checklist.length * 56 + 80;
    createPanel(this, PANEL_X, PANEL_Y, PANEL_W, panelH, {
      bg: C.PANEL, border: C.PANEL_BORDER, borderWidth: 2, radius: 12,
    });

    const cat = getCategoryById(this.mission.categoryId);
    const hex = cat?.hexColor ?? C.BTN_PRIMARY;
    const css = cat?.cssColor ?? TC.SECONDARY;

    // Accent top strip
    const accentGfx = this.add.graphics();
    accentGfx.fillStyle(hex, 0.8);
    accentGfx.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 5, { tl: 12, tr: 12, bl: 0, br: 0 });

    let y = PANEL_Y + 22;

    // Mission title
    this.add.text(PANEL_X + 20, y, this.mission.title, {
      fontSize: '20px', color: TC.PRIMARY, fontFamily: FONT, fontStyle: 'bold',
      wordWrap: { width: PANEL_W - 40 },
    });
    y += 36;

    // In-progress indicator
    const indGfx = this.add.graphics();
    indGfx.fillStyle(hex, 0.15);
    indGfx.fillRoundedRect(PANEL_X + 20, y, PANEL_W - 40, 26, 6);
    const dot = this.add.graphics();
    dot.fillStyle(hex, 1);
    dot.fillCircle(PANEL_X + 34, y + 13, 5);
    this.add.text(PANEL_X + 46, y + 13, 'MISSION IN PROGRESS', {
      fontSize: '11px', color: css, fontFamily: FONT, fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(0, 0.5);
    y += 38;

    // Progress bar
    sectionHeader(this, PANEL_X + 20, y, 'PROGRESS', hex, css);
    y += 20;
    this.progressBar = createProgressBar(
      this, PANEL_X + 20, y, PANEL_W - 40 - 80, 10, 0, hex,
    );
    this.progressText = this.add.text(PANEL_X + PANEL_W - 22, y + 5, '0 / 0', {
      fontSize: '12px', color: TC.SECONDARY, fontFamily: FONT,
    }).setOrigin(1, 0.5);
    y += 26;

    // Checklist
    sectionHeader(this, PANEL_X + 20, y, 'TASKS', hex, css);
    y += 22;
    this.checklist.forEach((item, idx) => {
      const row = this.buildCheckRow(item, idx, PANEL_X + 20, y, PANEL_W - 40, hex, css);
      this.checkRows.push(row);
      y += 56;
    });

    // Submit button (initially disabled)
    this.submitBtn = createButton(this, {
      x: PANEL_X + PANEL_W - 20 - 160,
      y: y + 24,
      w: 160, h: 42,
      label: '📤 SUBMIT PROOF',
      bg: C.BTN_NEUTRAL,
      bgHover: C.BTN_NEUTRAL_HV,
      disabled: true,
      onClick: () => {},
    });

    createButton(this, {
      x: PANEL_X + 20 + 90,
      y: y + 24,
      w: 150, h: 42,
      label: '← BACK',
      bg: C.BTN_NEUTRAL,
      bgHover: C.BTN_NEUTRAL_HV,
      textColor: TC.SECONDARY,
      onClick: () => this.scene.start(SCENE_KEYS.MISSION_DETAIL, {
        mission: this.mission,
        location: this.location,
        allMissions: [this.mission],
      }),
    });

    this.updateProgress();
  }

  private buildCheckRow(
    item: ChecklistItem,
    idx: number,
    x: number, y: number,
    w: number,
    hex: number,
    css: string,
  ): Phaser.GameObjects.Container {
    const h = 48;
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    const paintBg = (done: boolean) => {
      bg.clear();
      bg.fillStyle(done ? hex : C.PANEL_LT, done ? 0.12 : 0.5);
      bg.fillRoundedRect(0, 0, w, h, 8);
      bg.lineStyle(1, done ? hex : C.PANEL_BORDER, done ? 0.5 : 0.4);
      bg.strokeRoundedRect(0, 0, w, h, 8);
    };
    paintBg(item.completed);

    // Checkbox
    const box = this.add.graphics();
    const paintBox = (done: boolean) => {
      box.clear();
      if (done) {
        box.fillStyle(hex, 1);
        box.fillRoundedRect(12, 14, 20, 20, 4);
        box.fillStyle(0xffffff, 1);
        // Checkmark via lines
        box.lineStyle(2.5, 0xffffff, 1);
        box.moveTo(16, 24); box.lineTo(20, 28); box.lineTo(28, 18);
        box.strokePath();
      } else {
        box.lineStyle(2, C.PANEL_BORDER, 0.8);
        box.strokeRoundedRect(12, 14, 20, 20, 4);
      }
    };
    paintBox(item.completed);

    const label = this.add.text(42, h / 2, item.label, {
      fontSize: '14px',
      color: item.completed ? css : TC.PRIMARY,
      fontFamily: FONT,
    }).setOrigin(0, 0.5);

    const btnText = item.completed ? '✓ Done' : 'Complete';
    const stepBtn = createButton(this, {
      x: w - 50,
      y: h / 2,
      w: 90, h: 30,
      label: btnText,
      bg: item.completed ? C.BTN_NEUTRAL : C.BTN_SUCCESS,
      bgHover: item.completed ? C.BTN_NEUTRAL : C.BTN_SUCCESS_HV,
      fontSize: 12,
      disabled: item.completed,
      onClick: () => this.completeStep(idx, paintBg, paintBox, label, stepBtn),
    });

    container.add([bg, box, label, stepBtn]);
    return container;
  }

  // ─── State updates ────────────────────────────────────────────────────────────

  private completeStep(
    idx: number,
    paintBg: (done: boolean) => void,
    paintBox: (done: boolean) => void,
    label: Phaser.GameObjects.Text,
    btn: Phaser.GameObjects.Container,
  ): void {
    this.checklist[idx].completed = true;
    paintBg(true);
    paintBox(true);

    const cat = getCategoryById(this.mission.categoryId);
    const css = cat?.cssColor ?? TC.SECONDARY;
    label.setColor(css);

    // Replace button with done indicator
    btn.destroy();
    this.updateProgress();

    if (this.allDone()) this.enableSubmit();
  }

  private updateProgress(): void {
    const done = this.checklist.filter(c => c.completed).length;
    const total = this.checklist.length;
    this.progressBar.setProgress(done / total);
    this.progressText.setText(`${done} / ${total}`);
  }

  private allDone(): boolean {
    return this.checklist.every(c => c.completed);
  }

  private enableSubmit(): void {
    if (!this.submitBtn) return;
    this.submitBtn.destroy();

    this.submitBtn = createButton(this, {
      x: PANEL_X + PANEL_W - 20 - 160,
      y: PANEL_Y + 100 + this.checklist.length * 56 + 80 - 18,
      w: 160, h: 42,
      label: '📤 SUBMIT PROOF',
      bg: C.BTN_SUCCESS,
      bgHover: C.BTN_SUCCESS_HV,
      textColor: TC.BRIGHT,
      onClick: () => this.submitMission(),
    });

    // Success pulse on the button
    this.tweens.add({
      targets: this.submitBtn,
      scaleX: 1.04, scaleY: 1.04,
      duration: 600, yoyo: true, repeat: 2,
    });
  }

  private submitMission(): void {
    const { leveled, newLevel } = PlayerStateManager.addXP(this.mission.rewardXp);
    PlayerStateManager.addPoints(this.mission.rewardPoints);
    const newBadges = PlayerStateManager.completeMission(this.mission.id, this.mission.categoryId);

    EventBridge.emit('mission_completed', {
      missionId: this.mission.id,
      xp: this.mission.rewardXp,
      points: this.mission.rewardPoints,
    });

    this.scene.start(SCENE_KEYS.REWARD, {
      mission: this.mission,
      location: this.location,
      xpEarned: this.mission.rewardXp,
      pointsEarned: this.mission.rewardPoints,
      leveled,
      newLevel,
      newBadges,
    });
  }
}
