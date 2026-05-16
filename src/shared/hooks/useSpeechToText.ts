import { useCallback, useEffect, useRef, useState } from 'react';

/** Browser Web Speech API today; future fallback: POST /api/ai/speech-to-text when available. */

export const SPEECH_UNSUPPORTED_MESSAGE =
  'Voice input is not supported in this browser. Please type your message.';

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export type UseSpeechToTextOptions = {
  language?: string;
};

export type UseSpeechToTextResult = {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
};

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextResult {
  const language = options.language ?? 'en-US';
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const stopListening = useCallback(() => {
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
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(SPEECH_UNSUPPORTED_MESSAGE);
      return;
    }

    stopListening();
    setError(null);
    resetTranscript();

    const recognition = new Ctor();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. You can still type your message.');
      } else if (event.error === 'no-speech') {
        setError('No speech was detected. Try again or type your message.');
      } else if (event.error !== 'aborted') {
        setError(event.message || 'Speech recognition failed. Please type your message.');
      }
      setIsListening(false);
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

      setInterimTranscript(interim.trim());

      if (finalChunk.trim()) {
        setTranscript((prev) => {
          const next = finalChunk.trim();
          if (!prev.trim()) return next;
          return `${prev.trim()} ${next}`;
        });
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start speech recognition.');
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [language, resetTranscript, stopListening]);

  useEffect(
    () => () => {
      const active = recognitionRef.current;
      if (active) {
        try {
          active.abort();
        } catch {
          /* ignore */
        }
      }
    },
    [],
  );

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
