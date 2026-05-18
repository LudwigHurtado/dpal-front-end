import { prisma } from '../../lib/prisma';
import type { MrvProjectBundle } from './types';

export async function loadMrvProjectBundle(projectId: string): Promise<MrvProjectBundle> {
  const [configRow, dmrvReport, evidenceCount, emissionsCount] = await Promise.all([
    prisma.mrvProjectConfig.findUnique({ where: { projectId } }),
    prisma.dmrvReport.findFirst({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      select: {
        reportId: true,
        readinessScore: true,
        status: true,
        reportJson: true,
      },
    }),
    prisma.environmentalEvidencePacket.count({
      where: { projectId },
    }),
    prisma.emissionsAudit.count({
      where: { linkedMRVProjectId: projectId, deletedAt: null },
    }),
  ]);

  return {
    projectId,
    config: configRow?.configJson ? (configRow.configJson as Record<string, unknown>) : null,
    dmrvReport: dmrvReport
      ? {
          reportId: dmrvReport.reportId,
          readinessScore: dmrvReport.readinessScore,
          status: dmrvReport.status,
          reportJson: dmrvReport.reportJson,
        }
      : null,
    evidencePacketCount: evidenceCount,
    emissionsAuditLinked: emissionsCount > 0,
  };
}
