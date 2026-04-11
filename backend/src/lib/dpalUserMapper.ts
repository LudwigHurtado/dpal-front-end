import type { DpalUser } from '@prisma/client';

/** Public-safe user shape aligned with front-end `AuthUser`. */
export function toPublicUser(u: DpalUser) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    fullName: u.displayName,
    phone: u.phone ?? undefined,
    location: u.location ?? undefined,
    role: u.role,
    status: u.accountStatus,
    profilePhotoUrl: u.profileImageUrl ?? undefined,
    emailVerified: u.emailVerified,
    profileCompleted: u.profileCompleted,
    preferences: (u.profileMetadata as Record<string, unknown> | null) ?? undefined,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    isOnline: u.isOnline,
    onlineStatus: u.onlineStatus,
    presenceUpdatedAt: u.presenceUpdatedAt?.toISOString() ?? null,
    starterCredits: u.starterCredits,
    starterCoins: u.starterCoins,
    heroCredits: u.heroCredits,
    dpalCoins: u.dpalCoins,
    reputationScore: u.reputationScore,
    trustScore: u.trustScore,
  };
}
