import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, RefreshCw, Sparkles } from '../../../../components/icons';
import type { AiHelperMessage } from '../services/dmrvFieldPlotConfigTypes';
import { dmrvRuleBasedReply, trimDmrvAiContext } from '../utils/dmrvAiRuleBasedFallback';
import { useDpalAiMode } from '../../../shared/hooks/useDpalAiMode';
import { AiDiagnosticsPanel } from '../../../shared/components/AiDiagnosticsPanel';
import { DeepAlAssistantComposer } from '../../aiAssistant/components/DeepAlAssistantComposer';
import { sendDeepAlMessage } from '../../aiAssistant/sendDeepAlMessage';
import { sendAiGuidance } from '../../../services/dpalAiClient';

export type DmrvFieldPlotAiAssistantProps = {
  contextSummary: string;
  disabled?: boolean;
  prefillQuestion?: string | null;
  onClearPrefill?: () => void;
  onFillConfiguration: () => void;
  autofillPrompt?: string;
  onApplyAutofill?: (parsed: Record<string, unknown>) => void;
};

function buildPrompt(context: string, history: AiHelperMessage[], userMessage: string): string {
  const thread = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n\n');

  return `You are the DPAL DMRV Field Plot AI Assistant — helping operators configure ground-truth field evidence.

Rules:
- Answer in plain English, 2–6 sentences unless the user asks for a list.
- Use only facts from the configuration context; do not invent verification or certified credits.
- Stress that AI-filled values are drafts requiring human review before save or blockchain anchor.

Configuration context:
${context}

${thread ? `Recent conversation:\n${thread}\n\n` : ''}User: ${userMessage}

Assistant:`;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const QUICK_ACTIONS: { label: string; message: string; action?: 'fill' }[] = [
  { label: 'Fill out this configuration', message: '', action: 'fill' },
  { label: 'Explain field plots', message: 'Explain what field plots are and why they matter for forest DMRV.' },
  { label: 'What evidence is missing?', message: 'What field plot evidence is still missing based on my configuration?' },
  { label: 'Prepare validation rules', message: 'Which validation rules should I enable for forest field plots?' },
  { label: 'Prepare evidence packet checklist', message: 'What should go in my evidence packet checklist for field plots?' },
  {
    label: 'How does this connect to blockchain?',
    message: 'How does field plot configuration connect to blockchain anchoring in DPAL?',
  },
];

export function DmrvFieldPlotAiAssistant({
  contextSummary,
  disabled = false,
  prefillQuestion,
  onClearPrefill,
  onFillConfiguration,
  autofillPrompt,
  onApplyAutofill,
}: DmrvFieldPlotAiAssistantProps): React.ReactElement {
  const { geminiLive, isChecking, configured, userFallbackMessage, refresh, ensureLiveBeforeSend } =
    useDpalAiMode();
  const [messages, setMessages] = useState<AiHelperMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef(contextSummary);
  const submitLockRef = useRef(false);

  useEffect(() => {
    contextRef.current = trimDmrvAiContext(contextSummary);
  }, [contextSummary]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string): Promise<string | null> => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 2 || loading || disabled || submitLockRef.current) return null;

      submitLockRef.current = true;
      const userMsg: AiHelperMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      const live = await ensureLiveBeforeSend();

      if (!live) {
        const offlineText = dmrvRuleBasedReply(contextRef.current, trimmed);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-offline-${Date.now()}`,
            role: 'assistant',
            text: `${userFallbackMessage}\n\n${offlineText}`,
            createdAt: new Date().toISOString(),
          },
        ]);
        setError(userFallbackMessage);
        setLoading(false);
        window.setTimeout(() => {
          submitLockRef.current = false;
        }, 800);
        return offlineText;
      }

      try {
        const history = [...messages, userMsg].map((m) => ({ role: m.role, text: m.text }));
        const deepAl = await sendDeepAlMessage({
          question: trimmed,
          messages: history,
          context: contextRef.current,
          workspace: 'dmrv_field_plot',
          buildLegacyPrompt: (q, hist) =>
            buildPrompt(
              contextRef.current,
              hist.map((h, i) => ({
                id: `hist-${i}`,
                role: h.role,
                text: h.text,
                createdAt: new Date().toISOString(),
              })),
              q,
            ),
        });
        const assistantText = deepAl.answer.trim() || 'No response from the assistant.';
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: assistantText,
            createdAt: new Date().toISOString(),
          },
        ]);
        return assistantText;
      } catch {
        const fallbackText = dmrvRuleBasedReply(contextRef.current, trimmed);
        setError(userFallbackMessage);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: 'assistant',
            text: `${userFallbackMessage}\n\n${fallbackText}`,
            createdAt: new Date().toISOString(),
          },
        ]);
        return fallbackText;
      } finally {
        setLoading(false);
        window.setTimeout(() => {
          submitLockRef.current = false;
        }, 800);
      }
    },
    [disabled, ensureLiveBeforeSend, loading, messages, userFallbackMessage],
  );

  const prefillHandledRef = useRef<string | null>(null);
  useEffect(() => {
    const q = prefillQuestion?.trim();
    if (!q || prefillHandledRef.current === q) return;
    prefillHandledRef.current = q;
    void sendMessage(q);
    onClearPrefill?.();
  }, [prefillQuestion, onClearPrefill, sendMessage]);

  const deepAlMessages = useMemo(
    () => messages.map((m) => ({ role: m.role, text: m.text })),
    [messages],
  );

  const appendConversationMessages = useCallback((userText: string, assistantText: string) => {
    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      { id: `u-conv-${Date.now()}`, role: 'user', text: userText, createdAt: now },
      { id: `a-conv-${Date.now()}`, role: 'assistant', text: assistantText, createdAt: now },
    ]);
  }, []);

  const runAutofill = useCallback(async () => {
    if (!autofillPrompt || !onApplyAutofill || disabled) return;
    const live = await ensureLiveBeforeSend();
    if (!live) {
      const offlineText = dmrvRuleBasedReply(contextRef.current, autofillPrompt);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-fill-offline-${Date.now()}`,
          role: 'assistant',
          text: offlineText,
          createdAt: new Date().toISOString(),
        },
      ]);
      setError(userFallbackMessage);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prompt = `${autofillPrompt}

Configuration context:
${contextRef.current}

Return ONLY valid JSON — no markdown prose.`;
      const guidance = await sendAiGuidance({ prompt, context: contextRef.current });
      const raw = guidance.ok ? guidance.text : '';
      const parsed = extractJsonObject(raw);
      if (parsed) {
        onApplyAutofill(parsed);
        setNotice('Applied AI suggestions to draft fields — review before saving.');
      } else {
        setNotice('Could not parse JSON — use AI Fill From Project instead.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autofill failed.');
    } finally {
      setLoading(false);
    }
  }, [autofillPrompt, disabled, ensureLiveBeforeSend, onApplyAutofill, userFallbackMessage]);

  const quickButtons = useMemo(
    () =>
      QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          disabled={loading || disabled}
          onClick={() => {
            if (action.action === 'fill') {
              onFillConfiguration();
              return;
            }
            void sendMessage(action.message);
          }}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-700 hover:border-[#1e3a5f]/30 hover:bg-white disabled:opacity-50"
        >
          {action.label}
        </button>
      )),
    [disabled, loading, onFillConfiguration, sendMessage],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f] text-white">
          <Bot className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">AI assistant</p>
          <h2 className="text-base font-black text-[#1e3a5f]">DMRV Field Plot AI Assistant</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Ask questions, speak naturally, or let DPAL prepare a review draft.
          </p>
        </div>
      </div>

      <p
        className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
          geminiLive
            ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
            : 'border-amber-200 bg-amber-50 text-amber-950'
        }`}
      >
        {isChecking
          ? 'Checking AI connection…'
          : geminiLive
            ? 'Live AI guidance is connected.'
            : configured
              ? userFallbackMessage
              : 'AI is not configured for this deployment.'}
      </p>
      {!geminiLive && configured ? (
        <button
          type="button"
          disabled={loading || isChecking}
          onClick={() => void refresh(true)}
          className="mb-3 rounded-lg border border-[#1e3a5f]/25 bg-[#e8f0f7] px-3 py-1.5 text-[10px] font-bold text-[#1e3a5f] hover:bg-white disabled:opacity-50"
        >
          Retry Live AI
        </button>
      ) : null}
      <AiDiagnosticsPanel />

      <div className="mb-2 flex flex-wrap gap-1.5">{quickButtons}</div>

      <div className="max-h-64 min-h-[12rem] space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-500">
            Ask about field plots, validation, or tap a quick action. Use Manual or Conversation mode below.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'ml-4 border border-[#1e3a5f]/15 bg-[#e8f0f7] text-[#1e3a5f]'
                  : 'mr-4 border border-slate-200 bg-white text-slate-800'
              }`}
            >
              {msg.text.split('\n').map((line, i, arr) => (
                <span key={`${msg.id}-${i}`}>
                  {line}
                  {i < arr.length - 1 ? <br /> : null}
                </span>
              ))}
            </div>
          ))
        )}
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Thinking…
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{error}</p>
      ) : null}
      {notice ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {notice}
        </p>
      ) : null}

      {autofillPrompt && onApplyAutofill ? (
        <div className="mt-3">
          <button
            type="button"
            disabled={loading || disabled}
            onClick={() => void runAutofill()}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            AI suggest JSON
          </button>
        </div>
      ) : null}

      <DeepAlAssistantComposer
        className="mt-3"
        workspace="dmrv_field_plot"
        context={contextRef.current}
        messages={deepAlMessages}
        loading={loading}
        disabled={disabled}
        placeholder="Type a question or use voice…"
        onAppendMessages={appendConversationMessages}
        onManualSend={sendMessage}
      />
    </section>
  );
}
