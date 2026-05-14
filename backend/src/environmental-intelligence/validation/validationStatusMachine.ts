import { DEFAULT_VALIDATION_REQUEST_SAFETY } from './validationSafety';
import type {
  DpalValidationRequest,
  EnvironmentalValidationRequestStatus,
  EnvironmentalValidationResult,
} from './validationTypes';

export type ValidationWorkflowAction =
  | { kind: 'assign'; assignedTo?: string; reviewerName?: string; reviewerRole?: string }
  | { kind: 'start_review' }
  | { kind: 'complete_validated'; reviewNotes?: string }
  | { kind: 'complete_rejected'; reviewNotes?: string }
  | { kind: 'complete_inconclusive'; reviewNotes?: string }
  | { kind: 'complete_superseded'; reviewNotes?: string }
  | { kind: 'cancel'; reviewNotes?: string };

function stamp(req: DpalValidationRequest, patch: Partial<DpalValidationRequest>): DpalValidationRequest {
  return { ...req, ...patch, updatedAt: new Date().toISOString() };
}

function hasReviewerIdentity(req: DpalValidationRequest): boolean {
  return Boolean(req.reviewerName?.trim() || req.reviewerRole?.trim());
}

function canComplete(status: EnvironmentalValidationRequestStatus): boolean {
  return status === 'assigned' || status === 'in_progress';
}

export function applyValidationStatusTransition(
  request: DpalValidationRequest,
  action: ValidationWorkflowAction,
): { ok: true; request: DpalValidationRequest } | { ok: false; error: string } {
  const s = request.status;

  if (action.kind === 'assign') {
    if (s !== 'open' && s !== 'assigned') {
      return { ok: false, error: 'Assign is only allowed when the request is open or assigned.' };
    }
    const hasAssignee = Boolean(
      action.assignedTo?.trim() || action.reviewerName?.trim() || action.reviewerRole?.trim(),
    );
    if (!hasAssignee) {
      return { ok: false, error: 'Provide assignedTo and/or reviewerName and/or reviewerRole.' };
    }
    return {
      ok: true,
      request: stamp(request, {
        status: 'assigned',
        assignedTo: action.assignedTo?.trim() || request.assignedTo,
        reviewerName: action.reviewerName?.trim() || request.reviewerName,
        reviewerRole: action.reviewerRole?.trim() || request.reviewerRole,
      }),
    };
  }

  if (action.kind === 'start_review') {
    if (s !== 'assigned') {
      return { ok: false, error: 'Start review requires status assigned.' };
    }
    return { ok: true, request: stamp(request, { status: 'in_progress' }) };
  }

  if (action.kind === 'cancel') {
    if (s === 'completed' || s === 'cancelled') {
      return { ok: false, error: 'Cannot cancel a completed or cancelled request.' };
    }
    const notes = action.reviewNotes?.trim();
    return {
      ok: true,
      request: stamp(request, {
        status: 'cancelled',
        reviewNotes: notes ? `${request.reviewNotes ?? ''}\n[cancelled] ${notes}`.trim() : request.reviewNotes,
      }),
    };
  }

  if (
    action.kind === 'complete_validated' ||
    action.kind === 'complete_rejected' ||
    action.kind === 'complete_inconclusive' ||
    action.kind === 'complete_superseded'
  ) {
    if (!canComplete(s)) {
      return { ok: false, error: 'Complete requires status assigned or in_progress.' };
    }
    const completedAt = new Date().toISOString();
    const notes = action.reviewNotes?.trim();
    const mergedNotes = notes ? `${request.reviewNotes ?? ''}\n${notes}`.trim() : request.reviewNotes;

    if (action.kind === 'complete_validated') {
      if (!hasReviewerIdentity(request)) {
        return {
          ok: false,
          error: 'complete_validated requires reviewerName or reviewerRole on the request before completion.',
        };
      }
      const nextSafety = {
        ...request.safetyLabels,
        pending_verification: false,
        human_verified: true,
        blockchain_anchored: request.safetyLabels.blockchain_anchored === true,
      };
      return {
        ok: true,
        request: stamp(request, {
          status: 'completed',
          validationResult: 'validated' satisfies EnvironmentalValidationResult,
          completedAt,
          reviewNotes: mergedNotes,
          safetyLabels: nextSafety,
        }),
      };
    }

    if (action.kind === 'complete_rejected') {
      return {
        ok: true,
        request: stamp(request, {
          status: 'completed',
          validationResult: 'rejected',
          completedAt,
          reviewNotes: mergedNotes,
          safetyLabels: {
            ...DEFAULT_VALIDATION_REQUEST_SAFETY,
            pending_verification: false,
            human_verified: false,
            blockchain_anchored: request.safetyLabels.blockchain_anchored === true,
          },
        }),
      };
    }

    if (action.kind === 'complete_inconclusive') {
      return {
        ok: true,
        request: stamp(request, {
          status: 'completed',
          validationResult: 'inconclusive',
          completedAt,
          reviewNotes: mergedNotes,
          safetyLabels: {
            ...DEFAULT_VALIDATION_REQUEST_SAFETY,
            pending_verification: true,
            human_verified: false,
            blockchain_anchored: request.safetyLabels.blockchain_anchored === true,
          },
        }),
      };
    }

    return {
      ok: true,
      request: stamp(request, {
        status: 'completed',
        validationResult: 'superseded',
        completedAt,
        reviewNotes: mergedNotes,
        safetyLabels: {
          ...DEFAULT_VALIDATION_REQUEST_SAFETY,
          pending_verification: false,
          human_verified: false,
          blockchain_anchored: request.safetyLabels.blockchain_anchored === true,
        },
      }),
    };
  }

  return { ok: false, error: 'Unknown action.' };
}
