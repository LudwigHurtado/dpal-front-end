import type { Request, Response, NextFunction } from 'express';
import type { DpalUser } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/tokenService';

declare global {
  namespace Express {
    interface Request {
      dpalUser?: DpalUser | null;
    }
  }
}

/** Loads DPAL user from Bearer access JWT (optional — does not 401 if missing/invalid). */
export async function attachDpalJwtUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  req.dpalUser = null;
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return next();
  const token = auth.slice(7);
  if (!token) return next();
  try {
    const { sub } = verifyAccessToken(token);
    const user = await prisma.dpalUser.findUnique({ where: { id: sub } });
    req.dpalUser = user;
  } catch {
    req.dpalUser = null;
  }
  next();
}

/** Requires a valid access token and active (non-banned) user. */
export async function requireDpalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const u = req.dpalUser;
  if (!u) {
    res.status(401).json({ error: 'Unauthorized', message: 'Sign in required.' });
    return;
  }
  if (u.accountStatus === 'banned' || u.accountStatus === 'suspended') {
    res.status(403).json({ error: 'Forbidden', message: 'Account inactive.' });
    return;
  }
  next();
}
