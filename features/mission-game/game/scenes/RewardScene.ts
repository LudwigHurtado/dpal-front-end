import * as Phaser from 'phaser';
import { SCENE_KEYS, C, TC, GAME_WIDTH, GAME_HEIGHT, MAP_TOP, CATEGORY_COLORS } from '../constants';
import { Mission } from '../data/missions';
import { Location } from '../data/locations';
import { getCategoryById } from '../data/categories';
import { PlayerStateManager, type BadgeProgress } from '../data/playerState';
import { createButton, createPanel, createProgressBar, FONT, sectionHeader } from '../ui/UIHelpers';
import { EventBridge } from '../EventBridge';

interface SceneData {
  mission: Mission;
  location: Location;
  xpEarned: number;
  pointsEarned: number;
  leveled?: boolean;
  newLevel?: number;
  newBadges?: string[];
}

const CARD_W = 700;
const CARD_H = 520;
const CARD_X = (GAME_WIDTH - CARD_W) / 2;
const CARD_Y = MAP_TOP + 54;
const PAD = 30;

export class RewardScene extends Phaser.Scene {
  private mission!: Mission;
  private location!: Location;
  private xpEarned = 0;
  private pointsEarned = 0;
  private leveled = false;
  private newLevel = 1;
  private newBadges: string[] = [];

  constructor() {
    super({ key: SCENE_KEYS.REWARD });
  }

  init(data: SceneData): void {
    this.mission = data.mission;
    this.location = data.location;
    this.xpEarned = data.xpEarned;
    this.pointsEarned = data.pointsEarned;
    this.leveled = data.leveled ?? false;
    this.newLevel = data.newLevel ?? PlayerStateManager.get().level;
    this.newBadges = data.newBadges ?? [];

    this.ensureMissionRewardsApplied();
  }

  create(): void {
    const accent = this.getAccent();

    this.cameras.main.setBackgroundColor(C.BG);
    this.cameras.main.fadeIn(140, 0, 0, 0);

    this.drawBackground();
    this.buildRewardCard(accent);
    this.emitRewardGranted();
  }

  private ensureMissionRewardsApplied(): void {
    if (PlayerStateManager.isMissionCompleted(this.mission.id)) return;

    const levelResult = PlayerStateManager.addXP(this.xpEarned);
    PlayerStateManager.addPoints(this.pointsEarned);
    const badges = PlayerStateManager.completeMission(this.mission.id, this.mission.categoryId);

    this.leveled = levelResult.leveled;
    this.newLevel = levelResult.newLevel;
    this.newBadges = badges;
  }

  private drawBackground(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, C.STREET, 0.28);

