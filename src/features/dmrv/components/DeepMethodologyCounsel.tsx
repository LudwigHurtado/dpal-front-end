import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, FileCode, RefreshCw, Scale, Send, Shield } from '../../../../components/icons';
import { AiVoiceReplyControls } from '../../../shared/components/AiVoiceReplyControls';
import { appendVoiceTranscript, VoiceInputButton } from '../../../shared/components/VoiceInputButton';
import { useAiVoiceAssistant } from '../../../shared/hooks/useAiVoiceAssistant';
import type { DmrvMethodologyPreset } from '../dmrvMethodologyPresets';
import { METHODOLOGY_STATUS_STYLES } from '../dmrvMethodologyPresets';
import { recordBiomassFromMethodologyCalc } from '../reporting/dmrvReportEngine';
import {
  buildMethodologyExplanationBoard,
  calculateMethodologyExample,
  generateMethodologyCounselResponse,
  generateValidatorQuestions,
  findMissingMethodologyEvidence,
  saveMethodologyCounselTrace,
  type MethodologyCounselTrace,
  type MethodologyExplanationBoard,
} from '../utils/methodologyCounselHelpers';

export type DeepMethodologyCounselProps = {
  projectId?: string;
  dmrvTypeId?: string;
  dmrvTypeName?: string;
  selectedMethodologyId?: string;
  methodologyPreset?: DmrvMethodologyPreset;
  selectedSources?: string[];
  selectedLidarSources?: string[];
  formState?: Record<string, unknown>;
  evidenceRules?: Record<string, boolean>;
  blockchainAnchored?: boolean;
  disabled?: boolean;
};

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string };

const QUICK_ACTIONS: { id: string; label: string; topic: string; prompt: string }[] = [
  {
    id: 'explain',
    label: 'Explain Methodology',
    topic: 'explain',
    prompt: 'Explain this methodology for a verifier in plain English.',
  },
  {
    id: 'compare',
    label: 'Compare Methodologies',
    topic: 'compare',
    prompt: 'Compare this methodology with other presets for this DMRV type.',
  },
  {
    id: 'calculate',
    label: 'Calculate Example',
    topic: 'calculate',
    prompt: 'Run a calculation example with the current defaults.',
  },
  {
    id: 'defend',
    label: 'Defend for Validator',
    topic: 'defend',
    prompt: 'Defend this methodology for validator review.',
  },
  {
    id: 'missing',
    label: 'Find Missing Evidence',
    topic: 'missing',
    prompt: 'What evidence or configuration is still missing?',
  },
  {
    id: 'questions',
    label: 'Generate Verifier Questions',
    topic: 'validator-questions',
    prompt: 'Generate verifier questions for this configuration.',
  },
  {
    id: 'trace',
    label: 'Create Methodology Trace',
    topic: 'defend',
    prompt: 'Create a methodology decision trace summary for evidence packet handoff.',
  },
];

