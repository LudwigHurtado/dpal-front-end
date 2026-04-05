import type { Request } from 'express';

/** Normalize Express `req.params.id` (typed as `string | string[]` in some TS setups). */
export function paramId(req: Request): string {
  const v = req.params['id'];
  if (Array.isArray(v)) return v[0] ?? '';
  return typeof v === 'string' ? v : '';
}
