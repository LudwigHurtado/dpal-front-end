import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Send, Square, X } from '../../../../components/icons';
import { AiVoiceReplyControls } from '../../../shared/components/AiVoiceReplyControls';
import { appendVoiceTranscript, VoiceInputButton } from '../../../shared/components/VoiceInputButton';
import { useAiVoiceAssistant } from '../../../shared/hooks/useAiVoiceAssistant';
import type { AssistantInteractionMode, DeepAlChatMessage, DeepAlRationale } from '../conversation/conversationTypes';
import { useConversationMode } from '../conversation/useConversationMode';
import { ConversationModePanel } from './ConversationModePanel';
import { SpokenTextPanel } from '../voice/SpokenTextPanel';
import { AiRationalePanel } from '../rationale/AiRationalePanel';

export type DeepAlAssistantComposerProps = {
  workspace: string;
  context?: string;
  projectId?: string;
  messages: DeepAlChatMessage[];
  onAppendMessages: (userText: string, assistantText: string) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onManualSend: (text: string) => Promise<string | null>;
  onManualRationale?: (rationale: DeepAlRationale | null) => void;
  className?: string;
};

export function DeepAlAssistantComposer({
  workspace,
  context,
  projectId,
  messages,
  onAppendMessages,
  loading = false,
  disabled = false,
  placeholder = 'Type a question or use voice…',
  onManualSend,
  onManualRationale,
  className = '',
}: DeepAlAssistantComposerProps): React.ReactElement {
  const [interactionMode, setInteractionMode] = useState<AssistantInteractionMode>('manual');
  const [inputValue, setInputValue] = useState('');
  const [lastReply, setLastReply] = useState<string | null>(null);
  const [manualRationale, setManualRationale] = useState<DeepAlRationale | null>(null);
  const voiceAssistant = useAiVoiceAssistant({ defaultAutoSpeak: false });

  const conversation = useConversationMode({
    enabled: interactionMode === 'conversation',
    context,
    workspace,
    projectId,
    messages,
    disabled: disabled || loading,
    onMessagesAppend: onAppendMessages,
    onTurnComplete: (turn) => {
      setLastReply(turn.answer);
    },
  });

  useEffect(() => {
    onManualRationale?.(manualRationale);
  }, [manualRationale, onManualRationale]);

  useEffect(() => {
    if (interactionMode === 'conversation' && conversation.activeConversation) {
      setInputValue(conversation.liveTranscript);
    }
  }, [conversation.liveTranscript, conversation.activeConversation, interactionMode]);

  const handleManualSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || loading || disabled) return;
    setInputValue('');
    const answer = await onManualSend(trimmed);
    if (answer?.trim()) {
      setLastReply(answer.trim());
      voiceAssistant.speakReply(answer.trim());
    }
  }, [disabled, inputValue, loading, onManualSend, voiceAssistant]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setInputValue((prev) => appendVoiceTranscript(prev, text));
  }, []);

  const displayTranscript =
    interactionMode === 'conversation' && conversation.activeConversation
      ? conversation.liveTranscript || inputValue
      : inputValue;

  const statusLabel = useMemo(() => {
    if (interactionMode === 'conversation') return conversation.uiStatus;
    if (loading) return 'Thinking';
    return 'Ready';
  }, [conversation.uiStatus, interactionMode, loading]);

  const activeRationale =
    interactionMode === 'conversation' ? conversation.rationale : manualRationale;

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Interaction</span>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
          <button
            type="button"
            onClick={() => {
              if (conversation.activeConversation) conversation.stopConversation();
              setInteractionMode('manual');
            }}
            className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${
              interactionMode === 'manual'
                ? 'bg-[#1e3a5f] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => {
              setInteractionMode('conversation');
              voiceAssistant.stopSpeaking();
            }}
            className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${
              interactionMode === 'conversation'
                ? 'bg-[#1e3a5f] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Conversation
          </button>
        </div>
        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
          {statusLabel}
        </span>
      </div>

      {interactionMode === 'conversation' ? (
        <ConversationModePanel conversation={conversation} />
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {interactionMode === 'conversation' ? 'Message (manual fallback)' : 'Voice & message'}
        </p>

        <textarea
          rows={3}
          readOnly={interactionMode === 'conversation' && conversation.activeConversation}
          value={displayTranscript}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading || disabled}
          placeholder={placeholder}
          className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 disabled:opacity-60"
          aria-live="polite"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {interactionMode === 'manual' ? (
            <VoiceInputButton
              showHint={false}
              label="Speak"
              onTranscript={handleVoiceTranscript}
              disabled={loading || disabled}
            />
          ) : conversation.activeConversation ? (
            <button
              type="button"
              disabled={disabled}
              onClick={conversation.stopListening}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-900"
            >
              <Square className="h-3.5 w-3.5" aria-hidden />
              Stop mic
            </button>
          ) : null}

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setInputValue('');
              if (conversation.activeConversation) conversation.stopConversation();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear
          </button>

          <button
            type="button"
            disabled={!inputValue.trim() || loading || disabled}
            onClick={() => void handleManualSend()}
            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-[#1e3a5f] px-3 py-2 text-xs font-bold text-white hover:bg-[#152a47] disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" aria-hidden />}
            Send
          </button>
        </div>
      </div>

      {interactionMode === 'manual' && lastReply ? (
        <SpokenTextPanel spokenText={lastReply.slice(0, 600)} />
      ) : null}

      <AiRationalePanel rationale={activeRationale} />

      <AiVoiceReplyControls
        className="flex-wrap"
        replyText={lastReply ?? conversation.lastAnswer}
        autoSpeak={voiceAssistant.autoSpeak}
        onAutoSpeakChange={voiceAssistant.setAutoSpeak}
        isSpeaking={voiceAssistant.isSpeaking || conversation.isSpeaking}
        speak={(text) => {
          const spoken = conversation.spokenText.trim() || text;
          if (interactionMode === 'conversation' && spoken) {
            void conversation.replayLastVoice();
            return;
          }
          voiceAssistant.speak(text);
        }}
        stopSpeaking={() => {
          voiceAssistant.stopSpeaking();
        }}
        ttsSupported={voiceAssistant.ttsSupported}
        ttsUnsupportedMessage={voiceAssistant.ttsUnsupportedMessage}
        listenLabel="Speak Answer"
      />
    </div>
  );
}
