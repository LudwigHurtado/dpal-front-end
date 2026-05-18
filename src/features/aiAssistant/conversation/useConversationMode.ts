import { useCallback, useEffect, useRef, useState } from 'react';
import { useTextToSpeech } from '../../../shared/hooks/useTextToSpeech';
import { postDeepAlChat } from '../api/deepalChatApi';
import { useChatterboxPlayback } from '../voice/useChatterboxPlayback';
import {
  DEFAULT_CONVERSATION_SETTINGS,
  type ConversationPhase,
  type ConversationSettings,
  type ConversationTurnResult,
  type DeepAlChatMessage,
  type DeepAlRationale,
} from './conversationTypes';
import {
  isConversationStartable,
  phaseToUiStatus,
  shouldSuppressAutoSend,
  transitionOnBargeIn,
  transitionOnError,
  transitionOnPause,
  transitionOnSendStart,
  transitionOnSilenceDetected,
  transitionOnStart,
  transitionOnStop,
  transitionOnVoiceEnd,
  transitionOnVoiceStart,
} from './conversationStateMachine';

const SPEECH_UNSUPPORTED =
  'Voice input is not available in this browser. You can still type your question.';

const BARGE_IN_MIN_CHARS = 4;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export type UseConversationModeOptions = {
  enabled: boolean;
  settings?: Partial<ConversationSettings>;
  context?: string;
  workspace?: string;
  projectId?: string;
  messages?: DeepAlChatMessage[];
  onTurnComplete?: (turn: ConversationTurnResult) => void;
  onMessagesAppend?: (userText: string, assistantText: string) => void;
  disabled?: boolean;
};

