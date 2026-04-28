import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_ROUTES, apiUrl } from '../../constants';
import type {
  DpalAssistantWorkflowState,
  DpalGuideResponse,
  DpalModuleType,
} from './workflowGuideTypes';
import { workflowGuides } from './workflowGuides';

const STORAGE_KEY = 'dpal_project_assistant_state';

type PersistedAssistantState = {
  moduleType: DpalModuleType;
  completedStepIds: string[];
  dismissedTipIds: string[];
  currentStepId: string | null;
  lastQuestion: string;
  lastResponse: DpalGuideResponse | null;
};

const defaultPersisted = (moduleType: DpalModuleType): PersistedAssistantState => ({
  moduleType,
  completedStepIds: [],
  dismissedTipIds: [],
  currentStepId: null,
  lastQuestion: '',
  lastResponse: null,
});

function safeReadPersisted(moduleType: DpalModuleType): PersistedAssistantState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersisted(moduleType);
    const parsed = JSON.parse(raw) as Partial<PersistedAssistantState>;
    return {
      moduleType,
      completedStepIds: Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds : [],
      dismissedTipIds: Array.isArray(parsed.dismissedTipIds) ? parsed.dismissedTipIds : [],
      currentStepId: typeof parsed.currentStepId === 'string' ? parsed.currentStepId : null,
      lastQuestion: typeof parsed.lastQuestion === 'string' ? parsed.lastQuestion : '',
      lastResponse: parsed.lastResponse && typeof parsed.lastResponse === 'object' ? parsed.lastResponse as DpalGuideResponse : null,
    };
  } catch {
    return defaultPersisted(moduleType);
  }
}

function evaluateCompletedSteps(moduleType: DpalModuleType, workflowState: DpalAssistantWorkflowState): string[] {
  const guide = workflowGuides[moduleType] ?? workflowGuides.generic_project;
  return guide.steps
    .filter((step) =>
      step.requiredState.length === 0 || step.requiredState.every((required) => Boolean((workflowState as Record<string, unknown>)[required])))
    .map((step) => step.id);
}

export function useDpalWorkflowGuide(moduleType: DpalModuleType, workflowState: DpalAssistantWorkflowState) {
  const [persisted, setPersisted] = useState<PersistedAssistantState>(() => safeReadPersisted(moduleType));
  const [loading, setLoading] = useState(false);
  const guide = workflowGuides[moduleType] ?? workflowGuides.generic_project;

  const completedStepIds = useMemo(
    () => Array.from(new Set([...persisted.completedStepIds, ...evaluateCompletedSteps(moduleType, workflowState)])),
    [moduleType, persisted.completedStepIds, workflowState],
  );

  const currentStep = useMemo(() => {
    const firstIncomplete = guide.steps.find((step) => !completedStepIds.includes(step.id));
    return firstIncomplete ?? guide.steps[guide.steps.length - 1];
  }, [completedStepIds, guide.steps]);

  const savePersisted = useCallback((next: PersistedAssistantState) => {
    setPersisted(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // no-op for storage failure
    }
  }, []);

  useEffect(() => {
    savePersisted({
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
      if (!response.ok || !data) return persisted.lastResponse;
      const nextPersisted = {
        ...persisted,
        moduleType,
        currentStepId: typeof data.currentStep === 'string' ? data.currentStep : currentStep?.id ?? null,
        lastQuestion: userQuestion,
        lastResponse: data as DpalGuideResponse,
      };
      savePersisted(nextPersisted);
      return data as DpalGuideResponse;
    } finally {
      setLoading(false);
    }
  }, [currentStep?.id, moduleType, persisted, savePersisted, workflowState]);

  const dismissTip = useCallback((tipId: string) => {
    if (!tipId) return;
    savePersisted({
      ...persisted,
      dismissedTipIds: Array.from(new Set([...persisted.dismissedTipIds, tipId])),
    });
  }, [persisted, savePersisted]);

  return {
    guide,
    loading,
    completedStepIds,
    currentStep,
    lastQuestion: persisted.lastQuestion,
    lastResponse: persisted.lastResponse,
    dismissedTipIds: persisted.dismissedTipIds,
    requestGuide,
    dismissTip,
  };
}

