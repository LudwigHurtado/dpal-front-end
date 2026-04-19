import Phaser from 'phaser';
import { SCENE_KEYS, C, TC, GAME_WIDTH, GAME_HEIGHT, MAP_TOP } from '../constants';
import { Mission } from '../data/missions';
import { Location } from '../data/locations';
import { getCategoryById } from '../data/categories';
import { getRelatedItemsByIds, RelatedItem } from '../data/relatedItems';
import { PlayerStateManager } from '../data/playerState';
import {
  createPanel, createButton, createCategoryBadge, createUrgencyPill,
  sectionHeader, FONT,
} from '../ui/UIHelpers';
import { EventBridge } from '../EventBridge';

interface SceneData {
  mission: Mission;
  location: Location;
  allMissions: Mission[];
}

export class MissionDetailScene extends Phaser.Scene {
  private mission!: Mission;
  private location!: Location;
  private allMissions!: Mission[];

  constructor() {
    super({ key: SCENE_KEYS.MISSION_DETAIL });
  }

  init(data: SceneData): void {
    this.mission = data.mission;
    this.location = data.location;
    this.allMissions = data.allMissions;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.BG);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + MAP_TOP / 2;

    // ── Subtle map background suggestion ─────────────────────────────────────
    this.drawMapHint();

    // ── Card panel ────────────────────────────────────────────────────────────
    const cardW = 700, cardH = 530;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    createPanel(this, cardX, cardY, cardW, cardH, {
      bg: C.PANEL,
      border: C.PANEL_BORDER,
      borderWidth: 2,
      radius: 14,
    });

    // Accent strip (category color)
    const cat = getCategoryById(this.mission.categoryId);
    const accentHex = cat?.hexColor ?? C.BTN_PRIMARY;
    const accentCss = cat?.cssColor ?? TC.SECONDARY;
    const accentGfx = this.add.graphics();
    accentGfx.fillStyle(accentHex, 0.85);
    accentGfx.fillRoundedRect(cardX, cardY, cardW, 5, { tl: 14, tr: 14, bl: 0, br: 0 });

    let y = cardY + 28;

    // ── Header row ────────────────────────────────────────────────────────────
    // Category badge — container positioned so its center aligns left
    if (cat) {
      createCategoryBadge(this, cardX + 80, y, cat.emoji, cat.name, accentHex, accentCss);
    }

    // Urgency pill — container center-aligned to the right edge
    createUrgencyPill(this, cardX + cardW - 80, y, this.mission.urgency);

    y += 28;

    // ── Mission title ─────────────────────────────────────────────────────────
    this.add.text(cardX + 22, y, this.mission.title, {
      fontSize: '22px', color: TC.PRIMARY, fontFamily: FONT, fontStyle: 'bold',
      wordWrap: { width: cardW - 44 },
    });
    y += 48;

    // ── Location ──────────────────────────────────────────────────────────────
    this.add.text(cardX + 22, y, `📍 ${this.location.name}  ·  ${this.location.zoneName}`, {
      fontSize: '13px', color: TC.SECONDARY, fontFamily: FONT,
    });
    y += 26;

    // Divider
    this.add.graphics().lineStyle(1, C.PANEL_BORDER, 0.6)
      .lineBetween(cardX + 22, y, cardX + cardW - 22, y);
    y += 16;

    // ── Description ───────────────────────────────────────────────────────────
    sectionHeader(this, cardX + 22, y, 'DESCRIPTION', accentHex, accentCss);
    y += 22;
    this.add.text(cardX + 22, y, this.mission.description, {
      fontSize: '14px', color: TC.PRIMARY, fontFamily: FONT,
      wordWrap: { width: cardW - 44 }, lineSpacing: 4,
    });
    y += 68;

    // ── Proof required ────────────────────────────────────────────────────────
    sectionHeader(this, cardX + 22, y, 'PROOF REQUIRED', accentHex, accentCss);
    y += 22;
    this.add.text(cardX + 22, y, `📷  ${this.mission.proofRequired}`, {
      fontSize: '13px', color: TC.SECONDARY, fontFamily: FONT,
      wordWrap: { width: cardW - 44 },
    });
    y += 36;

    // ── Rewards row ───────────────────────────────────────────────────────────
    this.drawRewardRow(cardX + 22, y, cardW - 44);
    y += 42;

    // ── Related items ─────────────────────────────────────────────────────────
    const items = getRelatedItemsByIds(this.mission.relatedItemIds);
    if (items.length > 0) {
      sectionHeader(this, cardX + 22, y, 'RELATED ITEMS', accentHex, accentCss);
      y += 22;
      this.drawRelatedItems(items, cardX + 22, y, cardW - 44);
      y += 44;
    }

