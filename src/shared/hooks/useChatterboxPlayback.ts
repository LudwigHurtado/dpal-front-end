import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  postDeepAlVoiceSynthesize,
  resolveVoiceAudioUrl,
  type DeepAlVoiceSynthesizeResponse,
} from '../api/deepalVoiceApi';
import { toPlayableAudioSrc } from '../voice/chatterboxAudio';

const DEFAULT_CLIENT_TIMEOUT_MS = 120_000;
/** Keep synthesis payloads small for Railway CPU / browser decode limits. */
const MAX_SYNTHESIS_CHARS = 800;

export type ChatterboxPlayResult =
  | { success: true }
  | { success: false; reason: string };

export type UseChatterboxPlaybackOptions = {
  workspace?: string;
  module?: string;
  /** Max wait for Chatterbox API before browser fallback (default 120s). */
  clientTimeoutMs?: number;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onPlaybackError?: (message: string) => void;
};

function audioUrlType(url: string): 'data-uri' | 'url' {
  return url.startsWith('data:') ? 'data-uri' : 'url';
}

function resolveResponseAudioUrl(response: DeepAlVoiceSynthesizeResponse): string | null {
  if (!response.ok) return null;
  if (response.audioUrl?.trim()) return response.audioUrl.trim();
  return resolveVoiceAudioUrl(response as unknown as Record<string, unknown>);
}

function pauseCurrentAudio(currentAudioRef: MutableRefObject<HTMLAudioElement | null>) {
  const prev = currentAudioRef.current;
  if (!prev) return;
  prev.onended = null;
  prev.onerror = null;
  prev.onplay = null;
  prev.pause();
  prev.currentTime = 0;
  prev.removeAttribute('src');
  prev.load();
  currentAudioRef.current = null;
}

/** Play Chatterbox audio via HTMLAudioElement (data: URIs and https URLs). */
function playChatterboxAudio(
  audioUrl: string,
  currentAudioRef: MutableRefObject<HTMLAudioElement | null>,
  revokeRef: MutableRefObject<(() => void) | null>,
  hooks: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (message: string) => void;
  },
): Promise<{ success: true } | { success: false; reason: string }> {
  pauseCurrentAudio(currentAudioRef);
  revokeRef.current?.();
  revokeRef.current = null;

  return new Promise((resolve) => {
    const prepared = toPlayableAudioSrc(audioUrl);
    if (prepared.revoke) {
      revokeRef.current = prepared.revoke;
    }
    const audio = new Audio(prepared.src);
    currentAudioRef.current = audio;
    let settled = false;

    const cleanupPrepared = () => {
      prepared.revoke?.();
      if (revokeRef.current === prepared.revoke) {
        revokeRef.current = null;
      }
    };

    const finish = (success: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      if (!success) {
        cleanupPrepared();
        pauseCurrentAudio(currentAudioRef);
        const msg = reason ?? 'HTMLAudioElement playback failed.';
        hooks.onError?.(msg);
        resolve({ success: false, reason: msg });
        return;
      }
      resolve({ success: true });
    };

    audio.onplay = () => {
      hooks.onStart?.();
      finish(true);
    };

    audio.onended = () => {
      cleanupPrepared();
      pauseCurrentAudio(currentAudioRef);
      hooks.onEnd?.();
    };

    audio.onerror = () => {
      finish(false, 'HTMLAudioElement could not decode or play Chatterbox audio.');
    };

    void audio.play().then(() => {
      if (!settled) {
        hooks.onStart?.();
        finish(true);
      }
    }).catch((err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'audio.play() rejected (autoplay or decode error).';
      finish(false, message);
    });
  });
}

export function useChatterboxPlayback(options: UseChatterboxPlaybackOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const revokeObjectUrlRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const revokeObjectUrl = useCallback(() => {
    revokeObjectUrlRef.current?.();
    revokeObjectUrlRef.current = null;
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    pauseCurrentAudio(currentAudioRef);
    revokeObjectUrl();
    setIsPlaying(false);
    setIsLoading(false);
  }, [revokeObjectUrl]);

  const playText = useCallback(
    async (text: string): Promise<ChatterboxPlayResult> => {
      const trimmed = text.trim();
      if (!trimmed) return { success: false, reason: 'No text to speak.' };

      const synthText =
        trimmed.length > MAX_SYNTHESIS_CHARS
          ? `${trimmed.slice(0, MAX_SYNTHESIS_CHARS)}…`
          : trimmed;

      stop();
      setIsLoading(true);
      setLastError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const response = await postDeepAlVoiceSynthesize(synthText, {
        workspace: options.workspace,
        module: options.module,
        signal: controller.signal,
        timeoutMs: options.clientTimeoutMs ?? DEFAULT_CLIENT_TIMEOUT_MS,
      });

      if (controller.signal.aborted) {
        setIsLoading(false);
        return { success: false, reason: 'Voice request cancelled.' };
      }

      if (!response.ok) {
        const reason = response.message ?? response.error ?? 'Voice synthesis unavailable.';
        console.warn('[DeepAL Voice] Browser TTS fallback used', reason);
        setLastError(reason);
        setIsLoading(false);
        options.onPlaybackError?.(reason);
        return { success: false, reason };
      }

      const audioUrl = resolveResponseAudioUrl(response);

      if (!audioUrl) {
        const reason = 'Chatterbox response missing audioUrl.';
        console.warn('[DeepAL Voice] Browser TTS fallback used', reason);
        setLastError(reason);
        setIsLoading(false);
        options.onPlaybackError?.(reason);
        return { success: false, reason };
      }

      console.info('[DeepAL Voice] Chatterbox audio received', {
        ok: response.ok,
        hasAudioUrl: Boolean(audioUrl),
        audioUrlType: audioUrlType(audioUrl),
      });

      const playback = await playChatterboxAudio(audioUrl, currentAudioRef, revokeObjectUrlRef, {
        onStart: () => {
          setIsLoading(false);
          setIsPlaying(true);
          options.onPlaybackStart?.();
        },
        onEnd: () => {
          revokeObjectUrl();
          setIsPlaying(false);
          options.onPlaybackEnd?.();
        },
        onError: (message) => {
          console.warn('[DeepAL Voice] Browser TTS fallback used', message);
          setLastError(message);
          setIsPlaying(false);
          setIsLoading(false);
          options.onPlaybackError?.(message);
        },
      });

      if (!playback.success) {
        setIsLoading(false);
        return playback;
      }

      return { success: true };
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
