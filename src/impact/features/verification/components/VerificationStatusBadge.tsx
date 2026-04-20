import React from 'react';
import type { VerificationStatus } from '../../../types/verification';
import { VERIFICATION_STATUS_LABELS } from '../../../types/verification';

const STATUS_CLS: Record<VerificationStatus, string> = {
  submitted:      'im-badge-zinc',
  needs_evidence: 'im-badge-amber',
  under_review:   'im-badge-blue',
  verified:       'im-badge-green',
  flagged:        'im-badge-orange',
  rejected:       'im-badge-red',
};

const VerificationStatusBadge: React.FC<{ status: VerificationStatus }> = ({ status }) => (
  <span className={`im-badge ${STATUS_CLS[status]}`}>
    {VERIFICATION_STATUS_LABELS[status]}
  </span>
);

export default VerificationStatusBadge;
