import { prisma } from '../../../lib/prisma';
import type { AgentContext, AgentFindingDraft, AgentRunResult } from '../types';

function shouldNotify(ctx: AgentContext, findings: AgentFindingDraft[]): boolean {
  if (findings.some((f) => f.severity === 'WARNING' || f.severity === 'CRITICAL')) return true;
  if (ctx.state.readinessChanged) return true;
  if (ctx.state.newEvidenceDetected) return true;
  if (ctx.state.requiredEvidenceMissing) return true;
  if (ctx.state.integrityFailed) return true;
  if (ctx.state.validatorReviewNeeded) return true;
  return false;
}

export async function notificationAgent(
  ctx: AgentContext,
  allFindings: AgentFindingDraft[],
  runId: string,
): Promise<AgentRunResult> {
  const findings: AgentFindingDraft[] = [];

  if (!shouldNotify(ctx, allFindings)) {
    findings.push({
      severity: 'INFO',
      category: 'PROJECT_CONFIG',
      title: 'No notifications sent',
      message: 'Run completed without significant changes — no user notifications were created.',
      source: 'notificationAgent',
      label: 'System Checked',
    });
    return { findings };
  }

  const ownerUserId =
    typeof ctx.bundle.config?.ownerUserId === 'string'
      ? ctx.bundle.config.ownerUserId
      : undefined;

  const critical = allFindings.filter((f) => f.severity === 'CRITICAL');
  const warnings = allFindings.filter((f) => f.severity === 'WARNING');
  const top = critical[0] ?? warnings[0];

  const severity = critical.length > 0 ? 'CRITICAL' : 'WARNING';
  const title = top?.title ?? 'MRV Super Agent update';
  const parts: string[] = [];
  if (ctx.state.readinessChanged) {
    parts.push(`Readiness score is now ${ctx.state.readinessScore}.`);
  }
  if (ctx.state.requiredEvidenceMissing) parts.push('Required evidence is missing.');
  if (ctx.state.integrityFailed) parts.push('Integrity or blockchain check needs attention.');
  if (ctx.state.validatorReviewNeeded) parts.push('Validator review is needed.');
  if (warnings.length) parts.push(`${warnings.length} warning finding(s).`);
  if (critical.length) parts.push(`${critical.length} critical finding(s).`);

  const message = parts.join(' ') || top?.message || 'Review the latest Super Agent run.';

  await prisma.mrvNotification.create({
    data: {
      projectId: ctx.projectId,
      userId: ownerUserId ?? null,
      title,
      message,
      severity,
      runId,
    },
  });

  ctx.state.notifyReasons.push('notification_created');

  findings.push({
    severity: 'INFO',
    category: 'PROJECT_CONFIG',
    title: 'User notification created',
    message: 'A project notification was stored for WARNING/CRITICAL or significant readiness changes.',
    source: 'notificationAgent',
    label: 'System Checked',
  });

  return { findings };
}
