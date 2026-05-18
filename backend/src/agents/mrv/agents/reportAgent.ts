import { prisma } from '../../../lib/prisma';
import { computeReadinessScore } from '../readinessScore';
import type { AgentContext, AgentFindingDraft, AgentRunResult } from '../types';

export async function reportAgent(
  ctx: AgentContext,
  allFindings: AgentFindingDraft[],
): Promise<AgentRunResult> {
  const findings: AgentFindingDraft[] = [];
  const previous = ctx.bundle.dmrvReport?.readinessScore ?? ctx.previousReadinessScore ?? null;
  const score = computeReadinessScore(ctx.bundle, allFindings);
  ctx.state.readinessScore = score;

  if (previous !== null && Math.abs(previous - score) >= 10) {
    ctx.state.readinessChanged = true;
    findings.push({
      severity: 'WARNING',
      category: 'PROJECT_CONFIG',
      title: 'Readiness score changed',
      message: `Readiness score moved from ${previous} to ${score} during this agent run.`,
      source: 'reportAgent',
      label: 'System Checked',
    });
  }

  const config = ctx.bundle.config;
  const categorySlug = String(config?.categorySlug ?? 'custom');
  const reportId = ctx.bundle.dmrvReport?.reportId ?? `dmrv-${ctx.projectId}`;

  const agentSummary = {
    updatedAt: new Date().toISOString(),
    readinessScore: score,
    findingCount: allFindings.length,
    warningCount: allFindings.filter((f) => f.severity === 'WARNING').length,
    criticalCount: allFindings.filter((f) => f.severity === 'CRITICAL').length,
    missionType: ctx.missionType,
    labels: {
      aiSuggested: 'AI Suggested',
      systemChecked: 'System Checked',
      userReview: 'User Review Needed',
      validatorReview: 'Validator Review Needed',
    },
    disclaimer:
      'Agent output is readiness guidance only — not verification, certification, or blockchain anchoring.',
  };

  try {
    await prisma.dmrvReport.upsert({
      where: { reportId },
      create: {
        reportId,
        projectId: ctx.projectId,
        categoryId: categorySlug,
        reportType: categorySlug,
        status: score >= 70 ? 'in_progress' : 'draft',
        readinessScore: score,
        reportJson: {
          ...(typeof ctx.bundle.dmrvReport?.reportJson === 'object'
            ? (ctx.bundle.dmrvReport?.reportJson as object)
            : {}),
          projectId: ctx.projectId,
          lastAgentRunAt: new Date().toISOString(),
          agentReadinessSummary: agentSummary,
        },
      },
      update: {
        readinessScore: score,
        status: score >= 70 ? 'in_progress' : 'draft',
        reportJson: {
          ...(typeof ctx.bundle.dmrvReport?.reportJson === 'object'
            ? (ctx.bundle.dmrvReport?.reportJson as object)
            : { projectId: ctx.projectId }),
          lastAgentRunAt: new Date().toISOString(),
          agentReadinessSummary: agentSummary,
        },
      },
    });

    findings.push({
      severity: 'INFO',
      category: 'PROJECT_CONFIG',
      title: 'Living report updated',
      message: `dMRV report readiness score set to ${score}. Review sections before validator or public claims.`,
      source: 'reportAgent',
      label: 'System Checked',
    });
  } catch (err) {
    findings.push({
      severity: 'WARNING',
      category: 'PROJECT_CONFIG',
      title: 'Report persistence failed',
      message: `Could not update DmrvReport in database: ${(err as Error).message}`,
      source: 'reportAgent',
      label: 'System Checked',
    });
  }

  return { findings };
}
