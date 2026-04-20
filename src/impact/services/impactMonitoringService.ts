import type { MonitoringCheck } from '../types/monitoring';
import { MOCK_CHECKS } from '../data/mock/mockMonitoring';

function delay(ms = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function listChecks(projectId?: string): Promise<MonitoringCheck[]> {
  await delay();
  return projectId ? MOCK_CHECKS.filter((c) => c.projectId === projectId) : [...MOCK_CHECKS];
}

export async function completeCheck(id: string, findings: string, evidenceIds: string[]): Promise<void> {
  await delay(400);
  const check = MOCK_CHECKS.find((c) => c.id === id);
  if (check) {
    check.status = 'completed';
    check.completedDate = new Date().toISOString().split('T')[0];
    check.findings = findings;
    check.evidenceIds = evidenceIds;
  }
}
