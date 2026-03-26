import React, { useCallback, useMemo, useState } from 'react';
import { ForensicField, type ForensicQuestion } from './ForensicField';
import { Activity, ChevronLeft, ChevronRight, Pill } from './icons';

/** Short, plain-language hints so the flow feels supportive (first-aid style), not like a tax form. */
const COACH_BY_ID: Record<string, string> = {
  GLB_01: 'Exact time helps regulators and venues spot patterns.',
  GLB_02: 'If it’s still happening, responders treat this as higher priority.',
  GLB_04: 'Your role changes what follow-up questions may apply.',
  GLB_05: 'Impact type helps route this to the right desk.',
  GLB_06: 'Evidence strengthens every report — “none” is still valid.',
  ALG_01: 'What kind of exposure was it? This steers safety advice.',
  ALG_02: 'Select everything that might apply — you can note details in your story below.',
  ALG_03: 'Where were you? Setting changes who may be accountable.',
  ALG_04: 'Were allergens disclosed clearly on menus, labels, or signage?',
  ALG_05: 'Severity tells us how urgent this is for the community.',
  ALG_06: 'What care was given? This is critical for allergy incidents.',
  ALG_07: 'Repeat issues at one place are a red flag for investigators.',
  ALG_DD_01: 'Timing helps connect cause and reaction.',
  ALG_DD_02: 'Cross-contact clues — optional but powerful when you’re unsure what happened.',
  ALG_DD_03: 'Receipts, labels, or photos can prove what was served or sold.',
};

function isAnswered(q: ForensicQuestion, val: any): boolean {
  if (val === undefined || val === null) return false;
  if (q.answer_type === 'multi_select') return Array.isArray(val) && val.length > 0;
  if (q.answer_type === 'datetime') return String(val).trim().length > 0;
  if (q.answer_type === 'short_text') return String(val).trim().length > 0;
  if (q.answer_type === 'single_select') return String(val).trim().length > 0;
  return true;
}

export interface AllergyQuestionDeckProps {
  questions: ForensicQuestion[];
  answers: Record<string, any>;
  /** Per-field updates avoid stale merges when answers change quickly. */
  onAnswerChange: (id: string, value: any) => void;
}

const AllergyQuestionDeck: React.FC<AllergyQuestionDeckProps> = ({ questions, answers, onAnswerChange }) => {
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [entering, setEntering] = useState(false);

  const total = questions.length;
  const q = questions[index];
  const coach = (q && COACH_BY_ID[q.id]) || 'Your answers help others stay safe.';

  const setValue = useCallback(
    (id: string, val: any) => {
      onAnswerChange(id, val);
    },
    [onAnswerChange]
  );

  const canAdvance = useMemo(() => {
    if (!q) return false;
    if (!q.required) return true;
    return isAnswered(q, answers[q.id]);
  }, [q, answers]);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= total) return;
      setExiting(true);
      window.setTimeout(() => {
        setIndex(next);
        setExiting(false);
        setEntering(true);
        window.requestAnimationFrame(() => {
          window.setTimeout(() => setEntering(false), 40);
        });
      }, 220);
    },
    [index, total]
  );

  const onNext = useCallback(() => {
    if (!q) return;
    if (q.required && !isAnswered(q, answers[q.id])) return;
    go(1);
  }, [q, answers, go]);

  const onSkip = useCallback(() => {
    if (!q || q.required) return;
    go(1);
  }, [q, go]);

  if (!q || total === 0) {
    return (
      <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-8 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        No allergy questions loaded.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-rose-400">
          <Pill className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Allergy intake</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          {index + 1} / {total}
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
        <div
          className="h-full bg-gradient-to-r from-rose-500 to-cyan-500 transition-all duration-500 ease-out"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <div
        className={`relative min-h-[280px] rounded-[2rem] border-2 border-zinc-800 bg-zinc-950/90 p-6 sm:p-8 shadow-2xl transition-all duration-220 ease-out overflow-hidden ${
          exiting ? '-translate-x-[120%] opacity-0 scale-[0.98]' : ''
        } ${entering ? 'translate-x-6 opacity-90' : 'translate-x-0 opacity-100'}`}
        style={{ transitionDuration: exiting ? '220ms' : '280ms' }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500 shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{q.section}</span>
          </div>
          {!q.required && (
            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400">
              Optional
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm font-bold text-zinc-300 leading-relaxed mb-6">{coach}</p>

        <div key={q.id} className="animate-allergy-in">
          <ForensicField question={q} value={answers[q.id]} onChange={(v) => setValue(q.id, v)} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0 || exiting}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-zinc-800 bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:border-zinc-600 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
          {!q.required && (
            <button
              type="button"
              onClick={onSkip}
              disabled={exiting}
              className="px-5 py-3 rounded-2xl border border-zinc-800 bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!canAdvance || exiting}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-cyan-500/50 bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 disabled:opacity-30 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            {index >= total - 1 ? 'Done' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes allergyIn {
          from {
            opacity: 0;
            transform: translateX(48px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-allergy-in {
          animation: allergyIn 0.35s ease-out both;
        }
      `}</style>
    </div>
  );
};

export default AllergyQuestionDeck;
