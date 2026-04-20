import Phaser from 'phaser';
import { SCENE_KEYS, C, TC, GAME_WIDTH, GAME_HEIGHT, MAP_TOP } from '../constants';
import { Mission } from '../data/missions';
import { Location } from '../data/locations';
import { getCategoryById } from '../data/categories';
import { getRelatedItemsByIds, RelatedItem } from '../data/relatedItems';
import { PlayerStateManager } from '../data/playerState';
import {
  createPanel, createButton, createProgressBar, createCategoryBadge,
  createUrgencyPill, sectionHeader, itemTypeStyle, FONT,
} from '../ui/UIHelpers';
import { EventBridge } from '../EventBridge';

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_W  = 900;
const CARD_H  = 540;
const LEFT_W  = 230;   // illustration column width
const PAD     = 20;    // inner padding
const RIGHT_X = LEFT_W + PAD * 2;          // right-column x offset inside card
const RIGHT_W = CARD_W - RIGHT_X - PAD;    // right-column content width
const BTN_H   = 52;                        // button row height at card bottom

interface SceneData {
  mission:     Mission;
  location:    Location;
  allMissions: Mission[];
}

export class MissionDetailScene extends Phaser.Scene {
  private mission!:     Mission;
  private location!:    Location;
  private allMissions!: Mission[];

  // Active mission index when location has several missions
  private missionIndex = 0;

  constructor() {
    super({ key: SCENE_KEYS.MISSION_DETAIL });
  }

  init(data: SceneData): void {
    this.mission      = data.mission;
    this.location     = data.location;
    this.allMissions  = data.allMissions;
    this.missionIndex = data.allMissions.findIndex(m => m.id === data.mission.id);
    if (this.missionIndex < 0) this.missionIndex = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.BG);
    this.cameras.main.fadeIn(180, 0, 0, 0);

    this.drawBackground();
    this.buildCard();

