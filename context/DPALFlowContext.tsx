import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import type {
  CategoryMode,
  DPALFlowState,
  HelpDraft,
  ReportDraft,
} from '../types/categoryGateway';

export type DPALFlowActions = {
  setCategory: (categoryId: string) => void;
  setMode: (mode: CategoryMode) => void;
  startReportDraft: (draft: Partial<ReportDraft>) => void;
  updateReportDraft: (patch: Partial<ReportDraft>) => void;
  startHelpDraft: (draft: Partial<HelpDraft>) => void;
  updateHelpDraft: (patch: Partial<HelpDraft>) => void;
  selectMission: (missionId: string) => void;
  selectPlayActivity: (activityId: string) => void;
  resetFlow: () => void;
};

type Ctx = { state: DPALFlowState; actions: DPALFlowActions };

const DPALFlowContext = createContext<Ctx | undefined>(undefined);

const draftKey = (prefix: string, categoryId: string) => `dpal-flow-${prefix}-${categoryId}`;

const emptyReportDraft = (categoryId: string): ReportDraft => ({
  categoryId,
  reportTypeId: '',
  evidence: [],
  tags: [],
  status: 'draft',
});

const emptyHelpDraft = (categoryId: string): HelpDraft => ({
  categoryId,
  helpDirection: 'request',
  helpTypeId: '',
  status: 'draft',
});

export const DPALFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DPALFlowState>({});

  useEffect(() => {
    if (!state.categoryId) return;
    try {
      const raw = localStorage.getItem(draftKey('report', state.categoryId));
      if (raw && !state.reportDraft) {
        const parsed = JSON.parse(raw) as ReportDraft;
        setState((s) => ({ ...s, reportDraft: parsed }));
      }
    } catch {
      /* ignore */
    }
  }, [state.categoryId]);

  useEffect(() => {
    if (!state.categoryId || !state.reportDraft) return;
    try {
      localStorage.setItem(draftKey('report', state.categoryId), JSON.stringify(state.reportDraft));
    } catch {
      /* ignore */
    }
  }, [state.categoryId, state.reportDraft]);

  useEffect(() => {
    if (!state.categoryId || !state.helpDraft) return;
    try {
      localStorage.setItem(draftKey('help', state.categoryId), JSON.stringify(state.helpDraft));
    } catch {
      /* ignore */
    }
  }, [state.categoryId, state.helpDraft]);

  const actions = useMemo<DPALFlowActions>(
    () => ({
      setCategory: (categoryId) => setState((s) => ({ ...s, categoryId })),
      setMode: (mode) => setState((s) => ({ ...s, activeMode: mode })),
      startReportDraft: (partial) =>
        setState((s) => {
          const cid = partial.categoryId || s.categoryId || '';
          const base = s.reportDraft || emptyReportDraft(cid);
          return { ...s, reportDraft: { ...base, ...partial, categoryId: cid, status: 'draft' } };
        }),
      updateReportDraft: (patch) =>
        setState((s) => {
          const cid = s.categoryId || patch.categoryId || '';
          const base = s.reportDraft || emptyReportDraft(cid);
          return { ...s, reportDraft: { ...base, ...patch } };
        }),
      startHelpDraft: (partial) =>
        setState((s) => {
          const cid = partial.categoryId || s.categoryId || '';
          const base = s.helpDraft || emptyHelpDraft(cid);
          return { ...s, helpDraft: { ...base, ...partial, categoryId: cid, status: 'draft' } };
        }),
      updateHelpDraft: (patch) =>
        setState((s) => {
          const cid = s.categoryId || patch.categoryId || '';
          const base = s.helpDraft || emptyHelpDraft(cid);
          return { ...s, helpDraft: { ...base, ...patch } };
        }),
      selectMission: (missionId) => setState((s) => ({ ...s, activeMissionId: missionId })),
      selectPlayActivity: (activityId) => setState((s) => ({ ...s, activePlayId: activityId })),
      resetFlow: () => setState({}),
    }),
    []
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <DPALFlowContext.Provider value={value}>{children}</DPALFlowContext.Provider>;
};

export const useDPALFlow = (): Ctx => {
  const ctx = useContext(DPALFlowContext);
  if (!ctx) throw new Error('useDPALFlow must be used within DPALFlowProvider');
  return ctx;
};

export const useDPALFlowOptional = (): Ctx | undefined => useContext(DPALFlowContext);
