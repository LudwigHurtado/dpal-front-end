// src/field-os/super-agent/runtime/claimSafetyGuard.ts

export const claimSafetyGuard = {
  labelClaims<T extends Record<string, boolean>>(claims: T): T {
    return {
      ...claims,
      pending_verification: claims.pending_verification ?? true,
      human_verified: claims.human_verified ?? false,
      blockchain_anchored: claims.blockchain_anchored ?? false,
    };
  },
};
