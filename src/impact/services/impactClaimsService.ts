import type { ImpactClaim, ClaimStatus } from '../types/claim';
import { MOCK_CLAIMS } from '../data/mock/mockClaims';

function delay(ms = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function listClaims(projectId?: string): Promise<ImpactClaim[]> {
  await delay();
  return projectId ? MOCK_CLAIMS.filter((c) => c.projectId === projectId) : [...MOCK_CLAIMS];
}

export async function createClaim(
  data: Omit<ImpactClaim, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ImpactClaim> {
  await delay(500);
  const claim: ImpactClaim = {
    ...data,
    id: `clm-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  MOCK_CLAIMS.unshift(claim);
  return claim;
}

export async function updateClaimStatus(id: string, status: ClaimStatus): Promise<void> {
  await delay(300);
  const c = MOCK_CLAIMS.find((x) => x.id === id);
  if (c) {
    c.status = status;
    c.updatedAt = new Date().toISOString();
  }
}
