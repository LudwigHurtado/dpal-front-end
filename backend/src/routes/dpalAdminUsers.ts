import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { toPublicUser } from '../lib/dpalUserMapper';
import { attachDpalJwtUser } from '../middleware/dpalJwt';
import { requireDpalAdmin } from '../middleware/requireDpalAdmin';

const router = Router();

router.use(attachDpalJwtUser);
router.use(requireDpalAdmin);

const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  search: z.string().max(200).optional(),
  status: z.enum(['active', 'pending_verification', 'suspended', 'banned']).optional(),
});

const patchBody = z.object({
  role: z.enum(['standard', 'moderator', 'admin', 'validator', 'support_agent']).optional(),
  accountStatus: z.enum(['active', 'pending_verification', 'suspended', 'banned']).optional(),
});

router.get('/users', async (req: Request, res: Response): Promise<void> => {
  const q = listQuery.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: 'Bad query' });
    return;
  }
  const { page, limit, search, status } = q.data;
  const skip = (page - 1) * limit;
  const where: Prisma.DpalUserWhereInput = {};
  if (status) where.accountStatus = status;
  if (search?.trim()) {
    const s = search.trim();
    where.OR = [
      { email: { contains: s, mode: 'insensitive' } },
      { username: { contains: s, mode: 'insensitive' } },
      { displayName: { contains: s, mode: 'insensitive' } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.dpalUser.count({ where }),
    prisma.dpalUser.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);
  res.json({
    ok: true,
    users: rows.map(toPublicUser),
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

router.patch('/users/:id', async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = patchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed' });
    return;
  }
  const u = await prisma.dpalUser.update({
    where: { id },
    data: parsed.data,
  });
  res.json({ ok: true, user: toPublicUser(u) });
});

export default router;
