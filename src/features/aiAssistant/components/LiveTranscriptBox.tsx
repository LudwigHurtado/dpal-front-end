import React from 'react';

export type LiveTranscriptBoxProps = {
  transcript: string;
  isListening: boolean;
  autoSendHint?: string | null;
  placeholder?: string;
  className?: string;
};

export function LiveTranscriptBox({
  transcript,
  isListening,
  autoSendHint,
  placeholder = 'Speak or type your question…',
  className = '',
}: LiveTranscriptBoxProps): React.ReactElement {
  const display = transcript.trim() || (isListening ? 'Listening…' : '');

  return (
    <div className={className}>
      <div
        className="min-h-[4.5rem] rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900"
        aria-live="polite"
        aria-atomic="true"
      >
        {display ? (
          <p className="whitespace-pre-wrap leading-relaxed">{display}</p>
        ) : (
          <p className="text-slate-400">{placeholder}</p>
        )}
      </div>
      {autoSendHint ? (
        <p className="mt-1 text-[10px] font-semibold text-[#1e3a5f]">{autoSendHint}</p>
      ) : null}
    </div>
  );
}