    EventBridge.emit('mission_selected', {
      missionId: this.mission.id,
      locationId: this.location.id,
    });
  }

  // ─── Blurred city-grid background ────────────────────────────────────────────

  private drawBackground(): void {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, C.STREET, 0.28);
    for (let y = MAP_TOP; y < GAME_HEIGHT; y += 60) {
      gfx.moveTo(0, y); gfx.lineTo(GAME_WIDTH, y);
    }
    for (let x = 0; x < GAME_WIDTH; x += 80) {
      gfx.moveTo(x, MAP_TOP); gfx.lineTo(x, GAME_HEIGHT);
    }
    gfx.strokePath();

    // Soft vignette to make card pop
    const vigGfx = this.add.graphics();
    vigGfx.fillStyle(0x000000, 0.45);
    vigGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  // ─── Card scaffold ────────────────────────────────────────────────────────────

  private buildCard(): void {
    const cx    = GAME_WIDTH  / 2;
    const cy    = GAME_HEIGHT / 2 + MAP_TOP / 2;
    const cardX = cx - CARD_W / 2;
    const cardY = cy - CARD_H / 2;

    const cat       = getCategoryById(this.mission.categoryId);
    const accentHex = cat?.hexColor ?? C.BTN_PRIMARY;
    const accentCss = cat?.cssColor ?? TC.SECONDARY;

    // ── Card shadow ───────────────────────────────────────────────────────────
    const shadowGfx = this.add.graphics();
    shadowGfx.fillStyle(0x000000, 0.5);
    shadowGfx.fillRoundedRect(cardX + 6, cardY + 6, CARD_W, CARD_H, 14);

    // ── Card body ─────────────────────────────────────────────────────────────
    createPanel(this, cardX, cardY, CARD_W, CARD_H, {
      bg: C.PANEL, border: C.PANEL_BORDER, borderWidth: 2, radius: 14,
    });

    // Category-colored top strip (6 px)
    const stripGfx = this.add.graphics();
    stripGfx.fillStyle(accentHex, 1);
    stripGfx.fillRoundedRect(cardX, cardY, CARD_W, 6, { tl: 14, tr: 14, bl: 0, br: 0 });

    // Vertical divider between columns
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, accentHex, 0.15);
    divGfx.moveTo(cardX + LEFT_W + PAD, cardY + 6);
    divGfx.lineTo(cardX + LEFT_W + PAD, cardY + CARD_H - BTN_H - 8);
    divGfx.strokePath();

    // ── Left column ───────────────────────────────────────────────────────────
    this.buildLeftColumn(cardX + PAD, cardY + PAD + 6, LEFT_W, CARD_H - BTN_H - 12, accentHex, accentCss);

    // ── Right column ──────────────────────────────────────────────────────────
    this.buildRightColumn(cardX + RIGHT_X, cardY + PAD + 6, RIGHT_W, CARD_H - BTN_H - 12, accentHex, accentCss);

    // ── Button row ────────────────────────────────────────────────────────────
    this.buildButtonRow(cardX, cardY + CARD_H - BTN_H, CARD_W, accentHex);

    // ── Mission switcher (dots) if location has multiple missions ─────────────
    if (this.allMissions.length > 1) {
      this.buildMissionSwitcher(cardX + CARD_W / 2, cardY + CARD_H - BTN_H - 16);
    }
  }

  // ─── Left column: illustration + quick-stats ──────────────────────────────────

  private buildLeftColumn(
    x: number, y: number, w: number, _h: number,
    accentHex: number, accentCss: string,
  ): void {
    // Illustration panel
    const illH = 170;
    this.drawIllustration(x, y, w, illH, accentHex);
    let cy = y + illH + 14;

    // Category badge
    const cat = getCategoryById(this.mission.categoryId);
    if (cat) {
      createCategoryBadge(this, x + w / 2, cy, cat.emoji, cat.name, accentHex, accentCss);
      cy += 34;
    }

    // Urgency
    createUrgencyPill(this, x + w / 2, cy, this.mission.urgency);
    cy += 34;

    // Thin rule
    const ruleGfx = this.add.graphics();
    ruleGfx.lineStyle(1, accentHex, 0.25);
    ruleGfx.lineBetween(x + 8, cy, x + w - 8, cy);
    cy += 12;

    // Location & zone
    this.statLine(x + 4, cy, '📍', this.location.name, accentCss);     cy += 22;
    this.statLine(x + 4, cy, '🗺', this.location.zoneName, TC.MUTED);  cy += 22;

    // Thin rule
    ruleGfx.lineStyle(1, accentHex, 0.18);
    ruleGfx.lineBetween(x + 8, cy, x + w - 8, cy);
    cy += 12;

    // Rewards
    this.rewardLine(x + 4, cy, `✦ ${this.mission.rewardXp} XP`, TC.CAT_EDU);   cy += 22;
    this.rewardLine(x + 4, cy, `◆ ${this.mission.rewardPoints} pts`, TC.GOLD); cy += 22;
    this.rewardLine(x + 4, cy, '+ badge progress', TC.MUTED);
  }

  /** Small icon + label stat line used in the left column. */
  private statLine(x: number, y: number, icon: string, label: string, color: string): void {
    this.add.text(x, y, icon, {
      fontSize: '12px', fontFamily: '"Segoe UI Emoji", Arial, sans-serif',
    }).setOrigin(0, 0.5);
    this.add.text(x + 20, y, label, {
      fontSize: '12px', color, fontFamily: FONT,
      wordWrap: { width: LEFT_W - 24 },
    }).setOrigin(0, 0.5);
  }

  private rewardLine(x: number, y: number, label: string, color: string): void {
    this.add.text(x, y, label, {
      fontSize: '13px', color, fontFamily: FONT, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
  }

  // ─── Category illustration (Phaser shapes only) ───────────────────────────────

  private drawIllustration(
    x: number, y: number, w: number, h: number, accentHex: number,
  ): void {
    const gfx = this.add.graphics();

    // Frame background
    gfx.fillStyle(C.PANEL_LT, 1);
    gfx.fillRoundedRect(x, y, w, h, 8);
    gfx.lineStyle(1, accentHex, 0.4);
    gfx.strokeRoundedRect(x, y, w, h, 8);

    const cx = x + w / 2;
    const cy = y + h / 2;

    switch (this.mission.categoryId) {
      case 'road_hazards':
        this.drawRoadIllustration(gfx, x, y, w, h, cx, cy, accentHex);
        break;
      case 'lost_pets':
        this.drawPetsIllustration(gfx, x, y, w, h, cx, cy, accentHex);
        break;
      case 'environmental':
        this.drawEnvIllustration(gfx, x, y, w, h, cx, cy, accentHex);
        break;
      case 'education':
        this.drawEduIllustration(gfx, x, y, w, h, cx, cy, accentHex);
        break;
      default:
        this.drawDefaultIllustration(gfx, cx, cy, accentHex);
    }

    // Urgency ribbon (top-right corner)
    const cat = getCategoryById(this.mission.categoryId);
    if (cat) {
      this.add.text(cx, y + h - 14, cat.emoji, {
        fontSize: '26px', fontFamily: '"Segoe UI Emoji", Arial, sans-serif',
      }).setOrigin(0.5, 1);
    }
  }

  private drawRoadIllustration(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    cx: number, cy: number, hex: number,
  ): void {
    // Sky
    g.fillStyle(0x0a1830, 1);
    g.fillRect(x + 2, y + 2, w - 4, h - 4);
    // Road surface
    g.fillStyle(0x1a1a2a, 1);
    g.fillRect(x + 2, cy - 10, w - 4, h / 2 + 8);
    // Road markings
    g.lineStyle(2, 0xf0e060, 0.6);
    for (let rx = x + 20; rx < x + w - 10; rx += 28) {
      g.moveTo(rx, cy + 10); g.lineTo(rx + 14, cy + 10);
    }
    g.strokePath();
    // Pothole
    g.fillStyle(0x0a0a14, 1);
    g.fillEllipse(cx - 10, cy + 18, 44, 22);
    g.lineStyle(1.5, 0x303040, 0.9);
    g.strokeEllipse(cx - 10, cy + 18, 44, 22);
    // Traffic cone
    g.fillStyle(hex, 0.9);
    g.fillTriangle(cx + 30, cy + 6, cx + 22, cy + 30, cx + 38, cy + 30);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(cx + 24, cy + 14, 14, 4);
    // Caution exclamation
    this.add.text(cx - 40, cy - 28, '⚠', {
      fontSize: '22px', color: '#e0a020', fontFamily: FONT,
    }).setOrigin(0.5);
  }

  private drawPetsIllustration(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    cx: number, cy: number, hex: number,
  ): void {
    // Park background
    g.fillStyle(0x0a1e10, 1);
    g.fillRect(x + 2, y + 2, w - 4, h - 4);
    // Grass
    g.fillStyle(0x183a20, 1);
    g.fillRect(x + 2, cy + 5, w - 4, h / 2 + 3);
    // Trees
    [[cx - 60, cy - 15], [cx + 50, cy - 20]].forEach(([tx, ty]) => {
      g.fillStyle(0x1a5a28, 0.9);
      g.fillCircle(tx, ty, 20);
      g.fillStyle(0x3a2218, 1);
      g.fillRect(tx - 4, ty + 15, 8, 20);
    });
    // Paw print (large center)
    g.fillStyle(hex, 0.7);
    g.fillCircle(cx, cy + 4, 14);
    [[-14, -10], [14, -10], [-20, 0], [20, 0]].forEach(([px, py]) => {
      g.fillCircle(cx + px, cy + py, 6);
    });
    // Lost pet flyer (right)
    g.fillStyle(0xf0e8d0, 0.85);
    g.fillRect(cx + 32, cy - 18, 36, 44);
    g.lineStyle(1, 0x808060, 0.5);
    g.strokeRect(cx + 32, cy - 18, 36, 44);
    this.add.text(cx + 50, cy - 6, '?', {
      fontSize: '22px', color: '#c03030', fontFamily: FONT, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private drawEnvIllustration(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    cx: number, cy: number, hex: number,
  ): void {
    // Sky
    g.fillStyle(0x081420, 1);
    g.fillRect(x + 2, y + 2, w - 4, h - 4);
    // Water surface
    g.fillStyle(0x0c3048, 1);
    g.fillRect(x + 2, cy + 2, w - 4, h / 2 + 2);
    // Wave lines (approximated with short diagonal segments)
    g.lineStyle(1.5, 0x1a88b0, 0.5);
    for (let wy = cy + 14; wy < y + h - 12; wy += 14) {
      for (let wx = x + 6; wx < x + w - 16; wx += 24) {
        g.moveTo(wx, wy);
        g.lineTo(wx + 6, wy - 5);
        g.lineTo(wx + 12, wy + 5);
        g.lineTo(wx + 18, wy);
      }
    }
    g.strokePath();
    // Hazard barrels
    [[cx - 30, cy - 8], [cx - 10, cy - 12], [cx + 8, cy - 6]].forEach(([bx, by], i) => {
      g.fillStyle(i === 1 ? 0xc04010 : hex, 0.85);
      g.fillRect(bx, by, 16, 26);
      g.lineStyle(1, 0x202020, 0.6);
      g.strokeRect(bx, by, 16, 26);
      g.lineStyle(1, 0x404040, 0.5);
      g.lineBetween(bx, by + 8, bx + 16, by + 8);
      g.lineBetween(bx, by + 18, bx + 16, by + 18);
    });
    // Warning sign
    g.fillStyle(0xd0a010, 0.9);
    g.fillTriangle(cx + 42, cy - 26, cx + 30, cy - 4, cx + 54, cy - 4);
    this.add.text(cx + 42, cy - 13, '!', {
      fontSize: '12px', color: '#1a1a1a', fontFamily: FONT, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private drawEduIllustration(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    cx: number, cy: number, hex: number,
  ): void {
    // Sky
    g.fillStyle(0x0a1428, 1);
    g.fillRect(x + 2, y + 2, w - 4, h - 4);
    // Ground
    g.fillStyle(0x161e30, 1);
    g.fillRect(x + 2, cy + 16, w - 4, h / 2 + 2);
    // School building body
    const bx = cx - 44, bw = 88, bh = 52;
    g.fillStyle(0x1e3060, 0.9);
    g.fillRect(bx, cy - 24, bw, bh);
    // Roof triangle
    g.fillStyle(hex, 0.75);
    g.fillTriangle(bx - 6, cy - 24, cx, cy - 52, bx + bw + 6, cy - 24);
    // Windows (2 × 2)
    [[bx + 10, cy - 16], [bx + 32, cy - 16], [bx + 54, cy - 16], [bx + 10, cy - 2], [bx + 54, cy - 2]].forEach(([wx, wy]) => {
      g.fillStyle(0x8ac0f0, 0.6);
      g.fillRect(wx, wy, 14, 10);
      g.lineStyle(1, 0x4080a0, 0.4);
      g.strokeRect(wx, wy, 14, 10);
    });
    // Door
    g.fillStyle(0x2a1808, 0.9);
    g.fillRect(cx - 8, cy + 4, 16, 20);
    // Flag
    g.lineStyle(1.5, 0x808090, 0.9);
    g.moveTo(cx, cy - 52); g.lineTo(cx, cy - 66);
    g.strokePath();
    g.fillStyle(0xd02020, 0.9);
    g.fillRect(cx, cy - 66, 18, 10);
  }

  private drawDefaultIllustration(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number, hex: number,
  ): void {
    g.fillStyle(hex, 0.3);
    g.fillCircle(cx, cy, 40);
    g.lineStyle(2, hex, 0.7);
    g.strokeCircle(cx, cy, 40);
  }

  // ─── Right column: title, description, proof, progress, items ─────────────────

  private buildRightColumn(
    x: number, y: number, w: number, _h: number,
    accentHex: number, accentCss: string,
  ): void {
    let cy = y;

    // ── Mission title ──────────────────────────────────────────────────────────
    const titleTxt = this.add.text(x, cy, this.mission.title, {
      fontSize: '20px', color: TC.PRIMARY, fontFamily: FONT, fontStyle: 'bold',
      wordWrap: { width: w },
    });
    cy += titleTxt.height + 10;

    // Divider under title
    this.add.graphics()
      .lineStyle(1, accentHex, 0.3)
      .lineBetween(x, cy, x + w, cy);
    cy += 12;

    // ── Description ────────────────────────────────────────────────────────────
    sectionHeader(this, x, cy, 'DESCRIPTION', accentHex, accentCss);
    cy += 22;
    const descTxt = this.add.text(x, cy, this.mission.description, {
      fontSize: '13px', color: TC.PRIMARY, fontFamily: FONT,
      wordWrap: { width: w }, lineSpacing: 3,
    });
    cy += descTxt.height + 12;

    // ── Proof required ─────────────────────────────────────────────────────────
    sectionHeader(this, x, cy, 'PROOF REQUIRED', accentHex, accentCss);
    cy += 22;
    this.add.text(x, cy, `📷  ${this.mission.proofRequired}`, {
      fontSize: '12px', color: TC.SECONDARY, fontFamily: FONT,
      wordWrap: { width: w },
    });
    cy += 32;

    // ── Progress bar (initialized at 0%) ───────────────────────────────────────
    sectionHeader(this, x, cy, 'MISSION PROGRESS', accentHex, accentCss);
    cy += 22;

    const { container: pbContainer } = createProgressBar(
      this, x, cy, w, 10, 0, accentHex,
    );
    const totalTasks = this.mission.checklist.length;
    this.add.text(x + w, cy + 5, `0 / ${totalTasks} tasks`, {
      fontSize: '11px', color: TC.MUTED, fontFamily: FONT,
    }).setOrigin(1, 0.5);
    cy += 22;

    // ── Related items ──────────────────────────────────────────────────────────
    const items = getRelatedItemsByIds(this.mission.relatedItemIds);
    if (items.length > 0) {
      sectionHeader(this, x, cy, 'RELATED ITEMS', accentHex, accentCss);
      cy += 22;
      this.buildItemCards(items, x, cy, w, accentHex);
    }
  }

  // ─── Related item cards ───────────────────────────────────────────────────────

  private buildItemCards(
    items: RelatedItem[], x: number, y: number, maxW: number, accentHex: number,
  ): void {
    const cardW = 130, cardH = 54, gap = 8;
    const perRow = Math.floor((maxW + gap) / (cardW + gap));

    items.slice(0, 6).forEach((item, idx) => {
      const col  = idx % perRow;
      const row  = Math.floor(idx / perRow);
      const cx   = x + col * (cardW + gap);
      const cy   = y + row * (cardH + gap);

      const { hex: typeHex, css: typeCss } = itemTypeStyle(item.type);

      // Card background
      const gfx = this.add.graphics();
      gfx.fillStyle(C.PANEL_LT, 0.75);
      gfx.fillRoundedRect(cx, cy, cardW, cardH, 7);
      gfx.lineStyle(1, typeHex, 0.45);
      gfx.strokeRoundedRect(cx, cy, cardW, cardH, 7);

      // Emoji
      this.add.text(cx + 10, cy + cardH / 2, item.emoji, {
        fontSize: '20px',
        fontFamily: '"Segoe UI Emoji", Arial, sans-serif',
      }).setOrigin(0, 0.5);

      // Name
      this.add.text(cx + 36, cy + 10, item.name, {
        fontSize: '11px', color: TC.PRIMARY, fontFamily: FONT, fontStyle: 'bold',
        wordWrap: { width: cardW - 40 },
      });

      // Type badge (bottom of card)
      const typeLabelGfx = this.add.graphics();
      typeLabelGfx.fillStyle(typeHex, 0.25);
      typeLabelGfx.fillRoundedRect(cx + 34, cy + cardH - 18, cardW - 38, 12, 3);
      this.add.text(cx + cardW / 2 + 12, cy + cardH - 12, item.type.toUpperCase(), {
        fontSize: '9px', color: typeCss, fontFamily: FONT, fontStyle: 'bold', letterSpacing: 1,
      }).setOrigin(0.5, 0.5);
    });
  }

  // ─── Mission switcher dots ────────────────────────────────────────────────────

  private buildMissionSwitcher(cx: number, y: number): void {
    const dotR = 5, gap = 14;
    const total = this.allMissions.length;
    const startX = cx - ((total - 1) * gap) / 2;

    this.allMissions.forEach((m, i) => {
      const dx = startX + i * gap;
      const isDone = PlayerStateManager.isMissionCompleted(m.id);
      const isActive = i === this.missionIndex;

      const dot = this.add.graphics();
      dot.fillStyle(isActive ? C.BTN_PRIMARY : (isDone ? 0x1a5a28 : C.BTN_NEUTRAL), 1);
      dot.fillCircle(dx, y, isActive ? dotR : dotR - 1);
      if (isActive) {
        dot.lineStyle(1.5, C.BTN_PRIMARY_HV, 0.9);
        dot.strokeCircle(dx, y, dotR + 2);
      }

      // Make dot clickable to switch mission
      const hit = this.add.circle(dx, y, dotR + 4, 0, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (i === this.missionIndex) return;
        this.scene.restart({
          mission:     this.allMissions[i],
          location:    this.location,
          allMissions: this.allMissions,
        });
      });
    });

    // Label
    const avail = this.allMissions.filter(m => !PlayerStateManager.isMissionCompleted(m.id)).length;
    this.add.text(cx, y + 14,
      `Mission ${this.missionIndex + 1} of ${total}  ·  ${avail} available`,
      { fontSize: '10px', color: TC.MUTED, fontFamily: FONT },
    ).setOrigin(0.5, 0);
  }

  // ─── Button row ───────────────────────────────────────────────────────────────

  private buildButtonRow(cardX: number, rowY: number, cardW: number, accentHex: number): void {
    // Separator line
    this.add.graphics()
      .lineStyle(1, accentHex, 0.18)
      .lineBetween(cardX + PAD, rowY, cardX + cardW - PAD, rowY);

    const btnY = rowY + BTN_H / 2;
    const alreadyDone = PlayerStateManager.isMissionCompleted(this.mission.id);

    // Back button
    createButton(this, {
      x: cardX + PAD + 90,
      y: btnY,
      w: 160, h: 38,
      label: '← BACK TO MAP',
      bg: C.BTN_NEUTRAL,
      bgHover: C.BTN_NEUTRAL_HV,
      textColor: TC.SECONDARY,
      fontSize: 13,
      onClick: () => this.cameras.main.fadeOut(140, 0, 0, 0, (_: Phaser.Cameras.Scene2D.Camera, t: number) => {
        if (t === 1) this.scene.start(SCENE_KEYS.WORLD_MAP);
      }),
    });

    // Start / completed button
    createButton(this, {
      x: cardX + cardW - PAD - 110,
      y: btnY,
      w: 200, h: 38,
      label: alreadyDone ? '✓ ALREADY COMPLETED' : '▶  START MISSION',
      bg: alreadyDone ? C.BTN_NEUTRAL : C.BTN_SUCCESS,
      bgHover: alreadyDone ? C.BTN_NEUTRAL : C.BTN_SUCCESS_HV,
      disabled: alreadyDone,
      fontSize: 13,
      onClick: () => this.startMission(),
    });

    // Keyboard hint
    this.add.text(cardX + cardW / 2, btnY, 'ESC — back to map', {
      fontSize: '10px', color: TC.MUTED, fontFamily: FONT,
    }).setOrigin(0.5);

    // ESC key shortcut
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start(SCENE_KEYS.WORLD_MAP));
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────

  private startMission(): void {
    EventBridge.emit('mission_started', { missionId: this.mission.id });
    this.cameras.main.fadeOut(140, 0, 0, 0, (_: Phaser.Cameras.Scene2D.Camera, t: number) => {
      if (t === 1) {
        this.scene.start(SCENE_KEYS.MISSION_ACTION, {
          mission:  this.mission,
          location: this.location,
        });
      }
    });
  }
}
