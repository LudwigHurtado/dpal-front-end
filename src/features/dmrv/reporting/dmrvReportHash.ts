import { utf8ToBase64 } from '../utils/utf8Base64';
import type { DmrvReport } from './dmrvReportTypes';

/** Canonical payload for integrity hashing (excludes audit trail and anchor metadata). */
export function canonicalReportForHash(report: DmrvReport): Record<string, unknown> {
  return {
    reportId: report.reportId,
    projectId: report.projectId,
    categoryId: report.categoryId,
    typeId: report.typeId,
    reportType: report.reportType,
    projectContext: report.projectContext,
    methodologyContext: report.methodologyContext,
    dataSourceContext: report.dataSourceContext,
    evidenceContext: report.evidenceContext,
    fieldPlotContext: report.fieldPlotContext,
    validationContext: report.validationContext,
    calculationContext: report.calculationContext,
    sections: report.sections,
    readinessScore: report.readinessScore,
  };
}

export async function computeDmrvReportJsonHash(report: DmrvReport): Promise<string> {
  const canonical = JSON.stringify(canonicalReportForHash(report));
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(canonical);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return `local-${utf8ToBase64(canonical).slice(0, 48)}`;
}

export function computeDmrvReportJsonHashSync(report: DmrvReport): string {
  const canonical = JSON.stringify(canonicalReportForHash(report));
  return `local-${utf8ToBase64(canonical).slice(0, 48)}`;
}
