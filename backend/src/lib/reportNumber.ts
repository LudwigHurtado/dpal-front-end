import { prisma } from './prisma';

/** Atomically increment and return the next HC-YYYY-NNNNNN report number. */
export async function nextReportNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const counter = await prisma.reportCounter.upsert({
    where:  { id: 1 },
    create: { id: 1, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  return `HC-${year}-${String(counter.lastNumber).padStart(6, '0')}`;
}
