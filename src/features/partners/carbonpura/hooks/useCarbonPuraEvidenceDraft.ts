import { useCallback, useEffect, useMemo, useState } from 'react';
import { CARBONPURA_DEFAULT_PROJECT_ID } from '../carbonPuraProjectContext';

const STORAGE_KEY = 'dpal-carbonpura-evidence-draft-v1';

export type CarbonPuraEvidenceDraftEntry = {
  suiteCode: string;
  moduleLabel: string;
  route: string;
  evidenceUse: string;
  addedAtIso: string;
};

export type CarbonPuraEvidenceDraft = {
  projectId: string;
  selectedSourceSuites: CarbonPuraEvidenceDraftEntry[];
};

const EMPTY_DRAFT: CarbonPuraEvidenceDraft = {
  projectId: CARBONPURA_DEFAULT_PROJECT_ID,
  selectedSourceSuites: [],
};

function readDraft(): CarbonPuraEvidenceDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_DRAFT };
    const parsed = JSON.parse(raw) as CarbonPuraEvidenceDraft;
    if (!parsed || !Array.isArray(parsed.selectedSourceSuites)) return { ...EMPTY_DRAFT };
    return parsed;
  } catch {
    return { ...EMPTY_DRAFT };
  }
}

function writeDraft(draft: CarbonPuraEvidenceDraft): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function useCarbonPuraEvidenceDraft(projectId = CARBONPURA_DEFAULT_PROJECT_ID) {
  const [draft, setDraft] = useState<CarbonPuraEvidenceDraft>(() => readDraft());

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  const persist = useCallback((next: CarbonPuraEvidenceDraft) => {
    const withProject = { ...next, projectId };
    writeDraft(withProject);
    setDraft(withProject);
  }, [projectId]);

  const addSourceSuite = useCallback(
    (entry: Omit<CarbonPuraEvidenceDraftEntry, 'addedAtIso'>) => {
      const exists = draft.selectedSourceSuites.some((s) => s.suiteCode === entry.suiteCode);
      if (exists) return;
      persist({
        projectId,
        selectedSourceSuites: [
          ...draft.selectedSourceSuites,
          { ...entry, addedAtIso: new Date().toISOString() },
        ],
      });
    },
    [draft.selectedSourceSuites, persist, projectId],
  );

  const removeSourceSuite = useCallback(
    (suiteCode: string) => {
      persist({
        projectId,
        selectedSourceSuites: draft.selectedSourceSuites.filter((s) => s.suiteCode !== suiteCode),
      });
    },
    [draft.selectedSourceSuites, persist, projectId],
  );

  const clearDraft = useCallback(() => {
    persist({ projectId, selectedSourceSuites: [] });
  }, [persist, projectId]);

  const isSuiteSelected = useCallback(
    (suiteCode: string) => draft.selectedSourceSuites.some((s) => s.suiteCode === suiteCode),
    [draft.selectedSourceSuites],
  );

  const selectedModules = useMemo(() => {
    const set = new Set<string>();
    for (const e of draft.selectedSourceSuites) set.add(e.moduleLabel);
    return [...set];
  }, [draft.selectedSourceSuites]);

  return {
    draft,
    selectedSourceSuites: draft.selectedSourceSuites,
    selectedModules,
    addSourceSuite,
    removeSourceSuite,
    clearDraft,
    isSuiteSelected,
    storageKey: STORAGE_KEY,
    isLocalOnly: true as const,
  };
}
