import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, RefreshCw, Send } from '../../../../components/icons';
import { isAiEnabled, runGeminiPrompt } from '../../../../services/geminiService';
import type { HyperspectralPlasticScanResponse, PlasticEvidencePacketResponse } from '../types';
import { briefToPromptContext, buildPlasticWatchReportBrief } from '../utils/plasticWatchReportBrief';

type Props = {
  scan: HyperspectralPlasticScanResponse | null;
  evidence: PlasticEvidencePacketResponse | null;
  aoiLabel?: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const STARTER_PROMPTS = [
  'What does this scan mean in plain English?',
  'Why is the plastic-risk score not computed?',
  'What should we do next for field validation?',
  'How should I explain PACE metadata to a reviewer?',
];

function buildChatSystemContext(
  scan: HyperspectralPlasticScanResponse | null,
  evidence: PlasticEvidencePacketResponse | null,
  aoiLabel?: string,
): string {
  if (!scan) {
    return `No scan has been run yet for ${aoiLabel ?? 'this area of interest'}.
The operator can set AOI coordinates and dates in the left panel, then Run scan or Watch DPAL Work.
Do not invent plastic-risk scores or claim confirmed plastic detection.`;
  }

  const brief = buildPlasticWatchReportBrief(scan, evidence);
  const scanJson = JSON.stringify(
    {
      scanId: scan.scanId,
      label: scan.label,
      riskLevel: scan.riskLevel,
      plasticRisk: scan.plasticRisk,
      spectralSignals: scan.spectralSignals,
      providers: {
        pace: { status: scan.providers.pace.status, message: scan.providers.pace.message },
        emit: { status: scan.providers.emit.status, message: scan.providers.emit.message },
      },
      limitations: scan.limitations,
    },
    null,
    2,
  );

  return `${briefToPromptContext(brief)}

Compact scan JSON:
${scanJson}`;
}

function buildChatPrompt(context: string, history: ChatMessage[], userMessage: string): string {
  const thread = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n\n');

  return `You are the DPAL Hyperspectral Plastic Watch chat assistant — a conversational helper for operators and reviewers.

Rules:
- Answer in plain English, 2–6 sentences unless the user asks for a list.
- Use only facts from the scan context below; never invent scores, granule counts, or validator approval.
- Never claim confirmed plastic pollution from satellite metadata alone.
- If asked about enforcement or legal outcomes, stress field validation and independent review.
- If no scan is loaded, guide the user to set AOI and run a scan.

Scan context:
${context}

${thread ? `Recent conversation:\n${thread}\n\n` : ''}User: ${userMessage}

Assistant:`;
}

export default function PlasticWatchChatPanel({ scan, evidence, aoiLabel }: Props): React.ReactElement {
  const aiEnabled = isAiEnabled();
  const context = useMemo(
    () => buildChatSystemContext(scan, evidence, aoiLabel),
    [scan, evidence, aoiLabel],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastScanIdRef = useRef<string | null>(null);

  useEffect(() => {
    const id = scan?.scanId ?? null;
    if (id !== lastScanIdRef.current) {
      lastScanIdRef.current = id;
      setMessages([]);
      setError(null);
    }
  }, [scan?.scanId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || !aiEnabled) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);
      setError(null);

      try {
        const reply = await runGeminiPrompt(buildChatPrompt(context, messages, trimmed));
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: reply.trim() },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Chat request failed');
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setInput(trimmed);
      } finally {
        setLoading(false);
      }
    },
    [aiEnabled, context, loading, messages],
  );

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setInput('');
  };

  return (
    <section className="flex flex-col rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-100 px-4 py-3 md:px-5">
        <div className="flex items-start gap-2">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800">Plastic Watch chat</p>
            <h2 className="text-base font-bold text-slate-900">Ask about this AOI & scan</h2>
            <p className="mt-1 max-w-xl text-xs text-slate-600">
              Multi-turn conversation grounded in your current scan brief. Not a substitute for field validation or
              official enforcement decisions.
            </p>
          </div>
        </div>
        {messages.length > 0 ? (
          <button
            type="button"
            onClick={clearChat}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Clear chat
          </button>
        ) : null}
      </header>

      <div className="flex min-h-[280px] max-h-[min(56vh,520px)] flex-col px-4 py-3 md:px-5">
        {!aiEnabled ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-600">
            Chat requires <span className="font-mono">VITE_GEMINI_API_KEY</span> or{' '}
            <span className="font-mono">VITE_USE_SERVER_AI=true</span> on the deployment.
          </p>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {messages.length === 0 && !loading ? (
                <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-3 text-xs text-slate-700">
                  <p className="font-semibold text-violet-950">Start a conversation</p>
                  <p className="mt-1 leading-relaxed">
                    {scan
                      ? 'Ask about plastic-risk signals, PACE/EMIT metadata, confounders, or validation next steps.'
                      : 'Run a scan first for scan-specific answers, or ask how to set up AOI and run Watch DPAL Work.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={loading}
                        onClick={() => void sendMessage(prompt)}
                        className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[92%] rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'mr-auto border border-slate-200 bg-white text-slate-800'
                      : 'ml-auto border border-violet-200 bg-violet-700 text-white'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-violet-700">
                      Assistant
                    </span>
                  ) : null}
                  {msg.text.split('\n').map((line, i, arr) => (
                    <span key={`${msg.id}-${i}`}>
                      {line}
                      {i < arr.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </div>
              ))}

              {loading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>

            {error ? (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{error}</p>
            ) : null}

            <div className="mt-3 flex shrink-0 gap-2 border-t border-slate-100 pt-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && input.trim()) void sendMessage(input);
                }}
                disabled={loading}
                placeholder={
                  scan
                    ? 'Ask about risk signal, PACE granules, validation, or next steps…'
                    : 'Ask how to run a scan or interpret the workspace…'
                }
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:opacity-60"
              />
              <button
                type="button"
                disabled={!input.trim() || loading}
                onClick={() => void sendMessage(input)}
                className="inline-flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-2.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
