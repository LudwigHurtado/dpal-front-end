import { useCallback, useEffect, useRef, useState } from 'react';

export const TTS_UNSUPPORTED_MESSAGE =
  'Spoken replies are not supported in this browser. You can still read the text response.';

export type UseTextToSpeechOptions = {
  language?: string;
  rate?: number;
};

export type UseTextToSpeechResult = {
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string) => void;
  /** Resolves when playback ends or fails. */
  speakAsync: (text: string) => Promise<boolean>;
  stop: () => void;
};

export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeechResult {
  const language = options.language ?? 'en-US';
  const rate = options.rate ?? 1;
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speakAsync = useCallback(
    (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || typeof window === 'undefined' || !window.speechSynthesis) {
        return Promise.resolve(false);
      }

      stop();

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(trimmed);
        utterance.lang = language;
        utterance.rate = rate;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          utteranceRef.current = null;
          resolve(true);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          utteranceRef.current = null;
          resolve(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    },
    [language, rate, stop],
  );

  const speak = useCallback(
    (text: string) => {
      void speakAsync(text);
    },
    [speakAsync],
  );

  useEffect(
    () => () => {
      stop();
    },
    [stop],
  );

  return { isSupported, isSpeaking, speak, speakAsync, stop };
}
