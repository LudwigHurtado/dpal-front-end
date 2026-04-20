import * as Phaser from 'phaser';
import { SCENE_KEYS, C, TC, GAME_WIDTH, GAME_HEIGHT, MAP_TOP, CATEGORY_COLORS } from '../constants';
import { Mission } from '../data/missions';
import { Location } from '../data/locations';
import { getCategoryById } from '../data/categories';
import { getRelatedItemsByIds, RelatedItem } from '../data/relatedItems';
import { PlayerStateManager } from '../data/playerState';
import {
  createButton,
  createPanel,
  createProgressBar,
  FONT,
  itemTypeStyle,
  sectionHeader,
} from '../ui/UIHelpers';
import type { ProgressBarHandle } from '../ui/UIHelpers';
import { EventBridge } from '../EventBridge';

interface SceneData {
  mission: Mission;
  location: Location;
}

interface ActionTask {
  id: string;
  label: string;
  detail: string;
}

const PANEL_W = 760;
const PANEL_H = 560;
const PANEL_X = (GAME_WIDTH - PANEL_W) / 2;
const PANEL_Y = MAP_TOP + 38;
const PAD = 28;
const TASK_H = 68;
const TASK_GAP = 10;

const sessionTaskState = new Map<string, Set<string>>();

const ACTION_TASKS: ActionTask[] = [
  {
    id: 'confirm_location',
    label: 'Confirm location',
    detail: 'Verify that you are at the right mission marker.',
  },
  {
    id: 'inspect_issue',
    label: 'Inspect issue',
    detail: 'Review the situation and note visible risk or impact.',
  },
  {
    id: 'collect_related_item',
    label: 'Collect related item',
    detail: 'Select one relevant item or evidence cue for the report.',
  },
  {
    id: 'upload_proof',
    label: 'Upload proof',
    detail: 'Attach the required proof before submitting the mission.',
  },
];

export class MissionActionScene extends Phaser.Scene {
  private mission!: Mission;
  private location!: Location;
  private completedTaskIds!: Set<string>;
  private selectedItemId?: string;

