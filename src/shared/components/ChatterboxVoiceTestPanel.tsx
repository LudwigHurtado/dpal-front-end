import React, { useCallback, useRef, useState } from 'react';
import { API_ROUTES, apiUrl } from '../../../constants';
import { postDeepAlVoiceSynthesize, resolveVoiceAudioUrl } from '../api/deepalVoiceApi';

const TEST_PHRASE = 'Hello from DPAL. This is Chatterbox speaking.';

type TestState = {
  loading: boolean;
  rawJson: string;
  audioUrl: string | null;
  usedBrowserFallback: boolean;
  error: string | null;
};

const INITIAL: TestState = {
  loading: false,
  rawJson: '',
  audioUrl: null,
  usedBrowserFallback: false,
  error: null,
};

/** Dev-only panel to verify POST /api/deepal/voice/synthesize end-to-end. */
export function ChatterboxVoiceTestPanel({
  className = '',
}: {
  className?: string;
}): React.ReactElement | null {
  if (!import.meta.env.DEV) return null;

  const [state, setState] = useState<TestState>(INITIAL);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const runTest = useCallback(async () => {
    stopAudio();
    setState({ ...INITIAL, loading: true });

    try {
      const result = await postDeepAlVoiceSynthesize(TEST_PHRASE, {
        workspace: 'dev',
        module: 'chatterbox-test',
        timeoutMs: 180_000,
      });
      const rawJson = JSON.stringify(result, null, 2);

      if (result.ok && result.audioUrl) {
        console.info('[DeepAL Voice] Chatterbox audioUrl', result.audioUrl.slice(0, 120));
        const audio = new Audio(result.audioUrl);
        audioRef.current = audio;
        await audio.play();
        setState({
          loading: false,
          rawJson,
          audioUrl: result.audioUrl,
          usedBrowserFallback: false,
          error: null,
        });
        return;
      }

      const resolved = resolveVoiceAudioUrl(result as unknown as Record<string, unknown>);
      if (resolved) {
        const audio = new Audio(resolved);
        audioRef.current = audio;
        await audio.play();
        setState({
          loading: false,
          rawJson,
          audioUrl: resolved,
          usedBrowserFallback: false,
          error: null,
        });
        return;
      }

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        console.warn('[DeepAL Voice] Falling back to browser TTS', result);
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(TEST_PHRASE);
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
        setState({
          loading: false,
          rawJson,
          audioUrl: null,
          usedBrowserFallback: true,
          error: !result.ok ? (result.message ?? result.error) : 'No audioUrl in response',
        });
        return;
      }

      setState({
        loading: false,
        rawJson,
        audioUrl: null,
        usedBrowserFallback: false,
        error: !result.ok ? (result.message ?? result.error) : 'No audioUrl',
      });
    } catch (e: unknown) {
      setState({
        ...INITIAL,
        error: e instanceof Error ? e.message : 'Test failed',
      });
    }
  }, [stopAudio]);

  return (
    <div
      className={`rounded-lg border border-dashed border-amber-500/50 bg-amber-950/20 p-3 text-[11px] text-amber-100 ${className}`.trim()}
    >
      <p className="font-semibold uppercase tracking-wider text-amber-300">Dev: Test Chatterbox Voice</p>
      <p className="mt-1 text-slate-400">
        POST {apiUrl(API_ROUTES.DEEPAL_VOICE_SYNTHESIZE)}
      </p>
      <button
        type="button"
        onClick={() => void runTest()}
        disabled={state.loading}
        className="mt-2 rounded-md border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/25 disabled:opacity-50"
      >
        {state.loading ? 'Synthesizing…' : 'Test Chatterbox Voice'}
      </button>
      {state.usedBrowserFallback ? (
        <p className="mt-2 text-amber-200" role="status">
          Browser fallback was used (Chatterbox response missing or failed).
        </p>
      ) : state.audioUrl ? (
        <p className="mt-2 text-emerald-200" role="status">
          Playing Chatterbox audio (not browser fallback).
        </p>
      ) : null}
      {state.audioUrl ? (
        <p className="mt-1 break-all">
          <a href={state.audioUrl} target="_blank" rel="noreferrer" className="underline">
            {state.audioUrl.startsWith('data:') ? 'data: URL (inline WAV)' : state.audioUrl}
          </a>
        </p>
      ) : null}
      {state.error ? (
        <p className="mt-2 text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.rawJson ? (
        <pre className="mt-2 max-h-40 overflow-auto rounded border border-slate-800 bg-slate-950/80 p-2 text-[10px] text-slate-300">
          {state.rawJson}
        </pre>
      ) : null}
    </div>
  );
}

