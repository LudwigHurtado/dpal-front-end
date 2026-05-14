import type { EvidencePacketSafetyLabels } from './evidencePacketTypes';

export const DEFAULT_PACKET_SAFETY_LABELS: EvidencePacketSafetyLabels = {
  pending_verification: true,
  human_verified: false,
  blockchain_anchored: false,
};

/** Shipped with every packet integrity hash — not blockchain anchoring. */
export const INTEGRITY_HASH_LIMITATION =
  'Integrity hash records packet contents for tamper-evidence. This is not blockchain anchoring unless blockchain_anchored is true.';
