import { ResolutionStatus } from '@prisma/client';

const ORDER: ResolutionStatus[] = [
  ResolutionStatus.filed,
  ResolutionStatus.verified,
  ResolutionStatus.escalated,
  ResolutionStatus.responded,
  ResolutionStatus.corrected,
  ResolutionStatus.resolved,
];

const TERMINAL = new Set<ResolutionStatus>([
  ResolutionStatus.resolved,
  ResolutionStatus.ignored,
  ResolutionStatus.failed_delivery,
  ResolutionStatus.disputed,
]);

export function canTransitionResolutionStatus(from: ResolutionStatus, to: ResolutionStatus): boolean {
  if (from === to) return true;
  if (TERMINAL.has(from)) return false;
  if (to === ResolutionStatus.ignored || to === ResolutionStatus.disputed || to === ResolutionStatus.failed_delivery) return true;

  const fromIndex = ORDER.indexOf(from);
  const toIndex = ORDER.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return false;
  return toIndex === fromIndex + 1;
}
