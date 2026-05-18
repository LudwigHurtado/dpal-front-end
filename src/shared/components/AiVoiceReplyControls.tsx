import React from 'react';
import { Volume2 } from '../../../components/icons';

export type AiVoiceReplyControlsProps = {
  replyText?: string | null;
  autoSpeak: boolean;
  onAutoSpeakChange: (enabled: boolean) => void;
  isSpeaking: boolean;
  isGeneratingVoice?: boolean;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  ttsSupported: boolean;
  ttsUnsupportedMessage: string;
  voiceError?: string | null;
  statusMessage?: string | null;
  voiceProvider?: 'chatterbox' | 'browser' | null;
  /** Use on dark panels (AquaScan) for readable labels. */
  theme?: 'light' | 'dark';
  className?: string;
  listenLabel?: string;
  emptyHint?: string;
};

export function AiVoiceReplyControls({
  replyText,
  autoSpeak,
  onAutoSpeakChange,
  isSpeaking,
  isGeneratingVoice = false,
  speak,
  stopSpeaking,
  ttsSupported,
  ttsUnsupportedMessage,
  voiceError = null,
  statusMessage = null,
  voiceProvider = null,
  theme = 'light',
  className = '',
  listenLabel = 'Listen',
  emptyHint = 'Ask a question first to enable voice.',
}: AiVoiceReplyControlsProps): React.ReactElement {
  const trimmedReply = replyText?.trim() ?? '';
  const displayStatus = statusMessage ?? voiceError;
  const isDark = theme === 'dark';
  const labelClass = isDark ? 'text-slate-300' : 'text-slate-600';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-400';
  const statusClass = isDark ? 'text-amber-200' : 'text-amber-700';
  const metaClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const btnClass = isDark
    ? 'inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-950/40 px-2 py-1 text-[10px] font-bold text-cyan-100 hover:bg-cyan-900/50 disabled:cursor-wait disabled:opacity-60'
    : 'inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-[#1e3a5f] hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60';

  const handlePrimaryClick = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    if (isGeneratingVoice) {
      stopSpeaking();
      return;
    }
    if (!trimmedReply) return;
    speak(trimmedReply);
  };

  const primaryLabel = isGeneratingVoice
    ? 'Generating…'
    : isSpeaking
      ? 'Stop'
      : listenLabel;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Voice reply controls">
        <label className={`flex cursor-pointer items-center gap-1.5 text-[10px] ${labelClass}`}>
          <input
            type="checkbox"
            checked={autoSpeak}
            onChange={(e) => onAutoSpeakChange(e.target.checked)}
            disabled={!ttsSupported}
            className="rounded border-slate-300 text-[#1e3a5f]"
          />
          Read replies aloud
        </label>
        {!ttsSupported ? (
          <span className={`text-[10px] ${mutedClass}`}>({ttsUnsupportedMessage})</span>
        ) : null}
        {ttsSupported ? (
          <button
            type="button"
            onClick={handlePrimaryClick}
            disabled={!trimmedReply && !isSpeaking && !isGeneratingVoice}
            className={btnClass}
            aria-label={
              isGeneratingVoice
                ? 'Cancel voice generation'
                : isSpeaking
                  ? 'Stop speaking'
                  : trimmedReply
                    ? listenLabel
                    : emptyHint
            }
          >
            <Volume2 className="h-3 w-3" aria-hidden />
            {primaryLabel}
          </button>
        ) : null}
        {isGeneratingVoice && trimmedReply ? (
          <button
            type="button"
            onClick={stopSpeaking}
            className={`text-[10px] underline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            Cancel
          </button>
        ) : null}
        {displayStatus ? (
          <span className={`max-w-full text-[10px] ${statusClass}`} role="status">
            {displayStatus}
          </span>
        ) : null}
      </div>
      {!trimmedReply && ttsSupported ? (
        <p className={`text-[10px] ${metaClass}`}>{emptyHint}</p>
      ) : null}
      {trimmedReply ? (
        <p className={`text-[10px] ${metaClass}`}>
          <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Spoken text: </span>
          {trimmedReply.length > 200 ? `${trimmedReply.slice(0, 200)}…` : trimmedReply}
        </p>
      ) : null}
      {voiceProvider ? (
        <p className={`text-[10px] ${metaClass}`} role="status">
          Voice: {voiceProvider === 'chatterbox' ? 'Chatterbox' : 'Browser fallback'}
        </p>
      ) : null}
    </div>
  );
}
