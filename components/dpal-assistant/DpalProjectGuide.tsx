import React, { useEffect, useMemo, useState } from 'react';
import type { DpalProjectGuideSnapshot, DpalProjectModuleType, DpalProjectWorkflowState } from './projectGuideTypes';
import { useDpalProjectGuide } from './useDpalProjectGuide';

type Props = {
  moduleType: DpalProjectModuleType;
  workflowState: DpalProjectWorkflowState;
  scanResult?: Record<string, unknown>;
  evidenceState?: Record<string, unknown>;
  onCreateEvidencePacket?: () => void;
  onCreateVerificationMission?: () => void;
  onSendToSituationRoom?: () => void;
  onGuideStateChange?: (snapshot: DpalProjectGuideSnapshot) => void;
};

const GUIDE_ACTIONS = [
  { id: 'start_setup', label: 'Start guided setup', question: 'Start guided setup for this project.' },
  { id: 'next', label: 'What do I do next?', question: 'What do I do next?' },
  { id: 'aoi', label: 'Explain AOI', question: 'Explain AOI (Area of Interest) and why it matters.' },
  { id: 'scan', label: 'Explain this scan result', question: 'Explain this scan result in plain English.' },
  { id: 'missing', label: 'What evidence is missing?', question: 'What evidence is missing right now?' },
  { id: 'claim', label: 'Can I make a claim?', question: 'Can I make a legal, regulatory, insurance, or carbon claim yet?' },
];

export default function DpalProjectGuide(props: Props) {
  const { moduleType, workflowState, scanResult, evidenceState, onCreateEvidencePacket, onCreateVerificationMission, onSendToSituationRoom, onGuideStateChange } = props;
  const [expandedMobile, setExpandedMobile] = useState(false);
  const { guide, loading, completedStepIds, currentStep, lastResponse, lastQuestion, requestGuide } = useDpalProjectGuide(moduleType, workflowState);
  const shouldSuggestSituationRoom = Boolean(
    moduleType === 'earth_observation'
      && (workflowState.processingStage === 'metric_computed' || workflowState.processingStage === 'field_verified')
      && !workflowState.situationRoomSent,
  );

  const progress = useMemo(() => {
    if (!guide.steps.length) return 0;
    return Math.round((completedStepIds.length / guide.steps.length) * 100);
  }, [completedStepIds.length, guide.steps.length]);

  useEffect(() => {
    if (!onGuideStateChange) return;
    onGuideStateChange({
      currentStep: currentStep?.id,
      nextStep: lastResponse?.nextStep,
      plainEnglishExplanation: lastResponse?.plainEnglishExplanation,
      missingItems: lastResponse?.missingItems ?? [],
      warnings: lastResponse?.warnings ?? [],
      recommendedActions: lastResponse?.recommendedActions ?? [],
      claimSafety: lastResponse?.claimSafety,
      lastUserQuestion: lastQuestion || undefined,
      lastGuideResponse: lastResponse?.plainEnglishExplanation,
    });
  }, [currentStep?.id, lastQuestion, lastResponse, onGuideStateChange]);

  const situationRoomPrompt =
    'If the result needs review, send it to the Situation Room so team members, validators, and AI guidance can discuss the evidence and next action.';

  const askSituationRoomGuidance = () =>
    void requestGuide(situationRoomPrompt, scanResult, evidenceState);

  const panel = (
    <div className="rounded-xl border border-sky-700/30 bg-slate-950/90 p-4 text-slate-200 shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">DPAL Project Guide</p>
          <p className="text-sm font-bold text-white">{guide.title}</p>
        </div>
        <span className="rounded-full border border-sky-600/40 px-2 py-0.5 text-[11px] text-sky-300">{progress}%</span>
      </div>

      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/80 p-3">
        <p className="text-xs text-slate-400">Current step</p>
        <p className="text-sm font-semibold text-white">{currentStep?.title ?? 'Setup'}</p>
        <p className="mt-1 text-xs text-slate-400">{currentStep?.description}</p>
      </div>

      <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-2">
        {guide.steps.map((step, idx) => {
          const done = completedStepIds.includes(step.id);
          return (
            <div key={step.id} className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${done ? 'text-emerald-300' : 'text-slate-400'}`}>
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${done ? 'border-emerald-400 bg-emerald-600/20' : 'border-slate-600'}`}>
                {done ? '✓' : idx + 1}
              </span>
              <span>{step.title}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        {GUIDE_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => void requestGuide(action.question, scanResult, evidenceState)}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-xs text-slate-200 hover:border-sky-500/60 hover:bg-slate-800 disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <button type="button" onClick={onCreateEvidencePacket} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-500">
          Create evidence packet
        </button>
        <button type="button" onClick={onCreateVerificationMission} className="rounded-lg border border-sky-500/50 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-900/30">
          Create verification mission
        </button>
        {onSendToSituationRoom && (
          <button type="button" onClick={onSendToSituationRoom} className="rounded-lg border border-violet-500/50 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-900/30">
            Send to Situation Room
          </button>
        )}
      </div>

      {shouldSuggestSituationRoom && (
        <div className="mt-3 rounded-lg border border-violet-500/40 bg-violet-950/20 p-3 text-xs text-violet-100">
          <p className="font-semibold">Recommended next route</p>
          <p className="mt-1">
            {situationRoomPrompt}
          </p>
          <button
            type="button"
            onClick={askSituationRoomGuidance}
            disabled={loading}
            className="mt-2 rounded-lg border border-violet-500/40 bg-violet-900/20 px-3 py-1.5 text-[11px] font-bold text-violet-100 disabled:opacity-50"
          >
            Explain why in guide
          </button>
        </div>
      )}

      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-[11px] text-slate-400">
        <p>AOI = Area of Interest, the exact boundary DPAL analyzes.</p>
        <p>NDVI = vegetation health/change indicator.</p>
        <p>NBR = burn/canopy disturbance indicator.</p>
        <p>NDMI = moisture stress indicator.</p>
        <p>NDWI = water change indicator.</p>
      </div>

      {lastResponse && (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300">
          <p className="font-semibold text-white">{lastResponse.mode === 'AI' ? 'AI guidance' : 'Rule-based guidance'}</p>
          <p className="mt-1">{lastResponse.plainEnglishExplanation}</p>
          {lastResponse.missingItems.length > 0 && <p className="mt-2 text-amber-300">Missing: {lastResponse.missingItems.join(', ')}</p>}
          {lastResponse.warnings.length > 0 && <p className="mt-1 text-rose-300">Warning: {lastResponse.warnings[0]}</p>}
          <p className="mt-2 text-slate-400">Safe claim language: {lastResponse.claimSafety.safeClaimLanguage}</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden lg:sticky lg:top-4 lg:block">{panel}</div>
      <div className="lg:hidden">
        {!expandedMobile && (
          <button
            type="button"
            onClick={() => setExpandedMobile(true)}
            className="fixed bottom-4 right-4 z-40 rounded-full bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-xl"
          >
            DPAL Project Guide
          </button>
        )}
        {expandedMobile && (
          <div className="fixed inset-x-3 bottom-3 z-50 max-h-[80vh] overflow-y-auto">
            {panel}
            <button type="button" onClick={() => setExpandedMobile(false)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
              Close guide
            </button>
          </div>
        )}
      </div>
    </>
  );
}

