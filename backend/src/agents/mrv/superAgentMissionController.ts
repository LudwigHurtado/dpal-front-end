import type { MrvAgentRunStatus, MrvMissionType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { aoiAgent } from './agents/aoiAgent';
import { calculationAgent } from './agents/calculationAgent';
import { evidenceAgent } from './agents/evidenceAgent';
import { notificationAgent } from './agents/notificationAgent';
import { projectConfigAgent } from './agents/projectConfigAgent';
import { reportAgent } from './agents/reportAgent';
import { riskAgent } from './agents/riskAgent';
import { satelliteAgent } from './agents/satelliteAgent';
import { loadMrvProjectBundle } from './loadMrvProjectBundle';
import type { AgentContext, AgentFindingDraft, SuperAgentMissionResult } from './types';

export type RunMrvSuperAgentMissionParams = {
  projectId: string;
  scheduleId?: string;
  missionType?: MrvMissionType;
  createdBy?: string;
};

function resolveRunStatus(
  findings: AgentFindingDraft[],
  errors: string[],
): MrvAgentRunStatus {
  if (errors.length > 0 && findings.length === 0) return 'FAILED';
  if (errors.length > 0) return 'PARTIAL';
  if (findings.some((f) => f.severity === 'CRITICAL')) return 'PARTIAL';
  if (findings.some((f) => f.severity === 'WARNING')) return 'PARTIAL';
  return 'SUCCESS';
}

export async function runMrvSuperAgentMission(
  params: RunMrvSuperAgentMissionParams,
): Promise<SuperAgentMissionResult> {
  const projectId = params.projectId.trim();
  const missionType = params.missionType ?? 'MANUAL_RUN';
  const createdBy = params.createdBy ?? 'DPAL_SUPER_AGENT';

  const bundle = await loadMrvProjectBundle(projectId);
  const previousReadinessScore = bundle.dmrvReport?.readinessScore ?? null;

  const priorRun = await prisma.mrvAgentRun.findFirst({
    where: { projectId, status: { in: ['SUCCESS', 'PARTIAL'] } },
    orderBy: { startedAt: 'desc' },
  });
  const priorSummary = priorRun?.summary as Record<string, unknown> | null;
  const previousEvidencePacketCount =
    typeof priorSummary?.evidencePacketCount === 'number'
      ? priorSummary.evidencePacketCount
      : null;

  const run = await prisma.mrvAgentRun.create({
    data: {
      projectId,
      scheduleId: params.scheduleId ?? null,
      missionType,
      status: 'RUNNING',
      createdBy,
    },
  });

  const ctx: AgentContext = {
    projectId,
    scheduleId: params.scheduleId,
    missionType,
    bundle,
    previousReadinessScore,
    previousEvidencePacketCount,
    state: {
      readinessScore: previousReadinessScore ?? 0,
      readinessChanged: false,
      newEvidenceDetected: false,
      requiredEvidenceMissing: false,
      integrityFailed: false,
      validatorReviewNeeded: false,
      notifyReasons: [],
    },
  };

  const allFindings: AgentFindingDraft[] = [];
  const errors: string[] = [];

  const runStep = async (name: string, fn: () => Promise<{ findings: AgentFindingDraft[] }>) => {
    try {
      const result = await fn();
      allFindings.push(...result.findings);
    } catch (err) {
      errors.push(`${name}: ${(err as Error).message}`);
    }
  };

  await runStep('projectConfigAgent', () => projectConfigAgent(ctx));
  await runStep('aoiAgent', () => aoiAgent(ctx));
  await runStep('satelliteAgent', () => satelliteAgent(ctx));
  await runStep('evidenceAgent', () => evidenceAgent(ctx));
  await runStep('calculationAgent', () => calculationAgent(ctx));
  await runStep('riskAgent', () => riskAgent(ctx));
  await runStep('reportAgent', () => reportAgent(ctx, allFindings));
  await runStep('notificationAgent', () => notificationAgent(ctx, allFindings, run.id));

  const status = resolveRunStatus(allFindings, errors);
  const finishedAt = new Date();

  const summary = {
    projectId,
    missionType,
    readinessScore: ctx.state.readinessScore,
    previousReadinessScore,
    readinessChanged: ctx.state.readinessChanged,
    findingCounts: {
      total: allFindings.length,
      info: allFindings.filter((f) => f.severity === 'INFO').length,
      warning: allFindings.filter((f) => f.severity === 'WARNING').length,
      critical: allFindings.filter((f) => f.severity === 'CRITICAL').length,
    },
    evidencePacketCount: bundle.evidencePacketCount,
    notifyReasons: ctx.state.notifyReasons,
    errors,
    finishedAt: finishedAt.toISOString(),
  };

  if (allFindings.length > 0) {
    await prisma.mrvAgentFinding.createMany({
      data: allFindings.map((f) => ({
        runId: run.id,
        projectId,
        severity: f.severity,
        category: f.category,
        title: f.title,
        message: f.message,
        action: f.action ?? null,
        source: f.source,
      })),
    });
  }

  await prisma.mrvAgentRun.update({
    where: { id: run.id },
    data: {
      status,
      finishedAt,
      summary,
      findings: allFindings,
      errors: errors.length ? errors : undefined,
    },
  });

  return {
    runId: run.id,
    status,
    summary,
    findings: allFindings,
  };
}
