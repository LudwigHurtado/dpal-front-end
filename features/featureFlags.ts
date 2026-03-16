export interface FeatureFlags {
  reputationEnabled: boolean;
  auditTrailEnabled: boolean;
  blockchainAnchorEnabled: boolean;
  governanceEnabled: boolean;
}

export const featureFlags: FeatureFlags = {
  reputationEnabled: (import.meta.env.VITE_FEATURE_REPUTATION || 'true') === 'true',
  auditTrailEnabled: (import.meta.env.VITE_FEATURE_AUDIT_TRAIL || 'true') === 'true',
  blockchainAnchorEnabled: (import.meta.env.VITE_FEATURE_BLOCKCHAIN_ANCHOR || 'true') === 'true',
  governanceEnabled: (import.meta.env.VITE_FEATURE_GOVERNANCE || 'true') === 'true',
};
