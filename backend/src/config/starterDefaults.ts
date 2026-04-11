/**
 * Default balances and profile bootstrap for new DPAL accounts.
 * Tune via environment variables without code changes (optional overrides).
 */
function intEnv(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const starterDefaults = {
  starterCredits: intEnv('DPAL_STARTER_CREDITS', 1000),
  starterCoins: intEnv('DPAL_STARTER_COINS', 500),
  heroCredits: intEnv('DPAL_STARTER_HERO_CREDITS', 2745),
  dpalCoins: intEnv('DPAL_STARTER_DPAL_COINS', 100),
  reputationScore: intEnv('DPAL_STARTER_REPUTATION', 10),
  trustScore: intEnv('DPAL_STARTER_TRUST', 50),
} as const;

/** Initial profileMetadata.badges for new users (extend as product grows). */
export function defaultProfileMetadata() {
  return {
    version: 1,
    onboardingComplete: false,
    badges: [{ id: 'citizen', label: 'DPAL Citizen', grantedAt: new Date().toISOString() }],
    missionParticipation: { joinedCount: 0, ledCount: 0 },
    collections: { missions: [], reports: [], activity: [] },
  };
}
