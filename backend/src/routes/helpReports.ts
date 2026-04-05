import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { uploadAttachment } from '../lib/supabase';
import { nextReportNumber } from '../lib/reportNumber';
import { detectDuplicate } from '../lib/duplicateDetector';
import { validateBody } from '../middleware/validate';
import { attachUser } from '../middleware/auth';
import {
  CreateHelpReportSchema,
  type CreateHelpReportInput,
} from '../schemas/helpReport';
import { paramId } from '../lib/routeParams';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── POST /api/help-reports — submit a new help report ────────────────────────
router.post(
  '/',
  attachUser,
  validateBody(CreateHelpReportSchema),
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateHelpReportInput;
    const userId = (req as any).user?.id ?? null;

    try {
      // Duplicate detection
      const { isDuplicate, duplicateOfId } = await detectDuplicate({
        category:    body.category,
        title:       body.title,
        description: body.description,
        userId,
      });

      const reportNumber = await nextReportNumber();

      const report = await prisma.helpReport.create({
        data: {
          reportNumber,
          userId,
          category:               body.category,
          subcategory:            body.subcategory ?? null,
          tags:                   body.tags ?? [],
          title:                  body.title,
          description:            body.description,
          urgency:                body.urgency as any,
          source:                 body.source as any,
          isAnonymous:            body.isAnonymous,
          needsImmediateResponse: body.needsImmediateResponse,
          language:               body.language,
          occurredAt:             body.occurredAt ? new Date(body.occurredAt) : null,
          isDuplicate,
          duplicateOfId,

          contact: body.contact ? {
            create: {
              fullName:               body.contact.fullName ?? null,
              phone:                  body.contact.phone   ?? null,
              email:                  body.contact.email   ?? null,
              preferredContactMethod: body.contact.preferredContactMethod as any,
              safeToCall:             body.contact.safeToCall,
              safeToText:             body.contact.safeToText,
            },
          } : undefined,

          location: body.location ? {
            create: {
              country:       body.location.country      ?? null,
              stateRegion:   body.location.stateRegion  ?? null,
              city:          body.location.city         ?? null,
              address:       body.location.address      ?? null,
              latitude:      body.location.latitude     ?? null,
              longitude:     body.location.longitude    ?? null,
              locationNotes: body.location.locationNotes ?? null,
            },
          } : undefined,

          statusHistory: {
            create: {
              newStatus:  'submitted',
              changedBy:  userId ?? 'anonymous',
              reason:     'Initial submission',
            },
          },
        },
        include: {
          contact:  true,
          location: true,
        },
      });

      res.status(201).json({
        ok:           true,
        reportId:     report.id,
        reportNumber: report.reportNumber,
        isDuplicate:  report.isDuplicate,
        duplicateOfId: report.duplicateOfId,
        status:       report.status,
        urgency:      report.urgency,
        createdAt:    report.createdAt,
      });
    } catch (err) {
      console.error('[POST /help-reports]', err);
      res.status(500).json({ error: 'Failed to create report' });
    }
  },
);

// ── POST /api/help-reports/:id/attachments — upload files ────────────────────
router.post(
  '/:id/attachments',
  attachUser,
  upload.array('files', 10),
  async (req: Request, res: Response): Promise<void> => {
    const id = paramId(req);
    const files  = req.files as Express.Multer.File[];

    if (!files?.length) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    try {
      const report = await prisma.helpReport.findUnique({ where: { id }, select: { id: true } });
      if (!report) { res.status(404).json({ error: 'Report not found' }); return; }

      const created = await Promise.all(
        files.map(async (f) => {
          const { path, publicUrl } = await uploadAttachment(id, f.originalname, f.buffer, f.mimetype);
          return prisma.helpReportAttachment.create({
            data: {
              reportId:     id,
              filePath:     path,
              publicUrl,
              fileName:     f.originalname,
              fileType:     f.mimetype,
              fileSizeByes: f.size,
              uploadedBy:   (req as any).user?.id ?? null,
            },
          });
        }),
      );

      res.status(201).json({ ok: true, attachments: created });
    } catch (err) {
      console.error('[POST /help-reports/:id/attachments]', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  },
);

// ── GET /api/help-reports/:id — get a report (owner or admin) ────────────────
router.get('/:id', attachUser, async (req: Request, res: Response): Promise<void> => {
  const id = paramId(req);
  const userId  = (req as any).user?.id;

  try {
    const report = await prisma.helpReport.findUnique({
      where: { id },
      include: {
        contact:       true,
        location:      true,
        attachments:   true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        assignments:   true,
      },
    });

    if (!report) { res.status(404).json({ error: 'Not found' }); return; }

    // Restrict to owner unless admin (admin check handled by admin routes)
    if (report.userId && report.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({ ok: true, report });
  } catch (err) {
    console.error('[GET /help-reports/:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/help-reports/mine — reporter's own reports ──────────────────────
router.get('/mine', attachUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  try {
    const reports = await prisma.helpReport.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
      include: { contact: true, attachments: { select: { id: true } } },
    });
    res.json({ ok: true, reports });
  } catch (err) {
    console.error('[GET /help-reports/mine]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
