import { useCallback, useEffect, useRef, useState } from 'react';
import { postDeepAlVoiceSynthesize, resolveVoiceAudioUrl } from '../api/deepalVoiceApi';

export type UseChatterboxPlaybackOptions = {
  workspace?: string;
  module?: string;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onPlaybackError?: (message: string) => void;
};

export function useChatterboxPlayback(options: UseChatterboxPlaybackOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    }
    revokeObjectUrl();
    setIsPlaying(false);
    setIsLoading(false);
  }, [revokeObjectUrl]);

  const playText = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) return false;

      stop();
      setIsLoading(true);
      setLastError(null);

      const result = await postDeepAlVoiceSynthesize(trimmed, {
        workspace: options.workspace,
        module: options.module,
      });

      const audioUrl =
        result.ok && result.audioUrl
          ? result.audioUrl
          : resolveVoiceAudioUrl(result as unknown as Record<string, unknown>);

      if (!audioUrl) {
        const msg =
          !result.ok && result.message
            ? result.message
            : !result.ok
              ? result.error
              : 'Voice synthesis unavailable.';
        setLastError(msg);
        setIsLoading(false);
        options.onPlaybackError?.(msg);
        return false;
      }

      try {
        const audio = new Audio(audioUrl);
        if (audioUrl.startsWith('blob:')) {
          objectUrlRef.current = audioUrl;
        }
        audioRef.current = audio;
        audio.onplay = () => {
          setIsLoading(false);
          setIsPlaying(true);
          options.onPlaybackStart?.();
        };
        audio.onended = () => {
          stop();
          options.onPlaybackEnd?.();
        };
        audio.onerror = () => {
          const msg = 'Could not play synthesized audio.';
          setLastError(msg);
          stop();
          options.onPlaybackError?.(msg);
        };
        await audio.play();
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Audio playback failed.';
        setLastError(msg);
        stop();
        options.onPlaybackError?.(msg);
        return false;
      }
    },
    [options, stop],
  );

  useEffect(
    () => () => {
      stop();
    },
    [stop],
  );

  return {
    isPlaying,
    isLoading,
    lastError,
    playText,
    stop,
    replay: playText,
  };
}
