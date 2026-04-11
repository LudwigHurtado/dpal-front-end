import type { Request, Response, NextFunction } from 'express';

/** ADMIN_SECRET bearer OR DPAL JWT with role `admin`. */
export function requireDpalAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SECRET;
  const auth = req.headers.authorization;
  if (secret && auth === `Bearer ${secret}`) {
    next();
    return;
  }
  const u = req.dpalUser;
  if (u?.role === 'admin' && u.accountStatus === 'active') {
    next();
    return;
  }
  res.status(403).json({ error: 'Forbidden', message: 'Admin access required.' });
}
