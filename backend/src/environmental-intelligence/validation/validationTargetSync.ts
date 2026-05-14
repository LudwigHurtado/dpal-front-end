import { recalculateAndPersistProfileRisk } from '../accountabilityProfiles/accountabilityProfileRoutes';
import { getAccountabilityProfileStore } from '../accountabilityProfiles/accountabilityProfileStore';
import type {
  AccountabilityProfileValidationStatus,
  DpalAccountabilityProfile,
} from '../accountabilityProfiles/accountabilityProfileTypes';
import { getEvidencePacketStore } from '../evidencePackets/evidencePacketStore';
import type { DpalEvidencePacket, EvidencePacketValidationStatus } from '../evidencePackets/evidencePacketTypes';
import type { DpalValidationRequest, EnvironmentalValidationResult } from './validationTypes';

const PROFILE_REVIEW_NOTE =
  'A reviewer-validated evidence packet is associated with this accountability profile (human review workflow; not legal or regulatory verification).';

function nextPacketState(
  cur: DpalEvidencePacket,
  result: EnvironmentalValidationResult,
): Pick<DpalEvidencePacket, 'validationStatus' | 'safetyLabels'> | null {
  const chain = cur.safetyLabels.blockchain_anchored === true;
  if (result === 'validated') {
    return {
      validationStatus: 'human_verified' satisfies EvidencePacketValidationStatus,
      safetyLabels: {
        pending_verification: false,
        human_verified: true,
        blockchain_anchored: chain,
      },
    };
  }
  if (result === 'rejected') {
    return {
      validationStatus: 'rejected' satisfies EvidencePacketValidationStatus,
      safetyLabels: {
        pending_verification: false,
        human_verified: false,
        blockchain_anchored: chain,
      },
    };
  }
  if (result === 'inconclusive') {
    return {
      validationStatus: 'under_review' satisfies EvidencePacketValidationStatus,
      safetyLabels: {
        pending_verification: true,
        human_verified: false,
        blockchain_anchored: chain,
      },
    };
  }
  if (result === 'superseded') {
    return {
      validationStatus: 'superseded' satisfies EvidencePacketValidationStatus,
      safetyLabels: {
        pending_verification: false,
        human_verified: false,
        blockchain_anchored: chain,
      },
    };
  }
  return null;
}

function nextProfileState(
  cur: DpalAccountabilityProfile,
  result: EnvironmentalValidationResult,
): Pick<DpalAccountabilityProfile, 'validationStatus' | 'safetyLabels' | 'limitations'> | null {
  const chain = cur.safetyLabels.blockchain_anchored === true;
  if (result === 'validated') {
    const lim = cur.limitations.includes(PROFILE_REVIEW_NOTE) ? cur.limitations : [...cur.limitations, PROFILE_REVIEW_NOTE];
    return {
      validationStatus: 'human_verified' satisfies AccountabilityProfileValidationStatus,
      safetyLabels: {
        pending_verification: false,
        human_verified: true,
        blockchain_anchored: chain,
      },
      limitations: lim,
    };
  }
  if (result === 'rejected') {
    return {
      validationStatus: 'rejected' satisfies AccountabilityProfileValidationStatus,
      safetyLabels: {
        pending_verification: false,
        human_verified: false,
        blockchain_anchored: chain,
      },
      limitations: cur.limitations,
    };
  }
  if (result === 'inconclusive') {
    return {
      validationStatus: 'under_review' satisfies AccountabilityProfileValidationStatus,
      safetyLabels: {
        pending_verification: true,
        human_verified: false,
        blockchain_anchored: chain,
      },
      limitations: cur.limitations,
    };
  }
  if (result === 'superseded') {
    return {
      validationStatus: 'superseded' satisfies AccountabilityProfileValidationStatus,
      safetyLabels: {
        pending_verification: false,
        human_verified: false,
        blockchain_anchored: chain,
      },
      limitations: cur.limitations,
    };
  }
  return null;
}

/** Apply completed validation outcomes to linked evidence packet and/or accountability profile. */
export async function syncLinkedTargetsAfterValidationComplete(req: DpalValidationRequest): Promise<void> {
  if (req.status !== 'completed' || !req.validationResult || req.validationResult === 'pending') return;

  const result = req.validationResult;
  const es = getEvidencePacketStore();
  const ps = getAccountabilityProfileStore();

  if (req.packetId) {
    const cur = await es.get(req.packetId);
    if (cur) {
      const patch = nextPacketState(cur, result);
      if (patch) await es.update(req.packetId, patch);
    }
  }

  if (req.profileId) {
    const cur = await ps.get(req.profileId);
    if (cur) {
      const patch = nextProfileState(cur, result);
      if (patch) {
        await ps.update(req.profileId, patch);
        await recalculateAndPersistProfileRisk(req.profileId);
      }
    }
  }
}
