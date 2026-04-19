/**
 * EventBridge — typed event bus that connects the Phaser game to the host React app.
 * React components subscribe with `.on()`; Phaser scenes emit with `.emit()`.
 * All listener cleanup is handled by the unsubscribe function returned by `.on()`.
 */

export interface MissionSelectedPayload  { missionId: string; locationId: string; }
export interface MissionStartedPayload   { missionId: string; }
export interface MissionCompletedPayload { missionId: string; xp: number; points: number; }
export interface RewardGrantedPayload    { xp: number; points: number; newLevel: number; newBadges: string[]; }

export interface GameEventMap {
  game_ready:          undefined;
  mission_selected:    MissionSelectedPayload;
  mission_started:     MissionStartedPayload;
  mission_completed:   MissionCompletedPayload;
  reward_granted:      RewardGrantedPayload;
}

type Listener<T> = T extends undefined ? () => void : (payload: T) => void;

class Bridge {
  private listeners: { [K in keyof GameEventMap]?: Array<Listener<GameEventMap[K]>> } = {};

  on<K extends keyof GameEventMap>(event: K, fn: Listener<GameEventMap[K]>): () => void {
    (this.listeners[event] ??= [] as any[]).push(fn);
    return () => this.off(event, fn);
  }

  off<K extends keyof GameEventMap>(event: K, fn: Listener<GameEventMap[K]>): void {
    this.listeners[event] = (this.listeners[event] as Array<Listener<GameEventMap[K]>> | undefined)
      ?.filter(l => l !== fn) as any;
  }

  emit<K extends keyof GameEventMap>(
    event: K,
    ...args: GameEventMap[K] extends undefined ? [] : [GameEventMap[K]]
  ): void {
    (this.listeners[event] as Array<Listener<GameEventMap[K]>> | undefined)
      ?.forEach(fn => (fn as Function)(args[0]));
  }
}

export const EventBridge = new Bridge();
