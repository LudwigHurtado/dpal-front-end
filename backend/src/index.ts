import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import helpReportsRouter from './routes/helpReports';
import dpalAuthRouter from './routes/dpalAuth';
import dpalAdminUsersRouter from './routes/dpalAdminUsers';
import adminRouter from './routes/admin';
import geminiProxyRouter from './routes/geminiProxy';
import resolutionRouter from './routes/resolution';
import rewardsRouter from './routes/rewards';
import carbonRouter from './routes/carbon';
import ecologyRouter from './routes/ecology';
import { prisma } from './lib/prisma';
import { startResolutionDispatcher } from './lib/resolutionDispatcher';

const app  = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ── Security & CORS ───────────────────────────────────────────────────────────
app.use(helmet());

// Always allow these DPAL-owned domains in addition to env-configured origins.
const BUILT_IN_ORIGINS = [
  'https://dpal-enterprise-dashboard.vercel.app',
  'https://dpal-front-end.vercel.app',
];

const normalizeOrigin = (value: string): string => value.trim().replace(/\/+$/, '');

const parseOriginList = (value?: string): string[] =>
  (value ?? '')
    .split(',')
    .map((o) => normalizeOrigin(o))
    .filter(Boolean);

const allowedOrigins = [
  ...BUILT_IN_ORIGINS,
  // Preferred legacy name in this repo.
  ...parseOriginList(process.env.CORS_ORIGINS),
  // Common deployment name used in Railway setup.
  ...parseOriginList(process.env.FRONTEND_ORIGIN),
];

const allowedOriginSet = new Set(allowedOrigins.map((origin) => normalizeOrigin(origin)));

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin header) and all listed origins
    if (!origin) return cb(null, true);
    if (allowedOriginSet.has(normalizeOrigin(origin))) return cb(null, true);
    // In development allow any localhost
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost/.test(origin)) return cb(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    ok:        true,
    service:   'dpal-backend',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV ?? 'development',
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/ai', geminiProxyRouter);
app.use('/api/help-reports', helpReportsRouter);
/** DPAL identity — register/login/me/presence (PostgreSQL + bcrypt + JWT). Mount before legacy admin so /api/admin/users is handled first. */
app.use('/api/auth', dpalAuthRouter);
app.use('/api/admin', dpalAdminUsersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/resolution',   resolutionRouter);
app.use('/api/rewards',      rewardsRouter);
app.use('/api/carbon',       carbonRouter);
app.use('/api/ecology',      ecologyRouter);

// Legacy /api/reports feed (compatibility with existing enterprise dashboard probe)
app.get('/api/reports', async (_req, res) => {
  try {
    const { prisma } = await import('./lib/prisma');
    const reports = await prisma.helpReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id:           true,
        reportNumber: true,
        title:        true,
        category:     true,
        urgency:      true,
        status:       true,
        createdAt:    true,
        location:     { select: { city: true, stateRegion: true } },
      },
    });
    res.json({ ok: true, reports, total: reports.length });
  } catch {
    res.json({ ok: true, reports: [], total: 0 }); // Don't crash if DB not ready
  }
});

// Legacy /api/reports/feed (enterprise dashboard compatibility)
app.get('/api/reports/feed', async (req, res) => {
  try {
    const { prisma } = await import('./lib/prisma');
    const limit = Math.min(parseInt(String(req.query.limit ?? '25'), 10), 100);
    const reports = await prisma.helpReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id:           true,
        reportNumber: true,
        title:        true,
        description:  true,
        category:     true,
        urgency:      true,
        status:       true,
        createdAt:    true,
        updatedAt:    true,
        location:     { select: { city: true, stateRegion: true, country: true } },
      },
    });

    // Map to ReportItem shape the enterprise dashboard expects
    const items = reports.map(r => ({
      reportId:   r.id,
      title:      r.title,
      description: r.description,
      severity:   r.urgency,
      opsStatus:  r.status === 'resolved' ? 'Resolved' :
                  r.status === 'under_review' ? 'Investigating' :
                  r.status === 'assigned' || r.status === 'in_progress' ? 'Action Taken' : 'New',
      location:   r.location ? [r.location.city, r.location.stateRegion].filter(Boolean).join(', ') : undefined,
      category:   r.category,
      createdAt:  r.createdAt?.toISOString(),
      updatedAt:  r.updatedAt?.toISOString(),
      channel:    'help-center',
    }));

    res.json({ ok: true, items, total: items.length });
  } catch {
    res.json({ ok: true, items: [], total: 0 });
  }
});

// POST /api/reports minimal upsert fallback for front-end compatibility.
app.post('/api/reports', async (req, res) => {
  try {
    const body = req.body ?? {};
    const reportNumber = `API-${Date.now()}`;
    const created = await prisma.helpReport.create({
      data: {
        reportNumber,
        category: String(body.category ?? 'Other'),
        title: String(body.title ?? 'Resolution report'),
        description: String(body.description ?? ''),
        urgency: 'normal',
        source: 'api',
      },
    });
    res.status(201).json({ ok: true, reportId: created.id, reportNumber: created.reportNumber });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message ?? 'Failed to persist report' });
  }
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`DPAL Backend running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
});

startResolutionDispatcher(prisma);

export default app;