  private progressBar!: ProgressBarHandle;
  private progressText!: Phaser.GameObjects.Text;
  private submitButton?: Phaser.GameObjects.Container;
  private taskRows: Phaser.GameObjects.Container[] = [];
  private relatedItemCards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: SCENE_KEYS.MISSION_ACTION });
  }

  init(data: SceneData): void {
    this.mission = data.mission;
    this.location = data.location;
    this.completedTaskIds = sessionTaskState.get(this.mission.id) ?? new Set<string>();
    sessionTaskState.set(this.mission.id, this.completedTaskIds);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.BG);
    this.cameras.main.fadeIn(140, 0, 0, 0);

    this.drawBackground();
    this.buildPanel();
    this.bindKeyboard();
    this.updateProgress();
  }

  private drawBackground(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, C.STREET, 0.3);

    for (let y = MAP_TOP; y <= GAME_HEIGHT; y += 70) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }

    for (let x = 0; x <= GAME_WIDTH; x += 90) {
      grid.lineBetween(x, MAP_TOP, x, GAME_HEIGHT);
    }
  }

  private buildPanel(): void {
    const accent = this.getAccent();
    const category = getCategoryById(this.mission.categoryId);

    createPanel(this, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, {
      bg: C.PANEL,
      border: accent.hex,
      borderWidth: 2,
      radius: 12,
    });

    this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, 7, accent.hex, 0.95).setOrigin(0);

    let y = PANEL_Y + PAD;
    this.add.text(PANEL_X + PAD, y, this.mission.title, {
      fontSize: '23px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
      wordWrap: { width: PANEL_W - PAD * 2 },
    });
    y += 42;

    this.add.text(PANEL_X + PAD, y, `${category?.name ?? this.mission.categoryId} mission at ${this.location.name}`, {
      fontSize: '13px',
      color: accent.css,
      fontFamily: FONT,
      fontStyle: 'bold',
      wordWrap: { width: PANEL_W - PAD * 2 },
    });
    y += 34;

    sectionHeader(this, PANEL_X + PAD, y, 'MISSION PROGRESS', accent.hex, accent.css);
    y += 26;

    this.progressBar = createProgressBar(this, PANEL_X + PAD, y, PANEL_W - PAD * 2 - 92, 12, 0, accent.hex);
    this.progressText = this.add.text(PANEL_X + PANEL_W - PAD, y + 6, '0 / 4', {
      fontSize: '13px',
      color: TC.SECONDARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);
    y += 38;

    sectionHeader(this, PANEL_X + PAD, y, 'CHECKLIST', accent.hex, accent.css);
    y += 26;

    ACTION_TASKS.forEach((task) => {
      const row = this.buildTaskRow(task, PANEL_X + PAD, y, PANEL_W - PAD * 2, accent);
      this.taskRows.push(row);
      y += TASK_H + TASK_GAP;
    });

    this.buildRelatedItems(PANEL_X + PAD, PANEL_Y + PANEL_H - 104, PANEL_W - PAD * 2, accent);
    this.buildActions(accent);
  }

  private buildTaskRow(
    task: ActionTask,
    x: number,
    y: number,
    w: number,
    accent: { hex: number; css: string },
  ): Phaser.GameObjects.Container {
    const done = this.completedTaskIds.has(task.id);
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, TASK_H, done ? accent.hex : C.PANEL_LT, done ? 0.16 : 0.72).setOrigin(0);
    bg.setStrokeStyle(1, done ? accent.hex : C.PANEL_BORDER, done ? 0.65 : 0.45);

    const marker = this.add.rectangle(18, TASK_H / 2, 28, 28, done ? accent.hex : C.BTN_NEUTRAL, 1).setOrigin(0.5);
    marker.setStrokeStyle(1, done ? accent.hex : C.PANEL_BORDER, 0.85);

    const markerText = this.add.text(18, TASK_H / 2, done ? 'OK' : '', {
      fontSize: '10px',
      color: TC.BRIGHT,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const label = this.add.text(44, 16, task.label, {
      fontSize: '15px',
      color: done ? accent.css : TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    });

    const detail = this.add.text(44, 38, task.detail, {
      fontSize: '11px',
      color: TC.MUTED,
      fontFamily: FONT,
      wordWrap: { width: w - 180 },
    });

    const button = createButton(this, {
      x: w - 58,
      y: TASK_H / 2,
      w: 116,
      h: 34,
      label: done ? 'Done' : 'Complete',
      bg: done ? C.BTN_NEUTRAL : C.BTN_SUCCESS,
      bgHover: done ? C.BTN_NEUTRAL_HV : C.BTN_SUCCESS_HV,
      disabled: done,
      fontSize: 12,
      onClick: () => this.completeTask(task.id),
    });

    container.add([bg, marker, markerText, label, detail, button]);
    return container;
  }

  private buildRelatedItems(
    x: number,
    y: number,
    w: number,
    accent: { hex: number; css: string },
  ): void {
    const items = getRelatedItemsByIds(this.mission.relatedItemIds).slice(0, 4);

    sectionHeader(this, x, y, 'RELATED ITEMS', accent.hex, accent.css);
    y += 26;

    if (items.length === 0) {
      this.add.text(x, y, 'No related items are attached to this mission.', {
        fontSize: '12px',
        color: TC.MUTED,
        fontFamily: FONT,
      });
      return;
    }

    const cardW = Math.floor((w - 30) / 4);
    items.forEach((item, index) => {
      const card = this.buildRelatedItemCard(item, x + index * (cardW + 10), y, cardW, 52);
      this.relatedItemCards.push(card);
    });
  }

  private buildRelatedItemCard(
    item: RelatedItem,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Phaser.GameObjects.Container {
    const style = itemTypeStyle(item.type);
    const selected = this.selectedItemId === item.id;
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, selected ? style.hex : C.PANEL_LT, selected ? 0.22 : 0.78).setOrigin(0);
    bg.setStrokeStyle(1, style.hex, selected ? 0.95 : 0.55);

    const shortName = item.name.length > 16 ? `${item.name.slice(0, 15)}...` : item.name;
    const name = this.add.text(12, 10, shortName, {
      fontSize: '12px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    });

    const type = this.add.text(12, 30, item.type.toUpperCase(), {
      fontSize: '10px',
      color: style.css,
      fontFamily: FONT,
      fontStyle: 'bold',
    });

    const hit = this.add.rectangle(0, 0, w, h, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.selectedItemId = item.id;
      PlayerStateManager.addToInventory(item.id);
      this.completeTask('collect_related_item');
      bg.setFillStyle(style.hex, 0.22);
      bg.setStrokeStyle(1, style.hex, 0.95);
    });

    container.add([bg, name, type, hit]);
    return container;
  }

  private buildActions(accent: { hex: number; css: string }): void {
    const y = PANEL_Y + PANEL_H - 34;
    this.add.rectangle(PANEL_X + PAD, y - 34, PANEL_W - PAD * 2, 1, accent.hex, 0.24).setOrigin(0, 0.5);

    createButton(this, {
      x: PANEL_X + PAD + 76,
      y,
      w: 152,
      h: 38,
      label: 'Back',
      bg: C.BTN_NEUTRAL,
      bgHover: C.BTN_NEUTRAL_HV,
      textColor: TC.SECONDARY,
      fontSize: 13,
      onClick: () => this.backToDetail(),
    });

    this.submitButton = createButton(this, {
      x: PANEL_X + PANEL_W - PAD - 84,
      y,
      w: 168,
      h: 38,
      label: this.allDone() ? 'Submit Proof' : 'Submit Locked',
      bg: this.allDone() ? C.BTN_SUCCESS : C.BTN_NEUTRAL,
      bgHover: this.allDone() ? C.BTN_SUCCESS_HV : C.BTN_NEUTRAL_HV,
      disabled: !this.allDone(),
      fontSize: 13,
      onClick: () => this.submitMission(),
    });
  }

  private completeTask(taskId: string): void {
    if (this.completedTaskIds.has(taskId)) return;

    this.completedTaskIds.add(taskId);
    sessionTaskState.set(this.mission.id, this.completedTaskIds);
    this.rebuildTaskRows();
    this.updateProgress();

    if (this.allDone()) {
      this.enableSubmit();
    }
  }

  private rebuildTaskRows(): void {
    this.taskRows.forEach(row => row.destroy());
    this.taskRows = [];

    const accent = this.getAccent();
    let y = PANEL_Y + PAD + 42 + 34 + 26 + 38 + 26;
    ACTION_TASKS.forEach((task) => {
      const row = this.buildTaskRow(task, PANEL_X + PAD, y, PANEL_W - PAD * 2, accent);
      this.taskRows.push(row);
      y += TASK_H + TASK_GAP;
    });
  }

  private updateProgress(): void {
    const done = this.completedTaskIds.size;
    const total = ACTION_TASKS.length;
    this.progressBar.setProgress(done / total);
    this.progressText.setText(`${done} / ${total}`);
  }

  private enableSubmit(): void {
    if (!this.submitButton) return;

    this.submitButton.destroy();
    const y = PANEL_Y + PANEL_H - 34;
    this.submitButton = createButton(this, {
      x: PANEL_X + PANEL_W - PAD - 84,
      y,
      w: 168,
      h: 38,
      label: 'Submit Proof',
      bg: C.BTN_SUCCESS,
      bgHover: C.BTN_SUCCESS_HV,
      fontSize: 13,
      onClick: () => this.submitMission(),
    });

    this.tweens.add({
      targets: this.submitButton,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 420,
      yoyo: true,
      repeat: 1,
    });
  }

  private allDone(): boolean {
    return ACTION_TASKS.every(task => this.completedTaskIds.has(task.id));
  }

  private bindKeyboard(): void {
    this.input.keyboard?.once('keydown-ESC', () => this.backToDetail());
  }

  private backToDetail(): void {
    this.cameras.main.fadeOut(140, 0, 0, 0, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) {
        this.scene.start(SCENE_KEYS.MISSION_DETAIL, {
          mission: this.mission,
          location: this.location,
          allMissions: [this.mission],
        });
      }
    });
  }

  private submitMission(): void {
    if (!this.allDone()) return;

    const { leveled, newLevel } = PlayerStateManager.addXP(this.mission.rewardXp);
    PlayerStateManager.addPoints(this.mission.rewardPoints);
    const newBadges = PlayerStateManager.completeMission(this.mission.id, this.mission.categoryId);

    EventBridge.emit('mission_completed', {
      missionId: this.mission.id,
      xp: this.mission.rewardXp,
      points: this.mission.rewardPoints,
    });

    this.cameras.main.fadeOut(140, 0, 0, 0, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) {
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
    });
  }

  private getAccent(): { hex: number; css: string } {
    return CATEGORY_COLORS[this.mission.categoryId] ?? {
      hex: C.BTN_PRIMARY,
      css: TC.SECONDARY,
    };
  }
}
