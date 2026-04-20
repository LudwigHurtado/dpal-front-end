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
  createUrgencyPill,
  FONT,
  itemTypeStyle,
  sectionHeader,
} from '../ui/UIHelpers';
import { EventBridge } from '../EventBridge';

interface SceneData {
  mission: Mission;
  location: Location;
  allMissions?: Mission[];
}

const CARD_W = 880;
const CARD_H = 520;
const CARD_X = (GAME_WIDTH - CARD_W) / 2;
const CARD_Y = MAP_TOP + 48;
const PAD = 28;
const LEFT_W = 250;
const RIGHT_X = CARD_X + PAD + LEFT_W + 30;
const RIGHT_W = CARD_W - LEFT_W - PAD * 2 - 30;

export class MissionDetailScene extends Phaser.Scene {
  private mission!: Mission;
  private location!: Location;
  private allMissions: Mission[] = [];

  constructor() {
    super({ key: SCENE_KEYS.MISSION_DETAIL });
  }

  init(data: SceneData): void {
    this.mission = data.mission;
    this.location = data.location;
    this.allMissions = data.allMissions ?? [data.mission];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.BG);
    this.cameras.main.fadeIn(140, 0, 0, 0);

    this.drawBackground();
    this.buildDetailCard();
    this.bindKeyboard();

