import { prisma } from './prisma';

interface NewReport {
  category: string;
  title: string;
  description: string;
  userId?: string | null;
}

/**
 * Simple duplicate detection:
 * 1. Same userId + same category + similar title within 24 hours → flag duplicate
 * 2. Very similar title across all reports in last 6 hours (keyword match)
 */
export async function detectDuplicate(
  report: NewReport,
): Promise<{ isDuplicate: boolean; duplicateOfId: string | null }> {
  const oneDayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sixHrsAgo  = new Date(Date.now() - 6  * 60 * 60 * 1000);

  // 1. Same user, same category, same title in last 24h
  if (report.userId) {
    const userDup = await prisma.helpReport.findFirst({
      where: {
        userId:   report.userId,
        category: report.category,
        title:    { equals: report.title, mode: 'insensitive' },
        createdAt: { gte: oneDayAgo },
        isDuplicate: false,
      },
      select: { id: true },
    });
    if (userDup) return { isDuplicate: true, duplicateOfId: userDup.id };
  }

  // 2. Exact title match by anyone in last 6 hours
  const titleDup = await prisma.helpReport.findFirst({
    where: {
      title:    { equals: report.title, mode: 'insensitive' },
      category: report.category,
      createdAt: { gte: sixHrsAgo },
      isDuplicate: false,
    },
    select: { id: true },
  });
  if (titleDup) return { isDuplicate: true, duplicateOfId: titleDup.id };

  return { isDuplicate: false, duplicateOfId: null };
}
