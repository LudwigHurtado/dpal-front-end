import { useCallback, useEffect, useRef, useState } from 'react';
import { TTS_UNSUPPORTED_MESSAGE, useTextToSpeech } from './useTextToSpeech';
import { useChatterboxPlayback } from './useChatterboxPlayback';

export type UseAiVoiceAssistantOptions = {
  defaultAutoSpeak?: boolean;
  language?: string;
  workspace?: string;
  module?: string;
};

export type AiVoiceProvider = 'chatterbox' | 'browser' | null;

export function useAiVoiceAssistant(options: UseAiVoiceAssistantOptions = {}) {
  const [autoSpeak, setAutoSpeak] = useState(options.defaultAutoSpeak ?? true);
  const [voiceProvider, setVoiceProvider] = useState<AiVoiceProvider>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const browserTts = useTextToSpeech({ language: options.language });
  const chatterbox = useChatterboxPlayback({
    workspace: options.workspace,
    module: options.module,
  });
  const autoSpeakRef = useRef(autoSpeak);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  const stopSpeaking = useCallback(() => {
    browserTts.stop();
    chatterbox.stop();
    setVoiceProvider(null);
    setStatusMessage(null);
  }, [browserTts, chatterbox]);

  const speak = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      void (async () => {
        stopSpeaking();
        setStatusMessage('Generating Chatterbox voice');

        const playResult = await chatterbox.playText(trimmed);
        if (playResult.success) {
          setVoiceProvider('chatterbox');
          setStatusMessage('Playing Chatterbox voice');
          return;
        }

        const fallbackReason = playResult.reason;
        console.warn('[DeepAL Voice] Browser TTS fallback used', fallbackReason);
        setStatusMessage('Chatterbox failed, using browser voice');

        const browserPlayed = await browserTts.speakAsync(trimmed);
        if (browserPlayed) {
          setVoiceProvider('browser');
          setStatusMessage('Chatterbox failed, using browser voice');
        } else {
          setVoiceProvider(null);
          setStatusMessage(
            chatterbox.lastError ?? browserTts.isSupported
              ? 'Could not play voice. Tap Speak to retry.'
              : TTS_UNSUPPORTED_MESSAGE,
          );
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
    voiceError: chatterbox.lastError ?? statusMessage,
    statusMessage,
    speak,
    stopSpeaking,
    speakReply,
    ttsUnsupportedMessage: TTS_UNSUPPORTED_MESSAGE,
  };
}