    EventBridge.emit('mission_selected', {
      missionId: this.mission.id,
      locationId: this.location.id,
    });
  }

  private drawBackground(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, C.STREET, 0.32);

    for (let y = MAP_TOP; y <= GAME_HEIGHT; y += 64) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }

    for (let x = 0; x <= GAME_WIDTH; x += 80) {
      grid.lineBetween(x, MAP_TOP, x, GAME_HEIGHT);
    }

    const veil = this.add.rectangle(
      GAME_WIDTH / 2,
      (GAME_HEIGHT + MAP_TOP) / 2,
      GAME_WIDTH,
      GAME_HEIGHT - MAP_TOP,
      0x000000,
      0.42,
    );
    veil.setOrigin(0.5);
  }

  private buildDetailCard(): void {
    const category = getCategoryById(this.mission.categoryId);
    const accent = this.getAccent();

    createPanel(this, CARD_X, CARD_Y, CARD_W, CARD_H, {
      bg: C.PANEL,
      border: accent.hex,
      borderWidth: 2,
      radius: 12,
    });

    this.add.rectangle(CARD_X, CARD_Y, CARD_W, 8, accent.hex, 1).setOrigin(0, 0);
    this.add.rectangle(RIGHT_X - 16, CARD_Y + 26, 1, CARD_H - 92, accent.hex, 0.28).setOrigin(0, 0);

    this.buildSummaryColumn(category?.name ?? this.mission.categoryId, accent);
    this.buildMissionColumn(category?.name ?? this.mission.categoryId, accent);
    this.buildActions(accent);
  }

  private buildSummaryColumn(categoryName: string, accent: { hex: number; css: string }): void {
    const x = CARD_X + PAD;
    let y = CARD_Y + PAD + 8;

    this.drawCategoryIcon(x, y, LEFT_W, 138, accent.hex);
    y += 162;

    this.add.text(x, y, categoryName.toUpperCase(), {
      fontSize: '14px',
      color: accent.css,
      fontFamily: FONT,
      fontStyle: 'bold',
      wordWrap: { width: LEFT_W },
    });
    y += 28;

    createUrgencyPill(this, x + 70, y + 10, this.mission.urgency);
    y += 46;

    this.add.text(x, y, 'LOCATION', {
      fontSize: '12px',
      color: TC.MUTED,
      fontFamily: FONT,
      fontStyle: 'bold',
    });
    y += 20;

    this.add.text(x, y, this.location.name, {
      fontSize: '15px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
      wordWrap: { width: LEFT_W },
    });
    y += 44;

    this.add.text(x, y, this.location.zoneName, {
      fontSize: '12px',
      color: TC.SECONDARY,
      fontFamily: FONT,
      wordWrap: { width: LEFT_W },
    });
    y += 42;

    this.add.rectangle(x, y, LEFT_W, 1, accent.hex, 0.28).setOrigin(0, 0.5);
    y += 22;

    this.add.text(x, y, `${this.mission.rewardPoints} points`, {
      fontSize: '15px',
      color: TC.GOLD,
      fontFamily: FONT,
      fontStyle: 'bold',
    });
    y += 26;

    this.add.text(x, y, `${this.mission.rewardXp} XP`, {
      fontSize: '15px',
      color: TC.CAT_EDU,
      fontFamily: FONT,
      fontStyle: 'bold',
    });
  }

  private buildMissionColumn(categoryName: string, accent: { hex: number; css: string }): void {
    let y = CARD_Y + PAD + 2;

    this.add.text(RIGHT_X, y, this.mission.title, {
      fontSize: '24px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
      wordWrap: { width: RIGHT_W },
    });
    y += 66;

    this.add.text(RIGHT_X, y, `Category: ${categoryName}`, {
      fontSize: '13px',
      color: accent.css,
      fontFamily: FONT,
      fontStyle: 'bold',
    });
    y += 34;

    sectionHeader(this, RIGHT_X, y, 'DESCRIPTION', accent.hex, accent.css);
    y += 24;
    const description = this.add.text(RIGHT_X, y, this.mission.description, {
      fontSize: '14px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      lineSpacing: 4,
      wordWrap: { width: RIGHT_W },
    });
    y += description.height + 22;

    sectionHeader(this, RIGHT_X, y, 'PROOF REQUIRED', accent.hex, accent.css);
    y += 24;
    const proof = this.add.text(RIGHT_X, y, this.mission.proofRequired, {
      fontSize: '13px',
      color: TC.SECONDARY,
      fontFamily: FONT,
      lineSpacing: 3,
      wordWrap: { width: RIGHT_W },
    });
    y += proof.height + 24;

    this.buildProgress(RIGHT_X, y, RIGHT_W, accent.hex);
    y += 56;

    sectionHeader(this, RIGHT_X, y, 'RELATED ITEMS', accent.hex, accent.css);
    y += 24;
    this.buildRelatedItems(getRelatedItemsByIds(this.mission.relatedItemIds), RIGHT_X, y, RIGHT_W);
  }

  private buildProgress(x: number, y: number, w: number, accentHex: number): void {
    sectionHeader(this, x, y, 'PROGRESS', accentHex, this.getAccent().css);
    y += 24;

    createProgressBar(this, x, y, w, 12, 0, accentHex);
    this.add.text(x + w, y + 22, `0 / ${this.mission.checklist.length} tasks`, {
      fontSize: '12px',
      color: TC.MUTED,
      fontFamily: FONT,
    }).setOrigin(1, 0);
  }

  private buildRelatedItems(items: RelatedItem[], x: number, y: number, maxW: number): void {
    if (items.length === 0) {
      this.add.text(x, y, 'No related items for this mission.', {
        fontSize: '13px',
        color: TC.MUTED,
        fontFamily: FONT,
      });
      return;
    }

    const cardW = 166;
    const cardH = 58;
    const gap = 10;
    const columns = Math.max(1, Math.floor((maxW + gap) / (cardW + gap)));

    items.slice(0, 6).forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const cardX = x + col * (cardW + gap);
      const cardY = y + row * (cardH + gap);
      const style = itemTypeStyle(item.type);

      const card = this.add.container(cardX, cardY);
      const bg = this.add.rectangle(0, 0, cardW, cardH, C.PANEL_LT, 0.82).setOrigin(0);
      bg.setStrokeStyle(1, style.hex, 0.55);

      const iconBox = this.add.rectangle(14, 14, 30, 30, style.hex, 0.24).setOrigin(0);
      iconBox.setStrokeStyle(1, style.hex, 0.8);
      const icon = this.add.text(29, 29, item.name.slice(0, 1).toUpperCase(), {
        fontSize: '15px',
        color: style.css,
        fontFamily: FONT,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const name = this.add.text(54, 11, item.name, {
        fontSize: '12px',
        color: TC.PRIMARY,
        fontFamily: FONT,
        fontStyle: 'bold',
        wordWrap: { width: cardW - 62 },
      });

      const type = this.add.text(54, 34, item.type.toUpperCase(), {
        fontSize: '10px',
        color: style.css,
        fontFamily: FONT,
        fontStyle: 'bold',
      });

      card.add([bg, iconBox, icon, name, type]);
    });
  }

  private buildActions(accent: { hex: number; css: string }): void {
    const y = CARD_Y + CARD_H - 42;
    const alreadyDone = PlayerStateManager.isMissionCompleted(this.mission.id);

    this.add.rectangle(CARD_X + PAD, y - 34, CARD_W - PAD * 2, 1, accent.hex, 0.22).setOrigin(0, 0.5);

    createButton(this, {
      x: CARD_X + PAD + 78,
      y,
      w: 156,
      h: 38,
      label: 'Back to Map',
      bg: C.BTN_NEUTRAL,
      bgHover: C.BTN_NEUTRAL_HV,
      textColor: TC.SECONDARY,
      fontSize: 13,
      onClick: () => this.backToMap(),
    });

    createButton(this, {
      x: CARD_X + CARD_W - PAD - 88,
      y,
      w: 176,
      h: 38,
      label: alreadyDone ? 'Completed' : 'Start Mission',
      bg: alreadyDone ? C.BTN_NEUTRAL : C.BTN_SUCCESS,
      bgHover: alreadyDone ? C.BTN_NEUTRAL_HV : C.BTN_SUCCESS_HV,
      disabled: alreadyDone,
      fontSize: 13,
      onClick: () => this.startMission(),
    });

    if (this.allMissions.length > 1) {
      this.add.text(CARD_X + CARD_W / 2, y, `${this.allMissions.length} missions at this location`, {
        fontSize: '11px',
        color: TC.MUTED,
        fontFamily: FONT,
      }).setOrigin(0.5);
    }
  }

  private drawCategoryIcon(x: number, y: number, w: number, h: number, accentHex: number): void {
    const box = this.add.rectangle(x, y, w, h, C.PANEL_LT, 1).setOrigin(0);
    box.setStrokeStyle(1, accentHex, 0.65);

    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const g = this.add.graphics();

    g.fillStyle(accentHex, 0.16);
    g.fillCircle(centerX, centerY, 52);
    g.lineStyle(3, accentHex, 0.8);

    switch (this.mission.categoryId) {
      case 'road_hazards':
        g.lineBetween(centerX - 62, centerY + 30, centerX + 62, centerY + 30);
        g.lineBetween(centerX - 36, centerY + 30, centerX - 8, centerY - 38);
        g.lineBetween(centerX + 36, centerY + 30, centerX + 8, centerY - 38);
        g.lineStyle(2, 0xffffff, 0.55);
        g.lineBetween(centerX, centerY + 20, centerX, centerY - 24);
        break;
      case 'lost_pets':
        g.fillStyle(accentHex, 0.62);
        g.fillCircle(centerX, centerY + 10, 18);
        g.fillCircle(centerX - 24, centerY - 12, 9);
        g.fillCircle(centerX - 8, centerY - 24, 9);
        g.fillCircle(centerX + 8, centerY - 24, 9);
        g.fillCircle(centerX + 24, centerY - 12, 9);
        break;
      case 'environmental':
        g.lineStyle(3, accentHex, 0.85);
        g.beginPath();
        g.moveTo(centerX - 54, centerY + 8);
        g.lineTo(centerX - 28, centerY - 8);
        g.lineTo(centerX, centerY + 8);
        g.lineTo(centerX + 28, centerY - 8);
        g.lineTo(centerX + 54, centerY + 8);
        g.strokePath();
        g.fillStyle(accentHex, 0.38);
        g.fillTriangle(centerX, centerY - 44, centerX - 28, centerY + 36, centerX + 30, centerY + 22);
        break;
      case 'education':
        g.strokeRect(centerX - 50, centerY - 28, 100, 58);
        g.lineBetween(centerX - 60, centerY - 28, centerX, centerY - 56);
        g.lineBetween(centerX + 60, centerY - 28, centerX, centerY - 56);
        g.lineBetween(centerX, centerY + 30, centerX, centerY - 28);
        break;
      default:
        g.strokeCircle(centerX, centerY, 44);
        g.lineBetween(centerX - 28, centerY, centerX + 28, centerY);
        g.lineBetween(centerX, centerY - 28, centerX, centerY + 28);
        break;
    }
  }

  private bindKeyboard(): void {
    this.input.keyboard?.once('keydown-ESC', () => this.backToMap());
  }

  private backToMap(): void {
    this.cameras.main.fadeOut(140, 0, 0, 0, (_camera, progress) => {
      if (progress === 1) {
        this.scene.start(SCENE_KEYS.WORLD_MAP);
      }
    });
  }

  private startMission(): void {
    EventBridge.emit('mission_started', { missionId: this.mission.id });

    this.cameras.main.fadeOut(140, 0, 0, 0, (_camera, progress) => {
      if (progress === 1) {
        this.scene.start(SCENE_KEYS.MISSION_ACTION, {
          mission: this.mission,
          location: this.location,
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
