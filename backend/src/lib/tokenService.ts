import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET ?? process.env.DPAL_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error('JWT_SECRET (or DPAL_JWT_SECRET) must be set to a strong value (16+ chars)');
  }
  return s;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: 'access' }, getJwtSecret(), { expiresIn: ACCESS_TTL_SEC });
}

export function verifyAccessToken(token: string): { sub: string } {
  const payload = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & { sub: string; typ?: string };
  if (payload.typ !== 'access' || !payload.sub) throw new Error('Invalid access token');
  return { sub: payload.sub };
}

export function createRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = crypto.randomBytes(48).toString('base64url');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  return { raw, hash, expiresAt };
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
