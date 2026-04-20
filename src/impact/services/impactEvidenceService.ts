import type { ImpactEvidence } from '../types/evidence';
import { MOCK_EVIDENCE } from '../data/mock/mockEvidence';

function delay(ms = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function listEvidence(projectId?: string): Promise<ImpactEvidence[]> {
  await delay();
  return projectId ? MOCK_EVIDENCE.filter((e) => e.projectId === projectId) : [...MOCK_EVIDENCE];
}

export async function addEvidence(
  data: Omit<ImpactEvidence, 'id' | 'uploadedAt'>
): Promise<ImpactEvidence> {
  await delay(500);
  const ev: ImpactEvidence = {
    ...data,
    id: `ev-${Date.now()}`,
    uploadedAt: new Date().toISOString(),
  };
  MOCK_EVIDENCE.unshift(ev);
  return ev;
}
