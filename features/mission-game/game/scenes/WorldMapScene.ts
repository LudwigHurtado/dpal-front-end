import * as Phaser from 'phaser';
import {
  SCENE_KEYS, C, TC, GAME_WIDTH, GAME_HEIGHT, MAP_TOP, CATEGORY_COLORS,
} from '../constants';
import { locations, Location } from '../data/locations';
import { categories } from '../data/categories';
import { getMissionsByLocation } from '../data/missions';
import { getCategoryById } from '../data/categories';
import { PlayerStateManager } from '../data/playerState';
import { FONT } from '../ui/UIHelpers';

// Map content area
const MAP_H = GAME_HEIGHT - MAP_TOP - 20;

// Zone boundary fractions (normalized, relative to map area)
const Z = {
  // Vertical divider between West and Center/East
  westEdge:   0.38,
  // Vertical divider between Center and School District
  schoolEdge: 0.65,
  // Horizontal divider between Central (top) and Riverside (bottom)
  riverEdge:  0.60,
} as const;

/** Named zone: visual color used for backgrounds and labels */
const ZONE_COLORS: Record<string, { hex: number; css: string }> = {
  'Westside':        { hex: C.CAT_ROAD, css: TC.CAT_ROAD },
  'Central':         { hex: C.CAT_PETS, css: TC.CAT_PETS },
  'Riverside':       { hex: C.CAT_ENV,  css: TC.CAT_ENV  },
  'School District': { hex: C.CAT_EDU,  css: TC.CAT_EDU  },
};

interface MarkerObjects {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  ring: Phaser.GameObjects.Graphics;
  pulseTween?: Phaser.Tweens.Tween;
}

