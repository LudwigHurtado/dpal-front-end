import 'dotenv/config';
import { prisma } from '../../lib/prisma';
import { runMrvSuperAgentMission } from './superAgentMissionController';

const DEFAULT_CRON_HINT = 'Daily at 12:00 UTC (08:00 Bolivia / America-La_Paz) — Railway cron uses UTC';

async function main(): Promise<void> {
  console.log('[mrv-agent-cron] Starting scheduled MRV Super Agent run…');
  const started = Date.now();

  if (!process.env.DATABASE_URL?.trim()) {
    console.error('[mrv-agent-cron] FATAL: DATABASE_URL is not set');
    process.exit(1);
  }

  let schedules;
  try {
    schedules = await prisma.mrvAgentSchedule.findMany({
      where: { enabled: true },
      orderBy: { projectId: 'asc' },
    });
  } catch (err) {
    console.error('[mrv-agent-cron] FATAL: Could not load schedules', err);
    process.exit(1);
  }

  console.log(`[mrv-agent-cron] ${schedules.length} enabled schedule(s)`);

  let ok = 0;
  let failed = 0;

  for (const schedule of schedules) {
    const label = `${schedule.projectId} (${schedule.name})`;
    try {
      console.log(`[mrv-agent-cron] Running mission for ${label}`);
      const result = await runMrvSuperAgentMission({
        projectId: schedule.projectId,
        scheduleId: schedule.id,
        missionType: 'SCHEDULED',
      });
      await prisma.mrvAgentSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          nextRunHint: schedule.nextRunHint ?? DEFAULT_CRON_HINT,
        },
      });
      console.log(
        `[mrv-agent-cron] ${label} → ${result.status} (runId=${result.runId}, findings=${result.findings.length})`,
      );
      ok += 1;
    } catch (err) {
      failed += 1;
      console.error(`[mrv-agent-cron] ${label} FAILED:`, (err as Error).message);
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[mrv-agent-cron] Done in ${elapsed}s — success=${ok} failed=${failed}`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[mrv-agent-cron] FATAL:', err);
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
