import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAdmin } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  UpdateStatusSchema,
  AddNoteSchema,
  AssignReportSchema,
  AdminListQuerySchema,
  type UpdateStatusInput,
  type AddNoteInput,
  type AssignReportInput,
  type AdminListQueryInput,
} from '../schemas/helpReport';
import { paramId } from '../lib/routeParams';

const router = Router();

// All admin routes require admin auth
router.use(requireAdmin);

// ── GET /api/admin/help-reports — list with filters & pagination ──────────────
router.get(
  '/help-reports',
  validateQuery(AdminListQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const q = (req as any).validQuery as AdminListQueryInput;

    const where: Prisma.HelpReportWhereInput = {};
    if (q.status)   where.status   = q.status as any;
    if (q.urgency)  where.urgency  = q.urgency as any;
    if (q.category) where.category = { contains: q.category, mode: 'insensitive' };
    if (q.search) {
      where.OR = [
        { title:       { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
        { reportNumber: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.dateFrom || q.dateTo) {
      where.createdAt = {};
      if (q.dateFrom) (where.createdAt as any).gte = new Date(q.dateFrom);
      if (q.dateTo)   (where.createdAt as any).lte = new Date(q.dateTo);
    }
    if (q.assignedTo) {
      where.assignments = { some: { assignedTo: q.assignedTo } };
    }
    if (q.city) {
      where.location = { city: { contains: q.city, mode: 'insensitive' } };
    }

    const orderBy: Prisma.HelpReportOrderByWithRelationInput = {
      [q.sortBy]: q.sortDir,
    };

    const skip = (q.page - 1) * q.limit;

    try {
      const [total, reports] = await Promise.all([
        prisma.helpReport.count({ where }),
        prisma.helpReport.findMany({
          where,
          orderBy,
          skip,
          take: q.limit,
          include: {
            contact:     { select: { fullName: true, email: true, phone: true } },
            location:    { select: { city: true, stateRegion: true, country: true } },
            attachments: { select: { id: true } },
            assignments: { select: { assignedTo: true, team: true, assignedAt: true } },
            _count:      { select: { notes: true, statusHistory: true } },
          },
        }),
      ]);

      res.json({
        ok: true,
        data: reports,
        meta: {
          total,
          page:      q.page,
          limit:     q.limit,
          totalPages: Math.ceil(total / q.limit),
        },
      });
    } catch (err) {
      console.error('[GET /admin/help-reports]', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// ── GET /api/admin/help-reports/stats — dashboard counts ─────────────────────
router.get('/help-reports/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [byStatus, byUrgency, byCategory, total, todayCount] = await Promise.all([
      prisma.helpReport.groupBy({ by: ['status'],  _count: { _all: true } }),
      prisma.helpReport.groupBy({ by: ['urgency'], _count: { _all: true } }),
      prisma.helpReport.groupBy({ by: ['category'], _count: { _all: true }, orderBy: { _count: { category: 'desc' } }, take: 10 }),
      prisma.helpReport.count(),
      prisma.helpReport.count({ where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    ]);

    res.json({
      ok: true,
      stats: {
        total,
        todayCount,
        byStatus:   Object.fromEntries(byStatus.map(s => [s.status, s._count._all])),
        byUrgency:  Object.fromEntries(byUrgency.map(u => [u.urgency, u._count._all])),
        byCategory: byCategory.map(c => ({ category: c.category, count: c._count._all })),
      },
    });
  } catch (err) {
    console.error('[GET /admin/help-reports/stats]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/help-reports/:id — full detail ─────────────────────────────
router.get('/help-reports/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = paramId(req);
    const report = await prisma.helpReport.findUnique({
      where: { id },
      include: {
        contact:       true,
        location:      true,
        attachments:   true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        notes:         { orderBy: { createdAt: 'desc' } },
        assignments:   { orderBy: { assignedAt: 'desc' } },
      },
    });
    if (!report) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ ok: true, report });
  } catch (err) {
    console.error('[GET /admin/help-reports/:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/admin/help-reports/:id/status ──────────────────────────────────
router.patch(
  '/help-reports/:id/status',
  validateBody(UpdateStatusSchema),
  async (req: Request, res: Response): Promise<void> => {
    const id = paramId(req);
    const body = req.body as UpdateStatusInput;
    const adminId = 'admin'; // Replace with (req as any).user?.id once full Supabase auth is wired

    try {
      const current = await prisma.helpReport.findUnique({ where: { id }, select: { status: true } });
      if (!current) { res.status(404).json({ error: 'Not found' }); return; }

      const [updated] = await prisma.$transaction([
        prisma.helpReport.update({
          where: { id },
          data:  { status: body.status as any, updatedAt: new Date() },
        }),
        prisma.helpReportStatusHistory.create({
          data: {
            reportId:  id,
            oldStatus: current.status,
            newStatus: body.status as any,
            changedBy: adminId,
            reason:    body.reason ?? null,
          },
        }),
      ]);

      res.json({ ok: true, status: updated.status });
    } catch (err) {
      console.error('[PATCH /admin/help-reports/:id/status]', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// ── PATCH /api/admin/help-reports/:id/assign ──────────────────────────────────
router.patch(
  '/help-reports/:id/assign',
  validateBody(AssignReportSchema),
  async (req: Request, res: Response): Promise<void> => {
    const id = paramId(req);
    const body = req.body as AssignReportInput;
    const adminId = 'admin';

    try {
      const assignment = await prisma.helpReportAssignment.create({
        data: {
          reportId:   id,
          assignedTo: body.assignedTo,
          assignedBy: adminId,
          team:       body.team ?? null,
        },
      });
      await prisma.helpReport.update({
        where: { id },
        data:  { status: 'assigned', updatedAt: new Date() },
      });
      res.json({ ok: true, assignment });
    } catch (err) {
      console.error('[PATCH /admin/help-reports/:id/assign]', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// ── POST /api/admin/help-reports/:id/note ─────────────────────────────────────
router.post(
  '/help-reports/:id/note',
  validateBody(AddNoteSchema),
  async (req: Request, res: Response): Promise<void> => {
    const id = paramId(req);
    const body = req.body as AddNoteInput;
    const adminId = 'admin';

    try {
      const note = await prisma.helpReportNote.create({
        data: {
          reportId: id,
          authorId: adminId,
          noteType: body.noteType as any,
          body:     body.body,
        },
      });
      res.status(201).json({ ok: true, note });
    } catch (err) {
      console.error('[POST /admin/help-reports/:id/note]', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

export default router;
