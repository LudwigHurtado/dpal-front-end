import React, { useCallback, useRef, useState } from 'react';
import { Bot, ChevronDown, ChevronUp, RefreshCw, Sparkles } from '../../../../components/icons';
import { isAiEnabled, runGeminiPrompt } from '../../../../services/geminiService';

export type DmrvSectionAiStripProps = {
  sectionLabel: string;
  hint: string;
  contextSummary: string;
  /** When set, "Suggest fill" asks the model for JSON matching this shape and calls onApply. */
  autofillPrompt?: string;
  onApply?: (parsed: Record<string, unknown>) => void;
  disabled?: boolean;
  starters?: string[];
};

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

export function DmrvSectionAiStrip({
  sectionLabel,
  hint,
  contextSummary,
  autofillPrompt,
  onApply,
  disabled = false,
  starters = [],
}: DmrvSectionAiStripProps): React.ReactElement {
  const aiEnabled = isAiEnabled();
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const contextRef = useRef(contextSummary);
  contextRef.current = contextSummary;

  const ask = useCallback(
    async (message: string, mode: 'chat' | 'autofill') => {
      if (!aiEnabled || disabled) {
        setNotice('Configure VITE_USE_SERVER_AI or VITE_GEMINI_API_KEY to use the assistant.');
        return;
      }
      setLoading(true);
      setNotice(null);
      try {
        const prompt =
          mode === 'autofill' && autofillPrompt
            ? `${autofillPrompt}

Configuration context:
${contextRef.current}

Return ONLY valid JSON — no markdown prose.`
            : `You are a DPAL DMRV assistant for the "${sectionLabel}" section.
Answer in 1–3 short sentences. Do not claim verification, live scans, or certified credits.

Context:
${contextRef.current}

User: ${message}

Assistant:`;

        const raw = await runGeminiPrompt(prompt);
        if (mode === 'autofill' && onApply) {
          const parsed = extractJsonObject(raw);
          if (parsed) {
            onApply(parsed);
            setReply('Applied suggested values — review and save when ready.');
            setNotice('Suggestions applied to this section. You can still edit fields manually.');
          } else {
            setReply(raw.trim());
            setNotice('Could not parse JSON from the assistant — see reply above.');
          }
        } else {
          setReply(raw.trim());
        }
        setExpanded(true);
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Assistant unavailable.');
      } finally {
        setLoading(false);
      }
    },
    [aiEnabled, autofillPrompt, disabled, onApply, sectionLabel],
  );

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#1e3a5f]">
          <Bot className="h-3.5 w-3.5 shrink-0" aria-hidden />
          AI · {sectionLabel}
        </span>
        <span className="min-w-0 flex-1 text-[10px] text-slate-500">{hint}</span>
        {autofillPrompt && onApply ? (
          <button
            type="button"
            disabled={loading || disabled || !aiEnabled}
            onClick={() => void ask('Suggest values for this section.', 'autofill')}
            className="inline-flex items-center gap-1 rounded-md border border-[#1e3a5f]/25 bg-[#e8f0f7] px-2 py-1 text-[10px] font-bold text-[#1e3a5f] hover:bg-white disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-3 w-3" aria-hidden />
            )}
            Suggest fill
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
          aria-expanded={expanded}
        >
          {expanded ? 'Less' : 'Ask'}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {expanded ? (
        <div className="mt-2 space-y-2">
          {starters.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading || disabled || !aiEnabled}
                  onClick={() => void ask(s, 'chat')}
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-medium text-slate-700 hover:border-[#1e3a5f]/30 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) void ask(input, 'chat');
              }}
              disabled={loading || disabled}
              placeholder={`Ask about ${sectionLabel.toLowerCase()}…`}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/20 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!input.trim() || loading || disabled || !aiEnabled}
              onClick={() => {
                void ask(input, 'chat');
                setInput('');
              }}
              className="shrink-0 rounded-lg bg-[#1e3a5f] px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-[#152a47] disabled:opacity-50"
            >
              Send
            </button>
          </div>
          {reply ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-700">
              {reply}
            </p>
          ) : null}
          {notice ? <p className="text-[10px] text-amber-800">{notice}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
