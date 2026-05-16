import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ChevronDown, ChevronUp, RefreshCw, Sparkles } from '../../../../components/icons';
import { isAiEnabled, runGeminiPrompt } from '../../../../services/geminiService';
import { AiVoiceReplyControls } from '../../../shared/components/AiVoiceReplyControls';
import { useAiVoiceAssistant } from '../../../shared/hooks/useAiVoiceAssistant';
import type { HyperspectralPlasticScanResponse, PlasticEvidencePacketResponse } from '../types';
import {
  briefToPromptContext,
  buildPlasticWatchReportBrief,
  type PlasticWatchReportSection,
} from '../utils/plasticWatchReportBrief';

type Props = {
  scan: HyperspectralPlasticScanResponse | null;
  evidence: PlasticEvidencePacketResponse | null;
  onOpenChat?: () => void;
};

type AiBlock = {
  overall: string;
  sections: { id: string; narrative: string }[];
  actions: string[];
};

const STATUS_STYLES: Record<PlasticWatchReportSection['status'], string> = {
  ok: 'border-emerald-200 bg-emerald-50/80',
  warning: 'border-amber-200 bg-amber-50/80',
  pending: 'border-slate-200 bg-slate-50',
  info: 'border-cyan-200 bg-cyan-50/60',
  neutral: 'border-slate-200 bg-white',
};

const STATUS_DOT: Record<PlasticWatchReportSection['status'], string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  pending: 'bg-slate-400',
  info: 'bg-cyan-500',
  neutral: 'bg-slate-400',
};

function parseAiStructuredResponse(raw: string, sectionIds: string[]): AiBlock | null {
  const text = raw.trim();
  if (!text) return null;

  const overallMatch = text.match(/OVERALL:\s*([\s\S]*?)(?=\n[A-Z_]+:|$)/i);
  const actionsMatch = text.match(/ACTIONS:\s*([\s\S]*?)(?=\n[A-Z_]+:|$)/i);
  const notProvenMatch = text.match(/NOT_PROVEN:\s*([\s\S]*?)(?=\n[A-Z_]+:|$)/i);

  const sections: { id: string; narrative: string }[] = [];
  for (const id of sectionIds) {
    const key = id.toUpperCase();
    const re = new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, 'i');
    const m = text.match(re);
    if (m?.[1]?.trim()) sections.push({ id, narrative: m[1].trim() });
  }

  const actions: string[] = [];
  if (actionsMatch?.[1]) {
    actionsMatch[1]
      .split(/\n|;;|•/)
      .map((s) => s.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
      .forEach((line) => actions.push(line));
  }

  const overall =
    overallMatch?.[1]?.trim() ||
    sections.find((s) => s.id === 'executive')?.narrative ||
    'See section summaries below.';

  if (notProvenMatch?.[1]?.trim()) {
    sections.push({ id: 'limitations', narrative: notProvenMatch[1].trim() });
  }

  return { overall, sections, actions };
}

function buildAiPrompt(brief: PlasticWatchReportSection[], followUp?: string): string {
  const structured = briefToPromptContext(brief);
  const sectionKeys = brief.map((s) => s.id.toUpperCase()).join(', ');

  if (followUp) {
    return `You are the DPAL Hyperspectral Plastic Watch report assistant. Answer using plain English for a non-expert operator.

Structured scan brief:
${structured}

User question: ${followUp}

Reply in under 120 words. Reference only facts in the brief. Do not claim confirmed plastic detection.`;
  }

  return `You are the DPAL Hyperspectral Plastic Watch report assistant. Explain the scan brief for a non-expert operator.

Use EXACTLY this format (plain text, no markdown headers):
OVERALL: 2-3 sentences — overall picture and honesty about pending vs computed fields.
EXECUTIVE: 1-2 sentences
SIGNAL: 1-2 sentences on plastic-risk signal and score (say if not computed).
CONFIDENCE: 1 sentence — bounded context only.
PACE: 1-2 sentences on PACE granule metadata.
EMIT: 1 sentence on EMIT metadata.
CONFOUNDERS: 1-2 sentences on algae/turbidity/sediment/clouds.
VALIDATION: 1-2 sentences on field/drone validation still needed.
NOT_PROVEN: 2 short bullets separated by ";;" — what must NOT be claimed.
ACTIONS: 3 recommended next steps as short bullets separated by ";;"

Rules:
- Never invent a plastic-risk score if the brief says not computed.
- Never claim validator approval or legal enforcement outcomes.
- Section keys available: ${sectionKeys}

Structured brief:
${structured}`;
}

