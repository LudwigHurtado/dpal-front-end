import Phaser from 'phaser';
import { SCENE_KEYS, C, TC, GAME_WIDTH, GAME_HEIGHT, MAP_TOP, CATEGORY_COLORS } from '../constants';
import { Mission } from '../data/missions';
import { Location } from '../data/locations';
import { getCategoryById } from '../data/categories';
import { PlayerStateManager } from '../data/playerState';
import { createPanel, createButton, createProgressBar, FONT } from '../ui/UIHelpers';
import { EventBridge } from '../EventBridge';

interface SceneData {
  mission: Mission;
  location: Location;
  xpEarned: number;
  pointsEarned: number;
  leveled: boolean;
  newLevel: number;
  newBadges: string[];
}

export class RewardScene extends Phaser.Scene {
  private mission!: Mission;
  private location!: Location;
  private xpEarned!: number;
  private pointsEarned!: number;
  private leveled!: boolean;
  private newLevel!: number;
  private newBadges!: string[];

  constructor() {
    super({ key: SCENE_KEYS.REWARD });
  }

  init(data: SceneData): void {
    this.mission = data.mission;
    this.location = data.location;
    this.xpEarned = data.xpEarned;
    this.pointsEarned = data.pointsEarned;
    this.leveled = data.leveled;
    this.newLevel = data.newLevel;
    this.newBadges = data.newBadges;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.BG);

    const cat = getCategoryById(this.mission.categoryId);
    const hex = cat?.hexColor ?? C.BTN_PRIMARY;
    const css = cat?.cssColor ?? TC.SECONDARY;

    this.drawBackground(hex);
    this.buildCard(hex, css, cat?.emoji ?? '✅');
    this.scheduleConfetti(hex);

