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
    clientTimeoutMs: 25_000,
  });
  const autoSpeakRef = useRef(autoSpeak);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  const stopSpeaking = useCallback(() => {
    chatterbox.stop();
    browserTts.stop();
    setVoiceProvider(null);
    setStatusMessage(null);
  }, [browserTts, chatterbox]);

  const speak = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      void (async () => {
        stopSpeaking();
        setStatusMessage('Generating natural voice…');

        const played = await chatterbox.playText(trimmed);
        if (played) {
          setVoiceProvider('chatterbox');
          setStatusMessage(null);
          return;
        }

        setStatusMessage('Using browser voice while Chatterbox warms up…');
        const browserPlayed = await browserTts.speakAsync(trimmed);
        if (browserPlayed) {
          setVoiceProvider('browser');
          setStatusMessage(
            chatterbox.lastError
              ? 'Playing browser voice (Chatterbox still loading on server — try again in a minute).'
              : null,
          );
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
