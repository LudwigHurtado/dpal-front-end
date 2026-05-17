import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceInputState } from '../services/dmrvFieldPlotConfigTypes';

const SPEECH_UNSUPPORTED =
  'Voice input is not available in this browser. You can still type your question.';

const MIN_SUBMIT_CHARS = 3;
const SILENCE_MS = 1500;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export type UseDmrvVoiceInputOptions = {
  language?: string;
  silenceMs?: number;
  onAutoSubmit?: (transcript: string) => void;
};

export type UseDmrvVoiceInputResult = {
  state: VoiceInputState;
  isSupported: boolean;
  isListening: boolean;
  liveTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
};

export function useDmrvVoiceInput(options: UseDmrvVoiceInputOptions = {}): UseDmrvVoiceInputResult {
  const language = options.language ?? 'en-US';
  const silenceMs = options.silenceMs ?? SILENCE_MS;
  const onAutoSubmit = options.onAutoSubmit;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<VoiceInputState>('idle');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalBufferRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);
  const onAutoSubmitRef = useRef(onAutoSubmit);

  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionCtor()));
    setState(getSpeechRecognitionCtor() ? 'ready' : 'unsupported');
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const scheduleAutoSubmit = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      const full = `${finalBufferRef.current} ${liveTranscript}`.trim();
      if (full.length < MIN_SUBMIT_CHARS || submittedRef.current) return;
      submittedRef.current = true;
      setState('processing');
      onAutoSubmitRef.current?.(full);
      finalBufferRef.current = '';
      setLiveTranscript('');
      const active = recognitionRef.current;
      if (active) {
        try {
          active.stop();
        } catch {
          /* ignore */
        }
      }
    }, silenceMs);
  }, [clearSilenceTimer, liveTranscript, silenceMs]);

  const resetBuffers = useCallback(() => {
    finalBufferRef.current = '';
    setLiveTranscript('');
    submittedRef.current = false;
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    const active = recognitionRef.current;
    if (active) {
      try {
        active.stop();
      } catch {
        try {
          active.abort();
        } catch {
          /* ignore */
        }
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    if (state !== 'processing') setState(isSupported ? 'ready' : 'unsupported');
  }, [clearSilenceTimer, isSupported, state]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(SPEECH_UNSUPPORTED);
      setState('unsupported');
      return;
    }

    stopListening();
    resetBuffers();
    setError(null);
    setState('listening');
    submittedRef.current = false;

    const recognition = new Ctor();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setState('listening');
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (!submittedRef.current) {
        const pending = `${finalBufferRef.current}`.trim();
        if (pending.length >= MIN_SUBMIT_CHARS && onAutoSubmitRef.current) {
          submittedRef.current = true;
          setState('processing');
          onAutoSubmitRef.current(pending);
          resetBuffers();
        } else {
          setState(isSupported ? 'ready' : 'unsupported');
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected — try again.');
      } else if (event.error !== 'aborted') {
        setError(event.message || 'Speech recognition failed.');
      }
      setIsListening(false);
      setState('ready');
      recognitionRef.current = null;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalChunk += text;
        } else {
          interim += text;
        }
      }

      if (finalChunk.trim()) {
        finalBufferRef.current = finalBufferRef.current.trim()
          ? `${finalBufferRef.current.trim()} ${finalChunk.trim()}`
          : finalChunk.trim();
        setLiveTranscript(finalBufferRef.current);
        scheduleAutoSubmit();
      } else if (interim.trim()) {
        const display = finalBufferRef.current.trim()
          ? `${finalBufferRef.current.trim()} ${interim.trim()}`
          : interim.trim();
        setLiveTranscript(display);
        scheduleAutoSubmit();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start microphone.');
      setState('ready');
      recognitionRef.current = null;
    }
  }, [
    isSupported,
    language,
    resetBuffers,
    scheduleAutoSubmit,
    stopListening,
  ]);

  const clearTranscript = useCallback(() => {
    resetBuffers();
    setError(null);
    setState(isSupported ? 'ready' : 'unsupported');
  }, [isSupported, resetBuffers]);

  useEffect(
    () => () => {
      clearSilenceTimer();
      const active = recognitionRef.current;
      if (active) {
        try {
          active.abort();
        } catch {
          /* ignore */
        }
      }
    },
    [clearSilenceTimer],
  );

  const voiceState: VoiceInputState = !isSupported
    ? 'unsupported'
    : state === 'processing'
      ? 'processing'
      : isListening
        ? 'listening'
        : state === 'ready'
          ? 'ready'
          : 'idle';

  return {
    state: voiceState,
    isSupported,
    isListening,
    liveTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
}

export function markVoiceReady(setState: (s: VoiceInputState) => void): void {
  setState('ready');
}
