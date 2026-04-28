import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_ROUTES, apiUrl } from '../../constants';
import { buildClaimSafety } from './claimSafety';
import { projectGuides } from './projectGuides';
import type { DpalProjectGuideResponse, DpalProjectModuleType, DpalProjectWorkflowState } from './projectGuideTypes';

const STORAGE_KEY = 'dpal_project_guide_state';

type PersistedGuideState = {
  moduleType: DpalProjectModuleType;
  completedStepIds: string[];
  dismissedTipIds: string[];
  currentStepId: string | null;
  lastQuestion: string;
  lastResponse: DpalProjectGuideResponse | null;
};

const defaultState = (moduleType: DpalProjectModuleType): PersistedGuideState => ({
  moduleType,
  completedStepIds: [],
  dismissedTipIds: [],
  currentStepId: null,
  lastQuestion: '',
  lastResponse: null,
});

function readState(moduleType: DpalProjectModuleType): PersistedGuideState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState(moduleType);
    const parsed = JSON.parse(raw) as Partial<PersistedGuideState>;
    return {
      moduleType,
      completedStepIds: Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds : [],
      dismissedTipIds: Array.isArray(parsed.dismissedTipIds) ? parsed.dismissedTipIds : [],
      currentStepId: typeof parsed.currentStepId === 'string' ? parsed.currentStepId : null,
      lastQuestion: typeof parsed.lastQuestion === 'string' ? parsed.lastQuestion : '',
      lastResponse: parsed.lastResponse && typeof parsed.lastResponse === 'object' ? parsed.lastResponse as DpalProjectGuideResponse : null,
    };
  } catch {
    return defaultState(moduleType);
  }
}

function computeCompleted(moduleType: DpalProjectModuleType, workflowState: DpalProjectWorkflowState): string[] {
  const guide = projectGuides[moduleType] ?? projectGuides.generic_project;
  return guide.steps
    .filter((step) => step.requiredState.every((key) => Boolean((workflowState as Record<string, unknown>)[key])))
    .map((step) => step.id);
}

export function useDpalProjectGuide(moduleType: DpalProjectModuleType, workflowState: DpalProjectWorkflowState) {
  const [persisted, setPersisted] = useState<PersistedGuideState>(() => readState(moduleType));
  const [loading, setLoading] = useState(false);
  const guide = projectGuides[moduleType] ?? projectGuides.generic_project;

  const completedStepIds = useMemo(
    () => Array.from(new Set([...persisted.completedStepIds, ...computeCompleted(moduleType, workflowState)])),
    [moduleType, persisted.completedStepIds, workflowState],
  );

  const currentStep = useMemo(() => {
    return guide.steps.find((step) => !completedStepIds.includes(step.id)) ?? guide.steps[guide.steps.length - 1];
  }, [completedStepIds, guide.steps]);

  const save = useCallback((next: PersistedGuideState) => {
    setPersisted(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    save({
      ...persisted,
      moduleType,
      completedStepIds,
      currentStepId: currentStep?.id ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleType, completedStepIds.join(','), currentStep?.id]);

  const requestGuide = useCallback(async (userQuestion: string, scanResult?: Record<string, unknown>, evidenceState?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl(API_ROUTES.DPAL_ASSISTANT_PROJECT_GUIDE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleType,
          currentStep: currentStep?.id ?? null,
          workflowState,
          userQuestion,
          scanResult: scanResult ?? {},
          evidenceState: evidenceState ?? {},
        }),
      });
      const data = await response.json().catch(() => null);
      let nextResponse: DpalProjectGuideResponse | null = null;
      if (response.ok && data) {
        nextResponse = data as DpalProjectGuideResponse;
      } else {
        nextResponse = persisted.lastResponse;
      }
      if (!nextResponse) return null;
      // enforce safe claim wrapper on client too
      nextResponse = {
        ...nextResponse,
        claimSafety: buildClaimSafety(workflowState),
      };
      save({
        ...persisted,
        moduleType,
        currentStepId: nextResponse.currentStep || currentStep?.id || null,
        lastQuestion: userQuestion,
        lastResponse: nextResponse,
      });
      return nextResponse;
    } finally {
      setLoading(false);
    }
  }, [currentStep?.id, moduleType, persisted, save, workflowState]);

  return {
    guide,
    loading,
    completedStepIds,
    currentStep,
    lastQuestion: persisted.lastQuestion,
    lastResponse: persisted.lastResponse,
    dismissedTipIds: persisted.dismissedTipIds,
    requestGuide,
  };
}

