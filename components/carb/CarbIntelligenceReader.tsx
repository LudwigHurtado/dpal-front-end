import React, { useMemo, useState } from 'react';

type Severity = 'Info' | 'Watch' | 'Priority';

export interface CarbReaderCategory {
  id: string;
  title: string;
  severity: Severity;
  rationale: string;
  suggestedActions: string[];
}

interface CarbIntelligenceReaderProps {
  facilityName?: string;
  facilityId?: string;
  sourceMode: 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK' | 'NEEDS_SOURCE';
  baselineYear: number | '' | null;
  currentYear: number | '' | null;
  claimComparison: string;
  integrityScore: number | null;
  riskLevel: string;
  categories: CarbReaderCategory[];
  recommendedNextSteps: string[];
}

type ReaderQuestion = {
  id: string;
  label: string;
  answer: string;
};

export default function CarbIntelligenceReader({
  facilityName,
  facilityId,
  sourceMode,
  baselineYear,
  currentYear,
  claimComparison,
  integrityScore,
  riskLevel,
  categories,
  recommendedNextSteps,
}: CarbIntelligenceReaderProps): React.ReactElement {
  const stateLabel = useMemo(() => {
    if (!facilityName) return 'Awaiting facility selection';
    if (riskLevel === 'High') return 'High-priority discrepancy review';
    if (riskLevel === 'Medium') return 'Watchlist discrepancy review';
    return 'Baseline consistency review';
  }, [facilityName, riskLevel]);

  const summary = useMemo(() => {
    if (!facilityName) {
      return 'Select a facility to begin AI-assisted CARB discrepancy interpretation.';
    }
    return [
      `Analyzing ${facilityName} (${facilityId || 'no facility id'}) using ${sourceMode} data.`,
      `Comparison period: ${baselineYear || 'n/a'} to ${currentYear || 'n/a'}.`,
      `Claim interpretation: ${claimComparison}.`,
      `Integrity score: ${integrityScore ?? 'Needs More Data'} (${riskLevel}).`,
    ].join(' ');
  }, [facilityName, facilityId, sourceMode, baselineYear, currentYear, claimComparison, integrityScore, riskLevel]);

  const keyFindings = useMemo(() => {
    if (!categories.length) return ['No priority categories available yet.'];
    return categories.slice(0, 3).map((category) => `${category.title}: ${category.rationale}`);
  }, [categories]);

  const questions = useMemo<ReaderQuestion[]>(() => ([
    {
      id: 'claim',
      label: 'Why was this claim flagged?',
      answer: claimComparison || 'No claim analysis is available yet.',
    },
    {
      id: 'risk',
      label: 'What does this risk level mean?',
      answer: riskLevel === 'High'
        ? 'High risk means claim and emissions signals show strong mismatch or missing verification context.'
        : riskLevel === 'Medium'
          ? 'Medium risk means the discrepancy signal is meaningful and should be reviewed with additional evidence.'
          : riskLevel === 'Low'
            ? 'Low risk means current records look directionally consistent, but verification is still required.'
            : 'Risk cannot be interpreted until core emissions and claim data are available.',
    },
    {
      id: 'next',
      label: 'What should investigators do next?',
      answer: recommendedNextSteps.length
        ? recommendedNextSteps.slice(0, 3).join(' ')
        : 'No recommended actions are available yet.',
    },
  ]), [claimComparison, riskLevel, recommendedNextSteps]);

  const [activeQuestion, setActiveQuestion] = useState<string>(questions[0]?.id ?? 'claim');
  const activeAnswer = questions.find((item) => item.id === activeQuestion) ?? questions[0];

  return (
    <section className="rounded-2xl border border-violet-500/30 bg-slate-950/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">AI Intelligence Reader</p>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">{stateLabel}</span>
      </div>
      <p className="mt-2 text-xs text-slate-200">{summary}</p>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
          <p className="font-semibold text-white">Key findings</p>
          <div className="mt-2 space-y-1">
            {keyFindings.map((line) => <p key={line}>- {line}</p>)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
          <p className="font-semibold text-white">Top category actions</p>
          <div className="mt-2 space-y-1">
            {(categories[0]?.suggestedActions ?? recommendedNextSteps.slice(0, 3)).map((line) => <p key={line}>- {line}</p>)}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
        <p className="font-semibold text-white">Ask the reader</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {questions.map((question) => (
            <button
              key={question.id}
              type="button"
              onClick={() => setActiveQuestion(question.id)}
              className={`rounded-full border px-2 py-1 text-[10px] ${
                activeQuestion === question.id
                  ? 'border-violet-400 bg-violet-900/30 text-violet-100'
                  : 'border-slate-700 bg-slate-900/40 text-slate-300'
              }`}
            >
              {question.label}
            </button>
          ))}
        </div>
        {activeAnswer ? (
          <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
            <p className="font-semibold text-white">{activeAnswer.label}</p>
            <p className="mt-1">{activeAnswer.answer}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
