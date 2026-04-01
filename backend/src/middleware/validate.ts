import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/** Middleware factory: validates req.body against a Zod schema. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: (result.error as ZodError).flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Middleware factory: validates req.query against a Zod schema. */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: (result.error as ZodError).flatten().fieldErrors,
      });
      return;
    }
    (req as any).validQuery = result.data;
    next();
  };
}
