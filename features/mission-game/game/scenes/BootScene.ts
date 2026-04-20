import * as Phaser from 'phaser';
import { SCENE_KEYS, C, TC, GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { FONT } from '../ui/UIHelpers';
import { EventBridge } from '../EventBridge';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    // No external assets — everything is rendered via Phaser graphics and text.
    this.cameras.main.setBackgroundColor(C.BG);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Title card
    const title = this.add.text(cx, cy - 30, 'DPAL Mission Ops', {
      fontSize: '36px',
      color: TC.PRIMARY,
      fontFamily: FONT,
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const sub = this.add.text(cx, cy + 18, 'Zone Control', {
      fontSize: '20px',
      color: TC.SECONDARY,
      fontFamily: FONT,
      letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0);

    const hint = this.add.text(cx, cy + 60, 'Loading...', {
      fontSize: '14px',
      color: TC.MUTED,
      fontFamily: FONT,
    }).setOrigin(0.5).setAlpha(0);

    // Fade in then out
    this.tweens.add({
      targets: [title, sub, hint],
      alpha: 1,
      duration: 400,
      onComplete: () => {
        this.time.delayedCall(900, () => {
          this.tweens.add({
            targets: [title, sub, hint],
            alpha: 0,
            duration: 300,
            onComplete: () => this.startGame(),
          });
        });
      },
    });
  }

  private startGame(): void {
    this.scene.launch(SCENE_KEYS.UI);
    this.scene.start(SCENE_KEYS.WORLD_MAP);
    EventBridge.emit('game_ready');
  }
}
