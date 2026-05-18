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
  className?: string;
  listenLabel?: string;
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
  className = '',
  listenLabel = 'Listen',
}: AiVoiceReplyControlsProps): React.ReactElement {
  const trimmedReply = replyText?.trim() ?? '';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()} role="group" aria-label="Voice reply controls">
      <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-slate-600">
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
        <span className="text-[10px] text-slate-400">({ttsUnsupportedMessage})</span>
      ) : null}
      {trimmedReply && ttsSupported ? (
        <button
          type="button"
          onClick={() => {
            if (isSpeaking || isGeneratingVoice) {
              stopSpeaking();
              return;
            }
            speak(trimmedReply);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-[#1e3a5f] hover:bg-slate-50"
          aria-label={
            isGeneratingVoice ? 'Cancel voice' : isSpeaking ? 'Stop speaking' : 'Listen to reply'
          }
        >
          <Volume2 className="h-3 w-3" aria-hidden />
          {isGeneratingVoice ? 'Cancel' : isSpeaking ? 'Stop' : listenLabel}
        </button>
      ) : null}
      {voiceError ? (
        <span className="max-w-full text-[10px] text-amber-700" role="status">
          {voiceError}
        </span>
      ) : null}
    </div>
  );
}
