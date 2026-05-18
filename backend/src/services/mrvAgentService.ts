import { prisma } from '../lib/prisma';
import { runMrvSuperAgentMission } from '../agents/mrv/superAgentMissionController';
import type { MrvMissionType, Prisma } from '@prisma/client';

const DEFAULT_SCHEDULE_NAME = 'Daily Super Agent';
const DEFAULT_CRON = '0 12 * * *';
const DEFAULT_TIMEZONE = 'America/La_Paz';
const DEFAULT_NEXT_HINT =
  'Daily at 12:00 UTC (08:00 Bolivia) — configure Railway cron: 0 12 * * *';

export async function ensureMrvAgentSchedule(projectId: string) {
  const existing = await prisma.mrvAgentSchedule.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;
  return prisma.mrvAgentSchedule.create({
    data: {
      projectId,
      name: DEFAULT_SCHEDULE_NAME,
      cronExpression: DEFAULT_CRON,
      timezone: DEFAULT_TIMEZONE,
      enabled: true,
      missionType: 'SCHEDULED',
      nextRunHint: DEFAULT_NEXT_HINT,
    },
  });
}

export async function syncMrvProjectConfig(
  projectId: string,
  configJson: Record<string, unknown>,
  ownerUserId?: string,
) {
  const json = configJson as Prisma.InputJsonValue;
  return prisma.mrvProjectConfig.upsert({
    where: { projectId },
    create: { projectId, configJson: json, ownerUserId: ownerUserId ?? null },
    update: { configJson: json, ownerUserId: ownerUserId ?? null },
  });
}

export async function runMrvAgentNow(projectId: string, missionType: MrvMissionType = 'MANUAL_RUN') {
  await syncMrvProjectConfig(projectId, { projectId, syncedAt: new Date().toISOString() }).catch(
    () => undefined,
  );
  return runMrvSuperAgentMission({ projectId, missionType });
}

export async function getLatestAgentReport(projectId: string) {
  const [report, lastRun] = await Promise.all([
    prisma.dmrvReport.findFirst({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.mrvAgentRun.findFirst({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
      include: {
        agentFindings: { orderBy: { createdAt: 'asc' }, take: 50 },
      },
    }),
  ]);

  return {
    report,
    lastRun,
    readinessScore: report?.readinessScore ?? lastRun?.summary ?? null,
  };
}

export async function listAgentRuns(projectId: string, limit = 20) {
  return prisma.mrvAgentRun.findMany({
    where: { projectId },
    orderBy: { startedAt: 'desc' },
    take: Math.min(limit, 50),
    include: {
      agentFindings: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function listProjectNotifications(projectId: string, limit = 30) {
  return prisma.mrvNotification.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  });
}

export { runMrvSuperAgentMission };
