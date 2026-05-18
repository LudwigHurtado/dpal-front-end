import type { AgentContext, AgentFindingDraft, AgentRunResult } from '../types';

export async function evidenceAgent(ctx: AgentContext): Promise<AgentRunResult> {
  const findings: AgentFindingDraft[] = [];
  const config = ctx.bundle.config;
  const count = ctx.bundle.evidencePacketCount;

  const prevCount = ctx.previousEvidencePacketCount;
  const evidenceIncreased = prevCount === null ? count > 0 : count > prevCount;

  if (count > 0) {
    if (evidenceIncreased) ctx.state.newEvidenceDetected = true;
    findings.push({
      severity: 'INFO',
      category: 'EVIDENCE',
      title: 'Environmental evidence packets linked',
      message: `${count} evidence packet(s) are associated with this project in the environmental intelligence store.`,
      source: 'evidenceAgent',
      label: 'System Checked',
    });
  } else {
    ctx.state.requiredEvidenceMissing = true;
    findings.push({
      severity: 'WARNING',
      category: 'EVIDENCE',
      title: 'No linked evidence packets',
      message:
        'Required evidence is missing at the project level — no environmental evidence packets are linked to this project id.',
      action: 'Build or import an evidence packet from Environmental Intelligence or workflow evidence steps.',
      source: 'evidenceAgent',
      label: 'User Review Needed',
    });
  }

  const methodology = (config?.methodology ?? {}) as Record<string, unknown> | undefined;
  const requiredSources = String(methodology?.requiredEvidenceSources ?? '').trim();
  if (config && !requiredSources) {
    ctx.state.requiredEvidenceMissing = true;
    findings.push({
      severity: 'WARNING',
      category: 'EVIDENCE',
      title: 'Required evidence sources not documented',
      message: 'Methodology required evidence sources field is empty in the project snapshot.',
      action: 'Document required evidence sources in Project Configuration.',
      source: 'evidenceAgent',
      label: 'User Review Needed',
    });
  }

  const reportJson = ctx.bundle.dmrvReport?.reportJson as Record<string, unknown> | undefined;
  const packets = reportJson?.evidencePackets;
  const reportPacketCount = Array.isArray(packets) ? packets.length : 0;
  if (reportPacketCount > 0) {
    ctx.state.newEvidenceDetected = true;
    findings.push({
      severity: 'INFO',
      category: 'EVIDENCE',
      title: 'Living report evidence summaries',
      message: `${reportPacketCount} evidence packet summary(ies) appear in the dMRV living report.`,
      source: 'evidenceAgent',
      label: 'System Checked',
    });
  }

  return { findings };
}
