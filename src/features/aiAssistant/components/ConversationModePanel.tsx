import React from 'react';
import { EyeOff, Mic, Minimize2, RefreshCw, Square, Volume2 } from '../../../../components/icons';
import type { useConversationMode } from '../conversation/useConversationMode';
import { LiveTranscriptBox } from './LiveTranscriptBox';
import { SpokenTextPanel } from '../voice/SpokenTextPanel';
import { AiRationalePanel } from '../rationale/AiRationalePanel';

export type ConversationModePanelProps = {
  conversation: ReturnType<typeof useConversationMode>;
  className?: string;
};

export function ConversationModePanel({
  conversation,
  className = '',
}: ConversationModePanelProps): React.ReactElement {
  const {
    uiStatus,
    liveTranscript,
    autoSendHint,
    error,
    voiceMuted,
    spokenText,
    rationale,
    voiceNotice,
    speechSupported,
    activeConversation,
    isSpeaking,
    settings,
    startConversation,
    stopConversation,
    pauseConversation,
    resumeConversation,
    toggleVoiceMute,
    replayLastVoice,
    phase,
  } = conversation;

  const isListening = phase === 'LISTENING' || phase === 'TRANSCRIBING';

  return (
    <div className={`space-y-3 rounded-xl border border-[#1e3a5f]/20 bg-[#f8fafc] p-3 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#1e3a5f]">Conversation mode</p>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
          {uiStatus}
        </span>
      </div>

      {!speechSupported ? (
        <p className="text-xs text-amber-900">{error ?? 'Voice input is not supported in this browser.'}</p>
      ) : null}

      <LiveTranscriptBox
        transcript={liveTranscript}
        isListening={isListening}
        autoSendHint={autoSendHint}
        placeholder={
          activeConversation
            ? 'Speak now — live transcript appears here…'
            : 'Start conversation to use hands-free voice.'
        }
      />

      {voiceNotice ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">{voiceNotice}</p>
      ) : null}

      {error && activeConversation ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{error}</p>
      ) : null}

      <SpokenTextPanel spokenText={spokenText} visible={settings.showSpokenText} />

      <AiRationalePanel rationale={rationale} visible={settings.showRationaleSummary} />

      <div className="flex flex-wrap items-center gap-2">
        {!activeConversation ? (
          <button
            type="button"
            disabled={!speechSupported}
            onClick={startConversation}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] px-3 py-2 text-xs font-bold text-white hover:bg-[#152a47] disabled:opacity-50"
          >
            <Mic className="h-3.5 w-3.5" aria-hidden />
            Start conversation
          </button>
        ) : (
          <>
            {phase === 'PAUSED' ? (
              <button
                type="button"
                onClick={resumeConversation}
                className="inline-flex items-center gap-1 rounded-lg border border-[#1e3a5f]/30 bg-white px-3 py-2 text-xs font-bold text-[#1e3a5f]"
              >
                <Mic className="h-3.5 w-3.5" aria-hidden />
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseConversation}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={stopConversation}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-900"
            >
              <Square className="h-3.5 w-3.5" aria-hidden />
              Stop
            </button>
          </>
        )}

        <button
          type="button"
          onClick={toggleVoiceMute}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          aria-pressed={voiceMuted}
        >
          {voiceMuted ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
          {voiceMuted ? 'Unmute voice' : 'Mute voice'}
        </button>

        <button
          type="button"
          disabled={!spokenText.trim() || voiceMuted || isSpeaking}
          onClick={replayLastVoice}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Replay
        </button>
      </div>
    </div>
  );
}