export default function PlasticWatchReportAssistant({ scan, evidence, onOpenChat }: Props): React.ReactElement {
  const brief = useMemo(() => buildPlasticWatchReportBrief(scan, evidence), [scan, evidence]);
  const aiEnabled = isAiEnabled();
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiBlock, setAiBlock] = useState<AiBlock | null>(null);
  const lastScanIdRef = useRef<string | null>(null);
  const voice = useAiVoiceAssistant();
  const spokenOverview = aiBlock?.overall ?? null;

  const runAiExplain = useCallback(
    async (question?: string) => {
      if (!aiEnabled) return;
      setLoading(true);
      setError(null);
      try {
        const raw = await runGeminiPrompt(buildAiPrompt(brief, question));
        const parsed = parseAiStructuredResponse(
          raw,
          brief.map((s) => s.id),
        );
        const block =
          parsed ?? {
            overall: raw.trim().slice(0, 600),
            sections: [],
            actions: [],
          };
        voice.speakReply(block.overall);
        setAiBlock(block);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI explanation failed');
      } finally {
        setLoading(false);
      }
    },
    [aiEnabled, brief, voice],
  );

  useEffect(() => {
    const id = scan?.scanId ?? null;
    if (id && id !== lastScanIdRef.current) {
      lastScanIdRef.current = id;
      setAiBlock(null);
      setError(null);
    }
  }, [scan?.scanId]);

  const narrativeFor = (sectionId: string): string | null => {
    const hit = aiBlock?.sections.find((s) => s.id === sectionId);
    return hit?.narrative ?? null;
  };

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-white p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Report assistant</p>
            <h2 className="text-base font-bold text-slate-900">Plastic Watch scan brief</h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-600">
              Organized readout of this scan — same fields as the summary cards above, expanded for review and
              questions. Not a substitute for field validation.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? 'Collapse' : 'Expand'} brief
          </button>
          {aiEnabled ? (
            <button
              type="button"
              disabled={loading || !scan}
              onClick={() => void runAiExplain()}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Summarize with AI
            </button>
          ) : null}
          {onOpenChat ? (
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-100"
            >
              Open Chat tab
            </button>
          ) : null}
        </div>
      </div>

      {aiBlock?.overall ? (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-800">AI overview</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">{aiBlock.overall}</p>
          <AiVoiceReplyControls
            className="mt-2"
            replyText={spokenOverview}
            autoSpeak={voice.autoSpeak}
            onAutoSpeakChange={voice.setAutoSpeak}
            isSpeaking={voice.isSpeaking}
            speak={voice.speak}
            stopSpeaking={voice.stopSpeaking}
            ttsSupported={voice.ttsSupported}
            ttsUnsupportedMessage={voice.ttsUnsupportedMessage}
          />
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {brief.map((section) => (
            <article
              key={section.id}
              className={`rounded-xl border p-4 ${STATUS_STYLES[section.status]}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[section.status]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{section.title}</p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">{section.headline}</p>
                  <ul className="mt-2 space-y-1.5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-xs leading-relaxed text-slate-700">
                        <span className="text-slate-400">·</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  {narrativeFor(section.id) ? (
                    <p className="mt-2 rounded-lg border border-indigo-100 bg-white/80 px-2.5 py-2 text-xs leading-relaxed text-indigo-950">
                      <span className="font-semibold text-indigo-800">AI note: </span>
                      {narrativeFor(section.id)}
                    </p>
                  ) : null}
                  {section.footnote ? (
                    <p className="mt-2 text-[10px] text-slate-500 leading-snug">{section.footnote}</p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {aiBlock?.actions && aiBlock.actions.length > 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Recommended next steps</p>
          <ul className="mt-2 space-y-1">
            {aiBlock.actions.map((action) => (
              <li key={action} className="text-xs text-slate-800">
                · {action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!aiEnabled ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          AI explanations need <span className="font-mono">VITE_GEMINI_API_KEY</span> or{' '}
          <span className="font-mono">VITE_USE_SERVER_AI=true</span>. The structured brief above is always available
          from scan data.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{error}</p>
      ) : null}

      {onOpenChat && aiEnabled ? (
        <p className="mt-3 text-xs text-slate-600">
          For multi-turn questions, use the <strong>Chat</strong> tab below the map.
        </p>
      ) : null}

      {!scan ? (
        <p className="mt-3 text-xs text-slate-500">Run a scan to populate the structured report brief.</p>
      ) : null}
    </section>
  );
}
