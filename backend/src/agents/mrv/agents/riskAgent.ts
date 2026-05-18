import type { AgentContext, AgentFindingDraft, AgentRunResult } from '../types';

export async function riskAgent(ctx: AgentContext): Promise<AgentRunResult> {
  const findings: AgentFindingDraft[] = [];
  const config = ctx.bundle.config;
  const blockchain = (config?.blockchain ?? {}) as Record<string, unknown> | undefined;
  const reviewer = (config?.reviewer ?? {}) as Record<string, unknown> | undefined;

  const reportJson = ctx.bundle.dmrvReport?.reportJson as Record<string, unknown> | undefined;
  const threats = reportJson?.threatRegister;
  const threatCount = Array.isArray(threats) ? threats.length : 0;

  if (threatCount > 0) {
    findings.push({
      severity: 'WARNING',
      category: 'SECURITY',
      title: 'Threat register entries present',
      message: `${threatCount} threat register item(s) require review in the living dMRV report.`,
      source: 'riskAgent',
      label: 'User Review Needed',
    });
  }

  const chainStatus = String(blockchain?.status ?? 'none');
  if (chainStatus === 'unavailable') {
    ctx.state.integrityFailed = true;
    findings.push({
      severity: 'WARNING',
      category: 'SECURITY',
      title: 'Blockchain identity unavailable',
      message:
        String(blockchain?.serviceMessage ?? 'Project blockchain identity service is unavailable.') ||
        'Blockchain anchoring service reported unavailable.',
      source: 'riskAgent',
      label: 'System Checked',
    });
  } else if (chainStatus === 'none' && !blockchain?.configHash) {
    findings.push({
      severity: 'INFO',
      category: 'SECURITY',
      title: 'Project identity not anchored',
      message:
        'Project config hash is not anchored. Final packet generation and public anchoring require explicit user confirmation.',
      source: 'riskAgent',
      label: 'User Review Needed',
    });
  } else if (chainStatus === 'pending') {
    findings.push({
      severity: 'INFO',
      category: 'SECURITY',
      title: 'Anchoring pending',
      message: 'Blockchain project identity anchoring is pending user-confirmed workflow completion.',
      source: 'riskAgent',
      label: 'User Review Needed',
    });
  }

  const anchorState = reportJson?.anchorState as Record<string, unknown> | undefined;
  if (anchorState?.hasUnanchoredChanges === true) {
    findings.push({
      severity: 'WARNING',
      category: 'SECURITY',
      title: 'Unanchored report changes',
      message: 'The living report has changes since the last anchor — review before any public claim.',
      source: 'riskAgent',
      label: 'User Review Needed',
    });
  }

  if (reviewer?.reviewRequired === true || reviewer?.humanVerificationRequired === true) {
    ctx.state.validatorReviewNeeded = true;
    findings.push({
      severity: 'INFO',
      category: 'VALIDATOR',
      title: 'Human or validator review flagged',
      message: 'Project configuration marks validator or human verification as required.',
      source: 'riskAgent',
      label: 'Validator Review Needed',
    });
  }

  const missions = reportJson?.validatorMissions;
  const openMissions = Array.isArray(missions)
    ? missions.filter((m) => {
        const row = m as Record<string, unknown>;
        const st = String(row.status ?? '').toLowerCase();
        return st !== 'complete' && st !== 'completed' && st !== 'approved';
      })
    : [];
  if (openMissions.length > 0) {
    ctx.state.validatorReviewNeeded = true;
    findings.push({
      severity: 'WARNING',
      category: 'VALIDATOR',
      title: 'Open validator missions',
      message: `${openMissions.length} validator mission(s) are not complete — AI recommendations do not replace validator approval.`,
      source: 'riskAgent',
      label: 'Validator Review Needed',
    });
  }

  return { findings };
}
