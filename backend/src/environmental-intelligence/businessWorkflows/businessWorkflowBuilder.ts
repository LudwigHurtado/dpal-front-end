import { randomBytes } from 'crypto';
import type { BusinessWorkflowInput } from './businessWorkflowTypes';
import type { BusinessWorkflowTemplate } from './businessWorkflowRegistry';

export function newWorkflowRunId(): string {
  return `bwf_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`;
}

export function resolveBusinessWorkflowInput(template: BusinessWorkflowTemplate, input: BusinessWorkflowInput): BusinessWorkflowInput {
  const useCaseId = (input.useCaseId?.trim() || template.defaultUseCaseId).trim();
  const profileType = (typeof input.profileType === 'string' && input.profileType.trim()
    ? input.profileType.trim()
    : template.defaultProfileType) as BusinessWorkflowInput['profileType'];
  const validationRequestType =
    (typeof input.validationRequestType === 'string' && input.validationRequestType.trim()
      ? input.validationRequestType.trim()
      : template.defaultValidationRequestType) as BusinessWorkflowInput['validationRequestType'];
  return {
    ...input,
    workflowId: template.workflowId,
    useCaseId,
    profileType,
    validationRequestType,
  };
}
