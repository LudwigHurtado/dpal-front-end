import { buildValidationRequest } from './validationBuilder';
import { applyValidationStatusTransition, type ValidationWorkflowAction } from './validationStatusMachine';
import { syncLinkedTargetsAfterValidationComplete } from './validationTargetSync';
import { getValidationRequestStore, mergeSafePatch } from './validationStore';
import type {
  CreateValidationRequestInput,
  DpalValidationRequest,
  UpdateValidationRequestPatch,
  EnvironmentalValidationResult,
} from './validationTypes';

export type ServiceError = { ok: false; error: string; status?: number };
export type ServiceOk<T> = { ok: true; request: T };

export async function createValidationRequestService(
  input: CreateValidationRequestInput,
): Promise<ServiceOk<DpalValidationRequest> | ServiceError> {
  try {
    const req = buildValidationRequest(input);
    const saved = await getValidationRequestStore().save(req);
    return { ok: true, request: saved };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Create failed';
    return { ok: false, error: msg, status: 400 };
  }
}

export async function assignValidationRequestService(
  validationId: string,
  body: { assignedTo?: string; reviewerName?: string; reviewerRole?: string },
): Promise<ServiceOk<DpalValidationRequest> | ServiceError> {
  const store = getValidationRequestStore();
  const cur = await store.get(validationId);
  if (!cur) return { ok: false, error: 'Validation request not found', status: 404 };
  const r = applyValidationStatusTransition(cur, {
    kind: 'assign',
    assignedTo: body.assignedTo,
    reviewerName: body.reviewerName,
    reviewerRole: body.reviewerRole,
  });
  if (!r.ok) return { ok: false, error: r.error, status: 400 };
  const saved = await store.save(r.request);
  return { ok: true, request: saved };
}

export async function startValidationRequestService(
  validationId: string,
): Promise<ServiceOk<DpalValidationRequest> | ServiceError> {
  const store = getValidationRequestStore();
  const cur = await store.get(validationId);
  if (!cur) return { ok: false, error: 'Validation request not found', status: 404 };
  const r = applyValidationStatusTransition(cur, { kind: 'start_review' });
  if (!r.ok) return { ok: false, error: r.error, status: 400 };
  const saved = await store.save(r.request);
  return { ok: true, request: saved };
}

function toCompleteAction(
  result: EnvironmentalValidationResult,
  reviewNotes?: string,
): ValidationWorkflowAction | null {
  if (result === 'validated') return { kind: 'complete_validated', reviewNotes };
  if (result === 'rejected') return { kind: 'complete_rejected', reviewNotes };
  if (result === 'inconclusive') return { kind: 'complete_inconclusive', reviewNotes };
  if (result === 'superseded') return { kind: 'complete_superseded', reviewNotes };
  return null;
}

export async function completeValidationRequestService(
  validationId: string,
  body: { validationResult: EnvironmentalValidationResult; reviewNotes?: string },
): Promise<ServiceOk<DpalValidationRequest> | ServiceError> {
  const store = getValidationRequestStore();
  const cur = await store.get(validationId);
  if (!cur) return { ok: false, error: 'Validation request not found', status: 404 };
  const action = toCompleteAction(body.validationResult, body.reviewNotes);
  if (!action) {
    return { ok: false, error: 'Invalid validationResult for completion.', status: 400 };
  }
  const r = applyValidationStatusTransition(cur, action);
  if (!r.ok) return { ok: false, error: r.error, status: 400 };
  const saved = await store.save(r.request);
  if (saved.status === 'completed' && saved.validationResult && saved.validationResult !== 'pending') {
    await syncLinkedTargetsAfterValidationComplete(saved);
  }
  return { ok: true, request: saved };
}

export async function cancelValidationRequestService(
  validationId: string,
  body?: { reviewNotes?: string },
): Promise<ServiceOk<DpalValidationRequest> | ServiceError> {
  const store = getValidationRequestStore();
  const cur = await store.get(validationId);
  if (!cur) return { ok: false, error: 'Validation request not found', status: 404 };
  const r = applyValidationStatusTransition(cur, { kind: 'cancel', reviewNotes: body?.reviewNotes });
  if (!r.ok) return { ok: false, error: r.error, status: 400 };
  const saved = await store.save(r.request);
  return { ok: true, request: saved };
}

export async function patchValidationRequestService(
  validationId: string,
  patch: UpdateValidationRequestPatch,
): Promise<ServiceOk<DpalValidationRequest> | ServiceError> {
  const store = getValidationRequestStore();
  const cur = await store.get(validationId);
  if (!cur) return { ok: false, error: 'Validation request not found', status: 404 };
  const safe = mergeSafePatch(cur, patch);
  const saved = await store.update(validationId, safe);
  if (!saved) return { ok: false, error: 'Update failed', status: 500 };
  return { ok: true, request: saved };
}
