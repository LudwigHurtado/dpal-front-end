import React from 'react';
import type { ClaimType, ClaimStatus } from '../../../types/claim';
import { CLAIM_TYPE_ICONS, CLAIM_TYPE_LABELS, CLAIM_STATUS_LABELS } from '../../../types/claim';

const STATUS_CLS: Record<ClaimStatus, string> = {
  draft:        'im-badge-zinc',
  submitted:    'im-badge-blue',
  under_review: 'im-badge-amber',
  approved:     'im-badge-green',
  rejected:     'im-badge-red',
};

interface Props {
  type: ClaimType;
  status: ClaimStatus;
}

const ClaimTypeTag: React.FC<Props> = ({ type, status }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span className="im-badge im-badge-teal">
      {CLAIM_TYPE_ICONS[type]} {CLAIM_TYPE_LABELS[type]}
    </span>
    <span className={`im-badge ${STATUS_CLS[status]}`}>{CLAIM_STATUS_LABELS[status]}</span>
  </div>
);

export default ClaimTypeTag;
