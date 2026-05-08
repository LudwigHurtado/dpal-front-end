import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExchangeWorkflowStepId } from './coloradoExchangeWorkflow';
import { COLORADO_EXCHANGE_WORKFLOW_STEPS } from './coloradoExchangeWorkflow';
import WaterIntelligenceWorkflowPanel from './components/WaterIntelligenceWorkflowPanel';
import type { WaterIntelWorkflowStepBase } from './waterIntelligenceWorkflow';

const WORKFLOW_STEPS: Array<WaterIntelWorkflowStepBase & { id: ExchangeWorkflowStepId }> =
  COLORADO_EXCHANGE_WORKFLOW_STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    purpose: s.purpose,
    checklist: s.checklist,
    openTabLabel: s.openLabel,
    continueLabel: s.continueLabel,
    aiHint: s.aiHint,
  }));

export interface ColoradoExchangeWorkflowPanelProps {
  completedIds?: ExchangeWorkflowStepId[];
  onCompletedChange?: (ids: ExchangeWorkflowStepId[]) => void;
}

export default function ColoradoExchangeWorkflowPanel({
  completedIds: controlledCompleted,
  onCompletedChange,
}: ColoradoExchangeWorkflowPanelProps = {}): React.ReactElement {
  const navigate = useNavigate();
  const [internalCompleted, setInternalCompleted] = useState<ExchangeWorkflowStepId[]>([]);
  const completedIds = controlledCompleted ?? internalCompleted;

  const setCompleted = useCallback(
    (next: ExchangeWorkflowStepId[]) => {
      if (onCompletedChange) onCompletedChange(next);
      else setInternalCompleted(next);
    },
    [onCompletedChange],
  );

  const onOpen = useCallback(
    (stepId: ExchangeWorkflowStepId) => {
      const s = COLORADO_EXCHANGE_WORKFLOW_STEPS.find((x) => x.id === stepId);
      if (!s) return;
      navigate(`/water-intelligence${s.path}${s.search ?? ''}`);
    },
    [navigate],
  );

  const onMark = useCallback(
    (stepId: ExchangeWorkflowStepId) => {
      const next = completedIds.includes(stepId) ? completedIds : [...completedIds, stepId];
      setCompleted(next);
    },
    [completedIds, setCompleted],
  );

  return useMemo(
    () => (
      <WaterIntelligenceWorkflowPanel<ExchangeWorkflowStepId>
        heading="Colorado River operator workflow"
        subheading="Plain-English steps with checklists. Use Open to jump to the related page, then mark complete."
        steps={WORKFLOW_STEPS}
        completedIds={completedIds}
        onOpenRelated={onOpen}
        onMarkComplete={onMark}
      />
    ),
    [completedIds, onMark, onOpen],
  );
}
