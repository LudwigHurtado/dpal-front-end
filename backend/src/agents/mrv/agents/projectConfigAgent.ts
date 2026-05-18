import type { AgentContext, AgentFindingDraft, AgentRunResult } from '../types';

export async function projectConfigAgent(ctx: AgentContext): Promise<AgentRunResult> {
  const findings: AgentFindingDraft[] = [];
  const config = ctx.bundle.config;

  if (!config) {
    findings.push({
      severity: 'WARNING',
      category: 'PROJECT_CONFIG',
      title: 'Project configuration not synced to server',
      message:
        'No server-side project snapshot exists. Open project config in Field OS and save, or run a manual agent sync before scheduled checks can assess AOI and methodology fields.',
      action: 'Save project configuration from the dMRV workflow to sync server context.',
      source: 'projectConfigAgent',
      label: 'User Review Needed',
    });
    return { findings };
  }

  const projectName = String(config.projectName ?? '').trim();
  const organization = String(config.organization ?? '').trim();
  const categorySlug = String(config.categorySlug ?? '').trim();
  const typeId = String(config.typeId ?? '').trim();

  if (!projectName) {
    findings.push({
      severity: 'WARNING',
      category: 'PROJECT_CONFIG',
      title: 'Project name missing',
      message: 'The project name is required before MRV reporting can proceed.',
      action: 'Enter a project name in Project Configuration.',
      source: 'projectConfigAgent',
      label: 'User Review Needed',
    });
  }

  if (!organization) {
    findings.push({
      severity: 'INFO',
      category: 'PROJECT_CONFIG',
      title: 'Organization not set',
      message: 'Steward or organization name is empty; add it for audit trail clarity.',
      source: 'projectConfigAgent',
      label: 'System Checked',
    });
  }

  if (!categorySlug || !typeId) {
    findings.push({
      severity: 'WARNING',
      category: 'PROJECT_CONFIG',
      title: 'MRV category or type incomplete',
      message: 'Category slug or monitoring type id is missing from the synced project context.',
      source: 'projectConfigAgent',
      label: 'User Review Needed',
    });
  } else {
    findings.push({
      severity: 'INFO',
      category: 'PROJECT_CONFIG',
      title: 'Project identity present',
      message: `Synced project context for ${categorySlug} / ${typeId} is available for readiness checks.`,
      source: 'projectConfigAgent',
      label: 'System Checked',
    });
  }

  const status = String(config.status ?? 'draft');
  if (status === 'required') {
    findings.push({
      severity: 'WARNING',
      category: 'PROJECT_CONFIG',
      title: 'Project configuration incomplete',
      message: 'Project status is still marked as required — complete mandatory fields before verification.',
      source: 'projectConfigAgent',
      label: 'User Review Needed',
    });
  }

  return { findings };
}
