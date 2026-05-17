import React, { useCallback, useEffect, useState } from 'react';
import { Bot, ChevronDown, ChevronUp } from '../../../../components/icons';
import { runGeminiPrompt } from '../../../../services/geminiService';
import { fetchDmrvAiAvailability } from '../utils/dmrvAiAvailability';
import { dmrvRuleBasedReply, trimDmrvAiContext } from '../utils/dmrvAiRuleBasedFallback';

export type DmrvFieldPlotSectionHelperProps = {
  title: string;
  intro: string;
  sectionId: string;
  contextSummary: string;
  disabled?: boolean;
  onExplain?: () => void;
  onSuggest?: () => void;
  onCheckMissing?: () => void;
  onFillDraft?: () => void;
  onOpenFullHelper?: (prefill: string) => void;
};

export function DmrvFieldPlotSectionHelper({
  title,
  intro,
  sectionId,
  contextSummary,
  disabled = false,
  onExplain,
  onSuggest,
  onCheckMissing,
  onFillDraft,
  onOpenFullHelper,
}: DmrvFieldPlotSectionHelperProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geminiLive, setGeminiLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchDmrvAiAvailability().then((status) => {
      if (!cancelled) setGeminiLive(Boolean(status.geminiReady));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runInline = useCallback(
    async (prompt: string) => {
      if (disabled) return;
      setLoading(true);
      setExpanded(true);
      const ctx = trimDmrvAiContext(contextSummary);

      if (!geminiLive) {
        setReply(dmrvRuleBasedReply(ctx, prompt));
        setLoading(false);
        return;
      }

      try {
        const text = await runGeminiPrompt(
          `You are the DPAL Field Plot configuration assistant for section "${title}".
Answer in 2–4 short sentences. Do not claim verification or certified credits.

Context:
${ctx}

User question: ${prompt}

Assistant:`,
        );
        setReply(text.trim());
      } catch {
        setReply(dmrvRuleBasedReply(ctx, prompt));
      } finally {
        setLoading(false);
      }
    },
    [contextSummary, disabled, geminiLive, title],
  );

  const handleAction = (action: 'explain' | 'missing' | 'suggest' | 'fill') => {
    if (action === 'explain' && onExplain) {
      onExplain();
      return;
    }
    if (action === 'missing' && onCheckMissing) {
      onCheckMissing();
      return;
    }
    if (action === 'suggest' && onSuggest) {
      onSuggest();
      return;
    }
    if (action === 'fill' && onFillDraft) {
      onFillDraft();
      return;
    }

    const prompts: Record<string, string> = {
      explain: `Explain the "${title}" section in plain English for a non-technical user.`,
      missing: `What is missing in "${title}" based on the context? List bullet points.`,
      suggest: `Suggest concrete values for "${title}" fields. Be specific but mark uncertain items for review.`,
      fill: `What should I do to fill "${title}" from project configuration?`,
    };
    void runInline(prompts[action]);
    onOpenFullHelper?.(prompts[action]);
  };

  return (
    <section
      id={`field-plot-helper-${sectionId}`}
      className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
    >
      <div className="flex flex-wrap items-start gap-2">
        <Bot className="mt-0.5 h-4 w-4 shrink-0 text-[#1e3a5f]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-[#1e3a5f]">{title}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{intro}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-white"
          aria-expanded={expanded}
        >
          {expanded ? 'Hide' : 'Ask AI'}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <HelperBtn label="Explain this" onClick={() => handleAction('explain')} disabled={disabled || loading} />
        <HelperBtn label="What am I missing?" onClick={() => handleAction('missing')} disabled={disabled || loading} />
        <HelperBtn label="Suggest values" onClick={() => handleAction('suggest')} disabled={disabled || loading} />
        {onFillDraft ? (
          <HelperBtn
            label="Fill draft from project"
            onClick={() => handleAction('fill')}
            disabled={disabled || loading}
            primary
          />
        ) : null}
      </div>

      {expanded && (reply || loading) ? (
        <p className="mt-2 rounded-lg border border-white bg-white px-2.5 py-2 text-[11px] leading-relaxed text-slate-700">
          {loading ? 'Thinking…' : reply}
        </p>
      ) : null}
    </section>
  );
}

function HelperBtn({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-[10px] font-bold transition disabled:opacity-50 ${
        primary
          ? 'border-emerald-300/60 bg-emerald-50 text-emerald-900 hover:bg-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-[#1e3a5f]/25'
      }`}
    >
      {label}
    </button>
  );
}