    EventBridge.emit('reward_granted', {
      xp: this.xpEarned,
      points: this.pointsEarned,
      newLevel: this.newLevel,
      newBadges: this.newBadges,
    });
  }

  // ─── Background ──────────────────────────────────────────────────────────────

  private drawBackground(hex: number): void {
    const gfx = this.add.graphics();
    // Radial glow
    for (let r = 300; r > 0; r -= 30) {
      gfx.fillStyle(hex, 0.008);
      gfx.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, r);
    }
    // Grid
    gfx.lineStyle(1, C.STREET, 0.25);
    for (let y = MAP_TOP; y < GAME_HEIGHT; y += 70) { gfx.moveTo(0, y); gfx.lineTo(GAME_WIDTH, y); }
    for (let x = 0; x < GAME_WIDTH; x += 90) { gfx.moveTo(x, MAP_TOP); gfx.lineTo(x, GAME_HEIGHT); }
    gfx.strokePath();
  }

  private buildCard(hex: number, css: string, emoji: string): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + MAP_TOP / 2;
    const cardW = 580, cardH = 460;
    const cardX = cx - cardW / 2, cardY = cy - cardH / 2;

    createPanel(this, cardX, cardY, cardW, cardH, {
      bg: C.PANEL, border: hex, borderWidth: 2, radius: 16,
    });

    // Top accent
    const topGfx = this.add.graphics();
    topGfx.fillStyle(hex, 0.9);
    topGfx.fillRoundedRect(cardX, cardY, cardW, 6, { tl: 16, tr: 16, bl: 0, br: 0 });

    let y = cardY + 32;

    // ── Success header ────────────────────────────────────────────────────────
    const header = this.add.text(cx, y, `${emoji}  MISSION COMPLETE`, {
      fontSize: '26px', color: css, fontFamily: FONT, fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: header, alpha: 1, duration: 400 });
    y += 44;

    // Mission title
    this.add.text(cx, y, this.mission.title, {
      fontSize: '15px', color: TC.SECONDARY, fontFamily: FONT,
      wordWrap: { width: cardW - 60 }, align: 'center',
    }).setOrigin(0.5);
    y += 40;

    // Divider
    this.add.graphics().lineStyle(1, C.PANEL_BORDER, 0.5)
      .lineBetween(cardX + 30, y, cardX + cardW - 30, y);
    y += 22;

    // ── XP earned ────────────────────────────────────────────────────────────
    this.add.text(cx - 120, y, '✦ XP EARNED', {
      fontSize: '11px', color: TC.MUTED, fontFamily: FONT, fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(0.5);

    const xpNum = this.add.text(cx - 120, y + 28, '+0', {
      fontSize: '36px', color: TC.CAT_EDU, fontFamily: FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: xpNum, alpha: 1, duration: 300, delay: 200 });
    this.animateCounter(xpNum, this.xpEarned, TC.CAT_EDU, '+');

    // ── Points earned ─────────────────────────────────────────────────────────
    this.add.text(cx + 120, y, '◆ POINTS', {
      fontSize: '11px', color: TC.MUTED, fontFamily: FONT, fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(0.5);

    const ptNum = this.add.text(cx + 120, y + 28, '+0', {
      fontSize: '36px', color: TC.GOLD, fontFamily: FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: ptNum, alpha: 1, duration: 300, delay: 300 });
    this.animateCounter(ptNum, this.pointsEarned, TC.GOLD, '+');
    y += 76;

    // ── XP progress bar (current level) ──────────────────────────────────────
    this.add.graphics().lineStyle(1, C.PANEL_BORDER, 0.4)
      .lineBetween(cardX + 30, y, cardX + cardW - 30, y);
    y += 16;

    const ps = PlayerStateManager.get();
    this.add.text(cardX + 30, y, `Level ${ps.level}  ·  ${ps.xp} / ${ps.xpToNextLevel} XP`, {
      fontSize: '12px', color: TC.SECONDARY, fontFamily: FONT,
    });

    const xpBarHandle = createProgressBar(
      this, cardX + 30, y + 20, cardW - 60, 10, 0, C.XP_BAR,
    );
    this.time.delayedCall(600, () => {
      xpBarHandle.setProgress(ps.xp / ps.xpToNextLevel);
    });
    y += 42;

    // ── Level-up banner ───────────────────────────────────────────────────────
    if (this.leveled) {
      const lvlGfx = this.add.graphics();
      lvlGfx.fillStyle(0xb88000, 0.15);
      lvlGfx.fillRoundedRect(cardX + 30, y, cardW - 60, 36, 8);
      lvlGfx.lineStyle(1, 0xd4a80c, 0.7);
      lvlGfx.strokeRoundedRect(cardX + 30, y, cardW - 60, 36, 8);
      this.add.text(cx, y + 18, `⬆ LEVEL UP!  You are now Level ${this.newLevel}`, {
        fontSize: '15px', color: TC.GOLD, fontFamily: FONT, fontStyle: 'bold',
      }).setOrigin(0.5);
      y += 46;
    }

    // ── Badge progress ────────────────────────────────────────────────────────
    const badges = PlayerStateManager.get().badgeProgress;
    const activeBadge = badges.find(b => b.id !== 'first_responder' &&
      (getCategoryById(this.mission.categoryId)?.id === b.id.replace('_watcher', '_hazards')
        .replace('_finder', '_pets')
        .replace('_guard', 'al')
        .replace('_hero', 'tion')
        || b.id === {
          road_hazards: 'road_watcher',
          lost_pets: 'pet_finder',
          environmental: 'eco_guard',
          education: 'edu_hero',
        }[this.mission.categoryId]
      ));

    if (activeBadge) {
      this.add.text(cardX + 30, y, `${activeBadge.emoji}  ${activeBadge.name}`, {
        fontSize: '13px', color: activeBadge.earned ? TC.GOLD : TC.SECONDARY,
        fontFamily: FONT, fontStyle: 'bold',
      });

      const barW = cardW - 130;
      createProgressBar(this, cardX + 30, y + 22, barW, 8, activeBadge.current / activeBadge.required, hex);

      this.add.text(cardX + 30 + barW + 10, y + 22, `${activeBadge.current}/${activeBadge.required}`, {
        fontSize: '11px', color: TC.MUTED, fontFamily: FONT,
      }).setOrigin(0, 0.5);

      if (activeBadge.earned) {
        this.add.text(cx, y + 15, '🏅 Badge Earned!', {
          fontSize: '14px', color: TC.GOLD, fontFamily: FONT, fontStyle: 'bold',
        }).setOrigin(0.5);
      }
      y += 42;
    }

    // ── New badges list ───────────────────────────────────────────────────────
    if (this.newBadges.length > 0) {
      this.add.text(cx, y, `🏅 New: ${this.newBadges.join(', ')}`, {
        fontSize: '13px', color: TC.GOLD, fontFamily: FONT, fontStyle: 'bold',
      }).setOrigin(0.5);
      y += 28;
    }

    // ── Buttons ───────────────────────────────────────────────────────────────
    const btnY = cardY + cardH - 38;

    createButton(this, {
      x: cx + 100,
      y: btnY,
      w: 190, h: 42,
      label: '🗺 RETURN TO MAP',
      bg: C.BTN_PRIMARY,
      bgHover: C.BTN_PRIMARY_HV,
      onClick: () => this.returnToMap(),
    });

    createButton(this, {
      x: cx - 110,
      y: btnY,
      w: 190, h: 42,
      label: '📋 VIEW MISSION',
      bg: C.BTN_NEUTRAL,
      bgHover: C.BTN_NEUTRAL_HV,
      textColor: TC.SECONDARY,
      onClick: () => this.scene.start(SCENE_KEYS.MISSION_DETAIL, {
        mission: this.mission,
        location: this.location,
        allMissions: [this.mission],
      }),
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private animateCounter(
    text: Phaser.GameObjects.Text,
    target: number,
    color: string,
    prefix: string,
  ): void {
    const duration = 800;
    const steps = 30;
    const interval = duration / steps;
    let current = 0;
    const step = target / steps;

    const timer = this.time.addEvent({
      delay: interval,
      repeat: steps - 1,
      callback: () => {
        current = Math.min(current + step, target);
        text.setText(`${prefix}${Math.round(current)}`).setColor(color);
      },
    });
  }

  private scheduleConfetti(hex: number): void {
    // Particle burst using simple graphics
    for (let i = 0; i < 20; i++) {
      this.time.delayedCall(Phaser.Math.Between(0, 600), () => {
        const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
        const y = MAP_TOP + 20;
        const particle = this.add.graphics();
        particle.fillStyle(hex, 0.8);
        const size = Phaser.Math.Between(4, 10);
        particle.fillRect(-size / 2, -size / 2, size, size);
        particle.setPosition(x, y);

        this.tweens.add({
          targets: particle,
          y: y + Phaser.Math.Between(200, 500),
          x: x + Phaser.Math.Between(-80, 80),
          alpha: 0,
          angle: Phaser.Math.Between(-180, 180),
          duration: Phaser.Math.Between(1000, 2000),
          onComplete: () => particle.destroy(),
        });
      });
    }
  }

  private returnToMap(): void {
    PlayerStateManager.setZone('City Map');
    this.scene.start(SCENE_KEYS.WORLD_MAP);
  }
}