export class WorldMapScene extends Phaser.Scene {
  private markerObjects: MarkerObjects[] = [];
  private tooltip?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.WORLD_MAP });
  }

  create(): void {
    PlayerStateManager.setZone('City Map');
    this.cameras.main.setBackgroundColor(C.BG);

    this.drawZoneBackgrounds();
    this.drawStreetGrid();
    this.drawLandmarks();
    this.drawZoneDividers();
    this.drawZoneLabels();
    this.drawLegend();
    this.buildMarkers();
    this.drawFooter();

    this.events.on(Phaser.Scenes.Events.RESUME, () => this.rebuildMarkers());
  }

  // ─── Zone backgrounds ─────────────────────────────────────────────────────

  private drawZoneBackgrounds(): void {
    const gfx = this.add.graphics();
    const my = MAP_TOP;
    const wx = GAME_WIDTH * Z.westEdge;
    const sx = GAME_WIDTH * Z.schoolEdge;
    const ry = my + MAP_H * Z.riverEdge;

    // Westside (full left strip)
    gfx.fillStyle(C.CAT_ROAD, 0.06);
    gfx.fillRect(0, my, wx, MAP_H);

    // Central (center-top block)
    gfx.fillStyle(C.CAT_PETS, 0.06);
    gfx.fillRect(wx, my, sx - wx, ry - my);

    // Riverside (bottom half including left)
    gfx.fillStyle(C.CAT_ENV, 0.06);
    gfx.fillRect(0, ry, sx, GAME_HEIGHT - ry);

    // School District (full right strip)
    gfx.fillStyle(C.CAT_EDU, 0.06);
    gfx.fillRect(sx, my, GAME_WIDTH - sx, MAP_H);
  }

  // ─── Street grid ──────────────────────────────────────────────────────────

  private drawStreetGrid(): void {
    const gfx = this.add.graphics();
    const my = MAP_TOP;

    // Minor streets
    gfx.lineStyle(1, C.STREET, 0.5);
    for (let y = my + 60; y < GAME_HEIGHT - 20; y += 60) {
      gfx.moveTo(0, y); gfx.lineTo(GAME_WIDTH, y);
    }
    for (let x = 60; x < GAME_WIDTH; x += 80) {
      gfx.moveTo(x, my); gfx.lineTo(x, GAME_HEIGHT);
    }
    gfx.strokePath();

    // Main arteries
    gfx.lineStyle(2.5, C.STREET_MAIN, 0.55);
    const vArteries = [GAME_WIDTH * 0.22, GAME_WIDTH * 0.52, GAME_WIDTH * 0.78];
    const hArteries = [my + MAP_H * 0.38, my + MAP_H * 0.65];
    vArteries.forEach(ax => { gfx.moveTo(ax, my); gfx.lineTo(ax, GAME_HEIGHT); });
    hArteries.forEach(hy => { gfx.moveTo(0, hy); gfx.lineTo(GAME_WIDTH, hy); });
    gfx.strokePath();
  }

  // ─── Landmarks ────────────────────────────────────────────────────────────

  private drawLandmarks(): void {
    const gfx = this.add.graphics();
    const my = MAP_TOP;

    // City Park (Central zone)
    const pkX = GAME_WIDTH * 0.41, pkY = my + MAP_H * 0.08;
    const pkW = GAME_WIDTH * 0.20,  pkH = MAP_H * 0.30;
    gfx.fillStyle(0x164a28, 0.28);
    gfx.fillRoundedRect(pkX, pkY, pkW, pkH, 8);
    gfx.lineStyle(1, 0x1e7a38, 0.45);
    gfx.strokeRoundedRect(pkX, pkY, pkW, pkH, 8);
    this.add.text(pkX + pkW / 2, pkY + 14, '🌳 CITY PARK', {
      fontSize: '11px', color: '#24a04a', fontFamily: FONT,
    }).setOrigin(0.5, 0);

    // River (Riverside zone — bottom strip)
    const rvY = my + MAP_H * 0.66;
    gfx.fillStyle(0x0c3050, 0.40);
    gfx.fillRect(0, rvY, GAME_WIDTH * 0.52, MAP_H * 0.24);
    // Wavy line over river
    gfx.lineStyle(2, 0x1a70a0, 0.35);
    for (let wx = 0; wx < GAME_WIDTH * 0.52; wx += 30) {
      gfx.moveTo(wx, rvY + 18);
      gfx.lineTo(wx + 15, rvY + 10);
      gfx.lineTo(wx + 30, rvY + 18);
    }
    gfx.strokePath();
    this.add.text(GAME_WIDTH * 0.26, rvY + 12, '≋  RIVER', {
      fontSize: '11px', color: '#2090b0', fontFamily: FONT,
    }).setOrigin(0.5, 0);

    // School cluster (School District)
    const schX = GAME_WIDTH * 0.68, schY = my + MAP_H * 0.08;
    const schW = GAME_WIDTH * 0.28,  schH = MAP_H * 0.24;
    gfx.fillStyle(C.CAT_EDU, 0.10);
    gfx.fillRoundedRect(schX, schY, schW, schH, 6);
    gfx.lineStyle(1, C.CAT_EDU, 0.3);
    gfx.strokeRoundedRect(schX, schY, schW, schH, 6);
    this.add.text(schX + schW / 2, schY + 14, '🏫 SCHOOL CAMPUS', {
      fontSize: '11px', color: TC.CAT_EDU, fontFamily: FONT,
    }).setOrigin(0.5, 0);

    // Industrial area (Westside / Riverside border)
    const inX = GAME_WIDTH * 0.04, inY = my + MAP_H * 0.54;
    gfx.fillStyle(0x2a1a0a, 0.25);
    gfx.fillRoundedRect(inX, inY, GAME_WIDTH * 0.20, MAP_H * 0.12, 5);
    gfx.lineStyle(1, 0x6a3a18, 0.35);
    gfx.strokeRoundedRect(inX, inY, GAME_WIDTH * 0.20, MAP_H * 0.12, 5);
    this.add.text(inX + GAME_WIDTH * 0.10, inY + 10, '⚙ INDUSTRIAL', {
      fontSize: '10px', color: '#8a5030', fontFamily: FONT,
    }).setOrigin(0.5, 0);
  }

  // ─── Zone dividers ────────────────────────────────────────────────────────

  private drawZoneDividers(): void {
    const gfx = this.add.graphics();
    const my = MAP_TOP;
    const wx = GAME_WIDTH * Z.westEdge;
    const sx = GAME_WIDTH * Z.schoolEdge;
    const ry = my + MAP_H * Z.riverEdge;

    gfx.lineStyle(1.5, 0x2a4a60, 0.6);

    // Westside | Central divider (vertical)
    gfx.moveTo(wx, my); gfx.lineTo(wx, GAME_HEIGHT);
    // Central | School District divider (vertical)
    gfx.moveTo(sx, my); gfx.lineTo(sx, GAME_HEIGHT);
    // Central | Riverside divider (horizontal, center strip only)
    gfx.moveTo(wx, ry); gfx.lineTo(sx, ry);

    gfx.strokePath();
  }

  // ─── Zone labels ──────────────────────────────────────────────────────────

  private drawZoneLabels(): void {
    const my = MAP_TOP;
    const wx = GAME_WIDTH * Z.westEdge;
    const sx = GAME_WIDTH * Z.schoolEdge;
    const ry = my + MAP_H * Z.riverEdge;

    // Each label: zone name as a styled "street sign" chip
    const labels = [
      { x: wx / 2,                     y: my + 14,             text: 'WESTSIDE',        css: TC.CAT_ROAD, hex: C.CAT_ROAD },
      { x: (wx + sx) / 2,              y: my + 14,             text: 'CENTRAL',         css: TC.CAT_PETS, hex: C.CAT_PETS },
      { x: sx + (GAME_WIDTH - sx) / 2, y: my + 14,             text: 'SCHOOL DISTRICT', css: TC.CAT_EDU,  hex: C.CAT_EDU  },
      { x: (wx + sx) / 2,              y: ry + 14,             text: 'RIVERSIDE',       css: TC.CAT_ENV,  hex: C.CAT_ENV  },
      // Riverside also bleeds into Westside bottom
      { x: wx / 2,                     y: ry + 14,             text: 'RIVERSIDE',       css: TC.CAT_ENV,  hex: C.CAT_ENV  },
    ];

    const gfx = this.add.graphics();

    labels.forEach(({ x, y, text, css, hex }) => {
      const txt = this.add.text(x, y + 8, text, {
        fontSize: '10px', color: css, fontFamily: FONT, fontStyle: 'bold', letterSpacing: 1,
      }).setOrigin(0.5, 0).setAlpha(0.75);

      // Underline rule in category color
      const tw = txt.width;
      gfx.lineStyle(1, hex, 0.3);
      gfx.moveTo(x - tw / 2, y + 22);
      gfx.lineTo(x + tw / 2, y + 22);
    });

    gfx.strokePath();
  }

  // ─── Legend ───────────────────────────────────────────────────────────────

  private drawLegend(): void {
    const lx = GAME_WIDTH - 178, ly = MAP_TOP + 10;
    const lw = 168, lh = 18 + categories.length * 24 + 8;

    const gfx = this.add.graphics();
    gfx.fillStyle(C.PANEL, 0.90);
    gfx.fillRoundedRect(lx, ly, lw, lh, 7);
    gfx.lineStyle(1, C.PANEL_BORDER, 0.8);
    gfx.strokeRoundedRect(lx, ly, lw, lh, 7);

    this.add.text(lx + lw / 2, ly + 10, 'CATEGORIES', {
      fontSize: '9px', color: TC.MUTED, fontFamily: FONT, fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(0.5, 0.5);

    categories.forEach((cat, i) => {
      const iy = ly + 22 + i * 24;
      // Color swatch
      gfx.fillStyle(cat.hexColor, 0.8);
      gfx.fillCircle(lx + 16, iy + 10, 6);
      // Label
      this.add.text(lx + 28, iy + 10, `${cat.emoji}  ${cat.name}`, {
        fontSize: '11px', color: TC.SECONDARY, fontFamily: FONT,
      }).setOrigin(0, 0.5);
    });
  }

  // ─── Markers ──────────────────────────────────────────────────────────────

  private buildMarkers(): void {
    locations.forEach(loc => this.createMarker(loc));
  }

  private rebuildMarkers(): void {
    this.markerObjects.forEach(m => {
      m.pulseTween?.stop();
      m.container.destroy();
      m.label.destroy();
    });
    this.markerObjects = [];
    this.hideTooltip();
    this.buildMarkers();
    this.input.enabled = true;
  }

  private createMarker(loc: Location): void {
    const x = GAME_WIDTH * loc.nx;
    const y = MAP_TOP + MAP_H * loc.ny;

    const catId  = loc.categoryIds[0];
    const cat    = getCategoryById(catId);
    const hex    = cat?.hexColor ?? C.BTN_PRIMARY;
    const emoji  = cat?.emoji    ?? '📍';

    const siteMissions = getMissionsByLocation(loc.id);
    const doneCount    = siteMissions.filter(m => PlayerStateManager.isMissionCompleted(m.id)).length;
    const allDone      = doneCount === siteMissions.length && siteMissions.length > 0;
    const partialDone  = doneCount > 0 && !allDone;

    // ── Pulse ring (active only) ────────────────────────────────────────────
    const ring = this.add.graphics();
    if (!allDone) {
      ring.lineStyle(2, hex, 0.45);
      ring.strokeCircle(0, 0, 26);
    }

    // ── Marker body ─────────────────────────────────────────────────────────
    const body = this.add.graphics();
    this.paintMarkerBody(body, hex, allDone, false);

    // ── Category icon ────────────────────────────────────────────────────────
    const icon = this.add.text(0, allDone ? -1 : 0, allDone ? '✓' : emoji, {
      fontSize: allDone ? '15px' : '16px',
      color: allDone ? TC.SUCCESS : TC.BRIGHT,
      fontFamily: '"Segoe UI Emoji", Arial, sans-serif',
      fontStyle: allDone ? 'bold' : 'normal',
    }).setOrigin(0.5);

    // ── Urgency dot (top-right, active only) ────────────────────────────────
    const urgencyContainer = this.add.container(0, 0);
    if (!allDone) {
      const firstMission = siteMissions.find(m => !PlayerStateManager.isMissionCompleted(m.id));
      if (firstMission) {
        const urgencyHex = this.urgencyHex(firstMission.urgency);
        const dot = this.add.graphics();
        dot.fillStyle(C.BG, 1);
        dot.fillCircle(13, -13, 6);
        dot.fillStyle(urgencyHex, 1);
        dot.fillCircle(13, -13, 4.5);
        urgencyContainer.add(dot);
      }
    }

    // ── Partial-done counter badge ───────────────────────────────────────────
    const badgeContainer = this.add.container(0, 0);
    if (partialDone) {
      const badgeGfx = this.add.graphics();
      badgeGfx.fillStyle(C.BG, 1);
      badgeGfx.fillCircle(-14, -14, 7);
      badgeGfx.fillStyle(0x1a7a40, 1);
      badgeGfx.fillCircle(-14, -14, 5.5);
      const badgeTxt = this.add.text(-14, -14, String(doneCount), {
        fontSize: '8px', color: TC.BRIGHT, fontFamily: FONT, fontStyle: 'bold',
      }).setOrigin(0.5);
      badgeContainer.add([badgeGfx, badgeTxt]);
    }

    // ── Hit zone ────────────────────────────────────────────────────────────
    const hit = this.add.circle(0, 0, 26, 0, 0).setInteractive({ useHandCursor: true });

    const container = this.add.container(x, y, [ring, body, icon, urgencyContainer, badgeContainer, hit]);

    // Hover handlers
    hit.on('pointerover', () => {
      this.paintMarkerBody(body, hex, allDone, true);
      const available = siteMissions.length - doneCount;
      const detail = allDone
        ? '✅ All missions complete'
        : `${available} of ${siteMissions.length} mission(s) open`;
      this.showTooltip(x, y - 34, loc.name, loc.zoneName, detail, hex);
    });

    hit.on('pointerout', () => {
      this.paintMarkerBody(body, hex, allDone, false);
      this.hideTooltip();
    });

    hit.on('pointerdown', () => {
      this.paintMarkerBody(body, hex, allDone, true);
      this.openLocation(loc);
    });

    // ── Location name label ──────────────────────────────────────────────────
    const labelColor = allDone ? TC.MUTED : TC.SECONDARY;
    const label = this.add.text(x, y + 30, loc.name, {
      fontSize: '10px', color: labelColor, fontFamily: FONT,
      align: 'center', wordWrap: { width: 110 },
    }).setOrigin(0.5, 0);

    if (allDone) label.setAlpha(0.6);

    // ── Pulse animation (active markers only) ────────────────────────────────
    let pulseTween: Phaser.Tweens.Tween | undefined;
    if (!allDone) {
      pulseTween = this.tweens.add({
        targets: ring,
        scaleX: 1.6, scaleY: 1.6, alpha: 0,
        duration: 1900, ease: 'Quad.easeOut', repeat: -1,
      });
    }

    this.markerObjects.push({ container, label, ring, pulseTween });
  }

  /** Draws (or redraws) the marker body circle. Called on create and hover. */
  private paintMarkerBody(
    gfx: Phaser.GameObjects.Graphics,
    hex: number,
    completed: boolean,
    hovered: boolean,
  ): void {
    gfx.clear();

    if (completed) {
      // Grey/dark body with faint green tint — clearly "done"
      gfx.fillStyle(0x1a2e1a, 1);
      gfx.fillCircle(0, 0, 18);
      gfx.lineStyle(2, 0x1a7a40, hovered ? 0.9 : 0.5);
      gfx.strokeCircle(0, 0, 18);
    } else if (hovered) {
      gfx.fillStyle(hex, 0.85);
      gfx.fillCircle(0, 0, 18);
      gfx.lineStyle(2.5, 0xffffff, 0.9);
      gfx.strokeCircle(0, 0, 18);
    } else {
      gfx.fillStyle(C.PANEL_LT, 1);
      gfx.fillCircle(0, 0, 18);
      gfx.lineStyle(2, hex, 1);
      gfx.strokeCircle(0, 0, 18);
    }
  }

  private urgencyHex(urgency: string): number {
    switch (urgency) {
      case 'critical': return 0xcc2828;
      case 'high':     return 0xcc6a18;
      case 'medium':   return 0xb8a018;
      default:         return 0x18883a;
    }
  }

  // ─── Tooltip ──────────────────────────────────────────────────────────────

  private showTooltip(
    x: number, y: number,
    name: string, zone: string, detail: string,
    accentHex: number,
  ): void {
    this.hideTooltip();

    // Clamp so tooltip doesn't go off-screen
    const clampedX = Phaser.Math.Clamp(x, 110, GAME_WIDTH - 110);
    const clampedY = Math.max(y, MAP_TOP + 50);

    const gfx = this.add.graphics().setDepth(20);

    const zoneTxt = this.add.text(clampedX, clampedY - 4, zone.toUpperCase(), {
      fontSize: '9px', color: this.hexToCSS(accentHex), fontFamily: FONT,
      fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(0.5, 1).setDepth(21);

    const nameTxt = this.add.text(clampedX, clampedY, name, {
      fontSize: '13px', color: TC.PRIMARY, fontFamily: FONT, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(21);

    const detailTxt = this.add.text(clampedX, clampedY + nameTxt.height + 2, detail, {
      fontSize: '11px', color: TC.SECONDARY, fontFamily: FONT,
    }).setOrigin(0.5, 0).setDepth(21);

    const bw = Math.max(zoneTxt.width, nameTxt.width, detailTxt.width) + 24;
    const bh = 10 + zoneTxt.height + nameTxt.height + detailTxt.height + 8;
    const bx = clampedX - bw / 2;
    const by = clampedY - zoneTxt.height - 6;

    gfx.fillStyle(C.PANEL, 0.97);
    gfx.fillRoundedRect(bx - 1, by - 1, bw + 2, bh + 2, 7);
    gfx.lineStyle(1, accentHex, 0.5);
    gfx.strokeRoundedRect(bx - 1, by - 1, bw + 2, bh + 2, 7);
    // Accent top edge
    gfx.lineStyle(2, accentHex, 0.8);
    gfx.moveTo(bx + 7, by); gfx.lineTo(bx + bw - 5, by);
    gfx.strokePath();

    this.tooltip = this.add.container(0, 0, [gfx, zoneTxt, nameTxt, detailTxt]).setDepth(20);
  }

  private hideTooltip(): void {
    if (this.tooltip) { this.tooltip.destroy(); this.tooltip = undefined; }
  }

  /** Converts a Phaser hex color to a CSS hex string for text objects. */
  private hexToCSS(hex: number): string {
    return '#' + hex.toString(16).padStart(6, '0');
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  private openLocation(loc: Location): void {
    this.hideTooltip();

    const siteMissions = getMissionsByLocation(loc.id);
    const mission =
      siteMissions.find(m => !PlayerStateManager.isMissionCompleted(m.id))
      ?? siteMissions[0];

    if (!mission) return;

    this.input.enabled = false;
    PlayerStateManager.setZone(loc.zoneName);

    this.scene.start(SCENE_KEYS.MISSION_DETAIL, {
      mission,
      location: loc,
      allMissions: siteMissions,
    });
  }

  // ─── Footer ───────────────────────────────────────────────────────────────

  private drawFooter(): void {
    this.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT - 10,
      '● Click a marker to view missions    ● Urgency dots: red=critical  orange=high  yellow=medium',
      { fontSize: '11px', color: TC.MUTED, fontFamily: FONT, align: 'center' },
    ).setOrigin(0.5, 1);
  }
}