    for (let y = MAP_TOP; y <= GAME_HEIGHT; y += 70) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }

    for (let x = 0; x <= GAME_WIDTH; x += 90) {
      grid.lineBetween(x, MAP_TOP, x, GAME_HEIGHT);
    }

    this.add.rectangle(
      GAME_WIDTH / 2,
      (GAME_HEIGHT + MAP_TOP) / 2,
      GAME_WIDTH,
      GAME_HEIGHT - MAP_TOP,
      0x000000,
      0.36,
    );
  }

  private buildRewardCard(accent: { hex: number; css: string }): void {
    const state = PlayerStateManager.get();
    const category = getCategoryById(this.mission.categoryId);
    const centerX = CARD_X + CARD_W / 2;

    createPanel(this, CARD_X, CARD_Y, CARD_W, CARD_H, {
      bg: C.PANEL,
      border: accent.hex,
      borderWidth: 2,
      radius: 12,
    });

    this.add.rectangle(CARD_X, CARD_Y, CARD_W, 7, accent.hex, 0.96).setOrigin(0);

    let y = CARD_Y + PAD;
    this.add.text(centerX, y, 'Mission Complete', {
      fontSize: '30px',
      color: accent.css,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    y += 44;

    this.add.text(centerX, y, this.mission.title, {
      fontSize: '14px',
      color: TC.SECONDARY,
      fontFamily: FONT,
      align: 'center',
      wordWrap: { width: CARD_W - PAD * 2 },
    }).setOrigin(0.5, 0);
    y += 42;

    this.buildRewardTotals(CARD_X + PAD, y, CARD_W - PAD * 2);
    y += 100;

    sectionHeader(this, CARD_X + PAD, y, 'UPDATED COMMUNITY SCORE', accent.hex, accent.css);
    y += 26;
    this.add.text(CARD_X + PAD, y, `${state.points} total points`, {
      fontSize: '22px',
      color: TC.GOLD,
      fontFamily: FONT,
      fontStyle: 'bold',
    });
    this.add.text(CARD_X + CARD_W - PAD, y + 4, `Level ${state.level}`, {
      fontSize: '15px',
      color: this.leveled ? TC.GOLD : TC.SECONDARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(1, 0);
    y += 40;

    createProgressBar(this, CARD_X + PAD, y, CARD_W - PAD * 2, 10, state.xp / state.xpToNextLevel, C.XP_BAR);
    this.add.text(CARD_X + CARD_W - PAD, y + 20, `${state.xp} / ${state.xpToNextLevel} XP to next level`, {
      fontSize: '11px',
      color: TC.MUTED,
      fontFamily: FONT,
    }).setOrigin(1, 0);
    y += 50;

    if (this.leveled) {
      this.add.text(centerX, y, `Level up: you reached Level ${this.newLevel}`, {
        fontSize: '14px',
        color: TC.GOLD,
        fontFamily: FONT,
        fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      y += 28;
    }

    sectionHeader(this, CARD_X + PAD, y, 'BADGE PROGRESS', accent.hex, accent.css);
    y += 26;
    this.buildBadgeProgress(CARD_X + PAD, y, CARD_W - PAD * 2, accent.hex, category?.name ?? 'Mission');

    this.buildReturnButton(centerX, CARD_Y + CARD_H - 42);
  }

  private buildRewardTotals(x: number, y: number, w: number): void {
    const boxW = (w - 16) / 2;
    this.buildRewardBox(x, y, boxW, 'XP Earned', `+${this.xpEarned}`, TC.CAT_EDU);
    this.buildRewardBox(x + boxW + 16, y, boxW, 'Points Earned', `+${this.pointsEarned}`, TC.GOLD);
  }

  private buildRewardBox(x: number, y: number, w: number, label: string, value: string, color: string): void {
    const bg = this.add.rectangle(x, y, w, 78, C.PANEL_LT, 0.82).setOrigin(0);
    bg.setStrokeStyle(1, C.PANEL_BORDER, 0.5);

    this.add.text(x + 18, y + 14, label.toUpperCase(), {
      fontSize: '11px',
      color: TC.MUTED,
      fontFamily: FONT,
      fontStyle: 'bold',
    });

    const valueText = this.add.text(x + 18, y + 34, '+0', {
      fontSize: '30px',
      color,
      fontFamily: FONT,
      fontStyle: 'bold',
    });

    this.animateCounter(valueText, Number(value.replace('+', '')), color, '+');
  }

  private buildBadgeProgress(x: number, y: number, w: number, accentHex: number, categoryName: string): void {
    const badges = PlayerStateManager.get().badgeProgress;
    const firstResponder = badges.find(badge => badge.id === 'first_responder');
    const categoryBadge = this.getCategoryBadge(badges);
    const rows = [firstResponder, categoryBadge].filter((badge): badge is BadgeProgress => Boolean(badge));

    rows.forEach((badge, index) => {
      const rowY = y + index * 54;
      this.add.text(x, rowY, `${badge.name}${badge.earned ? ' earned' : ''}`, {
        fontSize: '13px',
        color: badge.earned ? TC.GOLD : TC.PRIMARY,
        fontFamily: FONT,
        fontStyle: 'bold',
      });

      createProgressBar(this, x, rowY + 24, w - 76, 9, badge.current / badge.required, accentHex);
      this.add.text(x + w, rowY + 23, `${badge.current} / ${badge.required}`, {
        fontSize: '12px',
        color: TC.SECONDARY,
        fontFamily: FONT,
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);
    });

    if (this.newBadges.length > 0) {
      this.add.text(x, y + rows.length * 54 + 2, `New badge unlocked: ${this.newBadges.join(', ')}`, {
        fontSize: '12px',
        color: TC.GOLD,
        fontFamily: FONT,
        fontStyle: 'bold',
        wordWrap: { width: w },
      });
    } else {
      this.add.text(x, y + rows.length * 54 + 2, `${categoryName} progress saved for this session.`, {
        fontSize: '11px',
        color: TC.MUTED,
        fontFamily: FONT,
        wordWrap: { width: w },
      });
    }
  }

  private buildReturnButton(x: number, y: number): void {
    createButton(this, {
      x,
      y,
      w: 190,
      h: 42,
      label: 'Return to Map',
      bg: C.BTN_PRIMARY,
      bgHover: C.BTN_PRIMARY_HV,
      fontSize: 14,
      onClick: () => this.returnToMap(),
    });

    this.input.keyboard?.once('keydown-ENTER', () => this.returnToMap());
  }

  private animateCounter(text: Phaser.GameObjects.Text, target: number, color: string, prefix: string): void {
    let value = 0;
    const steps = 24;
    const step = target / steps;

    this.time.addEvent({
      delay: 24,
      repeat: steps - 1,
      callback: () => {
        value = Math.min(target, value + step);
        text.setText(`${prefix}${Math.round(value)}`).setColor(color);
      },
    });
  }

  private emitRewardGranted(): void {
    EventBridge.emit('reward_granted', {
      xp: this.xpEarned,
      points: this.pointsEarned,
      newLevel: this.newLevel,
      newBadges: this.newBadges,
    });
  }

  private returnToMap(): void {
    PlayerStateManager.setZone('City Map');

    this.cameras.main.fadeOut(140, 0, 0, 0, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) {
        this.scene.start(SCENE_KEYS.WORLD_MAP);
      }
    });
  }

  private getCategoryBadge(badges: readonly BadgeProgress[]): BadgeProgress | undefined {
    const badgeByCategory: Record<string, string> = {
      road_hazards: 'road_watcher',
      lost_pets: 'pet_finder',
      environmental: 'eco_guard',
      education: 'edu_hero',
    };

    return badges.find(badge => badge.id === badgeByCategory[this.mission.categoryId]);
  }

  private getAccent(): { hex: number; css: string } {
    return CATEGORY_COLORS[this.mission.categoryId] ?? {
      hex: C.BTN_PRIMARY,
      css: TC.SECONDARY,
    };
  }
}
