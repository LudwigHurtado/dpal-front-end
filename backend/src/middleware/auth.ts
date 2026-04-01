import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

/** Attach Supabase user to req if a valid Bearer JWT is present. */
export async function attachUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    (req as any).user = null;
    next();
    return;
  }
  const token = auth.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  (req as any).user = error ? null : user;
  next();
}

/** Guard: requires a valid authenticated user. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!(req as any).user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Guard: admin check.
 * Uses a simple ADMIN_SECRET bearer token for now; replace with
 * Supabase role check (app_metadata.role === 'admin') in production.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET;

  // Allow if correct admin secret
  if (adminSecret && auth === `Bearer ${adminSecret}`) {
    next();
    return;
  }

  // Or if authenticated Supabase user with admin role
  const user = (req as any).user as any;
  if (user?.app_metadata?.role === 'admin') {
    next();
    return;
  }

  res.status(403).json({ error: 'Admin access required' });
}
