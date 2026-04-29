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
  hasClimateClaim: boolean;
  isSingleYearEvidence: boolean;
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
  hasClimateClaim,
  isSingleYearEvidence,
}: CarbIntelligenceReaderProps): React.ReactElement {
  const stateLabel = useMemo(() => {
    if (!facilityName) return 'Awaiting facility selection';
    if (isSingleYearEvidence) return 'Preliminary single-year review';
    if (riskLevel === 'High') return 'High-priority discrepancy review';
    if (riskLevel === 'Medium') return 'Watchlist discrepancy review';
    return 'Baseline consistency review';
  }, [facilityName, isSingleYearEvidence, riskLevel]);

  const summary = useMemo(() => {
    if (!facilityName) {
      return 'Select a facility to begin AI-assisted CARB discrepancy interpretation.';
    }
    return [
      `Analyzing ${facilityName} (${facilityId || 'no facility id'}) using ${sourceMode} data.`,
      `Comparison period: ${baselineYear || 'n/a'} to ${currentYear || 'n/a'}.`,
      hasClimateClaim
        ? `Claim interpretation: ${claimComparison}.`
        : 'No climate claim entered. Current review is limited to CARB-reported facility data.',
      `Integrity score: ${integrityScore ?? 'Needs More Data'} (${riskLevel}).`,
      isSingleYearEvidence
        ? 'Only one reporting year is available, so year-over-year discrepancy interpretation remains preliminary.'
        : '',
    ].join(' ');
  }, [facilityName, facilityId, sourceMode, baselineYear, currentYear, hasClimateClaim, claimComparison, integrityScore, riskLevel, isSingleYearEvidence]);

  const keyFindings = useMemo(() => {
    if (!categories.length) return ['No priority categories available yet.'];
    return categories.slice(0, 3).map((category) => `${category.title}: ${category.rationale}`);
  }, [categories]);

  const questions = useMemo<ReaderQuestion[]>(() => {
    if (!hasClimateClaim) {
      return [
        {
          id: 'preliminary',
          label: 'Why is this preliminary?',
          answer: isSingleYearEvidence
            ? 'Only one reporting year is available, so trend and discrepancy findings cannot be confirmed yet.'
            : 'The review remains preliminary until a climate claim or additional corroborating evidence is provided.',
        },
        {
          id: 'single-year',
          label: 'What does single-year data prove?',
          answer: 'Single-year CARB data confirms what was officially reported for that year, but it does not prove year-over-year performance trends.',
        },
        {
          id: 'missing',
          label: 'What evidence is missing?',
          answer: 'Historical CARB records, climate claim context (if one exists), and external corroboration such as EPA references or production/activity data are still needed.',
        },
        {
          id: 'next',
          label: 'What should investigators add next?',
          answer: recommendedNextSteps.length
            ? recommendedNextSteps.slice(0, 4).join(' ')
            : 'Load historical CARB data, add facility coordinates, and attach corroborating evidence.',
        },
      ];
    }
    return [
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
    ];
  }, [hasClimateClaim, isSingleYearEvidence, claimComparison, riskLevel, recommendedNextSteps]);

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
