import type { TrustProfile, UserProfile } from '../../types/user';
import type { Role } from '../../types/role';

function asRole(v: unknown): Role {
  const r = String(v || '').trim();
  if (r === 'driver' || r === 'passenger' || r === 'worker') return r;
  return 'passenger';
}

function readTrust(o: Record<string, unknown>): TrustProfile {
  const t = (o.trust ?? {}) as Record<string, unknown>;
  const trustScore = typeof t.trustScore === 'number' ? t.trustScore : 0;
  const vu = t.verifiedUser === 'verified' || t.verifiedUser === 'pending' || t.verifiedUser === 'unverified' ? t.verifiedUser : 'pending';
  const vd = t.verifiedDriver === 'verified' || t.verifiedDriver === 'pending' || t.verifiedDriver === 'unverified' ? t.verifiedDriver : undefined;
  const vv = t.verifiedVehicle === 'verified' || t.verifiedVehicle === 'pending' || t.verifiedVehicle === 'unverified' ? t.verifiedVehicle : undefined;
  return { trustScore, verifiedUser: vu, verifiedDriver: vd, verifiedVehicle: vv };
}

/** Maps API user JSON to `UserProfile` and strips secrets. */
export function mapGoodWheelsApiUser(raw: unknown): UserProfile {
  const o = (raw ?? {}) as Record<string, unknown>;
  const role = asRole(o.role);
  const id = typeof o.id === 'string' ? o.id : 'user-unknown';
  const fullName = typeof o.fullName === 'string' ? o.fullName : 'User';
  const phoneMasked = typeof o.phoneMasked === 'string' ? o.phoneMasked : '(•••) •••-0000';
  const trust = readTrust(o);

  if (role === 'driver') {
    return {
      id,
      role: 'driver',
      fullName,
      phoneMasked,
      trust,
      vehicleId: typeof o.vehicleId === 'string' ? o.vehicleId : 'veh-unknown',
      isOnline: o.isOnline === true,
      earningsCents: typeof o.earningsCents === 'number' ? o.earningsCents : 0,
    };
  }
  if (role === 'worker') {
    return {
      id,
      role: 'worker',
      fullName,
      phoneMasked,
      trust,
      organization: typeof o.organization === 'string' ? o.organization : undefined,
      queueIds: Array.isArray(o.queueIds) ? (o.queueIds as string[]).filter((x) => typeof x === 'string') : [],
    };
  }
  return {
    id,
    role: 'passenger',
    fullName,
    phoneMasked,
    trust,
    savedPlaceIds: Array.isArray(o.savedPlaceIds) ? (o.savedPlaceIds as string[]).filter((x) => typeof x === 'string') : [],
    assistancePreferences: Array.isArray(o.assistancePreferences)
      ? (o.assistancePreferences as string[]).filter((x) => typeof x === 'string')
      : [],
    familySafeMode: o.familySafeMode === true,
  };
}
