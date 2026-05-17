import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Mic, RefreshCw, Send, Sparkles, Square, X } from '../../../../components/icons';
import { isAiEnabled, runGeminiPrompt } from '../../../../services/geminiService';
import { AiVoiceReplyControls } from '../../../shared/components/AiVoiceReplyControls';
import { useAiVoiceAssistant } from '../../../shared/hooks/useAiVoiceAssistant';
import { useDmrvVoiceInput } from '../hooks/useDmrvVoiceInput';
import type { AiHelperMessage } from '../services/dmrvFieldPlotConfigTypes';
import { fetchDmrvAiAvailability, type DmrvAiAvailability } from '../utils/dmrvAiAvailability';
import { dmrvRuleBasedReply, trimDmrvAiContext } from '../utils/dmrvAiRuleBasedFallback';

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

const VOICE_STATE_LABEL: Record<string, string> = {
  idle: 'Ready',
  listening: 'Listening…',
  processing: 'Processing…',
  ready: 'Ready',
  unsupported: 'Voice unavailable',
};

export function DmrvFieldPlotAiAssistant({
  contextSummary,
  disabled = false,
  prefillQuestion,
  onClearPrefill,
  onFillConfiguration,
  autofillPrompt,
  onApplyAutofill,
}: DmrvFieldPlotAiAssistantProps): React.ReactElement {
  const clientAiFlag = isAiEnabled();
  const [availability, setAvailability] = useState<DmrvAiAvailability | null>(null);
  const geminiLive = Boolean(availability?.geminiReady);
  const [messages, setMessages] = useState<AiHelperMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef(contextSummary);
  const submitLockRef = useRef(false);
  const voiceCompleteRef = useRef<() => void>(() => undefined);
  const voiceAssistant = useAiVoiceAssistant();

  useEffect(() => {
    contextRef.current = trimDmrvAiContext(contextSummary);
  }, [contextSummary]);

  useEffect(() => {
    let cancelled = false;
    void fetchDmrvAiAvailability().then((status) => {
      if (!cancelled) setAvailability(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 2 || loading || disabled || submitLockRef.current) return;

      submitLockRef.current = true;
      const userMsg: AiHelperMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setLoading(true);
      setError(null);

      const useOfflineOnly = !geminiLive;

      if (useOfflineOnly) {
        const offlineText = dmrvRuleBasedReply(contextRef.current, trimmed);
        voiceAssistant.speakReply(offlineText);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-offline-${Date.now()}`,
            role: 'assistant',
            text: `Offline guidance (Gemini not connected)\n\n${offlineText}`,
            createdAt: new Date().toISOString(),
          },
        ]);
        if (!clientAiFlag || !geminiLive) {
          setError(
            availability?.message ??
              'Set VITE_USE_SERVER_AI=true and VITE_API_BASE in .env.local, then restart npm run dev.',
          );
        }
        setLoading(false);
        voiceCompleteRef.current();
        window.setTimeout(() => {
          submitLockRef.current = false;
        }, 800);
        return;
      }

      try {
        const prompt = buildPrompt(contextRef.current, [...messages, userMsg], trimmed);
        const reply = await runGeminiPrompt(prompt);
        const assistantText = reply.trim() || 'No response from the assistant.';
        voiceAssistant.speakReply(assistantText);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: assistantText,
            createdAt: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not reach the AI helper.';
        const fallbackText = dmrvRuleBasedReply(contextRef.current, trimmed);
        setError(`${msg} — showing offline guidance.`);
        voiceAssistant.speakReply(fallbackText);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: 'assistant',
            text: `Offline guidance (Gemini error)\n\n${fallbackText}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
        voiceCompleteRef.current();
        window.setTimeout(() => {
          submitLockRef.current = false;
        }, 800);
      }
    },
    [availability?.message, clientAiFlag, disabled, geminiLive, loading, messages, voiceAssistant],
  );

  const handleVoiceAutoSubmit = useCallback(
    (transcript: string) => {
      setInputValue(transcript);
      void sendMessage(transcript);
    },
    [sendMessage],
  );

  const voice = useDmrvVoiceInput({
    onAutoSubmit: handleVoiceAutoSubmit,
    silenceMs: 1500,
  });

  voiceCompleteRef.current = voice.completeProcessing;

  const prefillHandledRef = useRef<string | null>(null);
  useEffect(() => {
    const q = prefillQuestion?.trim();
    if (!q || prefillHandledRef.current === q) return;
    prefillHandledRef.current = q;
    setInputValue(q);
    void sendMessage(q);
    onClearPrefill?.();
  }, [prefillQuestion, onClearPrefill, sendMessage]);

  const runAutofill = useCallback(async () => {
    if (!autofillPrompt || !onApplyAutofill || disabled) return;
    if (!geminiLive) {
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
      setError('Autofill needs Gemini — use offline chat for guidance, or configure server AI.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prompt = `${autofillPrompt}

Configuration context:
${contextRef.current}

Return ONLY valid JSON — no markdown prose.`;
      const raw = await runGeminiPrompt(prompt);
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
  }, [autofillPrompt, disabled, geminiLive, onApplyAutofill]);

  const lastAssistantReply = messages.filter((m) => m.role === 'assistant').at(-1)?.text ?? null;

  const displayTranscript = voice.isListening
    ? voice.liveTranscript || 'Speak now…'
    : inputValue;

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
        {availability === null
          ? 'Checking AI connection…'
          : geminiLive
            ? `Gemini connected — ${availability.message}`
            : `Offline guidance — ${availability?.message ?? 'Gemini not configured'}. Chat still answers from your field-plot context.`}
      </p>

      <div className="mb-2 flex flex-wrap gap-1.5">{quickButtons}</div>

      <div className="max-h-64 min-h-[12rem] space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-500">
            Ask about field plots, validation, or tap a quick action. Voice auto-sends after you stop speaking.
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

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Voice & message</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {VOICE_STATE_LABEL[voice.state] ?? 'Ready'}
          </span>
        </div>

        <textarea
          readOnly={voice.isListening}
          rows={3}
          value={displayTranscript}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading || disabled}
          placeholder="Type a question or tap the microphone…"
          className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 disabled:opacity-60"
          aria-live="polite"
        />

        {!voice.isSupported ? (
          <p className="mt-2 text-[11px] text-slate-500">
            Voice input is not available in this browser. You can still type your question.
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-2">
          {voice.isListening ? (
            <button
              type="button"
              disabled={disabled}
              onClick={voice.stopListening}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-900"
            >
              <Square className="h-3.5 w-3.5" aria-hidden />
              Stop listening
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || disabled || !voice.isSupported}
              onClick={voice.startListening}
              className="inline-flex items-center gap-1 rounded-lg border border-[#1e3a5f]/30 bg-[#e8f0f7] px-3 py-2 text-xs font-bold text-[#1e3a5f]"
            >
              <Mic className="h-3.5 w-3.5" aria-hidden />
              Start voice
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              voice.clearTranscript();
              setInputValue('');
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear transcript
          </button>
          {autofillPrompt && onApplyAutofill ? (
            <button
              type="button"
              disabled={loading || disabled}
              onClick={() => void runAutofill()}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              AI suggest JSON
            </button>
          ) : null}
          <button
            type="button"
            disabled={!inputValue.trim() || loading || disabled}
            onClick={() => void sendMessage(inputValue)}
            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-[#1e3a5f] px-3 py-2 text-xs font-bold text-white hover:bg-[#152a47] disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </button>
        </div>
      </div>

      <AiVoiceReplyControls
        className="mt-2"
        replyText={lastAssistantReply}
        autoSpeak={voiceAssistant.autoSpeak}
        onAutoSpeakChange={voiceAssistant.setAutoSpeak}
        isSpeaking={voiceAssistant.isSpeaking}
        speak={voiceAssistant.speak}
        stopSpeaking={voiceAssistant.stopSpeaking}
        ttsSupported={voiceAssistant.ttsSupported}
        ttsUnsupportedMessage={voiceAssistant.ttsUnsupportedMessage}
      />
    </section>
  );
}
