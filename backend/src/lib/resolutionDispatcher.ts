import { PrismaClient, ResolutionEventType, ResolutionRouteStatus } from '@prisma/client';
import { broadcastResolutionEvent } from './resolutionRealtime';

const BACKOFF_MINUTES = [1, 5, 15, 60, 240];

async function dispatchRoute(route: {
  id: string;
  destination: string;
  channel: string;
  target: string | null;
  attemptCount: number;
  maxAttempts: number;
  caseRefId: string;
}) {
  // Channel adapters can be expanded (email/SMS/API). For now, API calls attempt a POST if target is URL.
  if (route.channel.toLowerCase() === 'api' && route.target?.startsWith('http')) {
    const response = await fetch(route.target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'dpal-resolution-dispatcher',
        destination: route.destination,
        routeId: route.id,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }
}

export function startResolutionDispatcher(prisma: PrismaClient): void {
  const intervalMs = Math.max(5_000, parseInt(process.env.RESOLUTION_DISPATCH_INTERVAL_MS ?? '15000', 10));

  setInterval(async () => {
    try {
      const due = await prisma.resolutionRoute.findMany({
        where: {
          status: { in: [ResolutionRouteStatus.pending, ResolutionRouteStatus.failed] },
          nextAttemptAt: { lte: new Date() },
        },
        orderBy: { nextAttemptAt: 'asc' },
        take: 20,
      });

      for (const route of due) {
        await prisma.resolutionRoute.update({
          where: { id: route.id },
          data: { status: ResolutionRouteStatus.processing, attemptCount: { increment: 1 } },
        });

        try {
          await dispatchRoute(route);
          const deliveredAt = new Date();
          await prisma.$transaction([
            prisma.resolutionRoute.update({
              where: { id: route.id },
              data: { status: ResolutionRouteStatus.delivered, deliveredAt, lastError: null },
            }),
            prisma.resolutionEvent.create({
              data: {
                caseRefId: route.caseRefId,
                eventType: ResolutionEventType.route_dispatch_delivered,
                actor: 'resolution-dispatcher',
                note: `Delivered route ${route.destination}`,
                payload: { routeId: route.id, deliveredAt },
              },
            }),
          ]);
          broadcastResolutionEvent({
            type: 'route.delivered',
            caseRefId: route.caseRefId,
            routeId: route.id,
            deliveredAt: deliveredAt.toISOString(),
          });
        } catch (error: any) {
          const attempt = route.attemptCount + 1;
          const exhausted = attempt >= route.maxAttempts;
          const backoffMin = BACKOFF_MINUTES[Math.min(attempt - 1, BACKOFF_MINUTES.length - 1)];
          const nextAttemptAt = new Date(Date.now() + backoffMin * 60_000);
          await prisma.$transaction([
            prisma.resolutionRoute.update({
              where: { id: route.id },
              data: {
                status: exhausted ? ResolutionRouteStatus.failed : ResolutionRouteStatus.pending,
                lastError: error?.message ?? 'Dispatch failed',
                nextAttemptAt,
              },
            }),
            prisma.resolutionEvent.create({
              data: {
                caseRefId: route.caseRefId,
                eventType: ResolutionEventType.route_dispatch_failed,
                actor: 'resolution-dispatcher',
                note: exhausted ? 'Dispatch exhausted retries' : 'Dispatch failed, retry scheduled',
                payload: {
                  routeId: route.id,
                  error: error?.message ?? 'Dispatch failed',
                  attempt,
                  exhausted,
                  nextAttemptAt,
                },
              },
            }),
          ]);
          broadcastResolutionEvent({
            type: 'route.failed',
            caseRefId: route.caseRefId,
            routeId: route.id,
            exhausted,
            nextAttemptAt: nextAttemptAt.toISOString(),
          });
        }
      }
    } catch (error: any) {
      console.error('[resolution-dispatcher]', error?.message ?? error);
    }
  }, intervalMs);
}
