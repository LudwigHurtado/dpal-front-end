import type {
  MrvAgentRunStatus,
  MrvFindingCategory,
  MrvFindingSeverity,
  MrvMissionType,
} from '@prisma/client';

export type AgentContentLabel =
  | 'AI Suggested'
  | 'System Checked'
  | 'User Review Needed'
  | 'Validator Review Needed';

export type AgentFindingDraft = {
  severity: MrvFindingSeverity;
  category: MrvFindingCategory;
  title: string;
  message: string;
  action?: string;
  source: string;
  label: AgentContentLabel;
};

export type MrvProjectBundle = {
  projectId: string;
  config: Record<string, unknown> | null;
  dmrvReport: {
    reportId: string;
    readinessScore: number;
    status: string;
    reportJson: unknown;
  } | null;
  evidencePacketCount: number;
  emissionsAuditLinked: boolean;
};

export type AgentContext = {
  projectId: string;
  scheduleId?: string;
  missionType: MrvMissionType;
  bundle: MrvProjectBundle;
  previousReadinessScore: number | null;
  previousEvidencePacketCount: number | null;
  /** Mutable state passed between agents during a run. */
  state: {
    readinessScore: number;
    readinessChanged: boolean;
    newEvidenceDetected: boolean;
    requiredEvidenceMissing: boolean;
    integrityFailed: boolean;
    validatorReviewNeeded: boolean;
    notifyReasons: string[];
  };
};

export type AgentRunResult = {
  findings: AgentFindingDraft[];
};

export type SuperAgentMissionResult = {
  runId: string;
  status: MrvAgentRunStatus;
  summary: Record<string, unknown>;
  findings: AgentFindingDraft[];
};
