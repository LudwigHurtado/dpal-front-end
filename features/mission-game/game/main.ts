import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from './constants';
import { BootScene } from './scenes/BootScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { MissionDetailScene } from './scenes/MissionDetailScene';
import { MissionActionScene } from './scenes/MissionActionScene';
import { RewardScene } from './scenes/RewardScene';
import { UIScene } from './scenes/UIScene';
import { EventBridge } from './EventBridge';
import type { GameEventMap } from './EventBridge';
import { PlayerStateManager } from './data/playerState';

export type { GameEventMap } from './EventBridge';

export interface DPALGameCallbacks {
  onGameReady?(): void;
  onMissionSelected?(payload: GameEventMap['mission_selected']): void;
  onMissionStarted?(payload: GameEventMap['mission_started']): void;
  onMissionCompleted?(payload: GameEventMap['mission_completed']): void;
  onRewardGranted?(payload: GameEventMap['reward_granted']): void;
}

/**
 * DPALGame — the single entry point the React host uses.
 *
 * Usage:
 *   const game = new DPALGame(containerEl, { onMissionCompleted: (p) => console.log(p) });
 *   // later:
 *   game.destroy();
 */
export class DPALGame {
  readonly instance: Phaser.Game;
  private unsubs: Array<() => void> = [];

  constructor(parent: HTMLElement, callbacks: DPALGameCallbacks = {}) {
    // Wire event bridge → callbacks before creating the game
    if (callbacks.onGameReady) {
      this.unsubs.push(EventBridge.on('game_ready', callbacks.onGameReady));
    }
    if (callbacks.onMissionSelected) {
      this.unsubs.push(EventBridge.on('mission_selected', callbacks.onMissionSelected));
    }
    if (callbacks.onMissionStarted) {
      this.unsubs.push(EventBridge.on('mission_started', callbacks.onMissionStarted));
    }
    if (callbacks.onMissionCompleted) {
      this.unsubs.push(EventBridge.on('mission_completed', callbacks.onMissionCompleted));
    }
    if (callbacks.onRewardGranted) {
      this.unsubs.push(EventBridge.on('reward_granted', callbacks.onRewardGranted));
    }

    this.instance = new Phaser.Game({
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#0b1826',
      parent,
      // Responsive scaling: fill the container, maintain aspect ratio
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },
      // Scenes are listed in stack order (last = renders on top)
      scene: [
        BootScene,
        WorldMapScene,
        MissionDetailScene,
        MissionActionScene,
        RewardScene,
        UIScene,       // ← always on top
      ],
      // Disable default banner for clean embedding
      banner: false,
    });
  }

  /** Tear down the game and remove all event subscriptions. */
  destroy(): void {
    this.unsubs.forEach(fn => fn());
    this.unsubs = [];
    PlayerStateManager.reset();
    this.instance.destroy(true);
  }

  /** Navigate to the world map from outside the game (e.g. React button). */
  goToMap(): void {
    const scene = this.instance.scene.getScene(SCENE_KEYS.WORLD_MAP);
    if (scene && !this.instance.scene.isActive(SCENE_KEYS.WORLD_MAP)) {
      this.instance.scene.start(SCENE_KEYS.WORLD_MAP);
    }
  }

  /** Read current player state (useful for syncing to external UI). */
  getPlayerState() {
    return PlayerStateManager.get();
  }
}