function ChainDisplay({ steps }: { steps: string[] }): React.ReactElement {
  return (
    <ol className="flex flex-wrap items-center gap-1 text-[10px] font-medium text-slate-700">
      {steps.map((step, i) => (
        <li key={`${step}-${i}`} className="flex items-center gap-1">
          {i > 0 ? <span className="text-slate-400" aria-hidden>→</span> : null}
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function BoardPanel({
  board,
  calcInputs,
  onCalcInputChange,
  onRecalculate,
}: {
  board: MethodologyExplanationBoard;
  calcInputs: Record<string, string | number | boolean>;
  onCalcInputChange: (key: string, value: string) => void;
  onRecalculate: () => void;
}): React.ReactElement {
  const { methodologyCard: card, calculatorMode, calculatorOutputs } = board;

  return (
    <div className="space-y-4 overflow-y-auto max-h-[min(72vh,720px)] pr-1">
      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Methodology card</p>
        <h3 className="mt-1 text-sm font-bold text-[#1e3a5f]">{card.name}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
              METHODOLOGY_STATUS_STYLES[card.statusKey === 'unknown' ? 'custom' : card.statusKey]
            }`}
          >
            {card.status}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-700">
            {card.domain}
          </span>
        </div>
        <dl className="mt-2 grid gap-1 text-[11px] text-slate-700">
          <div>
            <dt className="font-semibold text-slate-500">Maturity</dt>
            <dd>{card.maturity}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Best for</dt>
            <dd>{card.bestFor}</dd>
          </div>
          <div>
            <dt className="font-semibold text-emerald-800">Not for</dt>
            <dd>{card.notFor}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#1e3a5f]">Calculation chain</p>
        <ChainDisplay steps={board.calculationChain} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Required evidence</p>
        <ul className="space-y-1">
          {board.requiredEvidence.length === 0 ? (
            <li className="text-xs text-slate-500">Apply a preset to see required inputs and rules.</li>
          ) : (
            board.requiredEvidence.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-xs">
                <span
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded border ${
                    item.met ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'
                  }`}
                  aria-hidden
                />
                <span className={item.met ? 'text-slate-800' : 'text-amber-900'}>{item.label}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-[#1e3a5f]/20 bg-[#e8f0f7]/50 p-3">
        <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#1e3a5f]">
          <Shield className="h-3.5 w-3.5" aria-hidden />
          Validator view
        </p>
        <div className="space-y-2 text-[11px] text-slate-700">
          <div>
            <p className="font-semibold text-slate-600">Verify</p>
            <ul className="mt-0.5 list-inside list-disc">
              {board.validatorView.verify.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-600">Assumptions</p>
            <ul className="mt-0.5 list-inside list-disc">
              {board.validatorView.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-amber-800">Limitations</p>
            <ul className="mt-0.5 list-inside list-disc text-amber-950/90">
              {board.validatorView.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-emerald-800">Stronger method</p>
            <ul className="mt-0.5 list-inside list-disc">
              {board.validatorView.strengthen.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {board.riskFlags.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase text-amber-900">Methodology risk flags</p>
          <ul className="list-inside list-disc text-xs text-amber-950">
            {board.riskFlags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Mini calculator · {calculatorMode} screening
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {calculatorMode === 'carbon' ? (
            <>
              <CalcField label="Biomass t/ha" value={calcInputs.biomassTHa} onChange={(v) => onCalcInputChange('biomassTHa', v)} />
              <CalcField label="Carbon fraction" value={calcInputs.carbonFraction} onChange={(v) => onCalcInputChange('carbonFraction', v)} />
              <CalcField label="Conversion factor" value={calcInputs.conversionFactor} onChange={(v) => onCalcInputChange('conversionFactor', v)} />
              <CalcField label="Uncertainty %" value={calcInputs.uncertaintyPct} onChange={(v) => onCalcInputChange('uncertaintyPct', v)} />
            </>
          ) : calculatorMode === 'plastic' ? (
            <>
              <CalcField label="Hotspot count" value={calcInputs.hotspotCount} onChange={(v) => onCalcInputChange('hotspotCount', v)} />
              <CalcField label="Affected area (ha)" value={calcInputs.affectedAreaHa} onChange={(v) => onCalcInputChange('affectedAreaHa', v)} />
              <CalcField label="Confidence (0–1)" value={calcInputs.confidenceScore} onChange={(v) => onCalcInputChange('confidenceScore', v)} />
              <label className="flex items-center gap-2 text-xs sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(calcInputs.fieldValidation)}
                  onChange={(e) => onCalcInputChange('fieldValidation', e.target.checked ? 'true' : 'false')}
                />
                Field validation recorded
              </label>
            </>
          ) : calculatorMode === 'water' ? (
            <>
              <CalcField label="Water extent before (ha)" value={calcInputs.waterExtentBeforeHa} onChange={(v) => onCalcInputChange('waterExtentBeforeHa', v)} />
              <CalcField label="Water extent after (ha)" value={calcInputs.waterExtentAfterHa} onChange={(v) => onCalcInputChange('waterExtentAfterHa', v)} />
              <CalcField label="Confidence (0–1)" value={calcInputs.confidenceScore} onChange={(v) => onCalcInputChange('confidenceScore', v)} />
            </>
          ) : (
            <>
              <CalcField label="Reported value" value={calcInputs.reportedValue} onChange={(v) => onCalcInputChange('reportedValue', v)} />
              <CalcField label="Observed / anomaly" value={calcInputs.observedValue} onChange={(v) => onCalcInputChange('observedValue', v)} />
              <CalcField label="Confidence (0–1)" value={calcInputs.confidenceScore} onChange={(v) => onCalcInputChange('confidenceScore', v)} />
              <CalcField label="Source reliability (0–1)" value={calcInputs.sourceReliability} onChange={(v) => onCalcInputChange('sourceReliability', v)} />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onRecalculate}
          className="mt-2 rounded-lg border border-[#1e3a5f]/30 bg-[#e8f0f7] px-3 py-1.5 text-[10px] font-bold text-[#1e3a5f] hover:bg-white"
        >
          Recalculate example
        </button>
        <dl className="mt-3 grid gap-1 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
          {Object.entries(calculatorOutputs).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="font-mono text-slate-500">{k}</dt>
              <dd className="font-semibold text-slate-900">{String(v)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[10px] text-slate-500">Calculation example only — not a certified credit estimate.</p>
      </section>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-[10px] text-slate-600">
        Readiness: <span className="font-bold text-[#1e3a5f]">{board.readinessScore}%</span> · {board.readinessLabel}
      </p>
    </div>
  );
}

function CalcField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | number | boolean | undefined;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <label className="block space-y-0.5">
      <span className="text-[9px] font-bold uppercase text-slate-500">{label}</span>
      <input
        className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function DeepMethodologyCounsel({
  projectId,
  dmrvTypeId,
  dmrvTypeName,
  selectedMethodologyId,
  methodologyPreset,
  selectedSources = [],
  selectedLidarSources = [],
  formState = {},
  evidenceRules = {},
  blockchainAnchored = false,
  disabled = false,
}: DeepMethodologyCounselProps): React.ReactElement {
  const voice = useAiVoiceAssistant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState<MethodologyExplanationBoard | null>(null);
  const [lastTrace, setLastTrace] = useState<MethodologyCounselTrace | null>(null);
  const [calcInputs, setCalcInputs] = useState<Record<string, string | number | boolean>>({});
  const [calcOutputs, setCalcOutputs] = useState<Record<string, string | number>>({});
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const counselContext = useMemo(
    () => ({
      projectId,
      dmrvTypeId,
      dmrvTypeName,
      selectedMethodologyId: selectedMethodologyId ?? methodologyPreset?.id,
      methodologyPreset: methodologyPreset ?? null,
      selectedSources: [...selectedSources, ...selectedLidarSources.map((s) => `LiDAR: ${s}`)],
      formState,
      evidenceRules,
    }),
    [
      dmrvTypeId,
      dmrvTypeName,
      evidenceRules,
      formState,
      methodologyPreset,
      projectId,
      selectedLidarSources,
      selectedMethodologyId,
      selectedSources,
    ],
  );

  useEffect(() => {
    const initial = buildMethodologyExplanationBoard(
      methodologyPreset ?? null,
      formState,
      evidenceRules,
      counselContext,
    );
    setBoard(initial);
    setCalcInputs(initial.calculatorInputs);
    setCalcOutputs(initial.calculatorOutputs);
  }, [methodologyPreset, formState, evidenceRules, counselContext]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const mergedBoard = useMemo(() => {
    if (!board) return null;
    return { ...board, calculatorOutputs: calcOutputs };
  }, [board, calcOutputs]);

  const runCounsel = useCallback(
    async (userMessage: string, topic?: string) => {
      if (!userMessage.trim() || loading || disabled) return;
      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: userMessage.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);
      try {
        const response = await generateMethodologyCounselResponse(
          { ...counselContext, topic },
          userMessage.trim(),
        );
        setBoard(response.board);
        setCalcInputs(response.board.calculatorInputs);
        setCalcOutputs(response.board.calculatorOutputs);
        setLastTrace(response.trace);
        saveMethodologyCounselTrace(response.trace);
        voice.speakReply(response.answer);
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: response.answer },
        ]);
      } catch {
        const fallback =
          'Deep Methodology Counsel could not complete this request. You can still use the methodology board and save configuration manually.';
        voice.speakReply(fallback);
        setMessages((prev) => [...prev, { id: `a-err-${Date.now()}`, role: 'assistant', text: fallback }]);
      } finally {
        setLoading(false);
      }
    },
    [counselContext, disabled, loading, voice],
  );

  const handleRecalculate = useCallback(() => {
    const parsed: Record<string, string | number | boolean> = { ...calcInputs };
    if (parsed.fieldValidation === 'true') parsed.fieldValidation = true;
    if (parsed.fieldValidation === 'false') parsed.fieldValidation = false;
    const result = calculateMethodologyExample(methodologyPreset ?? null, parsed, board?.calculatorMode);
    setCalcOutputs(result.outputs);
    if (board) setBoard({ ...board, calculatorOutputs: result.outputs });
    const hasBaseline = result.outputs.biomassTHa !== undefined || result.outputs.estimatedBiomassTonsPerHa !== undefined;
    const snapshotType = hasBaseline && !board?.calculatorOutputs?.biomassTHa ? 'baseline' : 'current';
    if (projectId?.trim()) {
      recordBiomassFromMethodologyCalc(
        projectId,
        snapshotType,
        result.outputs,
        parsed,
        methodologyPreset?.name ?? 'Methodology calculator',
      );
    }
  }, [board, calcInputs, methodologyPreset, projectId]);

  const handleCopyTrace = useCallback(() => {
    if (!lastTrace) return;
    void navigator.clipboard.writeText(JSON.stringify(lastTrace, null, 2));
    setCopyNotice('Trace JSON copied.');
    window.setTimeout(() => setCopyNotice(null), 2000);
  }, [lastTrace]);

  const lastAssistant = messages.filter((m) => m.role === 'assistant').at(-1)?.text ?? null;

  const anchorLabel = blockchainAnchored
    ? 'Anchored on ledger (backend confirmed)'
    : lastTrace?.status === 'prepared-for-anchor'
      ? 'Methodology trace prepared for anchor — not anchored until backend confirms'
      : 'Blockchain anchor: not prepared';

  return (
    <section className="rounded-2xl border border-[#1e3a5f]/25 bg-white shadow-sm overflow-hidden">
      <header className="border-b border-slate-200 bg-gradient-to-r from-[#e8f0f7] to-white px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f] text-white">
            <Scale className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Methodology Attorney Mode · Verifier Explanation Mode
            </p>
            <h2 className="text-lg font-black text-[#1e3a5f]">Deep Methodology Counsel</h2>
            <p className="mt-1 text-xs text-slate-600">
              Ask DPAL to explain, compare, calculate, or defend a methodology. Voice input, voice replies, and
              verifier-safe decision traces are recorded.
            </p>
            <p className="mt-1 text-[10px] text-amber-900">
              AI draft — not legal advice. Not certification. Human verifier review required.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={loading || disabled}
              onClick={() => void runCounsel(action.prompt, action.topic)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-[#1e3a5f] hover:border-[#1e3a5f]/30 hover:bg-[#e8f0f7] disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:divide-x lg:divide-slate-200">
        <div className="flex min-h-[320px] flex-col p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Conversation</p>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-3 max-h-[min(48vh,420px)]">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500">
                Ask how this methodology fits {dmrvTypeName ?? 'your DMRV type'}, what evidence is required, or request a
                validator defense summary.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'ml-4 border border-[#1e3a5f]/15 bg-[#e8f0f7] text-[#1e3a5f]'
                      : 'mr-4 border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  {msg.text}
                </div>
              ))
            )}
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Counsel reviewing methodology…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) void runCounsel(input);
              }}
              disabled={loading || disabled}
              placeholder="Ask Deep Methodology Counsel…"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 disabled:opacity-60"
            />
            <VoiceInputButton
              onTranscript={(t) => setInput((prev) => appendVoiceTranscript(prev, t))}
              disabled={loading || disabled}
              label="Speak"
            />
            <button
              type="button"
              disabled={!input.trim() || loading || disabled}
              onClick={() => void runCounsel(input)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#1e3a5f] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#152a47] disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </button>
          </div>
          <AiVoiceReplyControls
            className="mt-2"
            replyText={lastAssistant}
            autoSpeak={voice.autoSpeak}
            onAutoSpeakChange={voice.setAutoSpeak}
            isSpeaking={voice.isSpeaking}
            speak={voice.speak}
            stopSpeaking={voice.stopSpeaking}
            ttsSupported={voice.ttsSupported}
            ttsUnsupportedMessage={voice.ttsUnsupportedMessage}
          />
        </div>

        <div className="p-4 lg:max-h-[min(72vh,720px)]">
          <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <Bot className="h-3.5 w-3.5" aria-hidden />
            Methodology screen · Methodology Defender
          </p>
          {mergedBoard ? (
            <BoardPanel
              board={mergedBoard}
              calcInputs={calcInputs}
              onCalcInputChange={(key, value) => {
                setCalcInputs((prev) => ({
                  ...prev,
                  [key]:
                    key === 'fieldValidation'
                      ? value === 'true'
                      : /^\d*\.?\d+$/.test(value)
                        ? parseFloat(value)
                        : value,
                }));
              }}
              onRecalculate={handleRecalculate}
            />
          ) : null}
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-slate-600">{anchorLabel}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!lastTrace}
              onClick={handleCopyTrace}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileCode className="h-3 w-3" />
              Copy trace JSON
            </button>
            {lastTrace ? (
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[9px] text-slate-500">
                {lastTrace.traceHash}
              </span>
            ) : null}
          </div>
        </div>
        {copyNotice ? <p className="mt-1 text-[10px] text-emerald-800">{copyNotice}</p> : null}
        {lastTrace ? (
          <details className="mt-2 text-[10px] text-slate-600">
            <summary className="cursor-pointer font-semibold text-[#1e3a5f]">Decision trace rationale (verifier-safe)</summary>
            <p className="mt-1">
              Status: {lastTrace.status} · Confidence: {lastTrace.confidenceScore}% · Reviewed:{' '}
              {lastTrace.methodologyReviewed}
            </p>
            <p className="mt-1">Actions: {lastTrace.recommendedActions.join('; ')}</p>
          </details>
        ) : null}
      </footer>
    </section>
  );
}
