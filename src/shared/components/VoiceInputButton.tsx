import React, { useCallback, useEffect, useRef } from 'react';
import { Mic } from '../../../components/icons';
import { SPEECH_UNSUPPORTED_MESSAGE, useSpeechToText } from '../hooks/useSpeechToText';

export type VoiceInputButtonProps = {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
  /** When false, hides the caption under the button (parent can show it once). */
  showHint?: boolean;
};

/** Append spoken text to an existing chat input (space-separated). */
export function appendVoiceTranscript(current: string, spoken: string): string {
  const next = spoken.trim();
  if (!next) return current;
  if (!current.trim()) return next;
  return `${current.trim()} ${next}`;
}

export function VoiceInputButton({
  onTranscript,
  language = 'en-US',
  disabled = false,
  label = 'Speak',
  className = '',
  showHint = true,
}: VoiceInputButtonProps): React.ReactElement {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText({ language });

  const deliveredRef = useRef('');

  useEffect(() => {
    if (!transcript.trim() || transcript === deliveredRef.current) return;
    deliveredRef.current = transcript;
    onTranscript(transcript.trim());
    resetTranscript();
    deliveredRef.current = '';
  }, [transcript, onTranscript, resetTranscript]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    if (!isSupported) return;
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  }, [disabled, isListening, isSupported, startListening, stopListening]);

  const buttonLabel = isListening ? 'Listening…' : label;
  const title = isSupported
    ? 'Voice is converted to text only after you allow microphone access. Review the text before sending.'
    : SPEECH_UNSUPPORTED_MESSAGE;

  return (
    <div className={`flex flex-col items-start ${className}`.trim()}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || !isSupported}
        title={title}
        aria-pressed={isListening}
        aria-label={isSupported ? buttonLabel : SPEECH_UNSUPPORTED_MESSAGE}
        className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-bold transition ${
          isListening
            ? 'border-[#1e3a5f] bg-[#e8f0f7] text-[#1e3a5f]'
            : 'border-slate-300 bg-white text-[#1e3a5f] hover:bg-slate-50'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {isListening ? (
          <span
            className="absolute -inset-0.5 rounded-lg border border-[#1e3a5f]/30 animate-pulse"
            aria-hidden
          />
        ) : null}
        <span className="relative inline-flex items-center gap-1.5">
          {isListening ? (
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1e3a5f]/40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1e3a5f]" />
            </span>
          ) : (
            <Mic className="h-3.5 w-3.5" aria-hidden />
          )}
          <span>{buttonLabel}</span>
        </span>
      </button>

      {showHint && !isSupported ? (
        <p className="mt-1 max-w-[14rem] text-[10px] leading-snug text-slate-500" role="status">
          {SPEECH_UNSUPPORTED_MESSAGE}
        </p>
      ) : showHint ? (
        <p className="mt-1 max-w-[14rem] text-[10px] leading-snug text-slate-500">
          Voice is converted to text only after you allow microphone access. Review the text before sending.
        </p>
      ) : null}

      {isListening && interimTranscript ? (
        <p className="mt-0.5 max-w-[14rem] truncate text-[10px] italic text-slate-600" aria-live="polite">
          {interimTranscript}
        </p>
      ) : null}

      {error ? (
        <p className="mt-0.5 max-w-[14rem] text-[10px] text-amber-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
