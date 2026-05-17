import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Copy, RefreshCw, Send, Sparkles, X } from '../../../../components/icons';
import { sendAiGuidance } from '../../../services/dpalAiClient';
import { dmrvRuleBasedReply, trimDmrvAiContext } from '../utils/dmrvAiRuleBasedFallback';
import { useDpalAiMode } from '../../../shared/hooks/useDpalAiMode';
import { AiDiagnosticsPanel } from '../../../shared/components/AiDiagnosticsPanel';
import { AiVoiceReplyControls } from '../../../shared/components/AiVoiceReplyControls';
import { appendVoiceTranscript, VoiceInputButton } from '../../../shared/components/VoiceInputButton';
import { useAiVoiceAssistant } from '../../../shared/hooks/useAiVoiceAssistant';

export type DmrvAiHelperVariant = 'input' | 'project' | 'satellite-imagery' | 'lidar';

export type DmrvAiConfigHelperProps = {
  variant: DmrvAiHelperVariant;
  contextSummary: string;
  disabled?: boolean;
  /** When set, workspace can suggest JSON and apply values to the form. */
  autofillPrompt?: string;
  onApplyAutofill?: (parsed: Record<string, unknown>) => void;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const VARIANT_META: Record<
  DmrvAiHelperVariant,
  { title: string; placeholder: string; starters: string[] }
> = {
  input: {
    title: 'DMRV AI Configuration Helper',
    placeholder: 'Ask how to configure this source…',
    starters: [
      'What fields are required for this evidence source?',
      'How do validation rules affect integrity score?',
      'What should I test before generating an evidence packet?',
    ],
  },
  project: {
    title: 'Project Configuration AI Helper',
    placeholder: 'Ask about project identity, AOI, methodology, or reporting period…',
    starters: [
      'What project fields connect to satellite scans and evidence packets?',
      'How should I describe the AOI for reviewers?',
      'What should I anchor on blockchain after evidence is configured?',
    ],
  },
  'satellite-imagery': {
    title: 'Satellite Configuration AI Helper',
    placeholder: 'Ask which mission fits your MRV type, cloud limits, or AOI coverage…',
    starters: [
      'Which satellite should I pick for forest carbon screening?',
      'When should I use Sentinel-1 SAR instead of optical imagery?',
      'What should I document for validator review?',
    ],
  },
  lidar: {
    title: 'LiDAR & Terrain AI Helper',
    placeholder: 'Ask about USGS 3DEP, terrain evidence, or when LiDAR helps this project…',
    starters: [
      'Want me to check whether LiDAR terrain evidence helps this project?',
      'For a flood project, how does LiDAR help slope and drainage?',
      'Should USGS 3DEP terrain go in my evidence packet?',
    ],
  },
};

function buildPrompt(context: string, history: ChatMessage[], userMessage: string): string {
  const thread = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n\n');

  return `You are the DPAL DMRV configuration assistant — a civic-tech helper for operators configuring monitoring evidence.

Rules:
- Answer in plain English, 2–6 sentences unless the user asks for a list.
- Use only facts from the configuration context below; do not invent validator approval, blockchain anchoring, or certified credits.
- Never claim automatic verification or publication — human review and explicit saves remain required.
- If asked about legal or carbon market claims, stress limitations and independent review.

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

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function DmrvAiConfigHelper({
  variant,
  contextSummary,
  disabled = false,
  autofillPrompt,
  onApplyAutofill,
}: DmrvAiConfigHelperProps): React.ReactElement {
  const meta = VARIANT_META[variant];
  const { status: aiStatus, geminiLive, isChecking, configured, userFallbackMessage, refresh, ensureLiveBeforeSend } =
    useDpalAiMode();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [pasteNotes, setPasteNotes] = useState('');
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef(contextSummary);
  const voice = useAiVoiceAssistant();
  const lastAssistantReply = messages.filter((m) => m.role === 'assistant').at(-1)?.text ?? null;

  useEffect(() => {
    contextRef.current = trimDmrvAiContext(contextSummary);
  }, [contextSummary]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setInputValue((current) => appendVoiceTranscript(current, text));
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || disabled) return;

      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setLoading(true);
      setError(null);

      const live = await ensureLiveBeforeSend();

      if (!live) {
        const offlineText = dmrvRuleBasedReply(contextRef.current, trimmed);
        voice.speakReply(offlineText);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-offline-${Date.now()}`,
            role: 'assistant',
            text: `${userFallbackMessage}\n\n${offlineText}`,
          },
        ]);
        setError(userFallbackMessage);
        setLoading(false);
        return;
      }

      try {
        const prompt = buildPrompt(contextRef.current, [...messages, userMsg], trimmed);
        const result = await sendAiGuidance({ prompt, context: contextRef.current });
        if (result.ok && result.mode === 'live') {
          const assistantText = result.text.trim() || 'No response from the assistant.';
          voice.speakReply(assistantText);
          setMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: 'assistant', text: assistantText },
          ]);
        } else {
          const fallbackText = dmrvRuleBasedReply(contextRef.current, trimmed);
          setError(userFallbackMessage);
          voice.speakReply(fallbackText);
          setMessages((prev) => [
            ...prev,
            {
              id: `a-err-${Date.now()}`,
              role: 'assistant',
              text: `${userFallbackMessage}\n\n${fallbackText}`,
            },
          ]);
        }
      } catch (err) {
        const fallbackText = dmrvRuleBasedReply(contextRef.current, trimmed);
        setError(userFallbackMessage);
        voice.speakReply(fallbackText);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: 'assistant',
            text: `${userFallbackMessage}\n\n${fallbackText}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [disabled, ensureLiveBeforeSend, loading, messages, userFallbackMessage, voice],
  );

  const runAutofill = useCallback(async () => {
    if (!autofillPrompt || !onApplyAutofill || disabled) return;
    const live = await ensureLiveBeforeSend();
    if (!live) {
      setError(userFallbackMessage);
      const offlineText = dmrvRuleBasedReply(contextRef.current, autofillPrompt);
      setMessages((prev) => [
        ...prev,
        { id: `a-fill-offline-${Date.now()}`, role: 'assistant', text: offlineText },
      ]);
      return;
    }
    setLoading(true);
    setError(null);
    setWorkspaceNotice(null);
    try {
      const prompt = `${autofillPrompt}

Configuration context:
${contextRef.current}

Return ONLY valid JSON — no markdown prose.`;
      const guidance = await sendAiGuidance({ prompt, context: contextRef.current });
      const raw = guidance.ok ? guidance.text : '';
      const assistantText = raw.trim() || 'No response from the assistant.';
      voice.speakReply('Applied suggested field values. Review before saving.');
      setMessages((prev) => [
        ...prev,
        { id: `u-fill-${Date.now()}`, role: 'user', text: 'Suggest values for all fields on this form.' },
        { id: `a-fill-${Date.now()}`, role: 'assistant', text: assistantText },
      ]);
      const parsed = extractJsonObject(raw);
      if (parsed) {
        onApplyAutofill(parsed);
        setWorkspaceNotice('Applied suggested values to form fields.');
      } else {
        setWorkspaceNotice('Could not parse JSON — copy suggestions from the assistant reply.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autofill failed.');
    } finally {
      setLoading(false);
    }
  }, [autofillPrompt, disabled, ensureLiveBeforeSend, onApplyAutofill, userFallbackMessage, voice]);

  const copyMessage = useCallback(async (text: string) => {
    const ok = await copyText(text);
    setWorkspaceNotice(ok ? 'Copied to clipboard.' : 'Select text manually to copy.');
  }, []);

  const starterButtons = useMemo(
    () =>
      meta.starters.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={loading || disabled}
          onClick={() => void sendMessage(prompt)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-700 hover:border-[#1e3a5f]/30 hover:bg-white disabled:opacity-50"
        >
          {prompt}
        </button>
      )),
    [disabled, loading, meta.starters, sendMessage],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1e3a5f] text-white">
          <Bot className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">AI helper</p>
          <h2 className="text-sm font-black text-[#1e3a5f]">{meta.title}</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Guidance only — review settings and evidence before saving or anchoring.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 flex-col gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setWorkspaceOpen(true)}
            className="rounded-lg border border-[#1e3a5f]/25 bg-[#e8f0f7] px-2 py-1 text-[10px] font-bold text-[#1e3a5f] hover:bg-white disabled:opacity-50"
          >
            Open fill workspace
          </button>
          {autofillPrompt && onApplyAutofill ? (
            <button
              type="button"
              disabled={loading || disabled}
              onClick={() => void runAutofill()}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-300/60 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-900 hover:bg-white disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              Suggest fill
            </button>
          ) : null}
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

      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/80 p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-500">Ask a question about this configuration step, or use a starter below.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'ml-6 border border-[#1e3a5f]/15 bg-[#e8f0f7] text-[#1e3a5f]'
                  : 'mr-6 border border-slate-200 bg-white text-slate-800'
              }`}
            >
              {msg.role === 'assistant' ? (
                <button
                  type="button"
                  onClick={() => void copyMessage(msg.text)}
                  className="mb-1 inline-flex items-center gap-0.5 rounded border border-slate-200 px-1.5 py-px text-[9px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Copy className="h-2.5 w-2.5" aria-hidden />
                  Copy
                </button>
              ) : null}
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
      {workspaceNotice ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {workspaceNotice}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-1">{starterButtons}</div>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputValue.trim()) void sendMessage(inputValue);
          }}
          disabled={loading || disabled}
          placeholder={meta.placeholder}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 disabled:opacity-60"
        />
        <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={loading || disabled} />
        <button
          type="button"
          disabled={!inputValue.trim() || loading || disabled}
          onClick={() => void sendMessage(inputValue)}
          className="inline-flex items-center gap-1 rounded-lg bg-[#1e3a5f] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#152a47] disabled:opacity-50"
        >
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
          Send
        </button>
      </div>
      <AiVoiceReplyControls
        className="mt-2"
        replyText={lastAssistantReply}
        autoSpeak={voice.autoSpeak}
        onAutoSpeakChange={voice.setAutoSpeak}
        isSpeaking={voice.isSpeaking}
        speak={voice.speak}
        stopSpeaking={voice.stopSpeaking}
        ttsSupported={voice.ttsSupported}
        ttsUnsupportedMessage={voice.ttsUnsupportedMessage}
      />

      {workspaceOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/55 p-2 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setWorkspaceOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dmrv-ai-fill-workspace"
            className="relative flex max-h-[min(92vh,680px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 pr-12">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1e3a5f] text-white">
                <Bot className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Fill workspace</p>
                <h3 id="dmrv-ai-fill-workspace" className="text-sm font-black text-[#1e3a5f]">
                  {meta.title}
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Paste notes here, ask the assistant, and copy field values into the form.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWorkspaceOpen(false)}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Your paste area
                <textarea
                  value={pasteNotes}
                  onChange={(e) => setPasteNotes(e.target.value)}
                  rows={6}
                  disabled={disabled}
                  placeholder="Paste coordinates, dates, mission IDs, or copy assistant suggestions here…"
                  className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15"
                />
              </label>

              <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-500">Conversation appears here — use Ask or Suggest fill.</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id}>
                      <div
                        className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'ml-4 border border-[#1e3a5f]/15 bg-[#e8f0f7] text-[#1e3a5f]'
                            : 'mr-4 border border-slate-200 bg-white text-slate-800'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <button
                            type="button"
                            onClick={() => {
                              void copyMessage(msg.text);
                              setPasteNotes((prev) =>
                                prev.trim() ? `${prev.trim()}\n\n${msg.text}` : msg.text,
                              );
                            }}
                            className="mb-1 inline-flex items-center gap-0.5 rounded border border-slate-200 px-1.5 py-px text-[9px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <Copy className="h-2.5 w-2.5" aria-hidden />
                            Copy to notes
                          </button>
                        ) : null}
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <footer className="space-y-2 border-t border-slate-100 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {autofillPrompt && onApplyAutofill ? (
                  <button
                    type="button"
                    disabled={loading || disabled}
                    onClick={() => void runAutofill()}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-900 hover:bg-white disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Suggest and apply all fields
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={loading || disabled}
                  onClick={() =>
                    void sendMessage(
                      'List recommended values for every field with copy-paste friendly labels.',
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  Explain all fields
                </button>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue.trim()) void sendMessage(inputValue);
                  }}
                  disabled={loading || disabled}
                  placeholder={meta.placeholder}
                  className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
                <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={loading || disabled} />
                <button
                  type="button"
                  disabled={!inputValue.trim() || loading || disabled}
                  onClick={() => void sendMessage(inputValue)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#1e3a5f] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  Ask
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
