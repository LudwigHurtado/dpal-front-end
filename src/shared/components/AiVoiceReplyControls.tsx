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
  className?: string;
  /** Manual TTS button label (default: Listen). */
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
          disabled={isGeneratingVoice}
          onClick={() => {
            if (isSpeaking || isGeneratingVoice) {
              stopSpeaking();
              return;
            }
            speak(trimmedReply);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-[#1e3a5f] hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          aria-label={
            isGeneratingVoice ? 'Generating voice' : isSpeaking ? 'Stop speaking' : 'Listen to reply'
          }
        >
          <Volume2 className="h-3 w-3" aria-hidden />
          {isGeneratingVoice ? 'Loading…' : isSpeaking ? 'Stop' : listenLabel}
        </button>
      ) : null}
    </div>
  );
}