export function useConversationMode(options: UseConversationModeOptions) {
  const settings: ConversationSettings = {
    ...DEFAULT_CONVERSATION_SETTINGS,
    ...options.settings,
  };

  const [phase, setPhase] = useState<ConversationPhase>('IDLE');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [autoSendHint, setAutoSendHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [lastAnswer, setLastAnswer] = useState('');
  const [rationale, setRationale] = useState<DeepAlRationale | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [activeConversation, setActiveConversation] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const bargeRecognitionRef = useRef<SpeechRecognition | null>(null);
  const finalBufferRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef(options.messages ?? []);
  const phaseRef = useRef(phase);
  const activeRef = useRef(activeConversation);
  const voiceMutedRef = useRef(voiceMuted);

  useEffect(() => {
    messagesRef.current = options.messages ?? [];
  }, [options.messages]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    activeRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    voiceMutedRef.current = voiceMuted;
  }, [voiceMuted]);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const browserTts = useTextToSpeech({ language: 'en-US' });

  const finishVoicePlayback = useCallback(() => {
    if (!activeRef.current) {
      setPhase('IDLE');
      return;
    }
    setPhase(transitionOnVoiceEnd(settings.reopenMicAfterSpeech));
    if (settings.reopenMicAfterSpeech) {
      window.setTimeout(() => startListeningRef.current(), 120);
    }
  }, [settings.reopenMicAfterSpeech]);

  const chatterbox = useChatterboxPlayback({
    onPlaybackStart: () => setPhase(transitionOnVoiceStart()),
    onPlaybackEnd: finishVoicePlayback,
    onPlaybackError: () => {
      /* Fallback handled in playReplyVoice */
    },
  });

  const playReplyVoice = useCallback(
    async (text: string): Promise<boolean> => {
      browserTts.stop();
      const playResult = await chatterbox.playText(text);
      if (playResult.success) return true;
      const reason = playResult.reason;
      console.warn('[DeepAL Voice] Browser TTS fallback used', reason);
      if (!browserTts.isSupported) return false;
      setPhase(transitionOnVoiceStart());
      const browserPlayed = await browserTts.speakAsync(text);
      if (browserPlayed) {
        setVoiceNotice('Chatterbox failed, using browser voice');
        finishVoicePlayback();
        return true;
      }
      return false;
    },
    [browserTts, chatterbox, finishVoicePlayback],
  );

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setAutoSendHint(null);
  }, []);

  const stopRecognition = useCallback((target: 'main' | 'barge' | 'both') => {
    if (target === 'main' || target === 'both') {
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
    }
    if (target === 'barge' || target === 'both') {
      const barge = bargeRecognitionRef.current;
      if (barge) {
        try {
          barge.stop();
        } catch {
          try {
            barge.abort();
          } catch {
            /* ignore */
          }
        }
        bargeRecognitionRef.current = null;
      }
    }
  }, []);

  const resetTranscriptBuffers = useCallback(() => {
    finalBufferRef.current = '';
    setLiveTranscript('');
  }, []);

  const runAutoSend = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (trimmed.length < settings.minTranscriptLength) return;
      if (shouldSuppressAutoSend(phaseRef.current)) return;

      clearSilenceTimer();
      stopRecognition('main');
      resetTranscriptBuffers();
      setAutoSendHint('Sending…');
      setPhase(transitionOnSilenceDetected(phaseRef.current) ?? 'AUTO_SENDING');
      setPhase(transitionOnSendStart());

      try {
        const res = await postDeepAlChat({
          question: trimmed,
          messages: messagesRef.current,
          context: options.context,
          workspace: options.workspace,
          module: options.workspace,
          projectId: options.projectId,
        });

        const answer = res.answer?.trim() || 'No response from the assistant.';
        const speakText = res.spokenText?.trim() || answer;
        setLastAnswer(answer);
        setSpokenText(speakText);
        setRationale({
          ...res.rationale,
          finalAnswer: answer,
          spokenText: speakText,
        });
        setVoiceNotice(null);
        options.onMessagesAppend?.(trimmed, answer);

        const turn: ConversationTurnResult = {
          userText: trimmed,
          answer,
          spokenText: speakText,
          rationale: res.rationale,
          voiceError: null,
        };

        if (settings.autoSpeakAnswer && !voiceMutedRef.current) {
          setPhase('GENERATING_VOICE');
          const played = await playReplyVoice(speakText);
          if (!played) {
            setVoiceNotice('Voice unavailable — showing text only.');
            turn.voiceError = chatterbox.lastError;
            setRationale((prev) =>
              prev ? { ...prev, voiceStatus: 'failed' } : prev,
            );
            setPhase(
              activeRef.current && settings.reopenMicAfterSpeech ? 'LISTENING' : 'IDLE',
            );
            if (activeRef.current && settings.reopenMicAfterSpeech) {
              window.setTimeout(() => startListeningRef.current(), 120);
            }
          }
        } else {
          setPhase(
            activeRef.current && settings.reopenMicAfterSpeech ? 'LISTENING' : 'IDLE',
          );
          if (activeRef.current && settings.reopenMicAfterSpeech) {
            window.setTimeout(() => startListeningRef.current(), 120);
          }
        }

        options.onTurnComplete?.(turn);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Conversation send failed.';
        setError(msg);
        setPhase(transitionOnError());
      } finally {
        setAutoSendHint(null);
      }
    },
    [
      chatterbox,
      clearSilenceTimer,
      options,
      playReplyVoice,
      resetTranscriptBuffers,
      settings.autoSpeakAnswer,
      settings.minTranscriptLength,
      settings.reopenMicAfterSpeech,
      stopRecognition,
    ],
  );

  const scheduleAutoSend = useCallback(() => {
    if (!activeRef.current || shouldSuppressAutoSend(phaseRef.current)) return;
    clearSilenceTimer();
    setAutoSendHint('Auto-sending soon…');
    silenceTimerRef.current = setTimeout(() => {
      const full = finalBufferRef.current.trim();
      if (full.length < settings.minTranscriptLength) {
        setAutoSendHint(null);
        return;
      }
      void runAutoSend(full);
    }, settings.autoSendAfterSilenceMs);
  }, [
    clearSilenceTimer,
    runAutoSend,
    settings.autoSendAfterSilenceMs,
    settings.minTranscriptLength,
  ]);

  const handleBargeIn = useCallback(() => {
    if (!settings.allowBargeIn) return;
    chatterbox.stop();
    browserTts.stop();
    setVoiceNotice(null);
    stopRecognition('both');
    resetTranscriptBuffers();
    setPhase(transitionOnBargeIn());
    window.setTimeout(() => startListeningRef.current(), 80);
  }, [browserTts, chatterbox, resetTranscriptBuffers, settings.allowBargeIn, stopRecognition]);

  const startBargeInListener = useCallback(() => {
    if (!settings.allowBargeIn || !settings.pauseMicWhileSpeaking) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || bargeRecognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        chunk += event.results[i][0]?.transcript ?? '';
      }
      if (chunk.trim().length >= BARGE_IN_MIN_CHARS && phaseRef.current === 'SPEAKING') {
        handleBargeIn();
      }
    };

    recognition.onerror = () => {
      bargeRecognitionRef.current = null;
    };

    recognition.onend = () => {
      bargeRecognitionRef.current = null;
    };

    bargeRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      bargeRecognitionRef.current = null;
    }
  }, [handleBargeIn, settings.allowBargeIn, settings.pauseMicWhileSpeaking]);

  const startListening = useCallback(() => {
    if (!activeRef.current || options.disabled) return;
    if (phaseRef.current === 'SPEAKING' || phaseRef.current === 'GENERATING_VOICE') return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(SPEECH_UNSUPPORTED);
      setPhase(transitionOnError());
      return;
    }

    stopRecognition('main');
    resetTranscriptBuffers();
    setError(null);
    setPhase(transitionOnStart());

    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setPhase('LISTENING');

    recognition.onend = () => {
      recognitionRef.current = null;
      if (
        activeRef.current &&
        phaseRef.current === 'LISTENING' &&
        finalBufferRef.current.trim().length >= settings.minTranscriptLength
      ) {
        void runAutoSend(finalBufferRef.current.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') setError('Microphone access was denied.');
      else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(event.message || 'Speech recognition failed.');
      }
      recognitionRef.current = null;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (shouldSuppressAutoSend(phaseRef.current)) return;

      let interim = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) finalChunk += text;
        else interim += text;
      }

      if (finalChunk.trim()) {
        finalBufferRef.current = finalBufferRef.current.trim()
          ? `${finalBufferRef.current.trim()} ${finalChunk.trim()}`
          : finalChunk.trim();
        setLiveTranscript(finalBufferRef.current);
        setPhase('TRANSCRIBING');
        scheduleAutoSend();
      } else if (interim.trim()) {
        const display = finalBufferRef.current.trim()
          ? `${finalBufferRef.current.trim()} ${interim.trim()}`
          : interim.trim();
        setLiveTranscript(display);
        setPhase('TRANSCRIBING');
        scheduleAutoSend();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start microphone.');
      setPhase(transitionOnError());
      recognitionRef.current = null;
    }
  }, [
    options.disabled,
    resetTranscriptBuffers,
    runAutoSend,
    scheduleAutoSend,
    settings.minTranscriptLength,
    stopRecognition,
  ]);

  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  useEffect(() => {
    if (phase === 'SPEAKING' && settings.allowBargeIn && settings.pauseMicWhileSpeaking) {
      startBargeInListener();
    } else {
      stopRecognition('barge');
    }
  }, [phase, settings.allowBargeIn, settings.pauseMicWhileSpeaking, startBargeInListener, stopRecognition]);

  const startConversation = useCallback(() => {
    if (!options.enabled || options.disabled) return;
    setActiveConversation(true);
    activeRef.current = true;
    setError(null);
    setVoiceNotice(null);
    startListening();
  }, [options.disabled, options.enabled, startListening]);

  const stopConversation = useCallback(() => {
    setActiveConversation(false);
    activeRef.current = false;
    clearSilenceTimer();
    stopRecognition('both');
    chatterbox.stop();
    browserTts.stop();
    resetTranscriptBuffers();
    setPhase(transitionOnStop());
    setAutoSendHint(null);
  }, [browserTts, chatterbox, clearSilenceTimer, resetTranscriptBuffers, stopRecognition]);

  const pauseConversation = useCallback(() => {
    clearSilenceTimer();
    stopRecognition('both');
    chatterbox.stop();
    browserTts.stop();
    setPhase(transitionOnPause());
  }, [browserTts, chatterbox, clearSilenceTimer, stopRecognition]);

  const resumeConversation = useCallback(() => {
    if (!activeRef.current) return;
    setPhase('LISTENING');
    startListening();
  }, [startListening]);

  const toggleVoiceMute = useCallback(() => {
    setVoiceMuted((prev) => {
      const next = !prev;
      if (next) {
        chatterbox.stop();
        browserTts.stop();
      }
      return next;
    });
  }, [browserTts, chatterbox]);

  const replayLastVoice = useCallback(() => {
    const text = spokenText.trim();
    if (!text || voiceMuted) return;
    void playReplyVoice(text);
  }, [playReplyVoice, spokenText, voiceMuted]);

  useEffect(
    () => () => {
      clearSilenceTimer();
      stopRecognition('both');
      chatterbox.stop();
      browserTts.stop();
    },
    [browserTts, chatterbox, clearSilenceTimer, stopRecognition],
  );

  return {
    phase,
    uiStatus: phaseToUiStatus(phase),
    liveTranscript,
    autoSendHint,
    error,
    voiceMuted,
    spokenText,
    lastAnswer,
    rationale,
    voiceNotice,
    speechSupported,
    activeConversation,
    isSpeaking: chatterbox.isPlaying || browserTts.isSpeaking,
    isGeneratingVoice: chatterbox.isLoading || phase === 'GENERATING_VOICE',
    settings,
    startConversation,
    stopConversation,
    pauseConversation,
    resumeConversation,
    toggleVoiceMute,
    replayLastVoice,
    startListening,
    stopListening: () => stopRecognition('main'),
    isStartable: isConversationStartable(phase),
  };
}
