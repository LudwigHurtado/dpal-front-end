import { useCallback, useEffect, useRef, useState } from 'react';
import { TTS_UNSUPPORTED_MESSAGE, useTextToSpeech } from './useTextToSpeech';

export type UseAiVoiceAssistantOptions = {
  defaultAutoSpeak?: boolean;
  language?: string;
};

export function useAiVoiceAssistant(options: UseAiVoiceAssistantOptions = {}) {
  const [autoSpeak, setAutoSpeak] = useState(options.defaultAutoSpeak ?? true);
  const { isSupported: ttsSupported, isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech({
    language: options.language,
  });
  const autoSpeakRef = useRef(autoSpeak);
  const speakRef = useRef(speak);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  const speakReply = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed && autoSpeakRef.current) speakRef.current(trimmed);
  }, []);

  const setAutoSpeakEnabled = useCallback(
    (enabled: boolean) => {
      setAutoSpeak(enabled);
      if (!enabled) stopSpeaking();
    },
    [stopSpeaking],
  );

  return {
    autoSpeak,
    setAutoSpeak: setAutoSpeakEnabled,
    ttsSupported,
    isSpeaking,
    speak,
    stopSpeaking,
    speakReply,
    ttsUnsupportedMessage: TTS_UNSUPPORTED_MESSAGE,
  };
}
