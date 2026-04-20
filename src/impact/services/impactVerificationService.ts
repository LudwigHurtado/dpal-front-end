import type { VerificationReview, VerificationStatus } from '../types/verification';
import { MOCK_VERIFICATION } from '../data/mock/mockVerification';

function delay(ms = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function listReviews(status?: VerificationStatus): Promise<VerificationReview[]> {
  await delay();
  return status ? MOCK_VERIFICATION.filter((v) => v.status === status) : [...MOCK_VERIFICATION];
}

export async function updateReview(
  id: string,
  patch: Partial<Pick<VerificationReview, 'status' | 'notes' | 'requestedEvidenceTypes'>>
): Promise<void> {
  await delay(400);
  const r = MOCK_VERIFICATION.find((v) => v.id === id);
  if (r) {
    Object.assign(r, patch);
    r.updatedAt = new Date().toISOString();
  }
}
