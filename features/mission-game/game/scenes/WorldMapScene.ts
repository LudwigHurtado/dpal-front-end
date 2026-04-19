import Phaser from 'phaser';
import { SCENE_KEYS, C, TC, GAME_WIDTH, GAME_HEIGHT, MAP_TOP, CATEGORY_COLORS } from '../constants';
import { locations, Location } from '../data/locations';
import { missions, getMissionsByLocation } from '../data/missions';
import { getCategoryById } from '../data/categories';
import { PlayerStateManager } from '../data/playerState';
import { FONT } from '../ui/UIHelpers';

const MAP_H = GAME_HEIGHT - MAP_TOP - 20;

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

    this.drawCityMap();
    this.drawZoneLabels();
    this.buildMarkers();
    this.drawFooter();

    // Re-render markers when returning from another scene (missions may have been completed)
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.rebuildMarkers());
  }

  // ─── Map drawing ────────────────────────────────────────────────────────────

  private drawCityMap(): void {
    const gfx = this.add.graphics();
    const my = MAP_TOP;

    // Base background
    gfx.fillStyle(C.BG, 1);
    gfx.fillRect(0, my, GAME_WIDTH, MAP_H + 20);

    // City block grid (horizontal streets)
    gfx.lineStyle(1, C.STREET, 0.6);
    for (let y = my; y < GAME_HEIGHT; y += 70) {
      gfx.moveTo(0, y); gfx.lineTo(GAME_WIDTH, y);
    }
    gfx.strokePath();

    // City block grid (vertical streets)
    gfx.lineStyle(1, C.STREET, 0.6);
    for (let x = 0; x < GAME_WIDTH; x += 90) {
      gfx.moveTo(x, my); gfx.lineTo(x, GAME_HEIGHT);
    }
    gfx.strokePath();

    // Main arteries (thicker)
    gfx.lineStyle(2, C.STREET_MAIN, 0.5);
    const arteries = [GAME_WIDTH * 0.45, GAME_WIDTH * 0.72];
    arteries.forEach(ax => { gfx.moveTo(ax, my); gfx.lineTo(ax, GAME_HEIGHT); });
    const hArteries = [my + MAP_H * 0.48, my + MAP_H * 0.76];
    hArteries.forEach(hy => { gfx.moveTo(0, hy); gfx.lineTo(GAME_WIDTH, hy); });
    gfx.strokePath();

    // ── Zone backgrounds ────────────────────────────────────────────────────
    const zones = [
      { x: 0,               y: my,              w: GAME_WIDTH * 0.45, h: MAP_H * 0.48, cat: 'road_hazards' },
      { x: GAME_WIDTH * 0.45, y: my,              w: GAME_WIDTH * 0.55, h: MAP_H * 0.48, cat: 'education' },
      { x: 0,               y: my + MAP_H * 0.48, w: GAME_WIDTH * 0.45, h: MAP_H * 0.52, cat: 'environmental' },
      { x: GAME_WIDTH * 0.45, y: my + MAP_H * 0.48, w: GAME_WIDTH * 0.55, h: MAP_H * 0.52, cat: 'lost_pets' },
    ];
    zones.forEach(({ x, y, w, h, cat }) => {
      const col = CATEGORY_COLORS[cat].hex;
      gfx.fillStyle(col, 0.055);
      gfx.fillRect(x, y, w, h);
      gfx.lineStyle(1, col, 0.2);
      gfx.strokeRect(x, y, w, h);
    });

    // ── Park area ────────────────────────────────────────────────────────────
    const parkX = GAME_WIDTH * 0.28, parkY = my + MAP_H * 0.22;
    const parkW = GAME_WIDTH * 0.18, parkH = MAP_H * 0.35;
    gfx.fillStyle(C.PARK, 0.25);
    gfx.fillRoundedRect(parkX, parkY, parkW, parkH, 8);
    gfx.lineStyle(1, 0x1e7a38, 0.4);
    gfx.strokeRoundedRect(parkX, parkY, parkW, parkH, 8);
    this.add.text(parkX + parkW / 2, parkY + 16, '🌳 CITY PARK', {
      fontSize: '11px', color: '#24a04a', fontFamily: FONT,
    }).setOrigin(0.5, 0);

    // ── River ────────────────────────────────────────────────────────────────
    const rvY = my + MAP_H * 0.76;
    gfx.fillStyle(C.WATER, 0.35);
    gfx.fillRect(0, rvY, GAME_WIDTH * 0.32, MAP_H * 0.24);
    this.add.text(GAME_WIDTH * 0.16, rvY + 14, '≋ RIVER DISTRICT', {
      fontSize: '11px', color: '#2090b0', fontFamily: FONT,
    }).setOrigin(0.5, 0);

    // ── School block ─────────────────────────────────────────────────────────
    const schX = GAME_WIDTH * 0.64, schY = my + MAP_H * 0.12;
    gfx.fillStyle(C.CAT_EDU, 0.12);
    gfx.fillRoundedRect(schX, schY, GAME_WIDTH * 0.2, MAP_H * 0.22, 6);
    gfx.lineStyle(1, C.CAT_EDU, 0.3);
    gfx.strokeRoundedRect(schX, schY, GAME_WIDTH * 0.2, MAP_H * 0.22, 6);
    this.add.text(schX + GAME_WIDTH * 0.1, schY + 14, '🏫 SCHOOL ZONE', {
      fontSize: '11px', color: TC.CAT_EDU, fontFamily: FONT,
    }).setOrigin(0.5, 0);
  }

  private drawZoneLabels(): void {
    const my = MAP_TOP;
    const labels = [
      { nx: 0.22,  ny: 0.06, text: 'NORTH DISTRICT',  css: TC.CAT_ROAD },
      { nx: 0.72,  ny: 0.06, text: 'EAST SIDE',        css: TC.CAT_EDU  },
      { nx: 0.22,  ny: 0.66, text: 'WATERFRONT',       css: TC.CAT_ENV  },
      { nx: 0.72,  ny: 0.66, text: 'SOUTH QUARTER',    css: TC.CAT_PETS },
    ];
    labels.forEach(({ nx, ny, text, css }) => {
      this.add.text(GAME_WIDTH * nx, my + MAP_H * ny, text, {
        fontSize: '10px', color: css, fontFamily: FONT,
        fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.7);
    });
  }

  private drawFooter(): void {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'Click a map marker to view missions', {
      fontSize: '12px', color: TC.MUTED, fontFamily: FONT,
    }).setOrigin(0.5, 1);
  }

  // ─── Markers ─────────────────────────────────────────────────────────────────

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

    const catId = loc.categoryIds[0];
    const cat = getCategoryById(catId);
    const hex = cat?.hexColor ?? C.BTN_PRIMARY;
    const emoji = cat?.emoji ?? '📍';

    const allDone = getMissionsByLocation(loc.id)
      .every(m => PlayerStateManager.isMissionCompleted(m.id));

    // Pulse ring
    const ring = this.add.graphics();
    ring.lineStyle(2, hex, allDone ? 0.2 : 0.5);
    ring.strokeCircle(0, 0, 24);

    // Body circle
    const body = this.add.graphics();
    body.fillStyle(allDone ? 0x1a2a3a : C.PANEL_LT, 1);
    body.fillCircle(0, 0, 18);
    body.lineStyle(2, hex, allDone ? 0.35 : 1);
    body.strokeCircle(0, 0, 18);

    // Icon
    const icon = this.add.text(0, 0, allDone ? '✓' : emoji, {
      fontSize: '16px',
      fontFamily: '"Segoe UI Emoji", Arial, sans-serif',
    }).setOrigin(0.5);

    // Hit zone
    const hit = this.add.circle(0, 0, 24, 0, 0).setInteractive({ useHandCursor: true });

    const container = this.add.container(x, y, [ring, body, icon, hit]);

    // Hover
    hit.on('pointerover', () => {
      body.clear();
      body.fillStyle(hex, 0.7);
      body.fillCircle(0, 0, 18);
      body.lineStyle(2, 0xffffff, 0.8);
      body.strokeCircle(0, 0, 18);
      this.showTooltip(x, y - 32, loc.name, allDone ? '✅ Complete' : `${loc.missionIds.length} mission(s)`);
    });

    hit.on('pointerout', () => {
      body.clear();
      body.fillStyle(allDone ? 0x1a2a3a : C.PANEL_LT, 1);
      body.fillCircle(0, 0, 18);
      body.lineStyle(2, hex, allDone ? 0.35 : 1);
      body.strokeCircle(0, 0, 18);
      this.hideTooltip();
    });

    hit.on('pointerdown', () => this.openLocation(loc));

    // Location name label
    const label = this.add.text(x, y + 28, loc.name, {
      fontSize: '10px', color: allDone ? TC.MUTED : TC.SECONDARY, fontFamily: FONT,
      align: 'center', wordWrap: { width: 100 },
    }).setOrigin(0.5, 0);

    // Pulse animation for active markers
    let pulseTween: Phaser.Tweens.Tween | undefined;
    if (!allDone) {
      pulseTween = this.tweens.add({
        targets: ring,
        scaleX: 1.5, scaleY: 1.5, alpha: 0,
        duration: 1800, repeat: -1,
      });
    }

    this.markerObjects.push({ container, label, ring, pulseTween });
  }

  // ─── Tooltip ──────────────────────────────────────────────────────────────────

  private showTooltip(x: number, y: number, name: string, detail: string): void {
    this.hideTooltip();
    const gfx = this.add.graphics().setDepth(10);
    const line1 = this.add.text(x, y, name, {
      fontSize: '13px', color: TC.PRIMARY, fontFamily: FONT, fontStyle: 'bold',
    }).setOrigin(0.5, 1).setDepth(11);
    const line2 = this.add.text(x, y + 2, detail, {
      fontSize: '11px', color: TC.SECONDARY, fontFamily: FONT,
    }).setOrigin(0.5, 0).setDepth(11);

    const b1 = line1.getBounds();
    const tw = Math.max(b1.width, line2.width) + 20;
    const th = line1.height + line2.height + 12;
    const tx = x - tw / 2 - 2;
    const ty = y - line1.height - 6;
    gfx.fillStyle(C.PANEL, 0.96);
    gfx.fillRoundedRect(tx, ty, tw + 4, th, 6);
    gfx.lineStyle(1, C.PANEL_BORDER, 1);
    gfx.strokeRoundedRect(tx, ty, tw + 4, th, 6);

    this.tooltip = this.add.container(0, 0, [gfx, line1, line2]).setDepth(10);
  }

  private hideTooltip(): void {
    if (this.tooltip) { this.tooltip.destroy(); this.tooltip = undefined; }
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  private openLocation(loc: Location): void {
    this.hideTooltip();

    const available = getMissionsByLocation(loc.id)
      .find(m => !PlayerStateManager.isMissionCompleted(m.id))
      ?? getMissionsByLocation(loc.id)[0];

    if (!available) return;

    this.input.enabled = false;
    PlayerStateManager.setZone(loc.zoneName);

    this.scene.start(SCENE_KEYS.MISSION_DETAIL, {
      mission: available,
      location: loc,
      allMissions: getMissionsByLocation(loc.id),
    });
  }
}
