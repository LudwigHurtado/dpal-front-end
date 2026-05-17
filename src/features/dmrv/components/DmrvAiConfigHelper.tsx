import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, RefreshCw, Send } from '../../../../components/icons';
import { isAiEnabled, runGeminiPrompt } from '../../../../services/geminiService';
import { AiVoiceReplyControls } from '../../../shared/components/AiVoiceReplyControls';
import { appendVoiceTranscript, VoiceInputButton } from '../../../shared/components/VoiceInputButton';
import { useAiVoiceAssistant } from '../../../shared/hooks/useAiVoiceAssistant';

export type DmrvAiHelperVariant = 'input' | 'project' | 'satellite-imagery' | 'lidar';

export type DmrvAiConfigHelperProps = {
  variant: DmrvAiHelperVariant;
  contextSummary: string;
  disabled?: boolean;
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
      'What project fields help evidence packets and integrity scoring?',
      'How should I describe the AOI for reviewers?',
      'What belongs in the reporting period section?',
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

export function DmrvAiConfigHelper({
  variant,
  contextSummary,
  disabled = false,
}: DmrvAiConfigHelperProps): React.ReactElement {
  const meta = VARIANT_META[variant];
  const aiEnabled = isAiEnabled();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef(contextSummary);
  const voice = useAiVoiceAssistant();
  const lastAssistantReply = messages.filter((m) => m.role === 'assistant').at(-1)?.text ?? null;

  useEffect(() => {
    contextRef.current = contextSummary;
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

      if (!aiEnabled) {
        setError('AI helper is not configured. Set VITE_USE_SERVER_AI or VITE_GEMINI_API_KEY for guidance.');
        return;
      }

      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setLoading(true);
      setError(null);

      try {
        const prompt = buildPrompt(contextRef.current, [...messages, userMsg], trimmed);
        const reply = await runGeminiPrompt(prompt);
        const assistantText = reply.trim() || 'No response from the assistant.';
        voice.speakReply(assistantText);
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: assistantText },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not reach the AI helper.';
        setError(msg);
        const fallbackText =
          'The configuration helper could not complete this request. You can still save your settings and continue manually.';
        voice.speakReply(fallbackText);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: 'assistant',
            text: fallbackText,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [aiEnabled, disabled, loading, messages, voice],
  );

  const starterButtons = useMemo(
    () =>
      meta.starters.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={loading || disabled || !aiEnabled}
          onClick={() => void sendMessage(prompt)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-700 hover:border-[#1e3a5f]/30 hover:bg-white disabled:opacity-50"
        >
          {prompt}
        </button>
      )),
    [aiEnabled, disabled, loading, meta.starters, sendMessage],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1e3a5f] text-white">
          <Bot className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">AI helper</p>
          <h2 className="text-sm font-black text-[#1e3a5f]">{meta.title}</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Guidance only — review settings and evidence before saving or anchoring.
          </p>
        </div>
      </div>

      {!aiEnabled ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          AI guidance is unavailable until Gemini is configured for this deployment. You can still configure fields
          manually.
        </p>
      ) : null}

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
    </section>
  );
}
