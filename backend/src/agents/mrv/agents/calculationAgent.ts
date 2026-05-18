import type { AgentContext, AgentFindingDraft, AgentRunResult } from '../types';

export async function calculationAgent(ctx: AgentContext): Promise<AgentRunResult> {
  const findings: AgentFindingDraft[] = [];
  const config = ctx.bundle.config;
  const reporting = (config?.reporting ?? {}) as Record<string, unknown> | undefined;

  if (!config) {
    findings.push({
      severity: 'INFO',
      category: 'CALCULATION',
      title: 'Calculation readiness not assessed',
      message: 'Reporting period and methodology fields require a synced project configuration.',
      source: 'calculationAgent',
      label: 'System Checked',
    });
    return { findings };
  }

  const startDate = String(reporting?.startDate ?? '').trim();
  const endDate = String(reporting?.endDate ?? '').trim();
  const baselineYear = String(reporting?.baselineYear ?? '').trim();

  if (!startDate || !endDate) {
    findings.push({
      severity: 'WARNING',
      category: 'CALCULATION',
      title: 'Monitoring period incomplete',
      message: 'Reporting start or end date is missing — intensity and trend calculations need a defined period.',
      action: 'Set monitoring period dates in Project Configuration.',
      source: 'calculationAgent',
      label: 'User Review Needed',
    });
  }

  if (!baselineYear) {
    findings.push({
      severity: 'INFO',
      category: 'CALCULATION',
      title: 'Baseline year not set',
      message: 'Baseline year is empty; comparison metrics may be limited until it is defined.',
      source: 'calculationAgent',
      label: 'AI Suggested',
    });
  }

  if (ctx.bundle.emissionsAuditLinked) {
    findings.push({
      severity: 'INFO',
      category: 'CALCULATION',
      title: 'Emissions audit linked',
      message:
        'An emissions integrity audit is linked to this MRV project id. Review ADI and production signals in EIAS — this agent does not recalculate emissions.',
      source: 'calculationAgent',
      label: 'System Checked',
    });
  }

  const reportJson = ctx.bundle.dmrvReport?.reportJson as Record<string, unknown> | undefined;
  const biomass = reportJson?.biomassTimeline;
  if (Array.isArray(biomass) && biomass.length > 0) {
    findings.push({
      severity: 'INFO',
      category: 'CALCULATION',
      title: 'Biomass timeline entries in report',
      message: `${biomass.length} biomass snapshot(s) are recorded in the living report for human review.`,
      source: 'calculationAgent',
      label: 'System Checked',
    });
  }

  findings.push({
    severity: 'INFO',
    category: 'CALCULATION',
    title: 'No automatic credit issuance',
    message:
      'Super Agent does not issue carbon credits or certified quantities — calculations remain indicative until validator review.',
    source: 'calculationAgent',
    label: 'Validator Review Needed',
  });

  return { findings };
}