    // ── Mission selector (if multiple at this location) ───────────────────────
    if (this.allMissions.length > 1) {
      const availCount = this.allMissions.filter(
        m => !PlayerStateManager.isMissionCompleted(m.id),
      ).length;
      this.add.text(cardX + 22, cardY + cardH - 80,
        `${this.allMissions.length} missions at this location  ·  ${availCount} available`, {
          fontSize: '12px', color: TC.MUTED, fontFamily: FONT,
        });
    }

    // ── Buttons ───────────────────────────────────────────────────────────────
    const btnY = cardY + cardH - 40;
    const alreadyDone = PlayerStateManager.isMissionCompleted(this.mission.id);

    createButton(this, {
      x: cardX + cardW - 22 - 160,
      y: btnY,
      w: 160, h: 40,
      label: alreadyDone ? '✓ COMPLETED' : '▶ START MISSION',
      bg: alreadyDone ? C.BTN_NEUTRAL : C.BTN_SUCCESS,
      bgHover: alreadyDone ? C.BTN_NEUTRAL : C.BTN_SUCCESS_HV,
      disabled: alreadyDone,
      onClick: () => this.startMission(),
    });

    createButton(this, {
      x: cardX + 22 + 80,
      y: btnY,
      w: 140, h: 40,
      label: '← BACK TO MAP',
      bg: C.BTN_NEUTRAL,
      bgHover: C.BTN_NEUTRAL_HV,
      textColor: TC.SECONDARY,
      onClick: () => this.scene.start(SCENE_KEYS.WORLD_MAP),
    });

    // Emit event for React host
    EventBridge.emit('mission_selected', {
      missionId: this.mission.id,
      locationId: this.location.id,
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private drawMapHint(): void {
    const gfx = this.add.graphics();
    // Subtle grid in background
    gfx.lineStyle(1, C.STREET, 0.3);
    for (let y = MAP_TOP; y < GAME_HEIGHT; y += 70) { gfx.moveTo(0, y); gfx.lineTo(GAME_WIDTH, y); }
    for (let x = 0; x < GAME_WIDTH; x += 90) { gfx.moveTo(x, MAP_TOP); gfx.lineTo(x, GAME_HEIGHT); }
    gfx.strokePath();
  }

  private drawRewardRow(x: number, y: number, w: number): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(C.PANEL_LT, 0.6);
    gfx.fillRoundedRect(x, y, w, 36, 6);

    const xpCss = TC.CAT_EDU;
    const ptCss = TC.GOLD;

    this.add.text(x + 14, y + 18, `✦ ${this.mission.rewardXp} XP`, {
      fontSize: '14px', color: xpCss, fontFamily: FONT, fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(x + 110, y + 18, `◆ ${this.mission.rewardPoints} pts`, {
      fontSize: '14px', color: ptCss, fontFamily: FONT, fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(x + w - 14, y + 18, '+ badge progress', {
      fontSize: '12px', color: TC.MUTED, fontFamily: FONT,
    }).setOrigin(1, 0.5);
  }

  private drawRelatedItems(items: RelatedItem[], x: number, y: number, maxW: number): void {
    const itemW = 100, itemH = 36, gap = 10;
    items.slice(0, 5).forEach((item, i) => {
      const ix = x + i * (itemW + gap);
      if (ix + itemW > x + maxW) return;

      const gfx = this.add.graphics();
      gfx.fillStyle(C.PANEL_LT, 0.7);
      gfx.fillRoundedRect(ix, y, itemW, itemH, 6);
      gfx.lineStyle(1, C.PANEL_BORDER, 0.6);
      gfx.strokeRoundedRect(ix, y, itemW, itemH, 6);

      this.add.text(ix + 10, y + itemH / 2, item.emoji, {
        fontSize: '15px', fontFamily: '"Segoe UI Emoji", Arial, sans-serif',
      }).setOrigin(0, 0.5);

      this.add.text(ix + 30, y + itemH / 2, item.name, {
        fontSize: '11px', color: TC.SECONDARY, fontFamily: FONT,
        wordWrap: { width: itemW - 32 },
      }).setOrigin(0, 0.5);
    });
  }

  private startMission(): void {
    EventBridge.emit('mission_started', { missionId: this.mission.id });
    this.scene.start(SCENE_KEYS.MISSION_ACTION, {
      mission: this.mission,
      location: this.location,
    });
  }
}
