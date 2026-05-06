// src/field-os/super-agent/runtime/humanApprovalGate.ts

export interface ApprovalCheckpoint {
  name: string;
  description: string;
  requiredFor: string;
  requiresExplicitApproval: boolean;
}

export const APPROVAL_GATES: Record<string, ApprovalCheckpoint> = {
  final_report_publication: {
    name: 'Final Report Publication',
    description: 'Approval required before publishing the investigation report.',
    requiredFor: 'report publication',
    requiresExplicitApproval: true,
  },
  public_qr_publication: {
    name: 'Public QR Publication',
    description: 'Approval required before generating and publishing a public QR code for this case.',
    requiredFor: 'qr code publication',
    requiresExplicitApproval: true,
  },
  blockchain_anchoring: {
    name: 'Blockchain Anchoring',
    description: 'Approval required before anchoring case evidence to the blockchain.',
    requiredFor: 'blockchain anchor',
    requiresExplicitApproval: true,
  },
  validator_submission: {
    name: 'Validator Submission',
    description: 'Approval required before submitting evidence to validators.',
    requiredFor: 'validator review',
    requiresExplicitApproval: true,
  },
  legal_packet_export: {
    name: 'Legal Packet Export',
    description: 'Approval required before exporting evidence as a legal packet.',
    requiredFor: 'legal export',
    requiresExplicitApproval: true,
  },
  viu_draft_issuance: {
    name: 'VIU Draft Issuance',
    description: 'Approval required before issuing a draft Verified Impact Unit for this case.',
    requiredFor: 'viu issuance',
    requiresExplicitApproval: true,
  },
};

export class HumanApprovalGate {
  private approvals: Map<string, { approved: boolean; reviewedBy?: string; timestamp?: Date; notes?: string }>;

  constructor(requiredGates: string[]) {
    this.approvals = new Map(requiredGates.map((gate) => [gate, { approved: false }]));
  }

  canProceed(gateName: string): boolean {
    const approval = this.approvals.get(gateName);
    return approval?.approved ?? false;
  }

  approve(gateName: string, reviewedBy: string, notes?: string): boolean {
    if (this.approvals.has(gateName)) {
      this.approvals.set(gateName, {
        approved: true,
        reviewedBy,
        timestamp: new Date(),
        notes,
      });
      return true;
    }
    return false;
  }

  getStatus(gateName: string): { required: boolean; approved: boolean; reviewedBy?: string; timestamp?: Date; notes?: string } | null {
    const approval = this.approvals.get(gateName);
    if (!approval) return null;
    return {
      required: true,
      ...approval,
    };
  }

  getAll(): Record<string, { required: boolean; approved: boolean; reviewedBy?: string; timestamp?: Date; notes?: string }> {
    const result: Record<string, any> = {};
    this.approvals.forEach((value, key) => {
      result[key] = { required: true, ...value };
    });
    return result;
  }
}
