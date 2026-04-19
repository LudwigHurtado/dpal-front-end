import React, { useEffect, useRef, useCallback } from 'react';
import type { DPALGameCallbacks } from './game/main';

interface Props {
  /** Override width in px; defaults to 100% of the container */
  width?: number | string;
  /** Override height in px; defaults to 560px */
  height?: number | string;
  /** Callbacks forwarded to the Phaser EventBridge */
  onGameReady?: DPALGameCallbacks['onGameReady'];
  onMissionSelected?: DPALGameCallbacks['onMissionSelected'];
  onMissionStarted?: DPALGameCallbacks['onMissionStarted'];
  onMissionCompleted?: DPALGameCallbacks['onMissionCompleted'];
  onRewardGranted?: DPALGameCallbacks['onRewardGranted'];
  className?: string;
}

/**
 * MissionGameView — React wrapper for the DPAL Mission Ops Phaser game.
 *
 * Mount this component anywhere in the app; it creates an isolated Phaser
 * instance and cleans it up on unmount. The game has no knowledge of React —
 * all communication flows through the EventBridge callbacks.
 *
 * Example:
 *   <MissionGameView
 *     onMissionCompleted={({ missionId, xp }) =>
 *       console.log(`${missionId} done — earned ${xp} XP`)}
 *   />
 */
export function MissionGameView({
  width = '100%',
  height = 560,
  onGameReady,
  onMissionSelected,
  onMissionStarted,
  onMissionCompleted,
  onRewardGranted,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep callback refs stable so the effect doesn't re-run on re-render
  const cbRef = useRef<DPALGameCallbacks>({});
  cbRef.current = {
    onGameReady,
    onMissionSelected,
    onMissionStarted,
    onMissionCompleted,
    onRewardGranted,
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let game: import('./game/main').DPALGame | null = null;

    // Dynamic import keeps Phaser out of the initial bundle
    import('./game/main').then(({ DPALGame }) => {
      if (!containerRef.current) return;
      game = new DPALGame(containerRef.current, {
        onGameReady:        () => cbRef.current.onGameReady?.(),
        onMissionSelected:  (p) => cbRef.current.onMissionSelected?.(p),
        onMissionStarted:   (p) => cbRef.current.onMissionStarted?.(p),
        onMissionCompleted: (p) => cbRef.current.onMissionCompleted?.(p),
        onRewardGranted:    (p) => cbRef.current.onRewardGranted?.(p),
      });
    });

    return () => {
      game?.destroy();
      game = null;
    };
  }, []); // intentionally empty — game mounts once per component lifetime

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        background: '#0b1826',
        borderRadius: 8,
      }}
    />
  );
}

export default MissionGameView;
