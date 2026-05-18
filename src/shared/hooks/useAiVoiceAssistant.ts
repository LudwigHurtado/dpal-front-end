import { useCallback, useEffect, useRef, useState } from 'react';
import { TTS_UNSUPPORTED_MESSAGE, useTextToSpeech } from './useTextToSpeech';
import { useChatterboxPlayback } from './useChatterboxPlayback';

export type UseAiVoiceAssistantOptions = {
  defaultAutoSpeak?: boolean;
  language?: string;
};

export type AiVoiceProvider = 'chatterbox' | 'browser' | null;

export function useAiVoiceAssistant(options: UseAiVoiceAssistantOptions = {}) {
  const [autoSpeak, setAutoSpeak] = useState(options.defaultAutoSpeak ?? true);
  const [voiceProvider, setVoiceProvider] = useState<AiVoiceProvider>(null);
  const browserTts = useTextToSpeech({ language: options.language });
  const chatterbox = useChatterboxPlayback();
  const autoSpeakRef = useRef(autoSpeak);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  const stopSpeaking = useCallback(() => {
    chatterbox.stop();
    browserTts.stop();
    setVoiceProvider(null);
  }, [browserTts, chatterbox]);

  const speak = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      void (async () => {
        stopSpeaking();
        const played = await chatterbox.playText(trimmed);
        if (played) {
          setVoiceProvider('chatterbox');
          return;
        }
        if (await browserTts.speakAsync(trimmed)) {
          setVoiceProvider('browser');
        } else {
          setVoiceProvider(null);
        }
      })();
    },
    [browserTts, chatterbox, stopSpeaking],
  );

  const speakReply = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed && autoSpeakRef.current) speak(trimmed);
    },
    [speak],
  );

  const setAutoSpeakEnabled = useCallback(
    (enabled: boolean) => {
      setAutoSpeak(enabled);
      if (!enabled) stopSpeaking();
    },
    [stopSpeaking],
  );

  const isSpeaking = chatterbox.isPlaying || browserTts.isSpeaking;
  const ttsSupported = browserTts.isSupported;

  return {
    autoSpeak,
    setAutoSpeak: setAutoSpeakEnabled,
    ttsSupported,
    isSpeaking,
    isGeneratingVoice: chatterbox.isLoading,
    voiceProvider,
    voiceError: chatterbox.lastError,
    speak,
    stopSpeaking,
    speakReply,
    ttsUnsupportedMessage: TTS_UNSUPPORTED_MESSAGE,
  };
}
